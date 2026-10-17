import { stepLegacyZAj, type LegacyZAjLowerState } from "./LegacyZAj";
import { stepLegacyZAg, type LegacyZAgState, type LegacyZAgCallbacks } from "./LegacyZAg";
import { stepLegacyZB2 } from "./LegacyZB2";
import { stepLegacyEntityRecordCancel } from "../sim/units/LegacyEntityRecordCancel";
import { BLD_HP, BLD_KIND, BLD_LEVEL, BLD_MAX_HP, UNIT_RECORD, UNIT_SLOT, UNIT_TYPE, UNIT_Y } from "../core/DenseLayout";
import { T_BUILDING } from "../core/DataTables";

/**
 * Direct translation of `private void af()` (bytecode/f-javap.txt offsets
 * 0..1130, line 22399, 628 instructions) -- `ae()`'s dispatch target,
 * keyed on `r[as]`. Ported 2026-08-22 after the earlier partial pass (see
 * `docs/unknowns.md`'s 2026-08-21 entry) that only used the `r[as] in
 * [23,25]` slice to wire `frameLayoutAq`.
 *
 * Two branches reach a confirmed-permanently-null field (`f.c:[[B]`,
 * #262, zero `putfield` sites anywhere in the class) and throw
 * unconditionally with no ancestor try/catch -- see
 * `LegacyEntityRecordCancel.ts`'s own docblock for why this is faithfully
 * reproduced as an uncaught throw rather than invented error handling.
 *
 * The `r[as]===27` clamp (offset 441..684) recomputes the exact same
 * `resourceByte(138, (6+groupTable)*26+owner)` table lookup twice and
 * clamps `dense[8505+q]` against it twice in a row -- the SECOND clamp is
 * provably a no-op (nothing mutates between the two reads), so it is
 * collapsed here into a single clamp rather than literally repeated.
 */
export type LegacyZAfState = {
  dense: Int8Array;
  r: Int8Array;
  as: number;
  entityFocusFlag: boolean;
  kByte: number;
  frameLayoutAX: number;
  frameLayoutL: number;
  V: boolean;
  qCounter: number;
  selectionFlags: readonly boolean[];
  wByte: number;
  cSInt: number;
  pendingP: boolean;
  xMFlag: boolean;
  xOFlag: boolean;
  outerLoopLFlag: boolean;
  outerLoopNFlag: boolean;
  frameLayoutAq: number;
  /** f.c:[[B (#262) -- gridC. Allocated by e.i(); see this file's retraction. */
  readonly gridC: readonly Int8Array[];
  /** f.K:Z (#69) -- the canonical `game.choosingChief`, af() offset 108..131. */
  kFlag: boolean;
  /** f.a:[[S (#131), af() offset 115..128 writes aShort[0][17]. */
  readonly aShort: Int16Array[];
  /** class b's g:[[B (#176), allocated by f.g() as byte[3][20]. */
  readonly gRows: readonly Int8Array[];
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
} & LegacyZAgState;

export type LegacyZAfCallbacks = LegacyZAgCallbacks & {
    readonly onF2: (arg1: number, arg2: number) => void;
    readonly onAjUpper: () => void;
    readonly onCompleteEntityRecord: (record: number) => void;
    readonly resourceByte: (shortOffset: number, add: number) => number;
    /** `this.a.c():V` -- class `b`'s own action-rearm sweep, `r[as] in {14,15}`. */
    readonly onSubsystemBC: () => void;
    /** class b's own `final void b(int)` (#544 via f) -- releaseLegacyEntityHome, af() offset 134..142. */
    readonly onSubsystemBB?: (id: number) => void;
    /** f's own `private void d(byte)` (#578) -- stepLegacyD, af() offset 145..150. */
    readonly onDByte?: (value: number) => void;
    /** b's `final void a(int)` (#476), reached through b.b(byte)'s tail. */
    readonly onReleaseTenEntity?: (id: number) => void;
    readonly onSelectionReset9?: (
      a: boolean, b: boolean, c: boolean, d: boolean, e: boolean, f: boolean, g: boolean, h: boolean, i: boolean,
    ) => void;
  };

