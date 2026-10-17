/**
 * Raw port of the other private b.a(int,int,int):bytecode offsets 0..817.
 *
 * This is deliberately separate from LegacyNeighborLookup: the original
 * class contains two overloaded a(III) methods with different return types.
 * This predicate is used by path generation and answers whether a map cell is
 * acceptable for the requested mode.
 */
export type LegacyPathCellPredicateContext = {
  readonly map: Int8Array[];
  readonly packedBytes: Int8Array;
  readonly shortOffsets: Int16Array;
  readonly state: Int8Array;
  readonly u: number;
  readonly v: number;
  readonly occupancyBits?: Int32Array[][];
};

export function legacyPathCellPredicate(
  context: LegacyPathCellPredicateContext,
  x: number,
  y: number,
  mode: number,
): number {
  const { map, packedBytes, shortOffsets, state, u, v, occupancyBits } = context;
  const cell = map[y][x];

  if (mode === 0) {
    if ((cell > 0 && cell <= 122) || cell === -128) {
      const dy = clamp(y - read(state, 101 + v), -12, 12);
      const dx = clamp(x - read(state, v), -12, 12);
      if (read(packedBytes, shortOffsets[53] + (12 + dy) * 25 + 12 + dx) > 29) {
        if (cell === -128) return 0;
        const terrain = read(packedBytes, shortOffsets[cell <= 100 ? 29 : 108] + (cell <= 100 ? cell : cell - 101));
        if ((terrain & 0xff) <= 7) return 0;
      }
    }

    if (u === 0 && occupancyBits && !hasOccupancy(occupancyBits, x, y)) return 0;
    if (cell <= -111 - ((u ^ 1) * 6) && cell > -114 - ((u ^ 1) * 6) && read(state, 1414 + v) >= 12) return 0;
  }

  if (cell === v + mode) return 0;

  if (mode === 0 && read(state, 4848 + v) > 0 && cell > u * 50 && cell <= (u + 1) * 50) {
    const base = read(packedBytes, shortOffsets[43] + read(state, 2828 + v));
    const type = read(state, 2828 + cell);
    const left = read(packedBytes, base + read(state, 2828 + v));
    const right = read(packedBytes, base + type);
    // Bytecode 518/545 jumps to the common tail at 780; it is not a reject.
    // Keep the comparison explicit because it is part of the original branch
    // shape even though both outcomes continue into the later filters.
    if (left <= right && right !== 0) {
      // continue at 780
    }

    const terrain = read(state, 2929 + cell);
    if (terrain === -101 || terrain === -100) return 0;
    const feature = read(state, 2828 + cell);
    if (feature === 69 || feature === 79 || feature === 80 || (feature >= 83 && feature <= 85)) return 0;
  }

  if (mode === 0 && cell === -127 && read(state, 2828 + v) === 13) return 0;
  return 1;
}

function hasOccupancy(bits: Int32Array[][], x: number, y: number): boolean {
  const row = bits[0][x >> 5];
  return row !== undefined && (((row[y] ?? 0) >> (x & 31)) & 1) !== 0;
}

function clamp(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function read(buffer: Int8Array | Int16Array, index: number): number {
  if (!Number.isInteger(index) || index < 0 || index >= buffer.length) {
    throw new RangeError(`legacy path predicate index ${index} outside ${buffer.length}`);
  }
  return buffer[index];
}
