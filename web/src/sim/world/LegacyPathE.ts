/**
 * Raw port of `private void e(int)` (constant pool #374), bytecode/b-javap.txt
 * offsets 0..776 (lines 2849..3344 -- the next method, `private void f(int)`,
 * starts right after). Its only caller is `private void a(int,int,int,int,int)`
 * (#264, `LegacySubsystemPairSetup.ts`) at that method's offset 65..68, and its
 * own predecessor there is `private void a(int,int)` (#271,
 * `LegacyPathDirection.ts`) at offset 0..8.
 *
 * Field identities, each checked by constant-pool index across the whole of
 * bytecode/b-javap.txt rather than by letter (this project has repeatedly been
 * bitten by same-letter twins):
 *  - `a:I`(#68) -- `LegacySubsystemArrays.bField68`, the class-wide loop
 *    counter. `state.a` below. NOT `a:B`(#71).
 *  - `a:B`(#71) -- the direction mask `a(int,int)`#271 computes. `directionMask`
 *    below. All 13 references to #71 in the class are inside #271 (7, all
 *    writes) and this method (6, all reads), so the pair owns it outright.
 *  - `c:[B`(#146) -- `new byte[2]`, allocated by `f.g()` (f-javap.txt offset
 *    494..497, f-side pool #258). The two step counts #271 writes. `input.c`
 *    below. All 14 references are likewise confined to #271 and this method.
 *  - `f:[B`(#169) -- `LegacySubsystemArrays.fByte`, `new byte[3]`. `deltas`.
 *  - `e:[B`(#162) -- `LegacySubsystemArrays.eByte`, `new byte[3]`. `eCounts`.
 *    NOT `e:[[[B`(#161) or `e:I`(#164).
 *  - `e:I`(#164) -- `bField164`. `state.e`.
 *  - `c:I`(#147) -- written (offsets 74/357) before read (217/244) here, and
 *    likewise inside #380; a genuine per-call local. `state.cCursor`.
 *  - `f:I`(#170) -- same treatment (written at 403 before read at 494).
 *    `state.f`. NOT `f:[B`(#169).
 *  - `b:I`(#135) -- `bField135`. `state.b`.
 *  - `g:I`(#178) -- `bField178`. `state.g`.
 *  - `d:[B`(#157) -- `LegacySubsystemArrays.dByte`, `new byte[6]`. `dScratch`.
 *  - `d:[[[B`(#153) -- `LegacySubsystemArrays.d`, `new byte[3][2][96]`.
 *    `pathData`: three candidate routes x (x,y) x up to 96 steps.
 *  - `b:[[B`(#129) -- `gridC`, row-major (`gridC[y][x]`). `map`.
 *  - `b:[B`(#130) / `a:[S`(#66) -- `packedBytes` / `packedOffsets`; every
 *    delta read below is `packedBytes[packedOffsets[0] + directionMask*4 + k]`.
 *  - `invokespecial #272`, `a:(III)B` -- `checkLegacyCellCompatibility`
 *    (`LegacyCellCompatibilityCheck.ts`); it returns only `iconst_0`/`iconst_1`
 *    (verified: every `ireturn` in its range is preceded by one of the two), so
 *    modelling it as 0/1 here is exact. `onCellValue`.
 *
 * THREE BUGS FIXED (2026-09-10) while wiring this method up for the first time
 * -- it had never actually run, so none of them had ever been observable:
 *
 *  1. Offsets 85..97 compute the inner loop's terminator as `2 - 3 * e:I`
 *     (`iconst_2; iconst_3; getfield e:I; imul; isub` -- 3*e is what `imul`
 *     consumes, and `isub` then subtracts it from 2). The port had
 *     `3 - 2 * e`. With the wrong formula the `e === 0` pass ran a third
 *     iteration at `a === 2`, reading `c[2]` off the end of a `byte[2]`, and
 *     the `e === 1` pass ran zero iterations instead of two, so route 1 was
 *     never built at all.
 *  2. Offsets 471..506 branch to the "primary axis" step only when
 *     `(b >= 50 && e < c[0])` OR `f >= c[1]` -- `if_icmplt 590` at offset 503
 *     sends `f < c[1]` to the OTHER branch. The port had that last test
 *     inverted, so the Bresenham split walked the wrong axis.
 *  3. Offsets 506..649 index the packed delta table as
 *     `packedOffsets[0] + a:B * 4 + k` for k in 0..3, exactly like offsets
 *     121..204 do. The port dropped the `a:B * 4` term in this third phase,
 *     so route 2 stepped with route-independent deltas.
 */
