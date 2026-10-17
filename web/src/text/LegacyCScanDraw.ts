/**
 * Raw port of class c's `final void a(int, int, int)`, bytecode/c-javap.txt
 * offsets 0..453 (lines 1518..1786). No exception table on this method
 * (confirmed: no "Exception table:" section between its Code and the next
 * method's header) -- nothing here needs to be caught.
 *
 * Shape: `this.k = 13 + this.c` (offsets 0-8), then a `do`-style scan
 * (`while (this.k !== 13 + this.b) { ...; step k; }`, offsets 11-450) over a
 * 20-slot ring-buffer window `k in [13,32]` carved out of the SAME 33-row
 * geometry tables `LegacyResourceTables.ts` already models
 * (`rowFShort`/`rowDShort`/`rowEShort`/`rowDByte`/`rowEByte`/`geometryB`/
 * `geometryC`, all `e.e()`-allocated size-33 or 33x25 arrays -- see field
 * identities below). Per slot `k`:
 *   - offset 25-37: skip the slot (fall straight to the offset-425 step)
 *     unless `rowFShort[k] === arg1` (`saload`, sign-extended per JVM
 *     semantics, matches `Int16Array`'s own sign extension).
 *   - offset 38-90 (only when it matches): seed `this.m`/`this.n` from
 *     `arg2`/`arg3` plus per-row table lookups and one call to the RNG
 *     helper (`this.a.a(255, 5)`, `f.a:(II)I`, constant-pool #81 in this
 *     class's own numbering); reset `this.l = 0`.
 *   - offset 93-422: inner `while (this.l < rowDByte[k])` loop (offsets
 *     93-106 condition, 109-419 body, `goto 93`). Per item `l`: computes a
 *     glyph offset into a FIXED atlas section (`/pd0[282]`, not a
 *     frame-relative `281 + section` like the font-glyph siblings in
 *     `LegacyCComposition.ts`/`LegacyGeometryRenderer.ts` use), derives
 *     `this.o` (icon width) from it, looks up a fixed `Graphics`/`Image`
 *     pair (`f.a[1]`, `this.a.a[0][26]` -- both resolved outside this
 *     port's scope, exposed as the `onDrawIcon` callback), calls the
 *     shared static blit helper (constant-pool #79 in this class's own
 *     numbering == `f.a:(Ljavax/microedition/lcdui/Graphics;
 *     Ljavax/microedition/lcdui/Image;IIIIIII)Z`, constant-pool #435 in
 *     class f's own numbering -- the SAME helper already decoded and
 *     reused by `LegacyGeometryRenderer.ts`/`LegacyPaintScreen.ts`/
 *     `LegacyRuntimeState.ts`; its boolean result is discarded via the
 *     bytecode's own `pop` at offset 394, matching every other call site),
 *     then advances `this.m += this.o + 1` and `this.l += 1`.
 *   - offset 425-450 (always, whether or not the `rowFShort[k]===arg1`
 *     branch ran): if `this.k >= 32`, reset `this.k = 12` (wrap the ring
 *     buffer back to its start); either way `this.k += 1`; `goto 11`.
 *     Net effect: `k` walks `13,14,...,32,13,14,...` until it lands exactly
 *     on `13 + this.b` -- a true ring-buffer scan from read cursor `c` to
 *     write cursor `b`, not a bounded `for` loop; this file reproduces that
 *     exactly (a `while` on the same equality test), so a caller must
 *     ensure `b`/`c` are both within the ring's usable range or this loops
 *     forever, exactly as the original bytecode would.
 *
 * Field identities, each confirmed via its own constant-pool index against
 * `bytecode/c-javap.txt`'s full field table (`grep -oE "#[0-9]+ +// Field
 * [a-zA-Z]+:\S+"`) -- this class has SIX single-letter fields with a
 * same-letter twin of a different type that this method itself touches
 * (`a`, `b`, `c`, `d`, `e`, `f`), so every one of the following was checked
 * against its own numbered `getfield`/`putfield`/`invoke*` line, never
 * assumed from the letter alone:
 *   - `b:B`/#33 (this method's `this.b`, read-only here) -- distinct from
 *     `b:[B]`/#31, `b:[S]`/#32, `b:I`/#34, and `b:[[B]`/#35 (`geometryB`
 *     below).
 *   - `c:B`/#38 (this method's `this.c`, read-only here) -- distinct from
 *     `c:[B]`/#36, `c:[S]`/#37, `c:I`/#39 (`LegacyResourceTables.ts`'s
 *     `sectionScan`), and `c:[[B]`/#40 (`geometryC` below).
 *   - `k:I`/#58, `l:I`/#59, `m:I`/#60, `n:I`/#61, `o:I`/#62 -- each has no
 *     same-letter twin in class c's field table; genuine instance fields
 *     (real `getfield`/`putfield`, never a local-variable slot), unrelated
 *     to `LegacyCComposition.ts`'s own local variables of the same letters
 *     (those are plain JS locals in a *different* method, `c.a(Graphics,
 *     int)`, not this class's real `l:I`/`m:I`/`n:I`/`o:I` fields).
 *   - `a:Lf;`/#20 -- the class f instance this class c holds a reference
 *     to (`this.a` here); distinct from `a:[[B]`/#15, `a:[[S]`/#16,
 *     `a:[Ljava/lang/String;]`/#17, `a:B`/#18,
 *     `a:Ljava/io/InputStream;`/#19, `a:[B]`/#22 (`packedBytes` below),
 *     and `a:[S]`/#24 (`packedOffsets` below).
 *   - `a:[B]`/#22, `a:[S]`/#24 -- confirmed the SAME shared `packedBytes`/
 *     `packedOffsets` tables used everywhere else in this port (per
 *     `LegacyResourceTables.ts`'s own docblock on these exact indices).
 *   - `d:[S]`/#44 -- `rowDShort` elsewhere in this port (`LegacyGeometryRenderer.ts`
 *     reads the same field as `this.tables.rowDShort`... actually named via
 *     `LegacyResourceTables.ts`'s field list); distinct from `d:I`/#42,
 *     `d:[B]`/#43 (`rowDByte`, see next), and `d:B`/#45.
 *   - `d:[B]`/#43 -- `rowDByte` elsewhere in this port (33-length,
 *     `LegacyGeometryRenderer.ts`'s `length = this.tables.rowDByte[row]`
 *     bounds its own row's item count the exact same way this method's
 *     `this.l < rowDByte[this.k]` does); distinct from `d:I`/#42, `d:[S]`/#44
 *     (above), and `d:B`/#45.
 *   - `e:[S]`/#48 -- `rowEShort` elsewhere in this port; distinct from
 *     `e:I`/#46 and `e:[B]`/#47 (next).
 *   - `e:[B]`/#47 -- `rowEByte` elsewhere in this port (the per-row frame
 *     index `LegacyGeometryRenderer.ts` also reads as `this.tables.rowEByte[row]`);
 *     distinct from `e:I`/#46 and `e:[S]`/#48 (above).
 *   - `f:[S]`/#50 -- `rowFShort` elsewhere in this port. IMPORTANT
 *     CORRECTION: `LegacyResourceTables.ts`'s docblock on `stepLegacyClassCReset`
 *     claims this exact field is "CONFIRMED ... to never be assigned
 *     anywhere in the whole program" (a single-class-grep false positive,
 *     the same "permanently null" pattern this session's own git history
 *     retracted eleven times over for OTHER fields). It is wrong: class e's
 *     own bytecode allocates it directly --
 *     `bytecode/e-javap.txt:1077: 141: putfield #67 // Field c.f:[S`
 *     (`bipush 33; newarray short` immediately before, offsets 137-141),
 *     the exact same size-33 allocation as `LegacyResourceTables.ts`'s
 *     `rowFShort` (and its four size-33 siblings `d:[B]`/`d:[S]`/`e:[B]`/
 *     `e:[S]`, all allocated in the same run of `e.e()` instructions right
 *     next to it). This method's own read of it (offset 25-37, a live,
 *     reachable branch on every scan slot) is real, not a guaranteed
 *     throw -- ported as such below. `LegacyResourceTables.ts`'s stale
 *     docblock was NOT edited (out of scope for this port); flagging it
 *     here since acting on it would have made this entire method a no-op.
 *   - `b:[[B]`/#35 -- `geometryB` elsewhere in this port (confirmed the
 *     same 33x25 byte matrix `LegacyResourceTables.ts` allocates and
 *     `LegacyGeometryRenderer.ts` reads as `this.tables.geometryB[row][index]`).
 *   - `c:[[B]`/#40 -- `geometryC` elsewhere in this port, same reasoning.
 *
 * Masking is NOT uniform across this method's byte reads -- reproduced
 * exactly, not patterned off the sibling glyph-draw method:
 *   - the icon-width operands (offsets 157/207) and `sourceX` (offset 279)
 *     each get `sipush 255; iand` (`& 0xff`) before use.
 *   - `sourceY`'s base term (offset 312), the per-row height-scale byte it
 *     is scaled by (offset 329, multiplied against `rowEByte[k]` with NO
 *     mask), and `height` itself (offset 374) are all read RAW/signed --
 *     no `iand` anywhere in those three spans. `Int8Array`'s own sign
 *     extension reproduces this for free; this file intentionally does
 *     NOT add `& 0xff` to those three reads.
 *
 * Integer semantics reproduced exactly: `idiv` (offset 50, `this.d[k]/2`)
 * truncates toward zero via `Math.trunc`, matching Java's `idiv` (and JS's
 * `%`/`Math.trunc`, unlike `>>`/`Math.floor` which would be wrong for a
 * negative dividend); `imul` (offsets 83, 138, 190, 339) is plain `*`, no
 * truncation concern for in-range values.
 *
 * `f.a:(II)I` (constant-pool #81) -- confirmed via `bytecode/f-javap.txt`'s
 * own `final int a(int, int)` (offset 34579): `(random.nextInt() & mask) %
 * divisor`, byte-for-byte the same formula `LegacyRandom.ts`'s
 * `legacyRandomRemainder` already implements and `LegacyRuntimeState.ts`
 * exposes as `randomRemainder(mask, divisor)`. Exposed here as the
 * `onRandomRemainder` callback (not imported directly) so this file stays
 * a pure port with no wiring of its own, per house style.
 */

