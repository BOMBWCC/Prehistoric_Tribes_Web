/**
 * Simplified Chinese (added 2026-10-15 at the user's request; not in the original JAR).
 *
 * The strings come from docs/translation-zh-CN.json (imported by main.ts), keyed by the original record index of
 * /N/s (labels), /N/t and /N/d0 (paragraphs). Chinese runs on language 0's English tables: every
 * original layout and gameplay path keeps reading those bytes, and only the text drawing (and the
 * widths it lays out with) switches to these strings. ASCII inside a Chinese string still maps
 * through /a[280] to the original markers -- glyphs, icons (90..112), stats cells (> 112), the
 * '&' line break (127) and '=' (126) -- so it keeps the original bitmap font; only characters
 * the font lacks are drawn as pixel text in the font's colours.
 */
import type { Graphics } from "../platform/Graphics";
import type { ImagePack } from "../platform/ImagePack";

/** f.a:B for Chinese: one past the JAR's five languages (Q14 rows 0..4). */
export const ZH_LANGUAGE = 5;
/** The Q14 row added for it. */
export const ZH_LANGUAGE_NAME = "中文";

type TranslationRecord = { readonly i: number; readonly en: string; readonly zh: string };
/** The shape of docs/translation-zh-CN.json (main.ts imports it and hands it to the runtime). */
export type ZhTranslationFile = {
  readonly s: readonly TranslationRecord[];
  readonly t: readonly TranslationRecord[];
  readonly d0: readonly TranslationRecord[];
};

function byIndex(records: readonly TranslationRecord[]): readonly (string | null)[] {
  const out: (string | null)[] = [];
  for (const record of records) out[record.i] = record.zh === record.en ? null : record.zh;
  return out;
}

/** The strings by original record index; null where Chinese is the same as the original (names). */
export class ZhStrings {
  private readonly s: readonly (string | null)[];
  private readonly t: readonly (string | null)[];
  private readonly d0: readonly (string | null)[];

  constructor(file: ZhTranslationFile) {
    this.s = byIndex(file.s);
    this.t = byIndex(file.t);
    this.d0 = byIndex(file.d0);
  }

  /** /s record `record`. */
  label(record: number): string | null {
    return this.s[record] ?? null;
  }

  /** Large-view record `record`: /t below 71, /d0 from 71 on (c.b(2) loads d0 at record 71). */
  paragraph(record: number): string | null {
    return (record < 71 ? this.t[record] : this.d0[record - 71]) ?? null;
  }
}

/** One original marker byte, or a run of characters the bitmap font does not have. */
export type ZhToken = { readonly marker: number; readonly text?: undefined } | { readonly text: string; readonly marker?: undefined };

export function tokenizeZh(text: string, translate: (code: number) => number): ZhToken[] {
  const tokens: ZhToken[] = [];
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    // /a[280] maps what the font lacks ('(', ')', '"', ...) to 0, the 'A' glyph: draw those as text.
    const inFont = code < 128 && (code < 32 || code === 65 || code === 97 || translate(code) !== 0);
    tokens.push(inFont ? { marker: translate(code) } : { text: char });
  }
  return tokens;
}

/** Glyph geometry of the original font `font` (image 25 + font), as c.a(Graphics,int) reads it. */
export type ZhGlyphTables = { readonly packedBytes: Int8Array; readonly packedOffsets: Int16Array };

export function glyphWidth(tables: ZhGlyphTables, font: number, marker: number): number {
  const { packedBytes: p, packedOffsets: o } = tables;
  const offset = o[281 + font] + Math.trunc(marker / 30) * 21 + (marker % 30);
  return (p[offset + 1] & 0xff) - (p[offset] & 0xff);
}

/** How far a token moves the pen, the way the original advances `glyph width + font`. */
export function tokenAdvance(tables: ZhGlyphTables, font: number, token: ZhToken, textWidth: (text: string) => number): number {
  if (token.text !== undefined) return textWidth(token.text) + font;
  const marker = token.marker;
  if (marker === 126) return -(font + 2);
  if (marker === 127 || marker > 112) return 0;
  if (marker >= 90) return 15 + font;
  const block = Math.trunc(marker / 30);
  if (block === 0 && marker % 30 >= 14) return 0; // accents do not advance
  return glyphWidth(tables, font, marker) + font;
}

