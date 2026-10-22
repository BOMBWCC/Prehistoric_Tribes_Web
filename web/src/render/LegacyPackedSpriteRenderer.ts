import { Anchor } from "../platform/anchors";
import type { Graphics } from "../platform/Graphics";
import type { ImagePack } from "../platform/ImagePack";
import { hdArt } from "./HdArt";

export type LegacyPackedSpriteInput = {
  readonly shortTables: readonly Int16Array[];
  readonly byteTables: readonly Int8Array[];
  readonly imageGroups: readonly (ImagePack | undefined)[];
  readonly graphics: Graphics;
  /** Original f.an; -1 means no alternate image-family remap. */
  readonly an?: number;
  /** The HD wide view (render/HdArt.ts): only pieces of these sheets are drawn. */
  readonly onlySheets?: ReadonlySet<number>;
};

/**
 * Port of f.a(int,int,int) and its private b(int,int,int) sprite primitive.
 * Table indexes and bit masks intentionally retain the original layout.
 */
export class LegacyPackedSpriteRenderer {
  private readonly input: LegacyPackedSpriteInput;
  private readonly b: readonly Int16Array[];
  private readonly j: readonly Int8Array[];

  constructor(input: LegacyPackedSpriteInput) {
    this.input = input;
    this.b = input.shortTables;
    this.j = input.byteTables;
  }

  drawComposite(index: number, x: number, y: number): void {
    const descriptor = this.b[9]?.[index] ?? 0;
    const base = descriptor & 0x1fff;
    const family = (descriptor >>> 14) & 3;
    if (family !== 0) this.drawSprite((family - 1) * 3 + 1, x, y);

    const entries = (this.j[16]?.[index] ?? 0) & 63;
    for (let cursor = base; cursor < base + entries; cursor += 1) {
      const entry = this.b[10]?.[cursor] ?? 0;
      const imageIndex = entry & 0x1fff;
      const offsetX = ((entry >>> 14) & 3) << 7;
      const dx = x + signed(this.j[18]?.[cursor] ?? 0) + offsetX;
      const dy = y + signed(this.j[19]?.[cursor] ?? 0);
      if ((entry & 0x2000) === 0) this.drawSprite(imageIndex, dx, dy);
      else this.drawComposite(imageIndex, dx, dy);
    }
  }

  /**
   * paint()'s family, a(Graphics,III) #436 -> b(Graphics,III) #537 (bytecode/f-javap.txt 8333..8611):
   * the same piece walk minus #439's family prefix, and pieces drawn with no +11/+8 shift, no `an`
   * remapping, signed j[22..24] and setColor(0) for the vector types. ADDED 2026-10-15: paint()'s
   * three calls (records 556/524/528) used #439, so the HUD's edge strips sat 11 px right and 8 px
   * low -- the extra dark lines under the top bar and over the bottom bar (user report).
   */
  drawCompositeUnshifted(index: number, x: number, y: number): void {
    const descriptor = this.b[9]?.[index] ?? 0;
    const base = descriptor & 0x1fff;
    const entries = (this.j[16]?.[index] ?? 0) & 63;
    for (let cursor = base; cursor < base + entries; cursor += 1) {
      const entry = this.b[10]?.[cursor] ?? 0;
      const piece = entry & 0x1fff;
      const dx = x + signed(this.j[18]?.[cursor] ?? 0) + (((entry >>> 14) & 3) << 7);
      const dy = y + signed(this.j[19]?.[cursor] ?? 0);
      if ((entry & 0x2000) === 0) this.drawSpriteUnshifted(piece, dx, dy);
      else this.drawCompositeUnshifted(piece, dx, dy);
    }
  }

  private drawSpriteUnshifted(index: number, x: number, y: number): void {
    if (index === 0) return;
    const type = unsigned(this.j[20]?.[index] ?? 0) & 31;
    const sx = unsigned(this.j[21]?.[index] ?? 0) & 127;
    const sy = signed(this.j[22]?.[index] ?? 0);
    const width = signed(this.j[23]?.[index] ?? 0);
    const height = signed(this.j[24]?.[index] ?? 0);
    const graphics = this.input.graphics;
    try {
      if (type === 27) { graphics.setColor(0); graphics.drawLine(x + sx, y + sy, x + width, y + height); return; }
      if (type === 28) { graphics.setColor(0); graphics.drawRect(x + sx, y + sy, width, height); return; }
      // #437 adds the 11/8 back that these subtract.
      if (type === 29) { graphics.setColor(0); graphics.fillRect(x + sx, y + sy, width, height); return; }
      if (type === 30) { graphics.setColor(0); graphics.fillRect(x + sx * 4, y + sy * 4, width * 4, height * 4); return; }
      const image = this.input.imageGroups[0]?.get(type)?.image;
      if (image) graphics.drawRegion(image, sx, sy, width, height, 0, x, y, Anchor.LEFT | Anchor.TOP);
    } catch {
      // offsets 19..354 are inside a catch-all (handler 355).
    }
  }

