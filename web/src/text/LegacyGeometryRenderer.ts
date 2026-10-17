import { LegacyResourceTables } from "../platform/LegacyResourceTables";
import { Graphics } from "../platform/Graphics";
import { ImagePack } from "../platform/ImagePack";
import type { ZhToken } from "./LegacyZhText";

export type GeometryDrawCommand = {
  readonly imageGroup: 0;
  readonly imageIndex: number;
  readonly sourceX: number;
  readonly sourceY: number;
  readonly width: number;
  readonly height: number;
  readonly x: number;
  readonly y: number;
  readonly anchor: 20;
};

/** Command producer mirroring c.a(Graphics); it does not assign gameplay meaning. */
export class LegacyGeometryRenderer {
  /** Set while the language is Chinese: draws a row's tokens with its pen at (m, n) (LegacyZhText.ts). */
  zhPaint: ((graphics: Graphics, imageGroup0: ImagePack, font: number, tokens: readonly ZhToken[], m: number, n: number) => void) | null = null;

  constructor(
    private readonly packedBytes: Int8Array,
    private readonly packedOffsets: Int16Array,
    private readonly tables: LegacyResourceTables,
    private readonly activeRows: () => number,
  ) {}

  emit(): GeometryDrawCommand[] {
    const commands: GeometryDrawCommand[] = [];
    // c.p is a field, not a per-row local; f.a(Graphics) carries the
    // previous segment width into the next geometry row.
    let previousO = 0;
    for (let row = 0; row < this.activeRows(); row += 1) {
      if (this.tables.rowZh[row]) continue;
      let m = this.tables.rowFShort[row];
      const length = this.tables.rowDByte[row];
      for (let index = 0; index < length; index += 1) {
        const geometryC = this.tables.geometryC[row][index];
        const geometryB = this.tables.geometryB[row][index];
        if (geometryC === 126) {
          m -= this.tables.rowEByte[row] + 2;
          continue;
        }
        const frame = this.tables.rowEByte[row];
        const stepBase = this.offset(281 + frame);
        const glyphOffset = stepBase + geometryC * 21 + (geometryB & 0xff);
        const o = (this.byteAt(glyphOffset + 1) & 0xff) - (this.byteAt(glyphOffset) & 0xff);
        let n = this.tables.rowEShort[row];
        let q = m;
        if (geometryC === 0 && geometryB >= 14) {
          n -= this.byteAt(this.offset(285) + geometryB - 14);
          q -= javaDivide(o + previousO, 2);
        }
        commands.push({
          imageGroup: 0,
          imageIndex: 25 + frame,
          sourceX: this.byteAt(glyphOffset) & 0xff,
          sourceY: this.byteAt(this.offset(284) + frame * 3 + geometryC),
          width: o,
          height: this.byteAt(this.offset(283) + frame * 3 + geometryC) & 0xff,
          x: 11 + q,
          y: 8 + n,
          anchor: 20,
        });
        if (geometryC !== 0 || geometryB < 14) m += o + frame;
        previousO = o;
      }
    }
    return commands;
  }

  /** Execute the original drawRegion wrapper semantics against image group 0. */
  renderTo(graphics: Graphics, imageGroup0: ImagePack): void {
    for (const command of this.emit()) {
      const image = imageGroup0.get(command.imageIndex)?.image;
      if (!image) continue;
      try {
        graphics.drawRegion(
          image,
          command.sourceX,
          command.sourceY,
          command.width,
          command.height,
          0,
          command.x,
          command.y,
          command.anchor,
        );
      } catch {
        // f.a(Graphics, Image, …) catches the underlying J2ME draw exception.
      }
    }
    if (!this.zhPaint) return;
    for (let row = 0; row < this.activeRows(); row += 1) {
      const tokens = this.tables.rowZh[row];
      if (tokens) this.zhPaint(graphics, imageGroup0, this.tables.rowEByte[row], tokens, this.tables.rowFShort[row], this.tables.rowEShort[row]);
    }
  }

  private offset(index: number): number {
    if (index < 0 || index >= this.packedOffsets.length) throw new RangeError(`Packed offset ${index} is outside f.a`);
    return this.packedOffsets[index];
  }

  private byteAt(index: number): number {
    if (index < 0 || index >= this.packedBytes.length) throw new RangeError(`Packed byte ${index} is outside f.a`);
    return this.packedBytes[index];
  }

}

function javaDivide(value: number, divisor: number): number {
  return Math.trunc(value / divisor);
}