export function tokensWidth(tables: ZhGlyphTables, font: number, tokens: readonly ZhToken[], textWidth: (text: string) => number): number {
  let width = 0;
  for (const token of tokens) width += tokenAdvance(tables, font, token, textWidth);
  return width;
}

// Characters a line should not start with.
const CLOSING = new Set(Array.from("，。、；：？！）》」』”’…—"));
const isSpace = (token: ZhToken) => token.marker === 42;

/**
 * Greedy wrap to `width`: a line may break before a Chinese character (not a closing mark),
 * between Chinese and ASCII, after a space or after the original's own break markers 70/73/78;
 * 127 forces a break. Each line's width excludes trailing spaces (it is what centring uses).
 */
export function wrapZh(
  tables: ZhGlyphTables,
  font: number,
  tokens: readonly ZhToken[],
  width: number,
  textWidth: (text: string) => number,
): { tokens: ZhToken[]; width: number }[] {
  const lines: { tokens: ZhToken[]; width: number }[] = [];
  const emit = (line: ZhToken[]) => {
    let end = line.length;
    while (end > 0 && isSpace(line[end - 1]!)) end -= 1;
    lines.push({ tokens: line, width: tokensWidth(tables, font, line.slice(0, end), textWidth) });
  };
  let line: ZhToken[] = [];
  let lineWidth = 0;
  let breakAt = -1;
  for (const token of tokens) {
    if (token.marker === 127) { emit(line); line = []; lineWidth = 0; breakAt = -1; continue; }
    const previous = line[line.length - 1];
    const canBreakBefore = line.length > 0 && (
      (token.text !== undefined && !CLOSING.has(token.text)) ||
      (token.text === undefined && previous?.text !== undefined && !isSpace(token)) ||
      (previous !== undefined && (isSpace(previous) || previous.marker === 70 || previous.marker === 73 || previous.marker === 78)));
    if (canBreakBefore) breakAt = line.length;
    const advance = tokenAdvance(tables, font, token, textWidth);
    if (lineWidth + advance > width && breakAt > 0) {
      const rest = line.splice(breakAt);
      emit(line);
      line = rest;
      lineWidth = tokensWidth(tables, font, line, textWidth);
      breakAt = -1;
    }
    line.push(token);
    lineWidth += advance;
  }
  if (line.length > 0) emit(line);
  return lines;
}

/** What drawing a token line needs besides the tokens. */
export type ZhPaint = ZhGlyphTables & {
  readonly imageGroup0: ImagePack;
  readonly painter: ZhPainter;
  /** An icon (marker 90..112): f.a(560 + marker - 90, x, y - 1) in the caller's coordinates. */
  readonly onIcon?: (record: number, x: number, y: number) => void;
  /** A stats cell (marker > 112), drawn by the caller at the line's y. */
  readonly onStat?: (marker: number, y: number) => void;
};

/**
 * Draw one token line with its pen at (m, n) in the original's pre-offset coordinates: glyphs at
 * (11 + m, 8 + n) exactly as c.a(Graphics,int) places them, pixel text at the same spot.
 */
