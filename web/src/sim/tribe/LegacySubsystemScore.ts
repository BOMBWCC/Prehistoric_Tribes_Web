import type { LegacySubsystemArrays } from "../../core/LegacySubsystemArrays";
import { stepLegacySubsystemEntityRevertIdle } from "./LegacySubsystemEntityRevertIdle";
import {
  stepLegacySubsystemD,
  stepLegacySubsystemPairSetup,
  type LegacySubsystemDInput,
  type LegacySubsystemPairSetupInput,
} from "./LegacySubsystemPairSetup";
import {
  stepLegacySubsystemFCall,
  stepLegacySubsystemFlagPass,
  type LegacySubsystemFlagPassInput,
} from "./LegacySubsystemFlagPass";

/**
 * Raw port of class b's `private byte b(int, int, int, int)` (constant pool
 * #332), bytecode/b-javap.txt offsets 0..161 (lines 1808..1906).
 *
 * Its one known call site is `private void o()`'s tail (offset 100), where the
 * result becomes `dense[808 + v]` -- see `LegacySubsystemBVoidO.ts`.
 *
 * **RETRACTED (2026-09-07)**: this call used to be inlined at that call site as
 * a literal 0, on the chain "`a(IIII):B` (#267) dereferences `d:[[B]` (#154) as
 * its first real instruction; `d:[[B]` has zero putfield sites in class b; so it
 * always throws; its own catch returns `(byte) this.d` -- the *different* int
 * field `d:I` (#155) -- whose writes sit in the now-unreachable code, so 0". The
 * first link is false: `f.g()` allocates `b.d:[[B]` as `new byte[2][50]`
 * (bytecode/f-javap.txt offsets 611..618), which this port already carries as
 * `LegacySubsystemArrays.dRows`. See docs/unknowns.md's 2026-09-07 sweep.
 *
 * Structure (verified instruction by instruction):
 *
 *   i = 0;                                        // offsets 0..2
 *   h = a(arg1, arg2, arg3, arg4);                // 5..15   (#267, now ported below)
 *   for (j = 0; j < h; ) {                        // 18..31
 *     i = (byte)(i + a(d[1][j], d[0][j],          // 34..98  (#268, now ported below)
 *                      d[1][j+1], d[0][j+1], i, 0));
 *     if (!flags[0] && !flags[1]) break;          // 101..119
 *     j = (byte)(j + 1);                          // 122..133
 *   }
 *   return (f.q === 3 && i > 2) ? 2 : i;          // 136..161
 *
 * `i:B`(#188), `h:B`(#182) and `j:B`(#193) are fields in the original, but each
 * is accessed ONLY inside this method (6, 2 and 8 references respectively,
 * counted by constant-pool index across class b) and each is reset at entry, so
 * they are genuine locals here -- unlike `x:I`#230 / `w:I`#228 / `z:B`#235 /
 * `A:B`#6, which this project had to promote back to shared fields.
 *
 * `b(IIII)` has NO exception table of its own (confirmed), so the `j + 1` reads
 * at offsets 62..87 really can throw ArrayIndexOutOfBounds when `h` reaches 50,
 * and that propagates to the caller. Reproduced with an explicit throw rather
 * than a silent `?? 0`, matching this codebase's convention for JVM-implicit
 * exceptions.
 *
 * -----------------------------------------------------------------------
 * `private byte a(int, int, int, int)` (#267), bytecode/b-javap.txt offsets
 * 0..607 (lines 1127..1508, confirmed exact -- the next method,
 * `private void d(int)`, starts at line 1508). Ported below as
 * `computeLegacySubsystemBound`.
 *
 * Field identities (each checked for same-letter twins by grepping its own
 * constant-pool index across the whole of bytecode/b-javap.txt):
 *  - `d:[[B]`(#154) -- `LegacySubsystemArrays.dRows`, `new byte[2][50]`
 *    (same field `b(IIII)` reads via the file's own `dAt` helper).
 *  - `d:I`(#155) -- a cursor into `dRows`'s columns, NOT the same field as
 *    `d:[[B]`#154 or `d:[[[B]`#153. All 11 references to #155 in the class
 *    fall inside this one method's own offset range (verified by
 *    `grep -n "#155 " bytecode/b-javap.txt`), so it is a genuine local here
 *    (called `dIndex` below) -- this is the exact field the retracted
 *    2026-08 premise misattributed as "stuck at 0"; it is written at offset
 *    22 (unconditional, the second real instruction) and again at offset 461
 *    (inside the loop), both fully reachable.
 *  - `a:I`(#68) -- `LegacySubsystemArrays.bField68`. **CORRECTED
 *    (2026-09-10)**: previously modeled as a per-call JS local on the
 *    grounds that offset 37 resets it before this method's own first use.
 *    That is true and beside the point -- `f(int)`(#380, called at offset
 *    51, inside the loop) and `d(int)`(#366) both READ `a:I` and never
 *    write it, using it as the index of the run being worked on
 *    (`eCube[0][*][a:I]`, `new byte[2][3][10]`). Holding it in a JS local
 *    meant #380 saw whatever `a(IIIII)`(#264) / `e(int)`(#374) had left in
 *    the shared field. Both #267 and #268 now step `bScalars.bField68`
 *    directly -- including #268's second (copy-out) loop, whose own
 *    `putfield #68` sits at its offset 341.
 *  - `a:[Z]`(#69) -- the same `localFlags` (indices 0/1) as `b(IIII)` and
 *    `#268`; read-only in this method.
 *  - `d:[[[B]`(#153) -- `LegacySubsystemArrays.d`, `new byte[3][2][96]`
 *    (`f.g()` offsets 531..543, `f`'s own pool index #271).
 *  - `e:[[[B]`(#161) -- `LegacySubsystemArrays.e`, `new byte[2][3][10]`
 *    (`f.g()` offsets 556..568, `f`'s own pool index #282).
 *  - `g:[B]`(#177) -- `LegacySubsystemArrays.g`, `new byte[3]`.
 *  - `h:[B]`(#181) -- `LegacySubsystemArrays.h`, `new byte[10]`.
 *  - `f:[B]`(#169) -- `LegacySubsystemArrays.fByte`, `new byte[3]`.
 *  - `m:I`(#201), `j:I`(#192), `l:I`(#198), `b:I`(#135), `c:B`(#144) -- all
 *    persistent cross-method scalars; see their docblocks on
 *    `LegacySubsystemArrays`.
 *  - `a:Lf;`(#60) then `f.b:[[B]` (#133 as read from here) -- the owning
 *    `f` instance's `b:[[B]` field, `new byte[96][96]` (`e.i()` offsets
 *    18..30), already this port's `game.gridB` (see
 *    `LegacyRuntimeState.ts`'s `gridB` and `LegacySpiralPlacementGate.ts`).
 *  - `a:(IIIII)V`(#264) and `d:(I)V`(#366) -- **UPDATE (2026-09-08)**: now
 *    real calls into `LegacySubsystemPairSetup.ts` (`stepLegacySubsystemPairSetup`
 *    / `stepLegacySubsystemD`), not callbacks -- see that file's own
 *    docblock for the full derivation.
 *  - `f:(I)V`(#380) -- **UPDATE (2026-09-08)**: now a real call into
 *    `LegacySubsystemFlagPass.ts` (`stepLegacySubsystemFCall`), not a
 *    callback -- see that file's own docblock for the full derivation.
 *
 * Control flow:
 *
 *   dRows[0][0] = (byte) arg2; dRows[1][0] = (byte) arg1;   // 0..19
 *   dIndex = 1;                                              // 20..22
 *   onPairSetup(arg2, arg1, arg4, arg3, 0);                  // 25..32 (#264)
 *   for (loopvar = 0; loopvar < c; ) {                       // 35..48 (c = bField144)
 *     onFCall(0);                                            // 51..53 (#380)
 *     if (!flags[0] && !flags[1]) {                          // 56..71
 *       onDCall(0);                                          // 74..76 (#366)
 *       // 79..200: a SINGLE read of m (unchanged between the two writes
 *       // below, confirmed no putfield #201 between offsets 79 and 200)
 *       // selects the pair source and writes both dRows columns:
 *       dRows[0][dIndex] = m >= 0 ? d3[g[(m&1)+1]][0][m>>1] : e[0][0][loopvar];
 *       dRows[1][dIndex] = m >= 0 ? d3[g[(m&1)+1]][1][m>>1] : e[0][1][loopvar];
 *       copyHRowIntoGridB(...bound=c...);                    // 201..290 (shared idiom, see below)
 *       return (byte) dIndex;                                // 290..295 EARLY RETURN
 *     }
 *     // flags[0] || flags[1] true, offsets 296..474:
 *     b = (flags[0] && fByte[g[1]] < fByte[g[2]]) ? 1 : (flags[1] ? 2 : 1);  // 296..345
 *     dRows[0][dIndex] = d3[g[b]][0][fByte[g[b]] / 2];        // 348..391 (idiv, truncates toward 0)
 *     dRows[1][dIndex] = d3[g[b]][1][fByte[g[b]] / 2];        // 392..435
 *     loopvar = eByte[g[b]] + 1;                              // 436..451, 464..471 (REPLACES loopvar, not a plain increment)
 *     dIndex = dIndex + 1;                                    // 454..461 (plain int increment, no i2b -- only the final return narrows)
 *   }                                                          // 474 goto 40
 *   l = 0;                                                     // 477..479 (bField198)
 *   dRows[0][dIndex] = (byte) arg4; dRows[1][dIndex] = (byte) arg3;  // 482..508
 *   copyHRowIntoGridB(...bound=c...);                          // 509..598 (same shared idiom again)
 *   return (byte) dIndex;                                      // 602..607
 *
 * Exception table: `[0,295]->601` and `[296,598]->601`, both `Class
 * java/lang/Exception`, both handled by `pop; return (byte) dIndex`. Since
 * offset 295's own in-try `ireturn` ALSO returns `(byte) dIndex`, and the
 * normal fall-through at 598 goes to the SAME `602: return (byte) dIndex`,
 * this method returns `(byte) dIndex` on every path -- success, early
 * return, or exception. Reproduced by simply always returning `dIndex`
 * after the direct-translation body runs (no JS operation here can throw
 * the way the JVM's array/field accesses could, so there is nothing for an
 * explicit try/catch to actually intercept; see rule note in the file
 * header about not inventing scaffolding for currently-unreachable code).
 *
 * -----------------------------------------------------------------------
 * `private byte a(int, int, int, int, int, int)` (#268), bytecode/b-javap.txt
 * offsets 0..583 (lines 772..1127, confirmed exact -- the next method,
 * `private byte a(int,int,int,int)` i.e. #267, starts at line 1127). Ported
 * below as `computeLegacySubsystemPairScore`.
 *
 * Field identities beyond the ones shared with #267 above:
 *  - `i:I`(#187) -- NOT the same field as `i:B`#188 (the `b(IIII)`
 *    accumulator). Exactly one putfield in the whole class, offset 12 of
 *    THIS method; its only other references are 5 getfields inside
 *    `private void a(boolean)` (#265, now `stepLegacySubsystemFlagPass`,
 *    `LegacySubsystemFlagPass.ts`).
 *  - `e:[B]`(#162) -- `LegacySubsystemArrays.eByte`, `new byte[3]`. NOT the
 *    same field as `e:[[[B]`#161 (the cube used everywhere else in this
 *    method) -- a genuine twin, only referenced at offsets 436..451.
 *  - `a:[[[B]`(#70) / `b:[[[B]`(#134) -- `LegacySubsystemArrays.a`/`.b`,
 *    `new byte[2][101][80]` / `new byte[2][22][5]` (`f.g()` offsets
 *    429..457). Both were independently re-confirmed real (not
 *    permanently-null) in the 2026-09-07 sweep; see `LegacySubsystemAg.ts`
 *    and `LegacySubsystemEntityPathStep.ts`.
 *  - `v:I`(#225) -- the ambient entity id (`game.bUnit` everywhere else
 *    in this port). At this method's only reachable call site (`o()`/`p()`'s
 *    tail via `b(IIII)`/`stepLegacySubsystemScore`), the entity id is
 *    already threaded through explicitly as `id`, so it is passed directly
 *    as `entityId` here rather than round-tripped through `game.bUnit`,
 *    avoiding a sync-order assumption.
 *  - `a:[B]`(#61) -- `dense` (see `LegacyAuxiliaryCopy.ts`'s own derivation).
 *  - `P:()V`(#252) -- ALREADY ported (`stepLegacySubsystemEntityRevertIdle`,
 *    `LegacySubsystemEntityRevertIdle.ts`); called for real below, not left
 *    as a callback.
 *
 * Control flow:
 *
 *   i = (arg6 != 0) ? 5 : 80;                                 // 0..12 (bField187)
 *   onPairSetup(arg2, arg1, arg4, arg3, arg6);                // 15..23 (#264)
 *   for (loopvar = 0; loopvar < c; ) {                        // 26..39 (c = bField144)
 *     onFCall(arg6);                                          // 42..45 (#380)
 *     if (!flags[0] && !flags[1]) {                           // 48..63
 *       onDCall(arg6);                                        // 66..69 (#366)
 *       if (m >= 0) {                                          // 72..76
 *         fByte[g[(m&1)+1]] = (byte)((m>>1)+1);                // 109..135
 *         flags[m&1] = true; onFlagToggle(false); flags[m&1] = false;  // 136..165 (#265)
 *       } else {
 *         fByte[g[0]] = (byte)(e[0][2][loopvar] + 1);          // 79..105
 *       }
 *       break;                                                 // 106/165 goto 210 -- exits the WHOLE loop, not just this iteration
 *     }
 *     onFlagToggle(true);                                      // 168..170 (#265)
 *     if (fByte[g[0]] + arg5 < i) { loopvar++; continue; }      // 173..204
 *     break;                                                    // 194 goto 210
 *   }
 *   copyHRowIntoGridB(...bound=c...);                           // 210..296 (shared idiom)
 *   if (fByte[g[0]] + arg5 >= i) fByte[g[0]] = (byte)(i - arg5); // 299..339
 *   for (loopvar2 = 0; loopvar2 < fByte[g[0]]; loopvar2++) {     // 339..528
 *     const cube = (arg6 == 0) ? a3 : b3;                        // a3=LegacySubsystemArrays.a, b3=.b
 *     cube[0][entityId][loopvar2+arg5] = d3[g[0]][0][loopvar2];
 *     cube[1][entityId][loopvar2+arg5] = d3[g[0]][1][loopvar2];
 *   }
 *   if (arg6 == 0) {                                             // 531..568
 *     dense[707+entityId] = 0; dense[3030+entityId] = 0; P();     // #252, now a real call
 *   }
 *   return fByte[g[0]];                                          // 572..583, OUTSIDE the try -- always this, regardless of the catch below
 *
 * Exception table: `[0,568]->571`, `Class java/lang/Exception`, handler does
 * `pop` then falls through to the SAME `572: return fByte[g[0]]` that the
 * success path also reaches via `goto 572` at offset 568. So, exactly like
 * #267, the return value is identical whether or not anything inside threw
 * -- reproduced by simply computing the body then returning `fByte[g[0]]`
 * unconditionally afterward.
 *
 * -----------------------------------------------------------------------
 * Shared idiom (appears verbatim at #268 offsets 210..296, #267 offsets
 * 201..290 and 509..598): `for (j = 0; j < bound; j++) if (e[1][0][j] >= 0)
 * gridB[e[1][1][j]][e[1][0][j]] = h[j];`, threading the shared `j:I`(#192)
 * field through exactly as the bytecode does (reset to 0, incremented each
 * iteration, left at `bound` on exit for whichever not-yet-ported method
 * reads it next -- see `LegacySubsystemArrays`'s `bField192` docblock).
 *
 * **UPDATE (2026-09-08)**: `onPairSetup`(#264) and `onDCall`(#366) are now
 * REAL calls (`LegacySubsystemPairSetup.ts`'s `stepLegacySubsystemPairSetup`
 * / `stepLegacySubsystemD`), not callbacks -- see that file for their own
 * full derivation. `c:B`(#144, the shared loop bound) can now become
 * nonzero for real, so the loops below -- the shared `gridB`-copy idiom
 * included -- are no longer a guaranteed no-op. `onFCall`(#380) and
 * `onFlagToggle`(#265) are now ALSO real calls
 * (`LegacySubsystemFlagPass.ts`'s `stepLegacySubsystemFCall` /
 * `stepLegacySubsystemFlagPass`) -- none of #267/#268's four callees remain
 * callbacks as of this update. None of the array reads below (`e`/`d`/`gridB`/`a`/`b`
 * cubes at computed indices) are individually bounds-checked -- unlike this
 * file's `dAt` helper for `b(IIII)`, both #267 and #268 already wrap their
 * entire bodies in a catch-all handler that returns the SAME value whether
 * or not an exception occurred (derived above), so a thrown
 * ArrayIndexOutOfBounds would not change either method's return value, only
 * how many of the loop's side effects land -- and since the loops are
 * unreachable today, adding bounds-check scaffolding for a state this port
 * cannot yet produce would be speculative.
 */

