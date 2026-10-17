import type { LegacyMapOverlay } from "./LegacyMapOverlay";
import type { LegacyRawMap } from "../sim/world/LegacyMapRleDecoder";

/** Exact f.aN() projection into the two byte grids aliased by b/c. */
export function projectLegacyMapGrids(
  raw: LegacyRawMap,
  overlay: LegacyMapOverlay,
  gridB: Int8Array[],
  gridC: Int8Array[],
): void {
  if (overlay.values.length !== raw.tiles.length) throw new RangeError("map overlay length mismatch");
  for (const row of gridB) row.fill(0);
  for (const row of gridC) row.fill(0);
  for (let y = 0; y < raw.height; y += 1) {
    for (let x = 0; x < raw.width; x += 1) {
      const offset = y * raw.width + x;
      gridB[y][x] = raw.tiles[offset] ?? 0;
      gridC[y][x] = overlay.values[offset] ?? 0;
    }
  }
}
