import { UNIT_AGE, UNIT_CARRY_KIND, UNIT_FLAGS, UNIT_HELD_ITEM } from "../../core/DenseLayout";
export type LegacyEntityModeValueInput = {
  readonly state: Int8Array;
  readonly id: number;
};

/** Exact final byte b.b(int), bytecode/b-javap.txt offsets 0..154. */
export function readLegacyEntityModeValue(input: LegacyEntityModeValueInput): number {
  const { state, id } = input;
  if ((state[UNIT_AGE + id] ?? 0) >= 12) {
    if (((state[UNIT_FLAGS + id] ?? 0) & 2) !== 0) {
      if ((state[7777 + id] ?? 0) !== 0 ||
          (state[UNIT_CARRY_KIND + id] ?? 0) !== 0 ||
          (state[UNIT_HELD_ITEM + id] ?? 0) !== 1) {
        state[7777 + id] = 0;
        return 5;
      }
    }
    if ((state[UNIT_CARRY_KIND + id] ?? 0) === 0 && (state[UNIT_HELD_ITEM + id] ?? 0) !== 1) {
      if ((state[7777 + id] ?? 0) > 0) return 7;
      return 0;
    }
    state[7777 + id] = 0;
    return 1;
  }
  state[7777 + id] = 0;
  return 6;
}