export type LegacySubsystemScoreInput = {
  /** b.d:[[B] (#154) -- f.g()-allocated `new byte[2][50]`, LegacySubsystemArrays.dRows. */
  readonly dRows: readonly Int8Array[];
  /** b's own `boolean[] a` (#69), indices 0 and 1; the same array LegacySubsystemBVoidO writes index 2 of. Mutated by #268. */
  readonly localFlags: boolean[];
  /** f.q:B (#211) -- the mission selector, game.mission. */
  readonly q: number;
  /** b.d:[[[B] (#153) -- `new byte[3][2][96]`, LegacySubsystemArrays.d. */
  readonly dCube: readonly Int8Array[][];
  /** b.e:[[[B] (#161) -- `new byte[2][3][10]`, LegacySubsystemArrays.e. */
  readonly eCube: readonly Int8Array[][];
  /** b.a:[[[B] (#70) -- `new byte[2][101][80]`, LegacySubsystemArrays.a. Written by #268. */
  readonly aCube: readonly Int8Array[][];
  /** b.b:[[[B] (#134) -- `new byte[2][22][5]`, LegacySubsystemArrays.b. Written by #268. */
  readonly bCube: readonly Int8Array[][];
  /** f.b:[[B] -- `new byte[96][96]`, game.gridB. Written by the shared h[]-copy idiom. */
  readonly gridB: readonly Int8Array[];
  /** b.g:[B] (#177) -- `new byte[3]`, LegacySubsystemArrays.g. */
  readonly gArr: Int8Array;
  /** b.h:[B] (#181) -- `new byte[10]`, LegacySubsystemArrays.h. */
  readonly hArr: Int8Array;
  /** b.f:[B] (#169) -- `new byte[3]`, LegacySubsystemArrays.fByte. Written by #268. */
  readonly fByte: Int8Array;
  /** b.e:[B] (#162) -- `new byte[3]`, LegacySubsystemArrays.eByte. */
  readonly eByte: Int8Array;
  /** b.a:[B] (#61) / f.e:[B -- the shared dense entity bank. Written by #268's P()-adjacent tail. */
  readonly dense: Int8Array;
  /** b.v:I (#225) -- the ambient entity id, passed explicitly (see docblock above). */
  readonly entityId: number;
  readonly bScalars: Pick<
    LegacySubsystemArrays,
    | "bField68"
    | "bField135"
    | "bField144"
    | "bField164"
    | "bField178"
    | "bField183"
    | "bField187"
    | "bField192"
    | "bField198"
    | "bField201"
    | "bField212"
    | "bField215"
  >;
  /** b.d:[B] (#157) -- `new byte[6]`, LegacySubsystemArrays.dByte. Written by #264. ALSO #380's dScratch. */
  readonly dByte: Int8Array;
  /** b.b:[[B] (#129) -- game.gridC, row-major (gridC[y][x]). Read by #264 AND #380. */
  readonly gridC: readonly Int8Array[];
  /** b.B:I (#8) -- entityBValue(id), precomputed by the caller. Read by #366. */
  readonly bThreshold: number;
  /** b.b:[B (#130) -- packedBytes. Read by #380 (via `stepLegacySubsystemFCall`). */
  readonly packedBytes: Int8Array;
  /** b.a:[S (#66) -- packedOffsets. Read by #380. */
  readonly packedOffsets: Int16Array;
  /** b.b:[S] (#132) -- saveOffsets, forwarded to checkLegacyCellCompatibility. Read by #380. */
  readonly saveOffsets: Int16Array;
  /** f.a:[[[I] (#72 via a:Lf;) -- mainArrays.aInt, forwarded to checkLegacyCellCompatibility. Read by #380. */
  readonly visibilityBits: readonly (readonly Int32Array[])[];
  /** f.c:S (#145 via a:Lf;) -- game.mapWidth. Read by #380. */
  readonly mapWidth: number;
  /** f.d:S (#156 via a:Lf;) -- game.mapHeight. Read by #380. */
  readonly mapHeight: number;
  /** b.u:I (#222) -- game.bTeam, forwarded to checkLegacyCellCompatibility. Read by #380. */
  readonly team: number;
  /** `private void a(int,int)` (#271), b-javap.txt lines 2776..2848. Not ported -- #264's own callee. */
  readonly onRelativePreparation?: (dx: number, dy: number) => void;
  /** `private void e(int)` (#374), b-javap.txt lines 2849..3343. Not ported -- #264's own callee. */
  readonly onE?: (mode: number) => void;
  /** `private byte a(int,int,int)` (#272), b-javap.txt lines 4536+. Not ported -- #264's own callee. */
  /** `private int a(int,int,int)` (#266), b-javap.txt lines 7280..7560. Not ported -- #366's own callee. */
  readonly onComputeQR?: (arg1: number, arg2: number, arg3: number) => number;
};

