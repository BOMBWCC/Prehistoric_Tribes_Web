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
  const firstType = state[2828 + first] ?? 0;
  const special = firstType === 93 || firstType === 92 || firstType === 106;

  if ((state[8810 + second] ?? 0) === first &&
      !((state[8749 + second] ?? 0) === 2 && (state[8627 + second] ?? 0) === 0)) {
    if (special) state[8810 + second] = 0;
    input.onRecordCompletion?.(second);
    if (input.readEntityCell(state[101 + first] ?? 0, state[first] ?? 0) !== first) {
      if (!special) {
        state[2828 + first] = 87;
        state[6161 + first] = 3;
      } else {
        state[6161 + first] = 2;
      }
    } else {
      state[3131 + first] = state[first] ?? 0;
      state[3232 + first] = state[101 + first] ?? 0;
      if (special) {
        state[6262 + first] = state[first] ?? 0;
        state[6363 + first] = state[101 + first] ?? 0;
      }
      state[2828 + first] = 69;
      if (special) {
        state[6161 + first] = 2;
        state[4747 + first] = 0;
      } else {
        state[6161 + first] = 3;
      }
    }
    if (input.resetFlag) input.onLifecycleReset?.(second, false);
    return;
  }

  const secondType = state[8749 + second] ?? 0;
  if (!special || ((state[8627 + second] ?? 0) === 0 &&
      (secondType === 2 || secondType === 7 || secondType === 4 || secondType === 8))) {
    state[2828 + first] = 87;
    state[6161 + first] = 3;
    return;
  }
  state[6161 + first] = 2;
}
