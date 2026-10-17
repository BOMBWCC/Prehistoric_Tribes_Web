import type { Graphics } from "../platform/Graphics";
import type { DrawableImage } from "../platform/Image";
import { legacyEntityPartition } from "../sim/world/LegacyEntityPartition";
import { UNIT_FLAGS } from "../core/DenseLayout";

/**
 * The map overview (Q 19, `L()`): `private void C()` (f-javap 14795),
 * `private void D()` (14931) and `private void e(int,int)` (15301).
 *
 * The overview is a grid of 5x4-pixel cells, one per map tile, drawn into
 * Image[c[1]] under the panel sprite b[1][1181]. `C()` draws the whole window
 * (`L()` calls it once on entry); `D()` is aD 14's scroll update: it shifts
 * the panel by one cell through Image[c[0]] and paints only the new column
 * or row. `e(x,y)` picks the colour of one tile.
 */
export type LegacyMapOverviewInput = {
  /** f.a:[Graphics] / f.a:[Image] -- the four offscreen targets. */
  readonly graphics: readonly Graphics[];
  readonly images: readonly DrawableImage[];
  /** f.c:[B] (#263) -- game.frameImageSlots. */
  readonly imageSlots: Int8Array;
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
  /** f.b:[[S] (#244) and f.j:[[B] (#326) -- packedData's short/byte tables. */
  readonly shortTables: readonly Int16Array[];
  readonly byteTables: readonly Int8Array[];
  /** f.b:[[I] (#238) -- mainArrays.bColors, the two 12-colour palettes. */
  readonly colors: readonly Int32Array[];
  /** f.c:[[B] (#262) and f.b:[[B] (#242) -- gridC (occupants) and gridB (terrain). */
  readonly gridC: readonly Int8Array[];
  readonly gridB: readonly Int8Array[];
  /** f.e:[B] (#286). */
  readonly dense: Int8Array;
  /** f.a(int,int) (#447): 0 visible, 1 explored, 2 unexplored. */
  readonly occupancyClass: (x: number, y: number) => number;
  /** b(III) (#535), the sprite primitive, drawing into Graphics[N]. */
  readonly drawSprite: (graphicsIndex: number, record: number, x: number, y: number) => void;
  /** f.c:S (#254) / f.d:S (#266). */
  readonly mapWidth: number;
  readonly mapHeight: number;
  /** f.W:I (#111), f.X:I (#114), f.aL:I (#160). */
  readonly W: number;
  readonly X: number;
  readonly aL: number;
  /** f.af:I (#192) / f.ag:I (#194): the scroll direction, -1/0/1. */
  readonly af: number;
  readonly ag: number;
  /** f.aM:I (#161) / f.aN:I (#162): written by C(), read by D(). */
  size: { aM: number; aN: number };
};

/** f.<clinit> offsets 28..35: `ag:B = 40`, `ah:B = 60`. */
const MAX_COLUMNS = 40;
const MAX_ROWS = 60;
const PANEL_ROW = 1181;
/** Offsets 182..186 of e(int,int): unexplored tiles. */
const UNEXPLORED = 6049325;

/** e(int,int): the colour of tile (x, y), or -1. */
export function legacyMapOverviewColor(input: LegacyMapOverviewInput, x: number, y: number): number {
  const cls = input.occupancyClass(x, y);
  if (cls === 2) return UNEXPLORED;
  const palette = input.colors[cls];
  const cell = input.gridC[y]?.[x] ?? 0;
  let color = -1;
  if (cell > 0) {
    const team = legacyEntityPartition(cell);
    // Offsets 28..94: an enemy (team 1) with 7979 bit 2 is left to the terrain.
    color = team === 1 && ((input.dense[UNIT_FLAGS + cell] ?? 0) & 2) !== 0 ? -1 : (palette?.[team + 6] ?? 0);
  } else if (cell < 0) {
    // Offsets 100..133: b(int) -- records -1..-30 team 0, -31..-60 team 1, else 2.
    const team = cell <= -1 && cell >= -30 ? 0 : cell <= -31 && cell >= -60 ? 1 : 2;
    color = palette?.[team + 9] ?? 0;
  }
  if (color === -1) {
    const terrain = (input.gridB[y]?.[x] ?? 0) & 255;
    color = palette?.[input.packedBytes[(input.packedOffsets[194] ?? 0) + terrain] ?? 0] ?? 0;
  }
  return color;
}

/** helper #437: fillRect at +11/+8, which the callers' -11/-8 cancel. */
function fillCell(g: Graphics, color: number, x: number, y: number, width: number, height: number): void {
  g.setColor(color);
  g.fillRect(x, y, width, height);
}