export function stepLegacyZAf(state: LegacyZAfState, callbacks: LegacyZAfCallbacks): void {
  const dense = state.dense;
  const r = state.r[state.as] ?? 0;

  if (r === 13) {
    stepLegacyZAj(state as LegacyZAjLowerState);
    return;
  }

  if (r < 0) {
    if (state.entityFocusFlag) {
      if (state.kByte === state.frameLayoutL) {
        // Offsets 49..157. RETRACTED 2026-09-07: this used to throw, because
        // f.c:[[B] (#262) was believed permanently null. It is gridC, which
        // e.i() allocates.
        const k = state.kByte;
        if ((state.gridC[dense[UNIT_Y + k] ?? 0]?.[dense[k] ?? 0] ?? 0) !== k) {
          stepLegacyEntityRecordCancel(
            dense, state.gridC, k, dense[UNIT_RECORD + k] ?? 0, true, true,
            callbacks.onCompleteEntityRecord,
          );
        }
        if (state.kFlag) {
          state.aShort[0][17] = (k << 16) >> 16;
          state.kFlag = false;
          callbacks.onSubsystemBB?.(k);
        }
        callbacks.onDByte?.((k << 24) >> 24);
        // f.F:Z (#49) is the same field as `entityFocusFlag` (merged; see
        // LegacyGameState.ts's docblock about the removed duplicate `FFlag`).
        state.entityFocusFlag = false;
      }
      state.kByte = state.frameLayoutL;
    } else if (state.V) {
      stepLegacyEntityRecordCancel(dense, state.gridC, state.frameLayoutL, state.qCounter, true, true, callbacks.onCompleteEntityRecord);
      state.V = false;
    } else {
      state.V = true;
      state.pendingP = true;
    }

    const l = state.frameLayoutL;
    const marker = dense[UNIT_TYPE + l] ?? 0;
    const arg1 = (dense[UNIT_SLOT + l] ?? 0) < 0 || marker === 92 || marker === 106 ? l : -(dense[UNIT_RECORD + l] ?? 0);
    callbacks.onF2(arg1, 0);
    return;
  }

  if (state.selectionFlags[6]) {
    callbacks.onAjUpper();
    callbacks.onL?.(0);
    state.cSInt = callbacks.resourceByte(T_BUILDING, 416 + r);
    return;
  }

  if (r === 17) { callbacks.onL?.(3); return; }

  if (r === 16 || r === 26) {
    // Offsets 372..426. RETRACTED 2026-09-07: the 2026-08-22 note here
    // deleted everything after the b(int,boolean) call as unreachable dead
    // code, because b.b(byte) (#546) was believed a guaranteed throw. It is
    // not -- b's g:[[B] (#176) is allocated by f.g() -- so the
    // onSelectionReset/wByte=0 tail is restored.
    stepLegacyZB2(
      { dense, gRows: state.gRows, packedBytes: state.packedBytes, packedOffsets: state.packedOffsets },
      state.qCounter,
      r === 16,
      {
        onReleaseTenEntity: callbacks.onReleaseTenEntity,
        onRecordCancel: (node, owner) => stepLegacyEntityRecordCancel(
          dense, state.gridC, node, owner, false, false, callbacks.onCompleteEntityRecord,
        ),
      },
    );
    callbacks.onSelectionReset9?.(true, true, false, false, false, false, false, false, false);
    state.wByte = 0;
    return;
  }

  if (r === 27) {
    const q = state.qCounter;
    const owner = dense[BLD_KIND + q] ?? 0;
    const groupTable = dense[BLD_LEVEL + q] ?? 0;
    const clampValue = callbacks.resourceByte(T_BUILDING, (6 + groupTable) * 26 + owner);
    dense[BLD_MAX_HP + q] = clampValue;
    if ((dense[BLD_HP + q] ?? 0) > (dense[BLD_MAX_HP + q] ?? 0)) {
      dense[BLD_HP + q] = dense[BLD_MAX_HP + q] ?? 0;
    }
    dense[9054 + q] = ((dense[9054 + q] ?? 0) | 1) & 0xff;
    state.pendingP = true;
    return;
  }

  if (r === 28) {
    dense[9054 + state.qCounter] = ((dense[9054 + state.qCounter] ?? 0) | 1) & 0xff;
    state.pendingP = true;
    return;
  }

  if (r === 10) {
    callbacks.onSelectionReset9?.(true, false, false, false, false, true, false, false, false);
    state.pendingP = true;
    return;
  }

  if (r === 11) {
    state.xMFlag = true;
    callbacks.onL?.(2);
    state.cSInt = 100;
    callbacks.onAjUpper();
    return;
  }

  if (r === 14) {
    state.outerLoopLFlag = false;
    state.xMFlag = false;
    callbacks.onSubsystemBC();
    state.pendingP = true;
    return;
  }

  if (r === 12) {
    state.xOFlag = true;
    callbacks.onL?.(2);
    state.cSInt = 100;
    callbacks.onAjUpper();
    return;
  }

  if (r === 15) {
    state.outerLoopNFlag = false;
    state.xOFlag = false;
    callbacks.onSubsystemBC();
    state.pendingP = true;
    return;
  }

  if (r >= 23 && r <= 25) {
    state.frameLayoutAq += 1;
    if (state.frameLayoutAq > 2) state.frameLayoutAq = 0;
    state.pendingP = true;
    return;
  }

  if (r >= 6 && r <= 8) {
    callbacks.onL?.(2);
    state.cSInt = 20 + r - 6;
    return;
  }

  if (r < 6 || r === 29) {
    stepLegacyZAg(state, callbacks);
    return;
  }

  if (r >= 19 && state.wByte !== 3) {
    callbacks.onL?.(r === 22 ? 2 : 1);
    state.cSInt = (r - 19) << 24 >> 24;
  }
}
