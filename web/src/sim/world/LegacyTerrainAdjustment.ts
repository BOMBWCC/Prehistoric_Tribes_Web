import type { LegacyRawMap } from "./LegacyMapRleDecoder";

/**
 * Direct port of the post-read part of f.aN().
 *
 * The original keeps the raw /ma stream separate in its byte buffer, then
 * adjusts only tile values <= 8 using f.a(3,3) before overlay classification.
 * The callback is used so the exact RNG instance and call order remain at the
 * runtime boundary.
 */
export function applyLegacyTerrainAdjustment(
  raw: LegacyRawMap,
  randomRemainder: (mask: number, divisor: number) => number,
): LegacyRawMap {
  const tiles = new Uint8Array(raw.tiles);
  for (let offset = 0; offset < tiles.length; offset += 1) {
    const tile = tiles[offset];
    if (tile <= 8) tiles[offset] = (tile + randomRemainder(3, 3)) & 0xff;
  }
  return { ...raw, tiles };
}
