import { UNIT_HAPPINESS, UNIT_JOB_TYPE, UNIT_OFFSET_X, UNIT_OFFSET_Y, UNIT_ORDER, UNIT_RECORD, UNIT_TARGET_X, UNIT_TARGET_Y, UNIT_VISION, UNIT_WORK_TARGET, UNIT_Y } from "../../core/DenseLayout";
import { T_TYPE_JOB } from "../../core/DataTables";
/**
 * Raw port of b.t().  The private movement/target helpers are deliberately
 * callbacks: their meanings are not established by this method alone.
 */
export type LegacyEntityTargetStepInput = {
  readonly state: Int8Array;
  readonly packedBytes: Int8Array;
  /** Original b:[S] alias, which is f.b (not f.a's packed-offset table). */
  readonly saveOffsets: Int16Array;
  readonly packedOffsets: Int16Array;
  readonly id: number;
  readonly u: number;
  /** b.m:B (#202), read AFTER a(int,int,boolean) (#273) refreshes it. */
  readonly m: () => number;
  readonly kByte: number;
  readonly fN: boolean;
  readonly onPositionProbe?: (x: number, y: number, enabled: boolean) => number | undefined;
  readonly onAction?: (byteValue: number, enabled: boolean) => boolean;
  readonly onDistanceProbe?: (x: number, y: number, mode: number) => number | undefined;
  readonly onModeDispatch?: (mode: number) => void;
  readonly onByteDispatch?: (id: number, value: number) => void;
  /**
   * private void Q() (#253) -- offset 723 of the reset path. CORRECTED
   * 2026-09-23: this was named onAssociationReset, which described nothing in
   * the bytecode; the call is `Q()`, the type re-selection.
   */
  readonly onQ?: () => void;
  /** final void a(byte,int,int) (#274) -- offset 735, called as `a(12, v, 0)`. */
  readonly onTargetDispatch?: (type: number, id: number, flags: number) => void;
};

export type LegacyEntityTargetStepResult = {
  readonly entered: boolean;
  readonly returnedByAction: boolean;
  readonly usedTypeFourBranch: boolean;
};

/** Exact field gates, byte narrowing, table indirection, and callback order. */
export function stepLegacyEntityTarget(input: LegacyEntityTargetStepInput): LegacyEntityTargetStepResult {
  const { state, id } = input;
  const modeIndex = 6161 + id;
  if (state[modeIndex] < 2 || state[UNIT_OFFSET_X + id] !== 0 || state[UNIT_OFFSET_Y + id] !== 0) {
    return { entered: false, returnedByAction: false, usedTypeFourBranch: false };
  }

  let c = state[modeIndex] === 2;
  if (c) {
    const probeResult = input.onPositionProbe?.(state[UNIT_TARGET_X + id], state[UNIT_TARGET_Y + id], true);
    if (probeResult !== undefined && probeResult >= 0) c = false;
    const tableBase = input.packedOffsets[T_TYPE_JOB];
    const current = input.packedBytes[tableBase + state[UNIT_JOB_TYPE + id]];
    const target = input.packedBytes[tableBase + input.m()];
    // Offsets 124..210: `t41[6464] == t41[m]` -> c = false; else keep c when
    // `t41[m] != 0 || f.N || K >= 50`. CORRECTED 2026-09-15: the first test
    // was inverted, so a worker ordered to a DIFFERENT job class never ran
    // a(-1, true)'s -108 put-away animation, whose w() frame 6 writes
    // `6464 = 69` -- a finished builder kept 6464 = 56 and A() kept hiding
    // its building skill from the panel.
    // With t41[m] == 0, c survives only when !f.N && K >= 50 (offset 196: f.N jumps to the clear).
    // FIXED 2026-10-13 (oracle run 15, play11 frame 51347): f.N was read the wrong way round, so
    // an enemy builder sent to a rebuilt site started the -108 put-away instead of taking the job.
    if (current === target || (target === 0 && (input.fN || input.kByte < 50))) c = false;
  }

  const tableBase = input.packedOffsets[T_TYPE_JOB];
  if (input.u !== 1 && state[UNIT_HAPPINESS + id] < 10 && state[modeIndex] === 2 && input.packedBytes[tableBase + input.m()] !== 0) {
    return resetTargetState(input);
  }

  if (input.onAction?.(-1, c) === true) {
    return { entered: true, returnedByAction: true, usedTypeFourBranch: false };
  }

  let usedTypeFourBranch = false;
  if (state[modeIndex] === 4) {
    usedTypeFourBranch = true;
    // CORRECTED 2026-09-21 (offsets 305..495, re-read instruction by
    // instruction once H() #244 started feeding this branch for real):
    //  - offset 356's `bastore` targets `4444`, not `4747`, and the value is
    //    `4747 - (4747 > 100 ? 101 : 0)` -- the old port had the subtraction
    //    the wrong way round AND wrote it back over `4747`.
    //  - offset 393 then sets `4747` itself to `4747 > 100 ? 99 : 0`; the
    //    `if_icmpgt` at 384 consumes both operands, so there is no second
    //    subtraction.
    //  - offsets 394..495 read `a:[B` (dense), not `b:[B` (packedBytes):
    //    `b:[S`(#132, saveOffsets) only supplies the row base.
    // So `4747` arrives carrying a record id, optionally +101 to select the
    // "door" row pair (99/100) instead of the plain position pair (0/1).
    const encoded = state[UNIT_WORK_TARGET + id] ?? 0;
    state[UNIT_RECORD + id] = toByte(encoded - (encoded > 100 ? 101 : 0));
    state[UNIT_WORK_TARGET + id] = toByte(encoded > 100 ? 99 : 0);
    const selector = state[UNIT_WORK_TARGET + id];
    const record = state[UNIT_RECORD + id];
    state[UNIT_TARGET_X + id] = state[(input.saveOffsets[selector] ?? 0) + record] ?? 0;
    state[UNIT_TARGET_Y + id] = state[(input.saveOffsets[selector + 1] ?? 0) + record] ?? 0;

    const distance = input.onDistanceProbe?.(state[id], state[UNIT_Y + id], 0);
    if (distance !== undefined && Math.trunc(distance / 10) <= state[UNIT_VISION + id]) {
      input.onModeDispatch?.(1);
      state[modeIndex] = 0;
    } else if (distance !== undefined) {
      input.onByteDispatch?.(id, 87);
    }
  }

  state[808 + id] = 0;
  if (state[modeIndex] <= 0) {
    return { entered: true, returnedByAction: false, usedTypeFourBranch };
  }
  input.onModeDispatch?.(state[modeIndex] === 2 ? 0 : 2);
  return { entered: true, returnedByAction: false, usedTypeFourBranch };
}

function resetTargetState(input: LegacyEntityTargetStepInput): LegacyEntityTargetStepResult {
  const { state, id } = input;
  state[UNIT_ORDER + id] = 0;
  state[UNIT_TARGET_X + id] = state[id];
  state[UNIT_TARGET_Y + id] = state[UNIT_Y + id];
  state[UNIT_RECORD + id] = 0;
  state[UNIT_WORK_TARGET + id] = 0;
  input.onQ?.();
  input.onTargetDispatch?.(12, id, 0);
  return { entered: true, returnedByAction: false, usedTypeFourBranch: false };
}

function toByte(value: number): number {
  const narrowed = value & 0xff;
  return narrowed >= 0x80 ? narrowed - 0x100 : narrowed;
}
