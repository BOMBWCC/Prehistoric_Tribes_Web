/**
 * Direct port of f.a(int,int).
 *
 * The original method reads two bit planes from f.a[2][3][96] and returns the
 * raw class byte 2, 1, or 0.  It is intentionally not renamed to a gameplay
 * concept: the callers that give these classes a semantic meaning are still
 * being recovered from bytecode.
 */
export function legacyOccupancyClass(
  layers: Int32Array[][],
  x: number,
  y: number,
): number {
  const wordIndex = x >> 5;
  const bit = x & 31;
  const first = layers[0][wordIndex][y];
  if (((first >> bit) & 1) === 0) return 2;
  const second = layers[1][wordIndex][y];
  if (((second >> bit) & 1) === 0) return 1;
  return 0;
}