  drawSprite(index: number, x: number, y: number): void {
    if (index === 0) return;
    const rawType = unsigned(this.j[20]?.[index] ?? 0);
    let type = rawType & 31;
    let remapped = false;
    const an = this.input.an ?? -1;
    if (an > -1) {
      if (an === 0 && type === 5) { type = 0; remapped = true; }
      else if (an === 4 && type === 14) { type = 4; remapped = true; }
      else if (an === 4 && type === 15) { type = 5; remapped = true; }
      // offsets 108..121: any other `an` turns piece type 9 (the hair) into Image[1][an]. CORRECTED
      // 2026-10-15 (pixel comparison, play26 frame 75000): this read `an === 9`, so all hair was black.
      else if (an !== 0 && an !== 4 && type === 9) { type = an; remapped = true; }
    }

    if (this.input.onlySheets && !this.input.onlySheets.has(type)) return;
    const sx = unsigned(this.j[21]?.[index] ?? 0) & 127;
    const sy = unsigned(this.j[22]?.[index] ?? 0);
    const width = unsigned(this.j[23]?.[index] ?? 0);
    const height = unsigned(this.j[24]?.[index] ?? 0);
    if (type < 27) {
      const group = remapped ? 1 : 0;
      const image = this.input.imageGroups[group]?.get(type)?.image;
      if (!image) return;
      // The HD wide view (render/HdArt.ts): this piece's HD picture, if there is one.
      if (hdArt.active && hdArt.drawPiece(this.input.graphics, index, type, remapped, image, sx, sy, width, height, x + 11, y + 8)) return;
      this.input.graphics.drawRegion(image, sx, sy, width, height, 0, x + 11, y + 8, Anchor.LEFT | Anchor.TOP);
      return;
    }
    // CORRECTION (2026-09-09, same day): class f has TWO parallel families of
    // these methods, and the first pass at this block mixed them:
    //
    //   a(III)#439        -> b(III)#535          -- what THIS port models:
    //     `b(III)` offsets 19..22 are `iinc 2, 11; iinc 3, 8`, so x/y are
    //     shifted ONCE at entry and every branch below works in that shifted
    //     space. It also carries the `an` remapping (offsets 35..124) and the
    //     j[17] palette lookup (offsets 263..358). `m()`, `o()`, `p()`, `q()`
    //     and the entity draws all call #439.
    //   a(Graphics,III)#436 -> b(Graphics,III)#537 -- paint()'s variant:
    //     no entry shift, no remapping, and a literal `setColor(0)`.
    //
    // This port's `drawSprite` has both the +11/+8 and the `an` remapping, so
    // it is the #535 family; the palette below belongs to it, and so does the
    // shift on every branch.
    const paletteIndex = ((rawType & 255) >> 5) | ((unsigned(this.j[21]?.[index] ?? 0) & 128) >> 4);
    const palette = this.j[17];
    this.input.graphics.setColorRgb(
      unsigned(palette?.[paletteIndex * 3 + 0] ?? 0),
      unsigned(palette?.[paletteIndex * 3 + 1] ?? 0),
      unsigned(palette?.[paletteIndex * 3 + 2] ?? 0),
    );
    const shiftedX = x + 11;
    const shiftedY = y + 8;
    if (type === 27) {
      // Offsets 368..426: `d(Graphics, x + sx, y + sy, x + width, y + height)`
      // on the already-shifted x/y. `d` (#574) is a bare passthrough to
      // Graphics.drawLine(IIII), which takes two POINTS.
      //
      // BUG FIX (2026-09-09): `width`/`height` used to be passed straight
      // through as the second pair, so the line ran from the sprite back
      // toward the canvas origin -- the long diagonal streaks over the
      // tutorial map's building. (The first attempt at this fix also dropped
      // the +11/+8, which was wrong: #535 applies it at entry, not per call.)
      this.input.graphics.drawLine(shiftedX + sx, shiftedY + sy, shiftedX + width, shiftedY + height);
      return;
    }
    if (type === 28) {
      // Offsets 434..488: `b(Graphics, x + sx, y + sy, width, height)`, `b`
      // (#536) being a bare passthrough to drawRect.
      this.input.graphics.drawRect(shiftedX + sx, shiftedY + sy, width, height);
      return;
    }
    if (type === 29) {
      // Offsets 496..556: `a(Graphics, x + sx - 11, y + sy - 8, w, h)` on the
      // shifted x/y, and `a` (#437) adds 11/8 back. Net: `shiftedX + sx`.
      //
      // BUG FIX (2026-09-09): this read `x + sx`, i.e. it cancelled #437's
      // shift against the literal -11/-8 but forgot that `b(III)`'s own entry
      // shift is still in there. Every type-29 fill landed 11px left and 8px
      // up. Same for type 30 below.
      this.input.graphics.fillRect(shiftedX + sx, shiftedY + sy, width, height);
      return;
    }
    if (type === 30) {
      // Offsets 564..632: the same #437 with every value scaled by 4.
      this.input.graphics.fillRect(shiftedX + sx * 4, shiftedY + sy * 4, width * 4, height * 4);
    }
  }
}

function unsigned(value: number): number {
  return value & 0xff;
}

function signed(value: number): number {
  const normalized = value & 0xff;
  return normalized >= 128 ? normalized - 256 : normalized;
}