/** Slices LegacySubsystemScoreInput down to what #264 (stepLegacySubsystemPairSetup) needs. */
function toPairSetupInput(input: LegacySubsystemScoreInput): LegacySubsystemPairSetupInput {
  return {
    dByte: input.dByte,
    eByte: input.eByte,
    gArr: input.gArr,
    fByte: input.fByte,
    dCube: input.dCube,
    eCube: input.eCube,
    hArr: input.hArr,
    gridC: input.gridC,
    gridB: input.gridB,
    bScalars: input.bScalars,
    onRelativePreparation: input.onRelativePreparation,
    onE: input.onE,
    // #272 is a real call inside #264 now (see LegacySubsystemPairSetup.ts's
    // 2026-09-08 wiring note), so it needs #272's own inputs rather than an
    // onCellCheck callback.
    dense: input.dense,
    entityId: input.entityId,
    team: input.team,
    packedBytes: input.packedBytes,
    packedOffsets: input.packedOffsets,
    saveOffsets: input.saveOffsets,
    visibilityBits: input.visibilityBits,
  };
}

/** Slices LegacySubsystemScoreInput down to what #265/#380 (LegacySubsystemFlagPass.ts) need. */
function toFlagPassInput(input: LegacySubsystemScoreInput): LegacySubsystemFlagPassInput {
  return {
    localFlags: input.localFlags,
    fByte: input.fByte,
    gArr: input.gArr,
    eByte: input.eByte,
    dCube: input.dCube,
    eCube: input.eCube,
    dense: input.dense,
    dScratch: input.dByte,
    gridB: input.gridB,
    gridC: input.gridC,
    packedBytes: input.packedBytes,
    packedOffsets: input.packedOffsets,
    saveOffsets: input.saveOffsets,
    visibilityBits: input.visibilityBits,
    mapWidth: input.mapWidth,
    mapHeight: input.mapHeight,
    entityId: input.entityId,
    team: input.team,
    scalars: input.bScalars,
  };
}

