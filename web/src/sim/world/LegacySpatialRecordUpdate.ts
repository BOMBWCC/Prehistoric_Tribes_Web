/**
 * Raw port of b.a(int,int,int), which marks one record in b's int layers.
 * CORRECTION (2026-08-24): a speculative `onMark` callback used to be
 * accepted here and fired after each `rowData[row] |= bits` write, but the
 * real bytecode (offsets 0..89, no `invoke*` instruction anywhere in the
 * whole method) does the OR-write inline and nothing else -- confirmed
 * dead, no bytecode basis, never passed at either real call site. Same
 * pattern as `LegacyFrameCommandDraw.ts`'s removed `onNumericText`.
 */
export type LegacySpatialRecordUpdateInput = {
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
  /** f.a[2][3][96], aliased by b. */
  readonly layers: Int32Array[][];
  /** b.S selects the first dimension of f.a[2][3][96]. */
  readonly layerIndex: number;
  readonly mapHeight: number;
};

/** b.a:[I (#59): `new int[26]` filled with `(1 << i) - 1` in b's constructor. */
const WIDTH_MASKS = Int32Array.from({ length: 26 }, (_, i) => (1 << i) - 1);

function maskValue(width: number): number {
  if (width < 0 || width >= WIDTH_MASKS.length) throw new RangeError(`b.a:[I index ${width}`);
  return WIDTH_MASKS[width]!;
}

/**
 * b.d(int,int,int) (bytecode/b-javap.txt offsets 0..139) -- ORs one row's
 * width mask into the three 32-column segments of the layer b.S selects.
 * Both b.a(int,int,int) and b.a(int,int,int,int) funnel through it, which is
 * why they share a layer.
 */
function writeSpatialRow(layer: Int32Array[], x: number, row: number, width: number): void {
  for (let segment = 0; segment < 3; segment += 1) {
    const base = segment << 5;
    let bits = 0;
    // offsets 18..90: `if (x >= base) { if (x < base + 32) aX = a[w] << (x - base); }
    // else if (x + w >= base) aX = a[w] >> (base - x);` -- CORRECTED 2026-09-14:
    // the right-shift branch also fired for x past the segment.
    if (x >= base) {
      if (x < base + 32) bits = maskValue(width) << (x - base);
    } else if (x + width >= base) {
      bits = maskValue(width) >> (base - x);
    }
    if (bits === 0) continue;
    const rowData = layer[segment];
    if (!rowData || row < 0 || row >= rowData.length) continue;
    rowData[row] |= bits;
  }
}

export function markLegacySpatialRecord(
  input: LegacySpatialRecordUpdateInput,
  x: number,
  y: number,
  span: number,
): void {
  const table54 = input.packedOffsets[54] ?? 0;
  const table55 = input.packedOffsets[55] ?? 0;
  const layer = input.layers[input.layerIndex];
  if (!layer) return;

  for (let offset = 0; offset <= span * 2; offset += 1) {
    const row = y - span + offset;
    if (row < 0) continue;
    if (row >= input.mapHeight) return;

    const selector = input.packedBytes[table55 + span] ?? 0;
    const width = input.packedBytes[table54 + (selector & 0xff) + offset] ?? 0;
    // offsets 89..109: `d(x - (aY >> 1), row, aY)` -- the row is centred on x.
    // CORRECTED 2026-09-14: the port passed x, shifting every unit's vision
    // area right by half its width (a tree next to the villagers stayed fogged,
    // so c(IIII) took its unexplored shortcut and gather orders did nothing).
    writeSpatialRow(layer, x - (width >> 1), row, width);
  }
}

/**
 * Raw port of b.a(int,int,int,int) (bytecode/b-javap.txt offsets 0..68), the
 * rectangular-footprint variant b.d() uses for buildings (id 1..30, type>=12):
 * `for (aV = 0; aV < height; aV++) { row = y + aV; if (row < 0) continue;
 * if (row >= f.d:S) return; d(x, row, width); }`.
 */
export function markLegacySpatialRect(
  input: LegacySpatialRecordUpdateInput,
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  const layer = input.layers[input.layerIndex];
  if (!layer) return;

  for (let offset = 0; offset < height; offset += 1) {
    const row = y + offset;
    if (row < 0) continue;
    if (row >= input.mapHeight) return;
    writeSpatialRow(layer, x, row, width);
  }
}
