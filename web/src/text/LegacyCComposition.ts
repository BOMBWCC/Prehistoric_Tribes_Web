import { Graphics } from "../platform/Graphics";
import { ImagePack } from "../platform/ImagePack";
import type { ZhToken } from "./LegacyZhText";

export type LegacyCCompositionState = {
  readonly g: Int16Array;
  readonly h: Int16Array;
  r: number;
  s: number;
  t: number;
  q: number;
  p: number;
  u: number;
  v: number;
  w: number;
  y: number;
  /** Original c.g: selected localized dN block offset. */
  /** Not in the original: the composed text's Chinese lines (null for the original glyph rows). */
  zhLines?: readonly (readonly ZhToken[])[] | null;
};

/** Chinese paragraphs (LegacyZhText.ts): a record's tokens and their wrap to a width. */
export type LegacyCZh = {
  readonly tokens: (record: number) => readonly ZhToken[] | null;
  readonly wrap: (tokens: readonly ZhToken[], width: number, font: number) => { tokens: ZhToken[]; width: number }[];
};

export type LegacyCDrawCommand = {
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

/**
 * Java's `sastore`/`saload` throw `ArrayIndexOutOfBoundsException` on any
 * out-of-bounds index; `c.b(IIIIIII)`'s own bytecode (offsets 480..530,
 * `g[u]=w` / `h[u-1]=...`) does a raw array store with no explicit length
 * check, relying entirely on that JVM guarantee to abort the method (via
 * the caller's existing broad try/catch, see LegacyRuntimeState.ts's
 * `onCompose`) once a malformed/edge-case row overflows `g`/`h`'s real
 * capacity. Plain JS typed arrays have no such guarantee -- an
 * out-of-bounds read silently returns `undefined` (`& 0xffff` coerces
 * that to 0) and an out-of-bounds write is a silent no-op -- so this port
 * must check explicitly and throw to reproduce the same abort. Confirmed
 * bug (2026-09-03): without this, `state.w > (g[u] & 0xffff)` degrades to
 * `state.w > 0` once `u` walks past `g`'s length, which is true on every
 * further iteration; combined with `state.v = state.w - 1` re-pinning `v`
 * to the same unmoving `w`, the loop spins forever with no exception and
 * no console output -- the exact "holding a direction key hangs the
 * runtime" bug (see docs/unknowns.md's 2026-09-03 entry).
 */
function checkArrayIndex(index: number, length: number, arrayName: string): number {
  if (index < 0 || index >= length) {
    throw new RangeError(`c's ${arrayName}:[S] is length ${length}; index ${index} is out of bounds`);
  }
  return index;
}

/**
 * Direct port of c.b(IIIIIII): expand one /pd0 record into g/h rows.
 * Pure data transform, no drawing -- CORRECTION (2026-08-24): a
 * speculative `callbacks` param (`onDraw`/`onSkippedRecord`) used to be
 * accepted here but never referenced anywhere in this function's own
 * body (drawing happens separately, in `emitLegacyCRenderRow` below),
 * and both real call sites never passed one -- confirmed dead, no
 * bytecode basis, same pattern as `LegacyFrameCommandDraw.ts`'s removed
 * `onNumericText`. Removed.
 */
export function composeLegacyC(
  state: LegacyCCompositionState,
  packedBytes: Int8Array,
  packedOffsets: Int16Array,
  byteRows: readonly Int8Array[],
  shortRows: readonly Int16Array[],
  x: number,
  y: number,
  width: number,
  height: number,
  record: number,
  align: number,
  value: number,
  /** c.g:I, the section c.a(int) selected (resourceTables.sectionArg). */
  section = 0,
  zh: LegacyCZh | null = null,
): void {
  x += 1; width -= 2; y += 4; height -= 4;
  // Offsets 12..44: record >= 71 is relative to c.g's section. CORRECTED
  // 2026-09-29: this read a never-written languageOffset (always 0), so the
  // intro's first dialogue page showed the cutscene's record 71.
  if (record >= 71) record += packedBytes[packedOffsets[309] + section] & 0xff;
  state.zhLines = null;
  const zhTokens = zh?.tokens(record) ?? null;
  if (zh && zhTokens) {
    // Chinese: the same row bookkeeping (u lines, h[] x per line, r, s, t) from its own wrap.
    const lines = zh.wrap(zhTokens, width, value);
    state.zhLines = lines.map((line) => line.tokens);
    state.u = lines.length;
    lines.forEach((line, k) => {
      state.h[checkArrayIndex(k, state.h.length, "h")] = x + Math.trunc((width - line.width) * (align & 1) / 2);
    });
    state.r = y + ((align === 3 && state.u * 17 < height) ? Math.trunc((height - state.u * 17) / 2) : 0);
    state.s = value;
    state.t = Math.trunc(height / 17);
    return;
  }
  // Offsets 46..53: w = 0, u = 0 (CORRECTED 2026-09-29: this reset r, which
  // c.b() only assigns at the end, and left w from the previous text -- a
  // stale w past this record's start broke line 0 at it, so a short text
  // ran on through the rest of the string table).
  state.w = 0; state.u = 0;
  state.g[0] = shortRows[1][record];
  state.q = 0;
  state.v = shortRows[1][record] & 0xffff;
  const end = shortRows[1][record + 1] & 0xffff;
  while (state.v < end) {
    const marker = byteRows[1][state.v];
    // Offsets 113..198: a space (42) followed by anything outside 90..111, or
    // 127, is a break point. CORRECTED 2026-09-29: the 90..111 test was
    // inverted (hidden while w was never reset).
    const next = byteRows[1][state.v + 1];
    if ((marker === 42 && (next < 90 || next >= 112)) || marker === 127) {
      state.w = state.v + 1; state.y = state.q;
    }
    // Offsets 199..434: the width sum uses the 7th argument (the font /
    // letter spacing, stored as s at the end), not the 6th (alignment).
    // CORRECTED 2026-09-29: it used align and the previous text's t.
    if (marker === 126) {
      state.q -= value + 2;
    } else if (marker < 127) {
      const block = Math.trunc(marker / 30);
      const remainder = marker - block * 30;
      // Offsets 260..282: block 0 with remainder >= 14 (the accents, which do
      // not advance -- see emitLegacyCRenderRow) adds nothing. CORRECTED
      // 2026-09-29: the test was inverted.
      if (block !== 0 || remainder < 14) {
        state.q += value;
        state.q += marker >= 90
          ? 15
          : (packedBytes[packedOffsets[281 + value] + block * 21 + remainder + 1] & 0xff)
            - (packedBytes[packedOffsets[281 + value] + block * 21 + remainder] & 0xff);
      }
    }
    // Offsets 437..477: wrap when the line is too wide AND a break point
    // past this line's start exists, or on 127. CORRECTED 2026-09-29: the
    // first two tests were OR-ed, breaking after every word.
    if ((state.q > width && state.w > (state.g[checkArrayIndex(state.u, state.g.length, "g")] & 0xffff)) || marker === 127) {
      state.u += 1;
      state.g[checkArrayIndex(state.u, state.g.length, "g")] = state.w;
      state.h[checkArrayIndex(state.u - 1, state.h.length, "h")] = (x + Math.trunc((width - state.y) * (align & 1) / 2));
      state.v = state.w - 1;
      state.q = 0;
    }
    if (marker === 70 || marker === 73 || marker === 78) {
      state.w = state.v + 1; state.y = state.q;
    }
    state.v += 1;
  }
  if (state.q > 0) {
    state.u += 1;
    state.h[checkArrayIndex(state.u - 1, state.h.length, "h")] = x + Math.trunc((width - state.q) * (align & 1) / 2);
    state.g[checkArrayIndex(state.u, state.g.length, "g")] = shortRows[1][record + 1];
  }
  state.r = y + ((align === 3 && state.u * 17 < height) ? Math.trunc((height - state.u * 17) / 2) : 0);
  state.s = value;
  state.t = Math.trunc(height / 17);
}

/** What c.a(Graphics,int) reaches outside its glyph draws. */
export type LegacyCRenderExtras = {
  /** c.a(int,int,int,String,int) (#80) -- the queued number text of a stats row. */
  readonly onNumber?: (x: number, y: number, width: number, text: string, value: number) => void;
  /** f.a(int,int) (#81), the RNG helper. */
  readonly random?: (mask: number, divisor: number) => number;
  /** f.a:[[S (#30) -- both tribes' counter pools. */
  readonly pools?: readonly Int16Array[];
  /** f.a(int,int,int) (#78) -- an icon (marker >= 90). */
  readonly onIcon?: (record: number, x: number, y: number) => void;
  /** Chinese: draw one line's tokens with the pen at (m, n); `stat` runs a stats cell (marker > 112). */
  readonly onZhLine?: (tokens: readonly ZhToken[], m: number, n: number, font: number, stat: (marker: number) => void) => void;
};

/**
 * Direct port of c.a(Graphics,int), returning the drawRegion operations.
 * CORRECTED 2026-10-10 against offsets 80..512 (oracle run 9, frame 21688):
 * marker 127 skips one byte (it ended the row); a marker > 112 is a stats
 * cell -- both tribes' counter `z = marker - 94` queued as numbers at x 24
 * and 216, `z == 24` showing `count * 10 + rand(10)`; a marker >= 90 is an
 * icon `f.a(560 + marker - 90, q, n - 1)`, not a glyph.
 */
export function emitLegacyCRenderRow(
  state: LegacyCCompositionState,
  packedBytes: Int8Array,
  packedOffsets: Int16Array,
  byteRows: readonly Int8Array[],
  imageGroup0: ImagePack | undefined,
  rowStart: number,
  onDraw?: (command: LegacyCDrawCommand) => void,
  /** Offsets 780..832 write f.Q:Z / f.R:Z (the dialogue's top/bottom arrows). */
  onEdges?: (atTop: boolean, atBottom: boolean) => void,
  extras: LegacyCRenderExtras = {},
): LegacyCDrawCommand[] {
  const commands: LegacyCDrawCommand[] = [];
  // Offsets 163..332: one stats row, left = team 0, right = team 1.
  const stat = (marker: number, n: number) => {
    const zStat = marker - 112 - 1 + 19;
    const cell = (team: number) => {
      const count = extras.pools?.[team]?.[zStat] ?? 0;
      return zStat === 24 ? count * 10 + (extras.random?.(65535, 10) ?? 0) : count;
    };
    extras.onNumber?.(24, n, 0, String(cell(0)), 0);
    extras.onNumber?.(216, n, 2, String(cell(1)), 0);
  };
  if (state.zhLines) {
    for (let k = rowStart; k < rowStart + state.t && k < state.u; k += 1) {
      const n = state.r + (k - rowStart) * 17;
      extras.onZhLine?.(state.zhLines[k] ?? [], state.h[k], n, state.s, (marker) => stat(marker, n));
    }
    onEdges?.(rowStart === 0, rowStart + state.t >= state.u);
    return commands;
  }
  let k = rowStart;
  while (k < rowStart + state.t && k < state.u) {
    let m = state.h[k];
    let l = state.g[k] & 0xffff;
    const end = state.g[k + 1] & 0xffff;
    while (l < end) {
      const marker = byteRows[1][l];
      if (marker === 127) { l += 1; continue; }
      if (marker === 126) { m -= state.s + 2; l += 1; continue; }
      let n = state.r + (k - rowStart) * 17;
      if (marker > 112) {
        stat(marker, n);
        l += 1;
        continue;
      }
      const z = Math.trunc(marker / 30);
      const a = marker - z * 30;
      const o = marker < 90
        ? (packedBytes[packedOffsets[281 + state.s] + Math.trunc(marker / 30) * 21 + a + 1] & 0xff)
          - (packedBytes[packedOffsets[281 + state.s] + Math.trunc(marker / 30) * 21 + a] & 0xff)
        : 15;
      let q = m;
      if (z === 0 && a >= 14) {
        n -= packedBytes[packedOffsets[285] + a - 14];
        q -= Math.trunc((o + state.p) / 2);
      }
      if (z >= 3) {
        // Offsets 470..512: an icon, then the shared advance at 710.
        extras.onIcon?.(560 + marker - 90, q, n - 1);
      } else {
        const glyphOffset = packedOffsets[281 + state.s] + Math.trunc(marker / 30) * 21 + a;
        const command: LegacyCDrawCommand = { imageGroup: 0, imageIndex: 25 + state.s, sourceX: packedBytes[glyphOffset] & 0xff, sourceY: packedBytes[packedOffsets[284] + state.s * 3 + z] & 0xff, width: o, height: packedBytes[packedOffsets[283] + state.s * 3 + z] & 0xff, x: 11 + q, y: 8 + n, anchor: 20 };
        commands.push(command); onDraw?.(command);
        if (imageGroup0) { try { imageGroup0.get(command.imageIndex)?.image && void 0; } catch { /* original wrapper catches draw errors */ } }
      }
      if (z !== 0 || a < 14) m += o + state.s;
      state.p = o;
      l += 1;
    }
    k += 1;
  }
  // CORRECTED 2026-09-30: these went to c-local Q/R nobody read, so the
  // dialogue box always showed both scroll arrows.
  onEdges?.(rowStart === 0, rowStart + state.t >= state.u);
  return commands;
}