export type LegacyCScanDrawState = {
  /** c.b:B (#33) -- ring-buffer end cursor; only read by this method. */
  readonly b: number;
  /** c.c:B (#38) -- ring-buffer start cursor; only read by this method. */
  readonly c: number;
  /** c.k:I (#58) -- scan cursor over the ring-buffer window [13,32]. */
  k: number;
  /** c.l:I (#59) -- per-slot sub-item cursor. */
  l: number;
  /** c.m:I (#60) -- running draw-X accumulator. */
  m: number;
  /** c.n:I (#61) -- draw-Y for the current slot. */
  n: number;
  /** c.o:I (#62) -- icon width scratch, also the per-item X advance. */
  o: number;
  /** c.f:[S] (#50) -- `rowFShort` elsewhere in this port; per-slot id table. */
  readonly rowFShort: Int16Array;
  /** c.d:[S] (#44) -- `rowDShort` elsewhere in this port. */
  readonly rowDShort: Int16Array;
  /** c.e:[S] (#48) -- `rowEShort` elsewhere in this port. */
  readonly rowEShort: Int16Array;
  /** c.d:[B] (#43) -- `rowDByte` elsewhere in this port; per-slot item count. */
  readonly rowDByte: Int8Array;
  /** c.e:[B] (#47) -- `rowEByte` elsewhere in this port; per-slot frame index. */
  readonly rowEByte: Int8Array;
  /** c.b:[[B] (#35) -- `geometryB` elsewhere in this port. */
  readonly geometryB: readonly Int8Array[];
  /** c.c:[[B] (#40) -- `geometryC` elsewhere in this port. */
  readonly geometryC: readonly Int8Array[];
};

