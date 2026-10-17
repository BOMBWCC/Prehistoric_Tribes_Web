import { LegacyResourceTables } from "../platform/LegacyResourceTables";
import type { ZhToken } from "./LegacyZhText";

export type GeometryDecoderHooks = {
  /** c.a(IIIII) offsets 452..487: record 97 (the score title) also draws f.a(III) composites 1041 and 1047. */
  readonly onRecord97?: (firstRecord: number, firstX: number, secondRecord: number, secondX: number, y: number) => void;
};

/** Direct storage-level port of c.a(int,int,int,int,int). */
/** Chinese labels (LegacyZhText.ts): the tokens for an /s record, and a token line's width. */
export type GeometryZh = {
  readonly tokens: (record: number) => readonly ZhToken[] | null;
  readonly width: (tokens: readonly ZhToken[], font: number) => number;
};

export class LegacyGeometryDecoder {
  private tableByte = 0;
  /** Set while the language is Chinese. */
  zh: GeometryZh | null = null;

  constructor(
    private readonly packedBytes: Int8Array,
    private readonly packedOffsets: Int16Array,
    private readonly tables: LegacyResourceTables,
    private readonly hooks: GeometryDecoderHooks = {},
  ) {}

  setTableByte(value: number): void {
    this.tableByte = signedByte(value);
  }

  get activeRows(): number {
    return this.tableByte;
  }

  /**
   * c.a(Graphics)'s tail (offset 624): only a:B (the HUD row count) goes
   * back to 0. CORRECTED 2026-09-28: this also cleared all 33 rows and the
   * floating-text ring cursor every frame, erasing c.b()'s texts; rows
   * 13..32 and b/c are reset only by c.a() (stepLegacyClassCReset).
   */
  reset(): void {
    this.tableByte = 0;
  }

  decodeRecord(x: number, mode: number, width: number, record: number, value: number, zhTokens?: readonly ZhToken[]): number {
    // c.b:B (#33) is the floating-text ring's end cursor (tables.cBByte);
    // this used a private copy until 2026-09-28, so the ring drawn by
    // c.a(int,int,int) (drawLegacyCScan, which reads cBByte) never grew.
    const row = mode === -100 ? 13 + this.tables.cBByte : this.tableByte;
    if (row < 0 || row >= 33) throw new RangeError(`Geometry row ${row} is outside c's 33 rows`);
    if (row >= 13 && this.tables.rowFShort[row] !== 0) return row;
    if (record < 0 || record + 1 >= this.tables.smallOffsets.length) {
      throw new RangeError(`Geometry record ${record} is outside c's 230 offsets`);
    }

    const start = this.tables.smallOffsets[record];
    const end = this.tables.smallOffsets[record + 1];
    const length = end - start;
    if (start < 0 || end > this.tables.smallBytes.length || length < 0) {
      throw new RangeError("Geometry source offsets are invalid");
    }
    let multiplier = value;
    this.tables.rowDByte[row] = signedByte(length);
    this.tables.rowEByte[row] = signedByte(value);
    this.tables.rowEShort[row] = signedShort(mode);
    if (row >= 13) {
      multiplier = 1;
      this.tables.rowEShort[row] = 0;
    }
    this.tables.rowDShort[row] = signedShort((length - 1) * multiplier);
    this.tables.rowFShort[row] = signedShort(x);

    const quotientRow = this.tables.geometryC[row];
    const remainderRow = this.tables.geometryB[row];
    // c.a(int,int,int,int,int) offsets 163..449 (bytecode/c-javap.txt line
    // 575). Local 5 is already 1 for rows >= 13, so the glyph table is
    // a_s[281 + multiplier]. CORRECTED 2026-10-01 against offsets 200..438:
    // '~' subtracts 2*multiplier + 2; a glyph adds only its width; and the
    // width counts when quotient != 0 or remainder < 14 (it was >= 14, which
    // mis-sized and so mis-centred every menu line).
    const stepBase = this.readPackedOffset(281 + multiplier);
    for (let index = 0; index < length; index += 1) {
      const raw = this.tables.smallBytes[start + index];
      if (raw === 126) {
        quotientRow[index] = 126;
        this.tables.rowDShort[row] = signedShort(this.tables.rowDShort[row] - (multiplier * 2 + 2));
        continue;
      }
      const quotient = javaDivide(raw, 30);
      const remainder = javaRemainder(raw, 30);
      quotientRow[index] = signedByte(quotient);
      remainderRow[index] = signedByte(remainder);
      if (quotient !== 0 || remainder < 14) {
        const glyphOffset = stepBase + quotient * 21 + remainder;
        const glyphWidth = (this.readPacked(glyphOffset + 1) & 0xff) - (this.readPacked(glyphOffset) & 0xff);
        this.tables.rowDShort[row] = signedShort(this.tables.rowDShort[row] + glyphWidth);
      }
    }
    // Offsets 452..487 test the record argument after the loop. CORRECTED 2026-10-15 (pixel
    // comparison, play26 frame 72500): this tested each byte for 97 and was never wired, so the score
    // screen lacked the two tribe emblems beside SCORE.
    if (record === 97) this.hooks.onRecord97?.(1041, 26, 1047, 211, mode - 2);

    if (row < 13) {
      // Chinese: the row draws its tokens instead of glyphs and lays out (centring, the segment
      // chain) with their width; the glyph bytes stay as decoded.
      const zh = zhTokens ?? this.zh?.tokens(record) ?? null;
      this.tables.rowZh[row] = zh;
      if (zh && this.zh) this.tables.rowDShort[row] = signedShort(this.zh.width(zh, multiplier) - multiplier);
      this.tables.rowFShort[row] = signedShort(
        this.tables.rowFShort[row] - Math.trunc((this.tables.rowDShort[row] * width) / 2),
      );
      this.tableByte = signedByte(this.tableByte + 1);
    } else {
      this.tables.cBByte = signedByte(this.tables.cBByte + 1);
      if (this.tables.cBByte >= 20) this.tables.cBByte = 0;
    }
    return row;
  }

