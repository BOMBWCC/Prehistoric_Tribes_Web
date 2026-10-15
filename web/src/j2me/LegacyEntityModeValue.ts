export type LegacyEntityModeValueInput = {
  readonly state: Int8Array;
  readonly id: number;
};

/** Exact final byte b.b(int), bytecode/b-javap.txt offsets 0..154. */
export function readLegacyEntityModeValue(input: LegacyEntityModeValueInput): number {
  const { state, id } = input;
  if ((state[1414 + id] ?? 0) >= 12) {
    if (((state[7979 + id] ?? 0) & 2) !== 0) {
      if ((state[7777 + id] ?? 0) !== 0 ||
          (state[3535 + id] ?? 0) !== 0 ||
          (state[6565 + id] ?? 0) !== 1) {
        state[7777 + id] = 0;
        return 5;
      }
    }
    if ((state[3535 + id] ?? 0) === 0 && (state[6565 + id] ?? 0) !== 1) {
      if ((state[7777 + id] ?? 0) > 0) return 7;
      return 0;
    }
    state[7777 + id] = 0;
    return 1;
  }
  state[7777 + id] = 0;
  return 6;
}