export type LegacyCScanDrawCallbacks = {
  /** f.a:(II)I (#81) -- LegacyRuntimeState.randomRemainder(mask, divisor). */
  readonly onRandomRemainder?: (mask: number, divisor: number) => number;
  /**
   * f.a:(Graphics,Image,IIIIIII)Z (#79 here / #435 in f's own pool) --
   * the shared static blit helper, already decoded elsewhere in this port.
   * Graphics is always `f.a[1]` and Image is always
   * `this.a.a[0][26]` (image group 0, index 26) -- both fixed resource
   * lookups outside this file's scope, left for the caller to resolve.
   * Its boolean return is discarded in the original bytecode (`pop`).
   */
  readonly onDrawIcon?: (
    sourceX: number,
    sourceY: number,
    width: number,
    height: number,
    x: number,
    y: number,
    anchor: 20,
  ) => void;
};

function offsetAt(packedOffsets: Int16Array, index: number): number {
  if (index < 0 || index >= packedOffsets.length) throw new RangeError(`Packed offset ${index} is outside c.a`);
  return packedOffsets[index];
}

function byteAt(packedBytes: Int8Array, index: number): number {
  if (index < 0 || index >= packedBytes.length) throw new RangeError(`Packed byte ${index} is outside c.a`);
  return packedBytes[index];
}