/** private void C(): the whole overview window, run-length filled per row. */
export function drawLegacyMapOverview(input: LegacyMapOverviewInput): void {
  const aM = input.mapWidth > MAX_COLUMNS ? MAX_COLUMNS : input.mapWidth;
  const aN = input.mapHeight > MAX_ROWS ? MAX_ROWS : input.mapHeight;
  input.size.aM = aM;
  input.size.aN = aN;
  const g = input.graphics[1];
  input.drawSprite(1, (input.shortTables[1]?.[PANEL_ROW] ?? 0) & 4095, -11, -8);
  if (!g) return;

  // Offsets 75..253: i1 = run colour, i2/i3 = run start, i4 = run length.
  let runX = 0;
  let runY = 0;
  let runLength = 0;
  let flush = false;
  let color = -1;
  for (let row = 0; row < aN; row += 1) {
    runX = 0;
    let runColor = -1;
    for (let column = 0; column <= aM; column += 1) {
      if (column === aM) flush = true;
      else color = legacyMapOverviewColor(input, input.W + column, input.X + row);
      if (!flush && color === runColor) {
        runLength += 1;
        continue;
      }
      if (runLength > 0) {
        fillCell(g, runColor, runX * 5, (input.aL + runY) * 4, runLength * 5, 4);
        runLength = 0;
      }
      if (flush) {
        flush = false;
        continue;
      }
      runColor = color;
      runX = column;
      runY = row;
      runLength = 1;
    }
  }
}

/** private void D(): the scroll update run by c()'s aD 14 when W/X moved. */
export function stepLegacyMapOverviewScroll(input: LegacyMapOverviewInput): void {
  const b1 = input.shortTables[1];
  const j = input.byteTables;
  const packed = b1?.[PANEL_ROW] ?? 0;
  const dy = ((packed >> 12) & 3) << 7;
  const record = packed & 4095;
  const panelX = j[1]?.[PANEL_ROW] ?? 0;
  const panelY = j[2]?.[PANEL_ROW] ?? 0;
  const { af, ag } = input;
  const t148 = (index: number) => input.packedBytes[(input.packedOffsets[148] ?? 0) + index] ?? 0;

  // Offsets 0..76: N = M (0); the panel sprite into Graphics[0].
  input.drawSprite(0, record, 120 + panelX + 11, 160 + panelY + 8 + dy);

  // Offsets 79..274: helper #435 copies the old overview from Image[c[1]]
  // shifted one cell against the scroll; its exception is swallowed.
  const source = input.images[input.imageSlots[1] ?? 0];
  const g0 = input.graphics[0];
  if (source && g0) {
    try {
      g0.drawRegion(
        source,
        Math.trunc((af + 1) / 2) * 5,
        Math.trunc((ag + 1) / 2) * 4,
        (j[23]?.[record] ?? 0) * 5 - 5 * t148(af + 1) - 44,
        (j[24]?.[record] ?? 0) * 5 - 4 * t148(ag + 1) - 32,
        0,
        131 + panelX + Math.trunc((1 - af) / 2) * 5,
        168 + panelY + Math.trunc((1 - ag) / 2) * 4 + dy,
        0,
      );
    } catch {
      // #435 returns false.
    }
  }

  // Offsets 275..337: copy it back into Image[c[1]].
  const g1 = input.graphics[input.imageSlots[1] ?? 0];
  const screen = input.images[input.imageSlots[0] ?? 0];
  if (g1 && screen) g1.drawImage(screen, -(120 + panelX + 11), -(160 + panelY + 8 + dy), 0);

  // Offsets 340..586: N = 1; paint the newly exposed column (ag == 0) or row (af == 0).
  const g = input.graphics[1];
  if (!g) return;
  const { aM, aN } = input.size;
  let column = ((af + 1) >> 1) * (aM - 1);
  let row = ((ag + 1) >> 1) * (aN - 1);
  if (ag === 0) {
    fillCell(g, 11180356, column * 5, row, 5, MAX_ROWS * 4);
    for (row = 0; row < aN; row += 1) {
      fillCell(g, legacyMapOverviewColor(input, input.W + column, input.X + row), column * 5, (input.aL + row) * 4, 5, 4);
    }
  } else if (af === 0) {
    for (column = 0; column < aM; column += 1) {
      fillCell(g, legacyMapOverviewColor(input, input.W + column, input.X + row), column * 5, (input.aL + row) * 4, 5, 4);
    }
  }
}