export function paintZhLine(graphics: Graphics, paint: ZhPaint, font: number, tokens: readonly ZhToken[], m: number, n: number): void {
  const { packedBytes: p, packedOffsets: o } = paint;
  for (const token of tokens) {
    // Characters are drawn one by one at the pen, so drawing advances exactly as wrapZh measured.
    if (token.text !== undefined) {
      paint.painter.draw(graphics, token.text, 11 + m, 8 + n);
      m += paint.painter.measure(token.text) + font;
      continue;
    }
    const marker = token.marker;
    if (marker === 127) continue;
    if (marker > 112) { paint.onStat?.(marker, n); continue; }
    if (marker >= 90) { paint.onIcon?.(560 + marker - 90, m, n - 1); m += 15 + font; continue; }
    if (marker === 126) { m -= font + 2; continue; }
    const block = Math.trunc(marker / 30);
    const glyphOffset = o[281 + font] + block * 21 + (marker % 30);
    const glyph = (p[glyphOffset + 1] & 0xff) - (p[glyphOffset] & 0xff);
    const image = paint.imageGroup0.get(25 + font)?.image;
    if (image && glyph > 0) {
      try {
        graphics.drawRegion(image, p[glyphOffset] & 0xff, p[o[284] + font * 3 + block] & 0xff, glyph,
          p[o[283] + font * 3 + block] & 0xff, 0, 11 + m, 8 + n, 20);
      } catch { /* the original's wrapper swallows draw errors */ }
    }
    if (block !== 0 || marker % 30 < 14) m += glyph + font;
  }
}

/**
 * Pixel text in the original font's style: the system CJK font rasterised at 12 px, thresholded
 * to hard pixels (so it stays sharp when the 240x320 canvas is scaled up), filled with the font's
 * yellow-to-olive gradient and outlined in its dark brown. Bitmaps are cached per string.
 */
export class ZhPainter {
  static readonly FONT = "12px 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Noto Sans CJK SC', 'Source Han Sans SC', sans-serif";
  private readonly cache = new Map<string, { element: HTMLCanvasElement; width: number; height: number }>();
  private readonly widths = new Map<string, number>();
  private measureContext?: CanvasRenderingContext2D | null;

  /** Advance width in pixels (the outline's extra pixel included). */
  measure(text: string): number {
    const cached = this.widths.get(text);
    if (cached !== undefined) return cached;
    this.measureContext ??= typeof document === "undefined" ? null : document.createElement("canvas").getContext("2d");
    let width = 12 * Array.from(text).length;
    if (this.measureContext) {
      this.measureContext.font = ZhPainter.FONT;
      width = Math.ceil(this.measureContext.measureText(text).width);
    }
    this.widths.set(text, width + 1);
    return width + 1;
  }

  draw(graphics: Graphics, text: string, x: number, y: number): void {
    const bitmap = this.bitmap(text);
    if (bitmap) graphics.drawImage(bitmap, x - 1, y - 1, 20);
  }

  private bitmap(text: string) {
    const cached = this.cache.get(text);
    if (cached) return cached;
    if (typeof document === "undefined") return undefined;
    const width = this.measure(text) + 2;
    const height = 16;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return undefined;
    context.font = ZhPainter.FONT;
    context.textBaseline = "top";
    context.fillStyle = "#fff";
    context.fillText(text, 1, 2);
    const image = context.getImageData(0, 0, width, height);
    const data = image.data;
    const ink = new Uint8Array(width * height);
    for (let i = 0; i < ink.length; i += 1) ink[i] = data[i * 4 + 3]! >= 110 ? 1 : 0;
    for (let yy = 0; yy < height; yy += 1) {
      for (let xx = 0; xx < width; xx += 1) {
        const i = yy * width + xx;
        let rgb: number | null = null;
        if (ink[i]) {
          rgb = yy < 8 ? 0xf5f400 : 0xa99f49;
        } else {
          for (let dy = -1; dy <= 1 && rgb === null; dy += 1) {
            for (let dx = -1; dx <= 1; dx += 1) {
              const nx = xx + dx, ny = yy + dy;
              if (nx >= 0 && ny >= 0 && nx < width && ny < height && ink[ny * width + nx]) { rgb = 0x311e17; break; }
            }
          }
        }
        data[i * 4] = rgb === null ? 0 : rgb >> 16;
        data[i * 4 + 1] = rgb === null ? 0 : (rgb >> 8) & 0xff;
        data[i * 4 + 2] = rgb === null ? 0 : rgb & 0xff;
        data[i * 4 + 3] = rgb === null ? 0 : 255;
      }
    }
    context.putImageData(image, 0, 0);
    const bitmap = { element: canvas, width, height };
    this.cache.set(text, bitmap);
    return bitmap;
  }
}
