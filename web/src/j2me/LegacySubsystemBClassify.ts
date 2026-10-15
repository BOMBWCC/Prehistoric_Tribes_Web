/**
 * Direct port of class b's `final byte b(int)` (bytecode/b-javap.txt offsets
 * 0..154), called for its `dense[7777+id]` side effect only -- the original
 * caller (`f.a(byte,byte)`'s dispatch target, `stepLegacyA2`'s own
 * `b.b(target)` seam) discards the returned byte entirely, so the return
 * value is exposed here purely for testability, not consumed live.
 */
export type LegacySubsystemBClassifyInput = {
  readonly dense: Int8Array;
  readonly id: number;
};

export function classifyLegacySubsystemB(input: LegacySubsystemBClassifyInput): number {
  const { dense, id } = input;

  if ((dense[1414 + id] ?? 0) < 12) {
    dense[7777 + id] = 0;
    return 6;
  }
  if (((dense[7979 + id] ?? 0) & 2) > 0) {
    if (
      (dense[7777 + id] ?? 0) === 0 ||
      (dense[3535 + id] ?? 0) !== 0 ||
      (dense[6565 + id] ?? 0) === 1
    ) {
      dense[7777 + id] = 0;
      return 5;
    }
  }
  if ((dense[3535 + id] ?? 0) !== 0 || (dense[6565 + id] ?? 0) === 1) {
    dense[7777 + id] = 0;
    return 1;
  }
  if ((dense[7777 + id] ?? 0) > 0) return 7;
  return 0;
}
