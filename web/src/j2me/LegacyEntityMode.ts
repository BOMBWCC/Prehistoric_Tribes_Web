/** Raw port of f.b(int id, boolean enabled). */
export type LegacyEntityModeInput = {
  readonly state: Int8Array;
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
  /** Original b.b((byte)id) status query. */
  readonly onStatusQuery?: (id: number) => void;
  /** Original f.a(linkedId, id, false, false) relation update. */
  readonly onLinkedRecord?: (linkedId: number, id: number, first: boolean, second: boolean) => void;
};

export function setLegacyEntityMode(
  input: LegacyEntityModeInput,
  id: number,
  enabled: boolean,
): void {
  input.onStatusQuery?.(id);
  let linkedId = input.state[8993 + id];
  while (linkedId > 0) {
    input.onLinkedRecord?.(linkedId, id, false, false);
    linkedId = input.state[4545 + linkedId];
  }

  input.state[8627 + id] = enabled ? 1 : 2;
  if (!enabled) return;

  const tableIndex = 7 + input.state[9115 + id];
  const tableOffset = input.packedOffsets[138] + tableIndex * 26 + input.state[8749 + id];
  input.state[8566 + id] = input.packedBytes[tableOffset];
}