/** Slices LegacySubsystemScoreInput down to what #366 (stepLegacySubsystemD) needs. */
function toDInput(input: LegacySubsystemScoreInput): LegacySubsystemDInput {
  return {
    eCube: input.eCube,
    dCube: input.dCube,
    gArr: input.gArr,
    fByte: input.fByte,
    bThreshold: input.bThreshold,
    bScalars: input.bScalars,
    onComputeQR: input.onComputeQR,
  };
}

function toByte(value: number): number {
  return (value << 24) >> 24;
}

/** b.d:[[B] read that throws where the JVM would, instead of yielding undefined. */
function dAt(dRows: readonly Int8Array[], row: number, index: number): number {
  const line = dRows[row];
  if (!line || index < 0 || index >= line.length) {
    throw new RangeError(
      `LegacySubsystemScore: d:[[B][${row}][${index}] is out of bounds -- b(IIII) has no exception table, so this propagates, matching the JVM`,
    );
  }
  return line[index]!;
}

/**
 * Shared idiom at #268 offsets 210..296 and #267 offsets 201..290 /
 * 509..598: `for (j = 0; j < bound; j++) if (e[1][0][j] >= 0)
 * gridB[e[1][1][j]][e[1][0][j]] = h[j];`, threading `j:I`(#192,
 * bScalars.bField192) exactly as the bytecode does.
 */