export type LegacyPathEInput = {
  readonly mode: number;
  readonly directionMask: number;
  readonly deltas: Int8Array;
  readonly c: Int8Array;
  readonly dScratch: Int8Array;
  readonly pathData: Int8Array[][];
  readonly eCounts: Int8Array;
  readonly map: Int8Array[];
  readonly readPackedDelta: (offset: number) => number;
  readonly onCellValue: (x: number, y: number, mode: number) => number;
  readonly state: { a: number; b: number; e: number; f: number; g: number; cCursor: number };
};

function javaByte(value: number): number {
  const narrowed = value & 0xff;
  return narrowed >= 0x80 ? narrowed - 0x100 : narrowed;
}

export function stepLegacyPathE(input: LegacyPathEInput): void {
  const { state } = input;
  // Offsets 0..59: `for (a:I = 0; a:I < 3; a:I++) { f[a] = c[0]+c[1]; e[a] = 0; }`
  // -- the real field, not a JS local, because offsets 78..141 of the caller
  // (#264) and #380/#265 all read `a:I` ambiently.
  for (state.a = 0; state.a < 3; state.a += 1) {
    input.deltas[state.a] = javaByte(input.c[0] + input.c[1]);
    input.eCounts[state.a] = 0;
  }
  state.e = 0;
  while (state.e < 2) {
    state.cCursor = 0;
    state.a = state.e;
    // Offsets 89..96: `iconst_2; iconst_3; getfield e:I; imul; isub` == 2 - 3*e.
    // e === 0 walks a = 0, 1 (step +1, stop at 2); e === 1 walks a = 1, 0
    // (step -1, stop at -1).
    const end = 2 - 3 * state.e;
    while (state.a !== end) {
      state.b = 0;
      while (state.b < (input.c[state.a] ?? 0)) {
        const pair = state.e * 2;
        const deltaBase = (input.directionMask * 4) + state.a * 2;
        input.dScratch[pair] = javaByte(input.dScratch[pair] + input.readPackedDelta(deltaBase));
        input.dScratch[pair + 1] = javaByte(input.dScratch[pair + 1] + input.readPackedDelta(deltaBase + 1));
        input.pathData[state.e][0][state.cCursor] = input.dScratch[pair];
        input.pathData[state.e][1][state.cCursor] = input.dScratch[pair + 1];
        const x = input.dScratch[pair];
        const y = input.dScratch[pair + 1];
        input.eCounts[state.e] = javaByte(input.eCounts[state.e] + (
          (input.map[y]?.[x] ?? 0) === 0 ? 0 : input.onCellValue(x, y, input.mode)
        ));
        state.b += 1;
        state.cCursor += 1;
      }
      state.a += 1 - 2 * state.e;
    }
    state.e += 1;
  }

  state.e = 0;
  state.f = 0;
  state.g = input.c[1] > 0 ? Math.trunc((input.c[0] * 50) / input.c[1]) : 1000000;
  state.b = state.g;
  state.a = 0;
  // Offsets 524/554/608/638: every one of this phase's four delta reads is
  // `packedOffsets[0] + a:B * 4 + k`, the same base the loop above uses.
  const deltaBase = input.directionMask * 4;
  while (state.a < (input.c[0] + input.c[1])) {
    // Offsets 471..506: `if (b >= 50 && e < c[0]) goto 506;` then
    // `if (f < c[1]) goto 590;` and otherwise fall through to 506.
    if ((state.b >= 50 && state.e < input.c[0]) || state.f >= input.c[1]) {
      input.dScratch[4] = javaByte(input.dScratch[4] + input.readPackedDelta(deltaBase + 0));
      input.dScratch[5] = javaByte(input.dScratch[5] + input.readPackedDelta(deltaBase + 1));
      state.e += 1;
      state.b -= 50;
    } else {
      input.dScratch[4] = javaByte(input.dScratch[4] + input.readPackedDelta(deltaBase + 2));
      input.dScratch[5] = javaByte(input.dScratch[5] + input.readPackedDelta(deltaBase + 3));
      state.f += 1;
      state.b += state.g;
    }
    input.pathData[2][0][state.a] = input.dScratch[4];
    input.pathData[2][1][state.a] = input.dScratch[5];
    const x = input.dScratch[4];
    const y = input.dScratch[5];
    input.eCounts[2] = javaByte(input.eCounts[2] + (
      (input.map[y]?.[x] ?? 0) === 0 ? 0 : input.onCellValue(x, y, input.mode)
    ));
    state.a += 1;
  }
}