  decodeSegments(x: number, mode: number, width: number, first: number, second: number, third: number, value: number): void {
    let distance = 0;
    let firstRow = 0;
    let lastRow = 0;
    if (first >= 0) {
      firstRow = this.decodeRecord(x, mode, 0, first, value);
      lastRow = firstRow;
      distance = this.tables.rowDShort[firstRow] + 1;
    }
    if (second >= 0) {
      const row = this.decodeRecord(x + distance, mode, 0, second, value);
      lastRow = row;
      distance += this.tables.rowDShort[row] + 1;
    }
    if (third >= 0) {
      const row = this.decodeRecord(x + distance, mode, 0, third, value);
      lastRow = row;
      distance += this.tables.rowDShort[row];
    }
    while (lastRow < this.tableByte) {
      this.tables.rowFShort[lastRow] = signedShort(
        this.tables.rowFShort[lastRow] - Math.trunc((distance * width) / 2),
      );
      lastRow += 1;
    }
  }

  /**
   * Exact c.b() (bytecode/c-javap.txt 1365, offsets 0..280), called first
   * thing in b.s() each frame: ages the floating-text rows 13 + c:B up to
   * 13 + b:B (the rise e[k] += e[k]/4 + 1; at 15 the row is freed and c:B
   * moves on, wrapping at 20), then for every entity with a pending value in
   * c.f:[B (the strike gate's hit-point mirror), on its turn every third
   * frame, queues "+n"/"n" above it (style 2 for gains, 1 ours, 0 enemies)
   * and clears the value. Ported 2026-09-28 -- until then no damage number
   * was ever shown.
   */
  stepFloatingTexts(frame: number): void {
    const t = this.tables;
    let k = 13 + t.cCByte;
    while (k !== 13 + t.cBByte) {
      t.rowEShort[k] = signedShort(t.rowEShort[k] + Math.trunc(t.rowEShort[k] / 4) + 1);
      if (t.rowEShort[k] >= 15) {
        t.rowFShort[k] = 0;
        t.cCByte = signedByte(t.cCByte + 1);
        if (t.cCByte >= 20) t.cCByte = 0;
      }
      if (k === 32) k = 12;
      k += 1;
    }
    for (k = 0; k < 122; k += 1) {
      const value = t.rowFByte[k];
      if (value !== 0 && k % 3 === frame % 3) {
        this.queueTextWithWidth(k, -100, 0, (value > 0 ? "+" : "") + value, value > 0 ? 2 : k <= 50 ? 1 : 0);
        t.rowFByte[k] = 0;
      }
    }
  }

  /**
   * Direct mirror of c.a(int,int,int,String,int): copy characters through the
   * original /a[280] glyph table into temporary record 228, then decode it
   * through the same compact-geometry path as every other glyph record.
   */
  queueText(x: number, mode: number, text: string, value: number): number {
    return this.queueTextWithWidth(x, mode, 0, text, value);
  }

  /** c.a(int,int,int,String,int), retaining the caller's third width/style field. */
  queueTextWithWidth(x: number, mode: number, width: number, text: string, value: number): number {
    const start = this.tables.smallOffsets[228];
    const base = this.readPackedOffset(280);
    if (start < 0 || start + text.length > this.tables.smallBytes.length) {
      throw new RangeError("Text glyph record 228 exceeds c's small byte buffer");
    }
    for (let index = 0; index < text.length; index += 1) {
      const glyphIndex = base + text.charCodeAt(index);
      this.tables.smallBytes[start + index] = this.readPacked(glyphIndex);
    }
    this.tables.smallOffsets[229] = signedShort(start + text.length);
    return this.decodeRecord(x, mode, width, 228, value);
  }

  /** A Chinese-only label (the Q14 "中文" row): an empty record 228 drawn as `tokens`. */
  queueZhLabel(x: number, mode: number, width: number, tokens: readonly ZhToken[], value: number): number {
    this.tables.smallOffsets[229] = this.tables.smallOffsets[228];
    return this.decodeRecord(x, mode, width, 228, value, tokens);
  }

  private readPackedOffset(index: number): number {
    if (index < 0 || index >= this.packedOffsets.length) {
      throw new RangeError(`Packed offset ${index} is outside f.a's 312 offsets`);
    }
    return this.packedOffsets[index];
  }

  readPacked(index: number): number {
    if (index < 0 || index >= this.packedBytes.length) throw new RangeError("Packed byte index outside f.a");
    return this.packedBytes[index];
  }
}

function signedByte(value: number): number {
  const narrowed = value & 0xff;
  return narrowed >= 0x80 ? narrowed - 0x100 : narrowed;
}


function javaDivide(value: number, divisor: number): number {
  return Math.trunc(value / divisor);
}

function javaRemainder(value: number, divisor: number): number {
  return value - javaDivide(value, divisor) * divisor;
}

function signedShort(value: number): number {
  const narrowed = value & 0xffff;
  return narrowed >= 0x8000 ? narrowed - 0x10000 : narrowed;
}