function copyHRowIntoGridB(
  eCube: readonly Int8Array[][],
  gridB: readonly Int8Array[],
  hArr: Int8Array,
  bound: number,
  bScalars: Pick<LegacySubsystemArrays, "bField192">,
): void {
  for (bScalars.bField192 = 0; bScalars.bField192 < bound; bScalars.bField192++) {
    const j = bScalars.bField192;
    const col = eCube[1][0][j];
    if (col >= 0) {
      gridB[eCube[1][1][j]][col] = hArr[j];
    }
  }
}

/**
 * `private byte a(int, int, int, int)` (#267), b-javap.txt offsets 0..607
 * (lines 1127..1508). See the file header for the full derivation.
 */
export function computeLegacySubsystemBound(
  input: LegacySubsystemScoreInput,
  arg1: number,
  arg2: number,
  arg3: number,
  arg4: number,
): number {
  const { dRows, dCube, eCube, gArr, fByte, eByte, gridB, hArr, localFlags, bScalars } = input;

  dRows[0][0] = toByte(arg2);
  dRows[1][0] = toByte(arg1);
  let dIndex = 1;

  // Exception table: [0,295] -> 601 and [296,598] -> 601, both `Exception`,
  // handler `pop` falling into the SAME `return (byte) d:I` that the in-try
  // `ireturn` at 295 and the normal fall-through reach (598 `goto 602`,
  // 601 `pop`, 602..607). Every path returns the same value -- but catching
  // also SKIPS the rest of the body, and those skipped dRows/gridB writes are
  // a real difference even when the return value is not. Reproduced at the
  // bytecode's own scope rather than left to JS's habit of yielding
  // `undefined` for an out-of-range read instead of throwing.
  try {
    stepLegacySubsystemPairSetup(toPairSetupInput(input), arg2, arg1, arg4, arg3, 0);

    // Offsets 35..48: `a:I = 0; while (a:I < c:B)`. CORRECTED (2026-09-10):
    // this loop counter is the real field `a:I`(#68), not a JS local. The old
    // docblock called it "a genuine per-call local here" because it is reset
    // at offset 37 before this method's own first use -- true, but the wrong
    // test again: #380 (`f(int)`, called at offset 51 from INSIDE the loop)
    // and #366 both READ `a:I` without writing it, using it as the index of
    // the run they are working on. Keeping it local meant #380 saw whatever
    // #264/#374 last left in `bField68` instead of this loop's cursor.
    for (bScalars.bField68 = 0; bScalars.bField68 < bScalars.bField144; ) {
      stepLegacySubsystemFCall(toFlagPassInput(input), 0);

      if (!localFlags[0] && !localFlags[1]) {
        stepLegacySubsystemD(toDInput(input), bScalars.bField68, 0);

        const m = bScalars.bField201;
        const gIdx = gArr[(m & 1) + 1];
        dRows[0][dIndex] = m >= 0 ? dCube[gIdx][0][m >> 1] : eCube[0][0][bScalars.bField68];
        dRows[1][dIndex] = m >= 0 ? dCube[gIdx][1][m >> 1] : eCube[0][1][bScalars.bField68];

        copyHRowIntoGridB(eCube, gridB, hArr, bScalars.bField144, bScalars);

        return toByte(dIndex);
      }

      const b = localFlags[0] && fByte[gArr[1]] < fByte[gArr[2]] ? 1 : localFlags[1] ? 2 : 1;
      bScalars.bField135 = b;

      const gb = gArr[b];
      const half = Math.trunc(fByte[gb] / 2);
      dRows[0][dIndex] = dCube[gb][0][half];
      dRows[1][dIndex] = dCube[gb][1][half];
      // Offsets 436..471: this REPLACES the cursor, it is not an increment.
      bScalars.bField68 = eByte[gb] + 1;
      dIndex = dIndex + 1;
    }

    bScalars.bField198 = 0;
    dRows[0][dIndex] = toByte(arg4);
    dRows[1][dIndex] = toByte(arg3);

    copyHRowIntoGridB(eCube, gridB, hArr, bScalars.bField144, bScalars);
  } catch {
    // offset 601: `pop`, then the shared return below.
  }

  return toByte(dIndex);
}

