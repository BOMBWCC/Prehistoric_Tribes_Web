/**
 * Raw port of `b`'s package-private `void a(int,int,int,int)` and private
 * `void d(int,int,int)`, bytecode/b-javap.txt offsets 0..68 and 0..139.
 *
 * Traced from `f.u()`'s entity-ID branch (see
 * reverse-engineering/gameplay-paint-cluster.md), which calls
 * `b.a(x, y, width, height)` where `x`/`y`/`width`/`height` come from an
 * entity's dense-state fields. This is NOT a sprite draw: it has no
 * Graphics call anywhere in it. It ORs a shifted width-bitmask into
 * `f.a:[[[I` -- the exact same 2-layer, 96-column occupancy bitmap already
 * ported as the `layers` parameter of `LegacyOccupancyClass.legacyOccupancyClass`
 * (which *reads* both of its layers to derive the 0/1/2 class the fog-of-war
 * epilogue in `LegacyGameplayCellLoop.ts` renders; confirmed 2 layers, not 3
 * -- `legacyOccupancyClass`'s own docblock says `f.a[2][3][96]`, and every
 * `onFootprintMark` call site only ever passes `layer` 0 or 1). So this is
 * the WRITER side: **f.u() recomputes each entity's footprint into the
 * occupancy/vision bitmap as part of every render pass**, rather than
 * maintaining it incrementally elsewhere. The layer index (`b.S:B`) is
 * prepared by the f.u() caller immediately before this call (confirmed:
 * offset 798..803 of f.u() writes `b.S = 0` in one branch).
 */

export type LegacyEntityFootprintMarkState = {
  /** b.S:B (#50) -- which of the 2 layers (`f.a[layer]`) to mark; caller-prepared. */
  readonly layer: number;
  /** b.a:[I (#59) -- width -> bitmask lookup table. */
  readonly widthMasks: Int32Array;
  /** f.a:[[[I (#72 on f, read via b's `a:Lf;` back-reference) -- 2 layers x 3 words x 96 rows. */
  readonly layers: Int32Array[][];
  /** f.d:S -- map height in tiles, the same bound LegacyGameplayCellLoop uses. */
  readonly mapHeight: number;
};

/**
 * b's constructor (bytecode/b-javap.txt offsets 0..255): a hardcoded
 * 26-element `new int[26]` literal, confirmed value-by-value against every
 * `iastore` in the constructor (`ldc_w` ints up to `33554431` at index 25).
 * Matches the closed form `(1 << width) - 1` exactly at every index --
 * b.a:[I is simply a width-to-bitmask table.
 */
export const LEGACY_ENTITY_FOOTPRINT_WIDTH_MASKS: Int32Array = Int32Array.from(
  { length: 26 },
  (_, width) => (1 << width) - 1,
);

/** Exact b.d(int,int,int), bytecode/b-javap.txt offsets 0..139. */
export function markLegacyEntityFootprintRow(
  state: LegacyEntityFootprintMarkState,
  x: number,
  row: number,
  width: number,
): void {
  for (let word = 0; word < 3; word += 1) {
    let mask = 0;
    if (x < word << 5) {
      if (x + width >= word << 5) {
        mask = state.widthMasks[width] >> ((word << 5) - x);
      }
    } else if (x < (word + 1) << 5) {
      mask = state.widthMasks[width] << (x - (word << 5));
    }
    if (mask !== 0) {
      const plane = state.layers[state.layer]?.[word];
      if (plane) plane[row] |= mask;
    }
  }
}

/** Exact b.a(int,int,int,int), bytecode/b-javap.txt offsets 0..68. */
export function markLegacyEntityFootprint(
  state: LegacyEntityFootprintMarkState,
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  for (let dy = 0; dy < height; dy += 1) {
    const row = y + dy;
    if (row < 0) continue;
    if (row >= state.mapHeight) return;
    markLegacyEntityFootprintRow(state, x, row, width);
  }
}
