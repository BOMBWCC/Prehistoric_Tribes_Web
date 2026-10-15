export type LegacySubsystemBPreActionGateInput = {
  readonly state: Int8Array;
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
  readonly id: number;
  readonly entityAt?: (row: number, column: number) => number;
  /** private boolean n() (#402), result popped. */
  readonly onNeeds?: () => void;
  /** private void an() (#321). */
  readonly onAn?: () => void;
};

function tableByte(input: LegacySubsystemBPreActionGateInput, table: number, index: number): number {
  return input.packedBytes[(input.packedOffsets[table] ?? 0) + index] ?? 0;
}

/**
 * `private boolean b()` offsets 253..613 (bytecode/b-javap.txt line 9482).
 *
 *   if ((t31[type] == 13 && t33[type] == 13) || 13 <= t41[type] <= 15) {   // 253..374
 *     if (!(t39[type] == 1 && gridC[y][x] == v) && 2929 != -109            // 377..458
 *         && 3131 == x && 3232 == y) goto 533;                             // 461..513
 *   }
 *   if (4444 != -1) goto 614;                                              // 516..530
 *   533: if (4444 == -1 && 10 <= type <= 16 && 3636 > 0) an(); else n();   // 533..613
 *
 * CORRECTED 2026-09-15: the port computed the first block and discarded it,
 * so a unit standing on its target with 4444 != -1 never reached n(), and
 * the n() call was wired to N() (#250) instead of n() (#402).
 */
export function stepLegacySubsystemBPreActionGate(
  input: LegacySubsystemBPreActionGateInput,
): void {
  const { state, id } = input;
  const type = state[2828 + id] ?? 0;
  const t41 = tableByte(input, 41, type);
  let reached = false;

  if ((tableByte(input, 31, type) === 13 && tableByte(input, 33, type) === 13) || (t41 >= 13 && t41 <= 15)) {
    const blocked = tableByte(input, 39, type) === 1 &&
      input.entityAt?.(state[101 + id] ?? 0, state[id] ?? 0) === id;
    reached = !blocked && (state[2929 + id] ?? 0) !== -109 &&
      (state[3131 + id] ?? 0) === (state[id] ?? 0) && (state[3232 + id] ?? 0) === (state[101 + id] ?? 0);
  }

  if (!reached && (state[4444 + id] ?? 0) !== -1) return;
  if ((state[4444 + id] ?? 0) === -1 && type >= 10 && type <= 16 && (state[3636 + id] ?? 0) > 0) input.onAn?.();
  else input.onNeeds?.();
}