/**
 * Direct port of class c's `final void a(int, int, int)`. `arg1` is the
 * value matched against `rowFShort[k]` (a per-slot id/type lookup);
 * `arg2`/`arg3` are the anchor `this.m`/`this.n` are seeded from (both
 * names are dataflow-inferred, not confirmed gameplay semantics -- the
 * bytecode carries no line-number/local-variable table for this method).
 */
export function drawLegacyCScan(
  state: LegacyCScanDrawState,
  packedBytes: Int8Array,
  packedOffsets: Int16Array,
  arg1: number,
  arg2: number,
  arg3: number,
  callbacks: LegacyCScanDrawCallbacks = {},
): void {
  state.k = 13 + state.c;

  while (state.k !== 13 + state.b) {
    if (state.rowFShort[state.k] === arg1) {
      state.m = arg2 - Math.trunc(state.rowDShort[state.k] / 2) + (callbacks.onRandomRemainder?.(255, 5) ?? 0) - 2;
      state.n = arg3 - 5 - state.rowEShort[state.k] * 2;
      state.l = 0;

      while (state.l < state.rowDByte[state.k]) {
        const geometryC = state.geometryC[state.k][state.l];
        const geometryB = state.geometryB[state.k][state.l];
        const glyphOffset = offsetAt(packedOffsets, 282) + geometryC * 21 + geometryB;

        state.o = (byteAt(packedBytes, glyphOffset + 1) & 0xff) - (byteAt(packedBytes, glyphOffset) & 0xff);

        const sourceX = byteAt(packedBytes, glyphOffset) & 0xff;
        const sourceY =
          byteAt(packedBytes, offsetAt(packedOffsets, 284) + 3 + geometryC) +
          state.rowEByte[state.k] * byteAt(packedBytes, offsetAt(packedOffsets, 283) + 3);
        const width = state.o;
        const height = byteAt(packedBytes, offsetAt(packedOffsets, 283) + 3 + geometryC);
        const x = 11 + state.m;
        const y = 8 + state.n;

        callbacks.onDrawIcon?.(sourceX, sourceY, width, height, x, y, 20);

        state.m = state.m + state.o + 1;
        state.l += 1;
      }
    }

    if (state.k >= 32) state.k = 12;
    state.k += 1;
  }
}