/**
 * `private byte a(int, int, int, int, int, int)` (#268), b-javap.txt
 * offsets 0..583 (lines 772..1127). See the file header for the full
 * derivation.
 */
export function computeLegacySubsystemPairScore(
  input: LegacySubsystemScoreInput,
  arg1: number,
  arg2: number,
  arg3: number,
  arg4: number,
  arg5: number,
  arg6: number,
): number {
  const { dCube, eCube, gArr, hArr, fByte, eByte, gridB, aCube, bCube, localFlags, dense, entityId, bScalars } = input;

  bScalars.bField187 = arg6 !== 0 ? 5 : 80;

  // Exception table: a single [0,568] -> 571 `Exception` range whose handler
  // falls through to the same `return fByte[g[0]]` the success path reaches.
  // Reproduced at that scope: the shared return makes the value identical
  // either way, but catching SKIPS the remaining gridB/aCube/bCube writes
  // and the P() call, which is a real difference.
  try {
    stepLegacySubsystemPairSetup(toPairSetupInput(input), arg2, arg1, arg4, arg3, arg6);

    // Offsets 26..39 -- same `a:I`(#68) correction as #267 above.
    for (bScalars.bField68 = 0; bScalars.bField68 < bScalars.bField144; ) {
      stepLegacySubsystemFCall(toFlagPassInput(input), arg6);

      if (!localFlags[0] && !localFlags[1]) {
        stepLegacySubsystemD(toDInput(input), bScalars.bField68, arg6);

        const m = bScalars.bField201;
        if (m >= 0) {
          fByte[gArr[(m & 1) + 1]] = toByte((m >> 1) + 1);
          localFlags[m & 1] = true;
          stepLegacySubsystemFlagPass(toFlagPassInput(input), false);
          localFlags[m & 1] = false;
        } else {
          fByte[gArr[0]] = toByte(eCube[0][2][bScalars.bField68] + 1);
        }
        break;
      }

      stepLegacySubsystemFlagPass(toFlagPassInput(input), true);
      if (fByte[gArr[0]] + arg5 < bScalars.bField187) {
        bScalars.bField68 = bScalars.bField68 + 1;
        continue;
      }
      break;
    }

    copyHRowIntoGridB(eCube, gridB, hArr, bScalars.bField144, bScalars);

    // Offsets 304/325/353/390/427/577 each re-read g[0]; #264 and #265 rewrite
    // it during this call. CORRECTED 2026-09-15: the port read it once on
    // entry, so the copy-out took the previous call's best route -- e.g. a
    // gatherer routed through a tree cell and replanned forever.
    if (fByte[gArr[0]] + arg5 >= bScalars.bField187) {
      fByte[gArr[0]] = toByte(bScalars.bField187 - arg5);
    }

    // Offsets 339..528: the copy-out loop reuses the SAME `a:I`(#68) field
    // (`putfield #68` at offset 341), not a second local.
    for (bScalars.bField68 = 0; bScalars.bField68 < fByte[gArr[0]]; bScalars.bField68++) {
      const loopvar2 = bScalars.bField68;
      const cube = arg6 === 0 ? aCube : bCube;
      cube[0][entityId][loopvar2 + arg5] = dCube[gArr[0]][0][loopvar2];
      cube[1][entityId][loopvar2 + arg5] = dCube[gArr[0]][1][loopvar2];
    }

    if (arg6 === 0) {
      dense[707 + entityId] = 0;
      dense[3030 + entityId] = 0;
      stepLegacySubsystemEntityRevertIdle(dense, entityId);
    }

  } catch {
    // offset 571: the handler falls into the shared return below.
  }

  return fByte[gArr[0]];
}

export function stepLegacySubsystemScore(
  input: LegacySubsystemScoreInput,
  arg1: number,
  arg2: number,
  arg3: number,
  arg4: number,
): number {
  const { dRows, localFlags } = input;

  let i = 0;
  const h = computeLegacySubsystemBound(input, arg1, arg2, arg3, arg4);

  for (let j = 0; j < h; ) {
    i = toByte(i + computeLegacySubsystemPairScore(
      input,
      dAt(dRows, 1, j),
      dAt(dRows, 0, j),
      dAt(dRows, 1, j + 1),
      dAt(dRows, 0, j + 1),
      i,
      0,
    ));

    // Offsets 101..119: continue only while one of the two flags is set.
    if (!localFlags[0] && !localFlags[1]) break;
    j = toByte(j + 1);
  }

  return input.q === 3 && i > 2 ? 2 : i;
}
