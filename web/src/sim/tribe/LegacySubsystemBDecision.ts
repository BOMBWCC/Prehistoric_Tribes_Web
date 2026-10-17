import { UNIT_AGE, UNIT_FLAGS, UNIT_HAPPINESS, UNIT_HOME_X, UNIT_HOME_Y, UNIT_JOB_TYPE, UNIT_ORDER, UNIT_SAVED_TYPE, UNIT_TARGET_X, UNIT_TARGET_Y, UNIT_TYPE, UNIT_WORK_TARGET } from "../../core/DenseLayout";
import { T_TYPE_JOB } from "../../core/DataTables";
export type LegacySubsystemBDecisionInput = {
  readonly state: Int8Array;
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
  readonly v: number;
  readonly u: number;
  readonly fN: boolean;
  readonly fL: boolean;
  /** b.Q:B (#46) -- game.subsystemBQByte, NOT f.q:B (#357). */
  readonly fQ: number;
  /** b.m:B (#202), read AFTER a(int,int,boolean) (#273) refreshes it. */
  readonly m: () => number;
  readonly onEntityTransform?: (x: number, y: number, flag: boolean) => void;
  readonly onQueue?: () => void;
  readonly onRawAction?: (id: number, action: number) => void;
  /** Result of private b(boolean), used by the type-12/16 continuation. */
  readonly onBBoolean?: (value: boolean) => boolean;
  readonly onGroupMode?: (mode: number) => void;
};

function tableByte(bytes: Int8Array, offsets: Int16Array, table: number, index: number): number {
  return bytes[(offsets[table] ?? 0) + index] ?? 0;
}

/** Exact b() continuation surrounding its private n() call (bytecode 614..1185). */
export function stepLegacySubsystemBDecision(input: LegacySubsystemBDecisionInput): boolean {
  const { state, packedBytes, packedOffsets, v, u } = input;
  const bit64 = ((state[UNIT_FLAGS + v] ?? 0) & 64) !== 0;
  const mayContinue = (
    (u === 0 && (!input.fN && (!input.fL || !bit64))) ||
    // BUG FIX (2026-09-10): this arm was `input.fQ >= 0`, inverted. b() offset
    // 668 is `getfield #46 // Q:B; ifge 1171` -- Q >= 0 RETURNS, so the method
    // continues when Q < 0. The field is class b's own Q:B (#46), tracked as
    // game.subsystemBQByte (default -1), not f.q:B (#357) which the call site
    // used to pass.
    (u === 1 && input.fQ < 0)
  ) && (state[UNIT_AGE + v] ?? 0) >= 12;
  // Offsets 615..690: every failed guard is `goto 1171`, i.e. it still clears 5050 below. FIXED
  // 2026-10-09 (oracle run 6, frame 18862): this returned first, so during a CALL TO ARMS (f.N)
  // no unit ever re-planned its route.
  if (!mayContinue) {
    state[5050 + v] = 0;
    return false;
  }

  const type = state[UNIT_TYPE + v] ?? 0;
  if (
    (type === 69 || (type === 84 && state[UNIT_SAVED_TYPE + v] === 69)) &&
    state[7777 + v] === 0 &&
    state[UNIT_ORDER + v] === 0 &&
    (state[UNIT_TARGET_X + v] !== state[UNIT_HOME_X + v] || state[UNIT_TARGET_Y + v] !== state[UNIT_HOME_Y + v])
  ) {
    input.onEntityTransform?.(state[UNIT_HOME_X + v] ?? 0, state[UNIT_HOME_Y + v] ?? 0, true);
    input.onQueue?.();

    // Offsets 872..1170, still inside the idle block above (every guard at
    // 672..834 jumps to 1171). CORRECTED 2026-09-29: this ran for every unit,
    // so a hunter carrying meat (type 22) or bones (19) was turned back to 12
    // one step into its trip to the store and never delivered.
    //
    // Offsets 945..1020 (same job class as the refreshed m, or m 16 with job
    // 12): back to the work spot, and g(1) once 505 >= 30. RESTORED
    // 2026-09-29 -- the port had dropped this branch and a 2026-09-18
    // deviation stood in for it on the premise that nothing in class b sends
    // an idle villager back to work.
    const job = state[UNIT_JOB_TYPE + v] ?? 0;
    const m = input.m();
    if (
      tableByte(packedBytes, packedOffsets, T_TYPE_JOB, m) === tableByte(packedBytes, packedOffsets, T_TYPE_JOB, job) ||
      (m === 16 && job === 12)
    ) {
      state[UNIT_TARGET_X + v] = state[UNIT_HOME_X + v] ?? 0;
      state[UNIT_TARGET_Y + v] = state[UNIT_HOME_Y + v] ?? 0;
      if ((state[UNIT_HAPPINESS + v] ?? 0) >= 30) input.onGroupMode?.(1);
    } else {
      if (state[UNIT_JOB_TYPE + v] === 12 || state[UNIT_JOB_TYPE + v] === 16) {
        input.onRawAction?.(v, 12);
        if (!input.onBBoolean?.(false)) {
          input.onRawAction?.(v, 60);
          state[UNIT_JOB_TYPE + v] = 12;
          state[UNIT_TARGET_X + v] = state[UNIT_HOME_X + v] ?? 0;
          state[UNIT_TARGET_Y + v] = state[UNIT_HOME_Y + v] ?? 0;
          if ((state[UNIT_HAPPINESS + v] ?? 0) >= 30) input.onGroupMode?.(1);
        }
      } else {
        state[UNIT_WORK_TARGET + v] = 0;
      }
    }
  }

  state[5050 + v] = 0;
  return false;
}
