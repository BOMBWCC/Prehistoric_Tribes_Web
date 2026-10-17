import { BLD_KIND, BLD_OWNER, BLD_WORK, UNIT_HOME_X, UNIT_HOME_Y, UNIT_ORDER, UNIT_TARGET_X, UNIT_TARGET_Y, UNIT_TYPE, UNIT_WORK_TARGET, UNIT_Y } from "../../core/DenseLayout";
/** Raw port of private f.a(int,int,boolean,boolean), javap offsets 0..420. */
export type LegacyEntityActionTransferInput = {
  readonly state: Int8Array;
  readonly entityId: number;
  readonly record: number;
  readonly moveFlag: boolean;
  readonly resetFlag: boolean;
  readonly readEntityCell: (row: number, column: number) => number;
  readonly onRecordCompletion?: (record: number) => void;
  readonly onLifecycleReset?: (record: number, enabled: boolean) => void;
};

/**
 * CORRECTED 2026-10-10 against offsets 48..420 (oracle run 8, frame 19191:
 * a couple claiming hut 4 sends its resident out): a non-owner that is not
 * type 92/93/106 becomes 87 with 6161 = 3 (offsets 310..408 -- the port did
 * nothing); an owner off its own cell also gets 6161 = 3 and the reset call
 * (offsets 135..151 -> 287 -> 298); an owner on its cell becomes 69 whether
 * special or not (offset 247).
 */
export function transferLegacyEntityAction(input: LegacyEntityActionTransferInput): void {
  const { state, entityId: first, record: second } = input;
  const firstType = state[UNIT_TYPE + first] ?? 0;
  const special = firstType === 93 || firstType === 92 || firstType === 106;

  if ((state[BLD_OWNER + second] ?? 0) === first &&
      !((state[BLD_KIND + second] ?? 0) === 2 && (state[BLD_WORK + second] ?? 0) === 0)) {
    if (special) state[BLD_OWNER + second] = 0;
    input.onRecordCompletion?.(second);
    if (input.readEntityCell(state[UNIT_Y + first] ?? 0, state[first] ?? 0) !== first) {
      if (!special) {
        state[UNIT_TYPE + first] = 87;
        state[UNIT_ORDER + first] = 3;
      } else {
        state[UNIT_ORDER + first] = 2;
      }
    } else {
      state[UNIT_TARGET_X + first] = state[first] ?? 0;
      state[UNIT_TARGET_Y + first] = state[UNIT_Y + first] ?? 0;
      if (special) {
        state[UNIT_HOME_X + first] = state[first] ?? 0;
        state[UNIT_HOME_Y + first] = state[UNIT_Y + first] ?? 0;
      }
      state[UNIT_TYPE + first] = 69;
      if (special) {
        state[UNIT_ORDER + first] = 2;
        state[UNIT_WORK_TARGET + first] = 0;
      } else {
        state[UNIT_ORDER + first] = 3;
      }
    }
    if (input.resetFlag) input.onLifecycleReset?.(second, false);
    return;
  }

  const secondType = state[BLD_KIND + second] ?? 0;
  if (!special || ((state[BLD_WORK + second] ?? 0) === 0 &&
      (secondType === 2 || secondType === 7 || secondType === 4 || secondType === 8))) {
    state[UNIT_TYPE + first] = 87;
    state[UNIT_ORDER + first] = 3;
    return;
  }
  state[UNIT_ORDER + first] = 2;
}
