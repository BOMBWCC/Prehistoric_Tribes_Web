import { BLD_X, BLD_Y, UNIT_TARGET_X, UNIT_TARGET_Y, UNIT_Y } from "../../core/DenseLayout";
/**
 * Direct translation of `private void b(int, int)` (constant pool #333),
 * javap offsets 0..424 (bytecode/b-javap.txt line 6093). `p()`'s own call
 * site (offset 137..173) invokes this as
 * `b(dense[8749+dense[4444+id]], dense[4444+id])` when packed table 39's
 * lookup for this entity's type equals 1.
 *
 * Not to be confused with `private void b(int, int)` used elsewhere by
 * `an()`'s own dependency chain -- class b has exactly one `b(int,int)`
 * overload; this IS it, just reached from a different call site than the
 * ones already ported.
 *
 * Searches up to `packedBytes[packedOffsets[20]+arg1]` candidate slots
 * (X/Y offsets from packed tables 22/23, relative to
 * `dense[8383+arg2]`/`dense[8444+arg2]`), skipping any that fall outside
 * the map or whose cell is occupied AND fails the occupancy-compatibility
 * check (`a(int,int,int):byte`/#272, `checkLegacyCellCompatibility`).
 * Among the survivors, keeps the one with the smallest squared distance to
 * this entity's own position, then writes its coordinates into
 * `dense[3131+id]`/`dense[3232+id]` and a packed-table-21 "kind" value into
 * `dense[4040+id]`.
 */
export type LegacyNearestCandidateSearchInput = {
  readonly state: Int8Array;
  readonly id: number;
  readonly gridC: readonly Int8Array[];
  readonly mapWidth: number;
  readonly mapHeight: number;
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
  readonly checkCompatibility: (x: number, y: number, mode: number) => boolean;
};

function table(input: LegacyNearestCandidateSearchInput, row: number, index: number): number {
  return input.packedBytes[(input.packedOffsets[row] ?? 0) + index] ?? 0;
}

export function findLegacyNearestCandidate(
  input: LegacyNearestCandidateSearchInput,
  arg1: number,
  arg2: number,
): void {
  const { state, id } = input;
  const count = table(input, 20, arg1);
  const originX = state[BLD_X + arg2] ?? 0;
  const originY = state[BLD_Y + arg2] ?? 0;
  const myX = state[id] ?? 0;
  const myY = state[UNIT_Y + id] ?? 0;

  let bestIndex = 0;
  let bestDistance = 10000;

  for (let candidate = 0; candidate < count; candidate += 1) {
    const x = originX + table(input, 22, arg1 * 3 + candidate);
    const y = originY + table(input, 23, arg1 * 3 + candidate);
    if (x >= input.mapWidth || y >= input.mapHeight || x < 0 || y < 0) continue;

    if ((input.gridC[y]?.[x] ?? 0) !== 0) {
      if (input.checkCompatibility(x, y, 0)) continue;
    }

    const dx = myX - x;
    const dy = myY - y;
    const squaredDist = dx * dx + dy * dy;
    if (bestDistance <= squaredDist) continue;

    bestDistance = squaredDist;
    bestIndex = candidate;
  }

  state[UNIT_TARGET_X + id] = originX + table(input, 22, arg1 * 3 + bestIndex);
  state[UNIT_TARGET_Y + id] = originY + table(input, 23, arg1 * 3 + bestIndex);
  state[4040 + id] = table(input, 21, arg1 * 3 + bestIndex);
}
