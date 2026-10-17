import type { LegacySubsystemArrays } from "../../core/LegacySubsystemArrays";
import { checkLegacyCellCompatibility, type LegacyCellCompatibilityCheckInput } from "../world/LegacyCellCompatibilityCheck";

/**
 * Raw port of class b's `private void d(int)` (constant pool #366),
 * bytecode/b-javap.txt offsets 0..461 (lines 1508..1808, confirmed exact --
 * the next method, `private byte b(int,int,int,int)` #332, starts
 * immediately after), and `private void a(int,int,int,int,int)` (#264),
 * offsets 0..597 (lines 2405..2775, confirmed exact -- the next method,
 * `private void a(int,int)` #271, starts immediately after).
 *
 * These are two of `LegacySubsystemScore.ts`'s three remaining unported
 * callees for #267/#268 (`onDCall`/`onPairSetup`); this file replaces both
 * callbacks with real implementations. `onFCall`(#380)/`onFlagToggle`(#265)
 * remain callbacks -- a separate, concurrent port owns those two methods.
 *
 * #264 is the ONLY writer anywhere in class b of `c:B` (#144,
 * `LegacySubsystemArrays.bField144`), the loop bound both #267 and #268
 * iterate on -- until this file existed, every loop gated on it was a real,
 * observed no-op (see `LegacySubsystemScore.ts`'s own docblock). It is also
 * the only writer of `b:I` (#135, `bField135`, seeded to 1000 then refined
 * to a minimum) and `d:[B]` (#157, `LegacySubsystemArrays.dByte`).
 *
 * ---------------------------------------------------------------------
 * FIELD IDENTITIES for #366 (each checked for same-letter twins by
 * `grep -n "#N " bytecode/b-javap.txt` against its own inline comment):
 *  - `e:[[[B]`(#161) -- `LegacySubsystemArrays.e` (`eCube`), same field
 *    #267/#268 already use.
 *  - `a:I`(#68) -- read-only in this method (offsets 10/23/46/64/83/104,
 *    zero putfield sites), so it is NOT this method's own local -- it is
 *    the ambient value the CALLER (#267/#268) currently has in its own
 *    `a:I`-backed loop counter (`loopvar` in `LegacySubsystemScore.ts`,
 *    itself confirmed a genuine per-call local there, reset at each
 *    caller's own offset 37/26). Since that caller keeps `loopvar` as a
 *    pure JS local rather than writing it back to a shared field, this
 *    port threads the SAME value through explicitly as a parameter
 *    (`loopvar` below) rather than reading a stale/unsynced shared field
 *    -- same reasoning `LegacySubsystemScore.ts` already applies to
 *    `entityId`/`v:I`#225.
 *  - `q:B`(#212) / `r:B`(#215) -- BOTH brand new to this port. NOT the
 *    same field as `f.q:B`(#211, `game.mission`, a DIFFERENT constant-pool
 *    index reached via `a:Lf;`) despite the identical letter, and NOT the
 *    same as `game.subsystemRByte` (that is class b's OWN `R:B`(#48,
 *    uppercase), a different field entirely -- confirmed via
 *    `LegacyGameState.ts`'s own docblock on `subsystemRByte`). `q:B`/
 *    `r:B`(#212/#215) have exactly one writer in the whole class:
 *    `private int a(int,int,int)` (#266, bytecode/b-javap.txt:7280..7560,
 *    NOT in scope here -- kept as the `onComputeQR` callback), and their
 *    only reader is THIS method. Modeled as new `LegacySubsystemArrays`
 *    fields (`bField212`/`bField215`); #266 writes them since 2026-09-28
 *    (runtime `occupancyCheck`, also wired as `onComputeQR`).
 *  - `l:I`(#198) / `m:I`(#201) -- ALREADY modeled (`bField198`/
 *    `bField201`, added when #267/#268 were ported -- that docblock
 *    already correctly predicted both are read/written here too).
 *  - `n:I`(#203) -- brand new. `grep -n "#203 " bytecode/b-javap.txt`
 *    shows exactly 2 references, both inside this method's own offset
 *    range (170 putfield, 183 getfield) -- a genuine per-call LOCAL, not
 *    a shared field. No `LegacySubsystemArrays` entry needed.
 *  - `g:[B]`(#177) / `f:[B]`(#169) -- `gArr`/`fByte`, already known.
 *  - `B:I`(#8) -- `entityBValue(id)` elsewhere in this port (see
 *    `LegacyRuntimeState.ts`); passed in precomputed as `bThreshold`
 *    (matching `LegacySubsystemP.ts`'s own convention for the same
 *    field) rather than re-derived here.
 *  - `d:[[[B]`(#153) -- `dCube`, already known.
 *  - `a:(III)I`(#266) -- unported callee, `onComputeQR`. Its own body was
 *    read in full while tracing this method (needed to understand what
 *    `q:B`/`r:B` mean) -- see the callback's own doc comment below for
 *    the derivation and a correction this surfaced in an existing file.
 *
 * Control flow (#366, offsets 0..461):
 *
 *   onComputeQR(eCube[0][0][loopvar], eCube[0][1][loopvar], arg1);  // 0..31, result discarded
 *   l = (q - eCube[0][0][loopvar])**2 + (r - eCube[0][1][loopvar])**2;  // 32..108
 *   m = -1;                                                              // 111..113
 *   if (l <= B) return;                                                 // 116..124
 *
 *   bChoice = (fByte[g[1]] <= fByte[g[2]]) ? 2 : 1;                     // 127..166
 *   n = fByte[g[bChoice]] * 2;                                          // 166..170
 *
 *   for (j = 0; j < n; j++) {                                           // 173..458
 *     gIdx = g[(j&1)+1];
 *     if (fByte[gIdx] <= (j>>1)) continue;                              // 189..213
 *     k = (q - dCube[gIdx][0][j>>1])**2 + (r - dCube[gIdx][1][j>>1])**2; // 216..348
 *     if (k >= l) continue;                                             // 351..359
 *     l = k; m = j;                                                     // 362..377
 *     result = onComputeQR(dCube[gIdx][0][j>>1], dCube[gIdx][1][j>>1], arg1); // 378..434
 *     if (result / 10 <= B) return;                                     // 437..447 (idiv truncates toward 0)
 *   }
 *
 * No exception table on #366 itself (confirmed -- the method's own Code
 * attribute has none), so an out-of-range array read here would propagate
 * uncaught to the caller. #267/#268 DO each wrap their own call to this
 * method in a catch-all (see `LegacySubsystemScore.ts`), so that remains
 * the effective boundary -- this file does not add its own try/catch,
 * matching the bytecode's own scope exactly.
 *
 * ---------------------------------------------------------------------
 * FIELD IDENTITIES for #264:
 *  - `a:I`(#68) -- reset to 0 at the start of EACH of this method's three
 *    internal loops (offsets 13, 80, 204) before ever being read, and its
 *    value on exit is never read again inside #264 either.
 *    **CORRECTED (2026-09-10)**: that used to be the argument for keeping it
 *    as a JS local. It is the wrong test. #264's own callers (#267/#268) do
 *    re-initialize their own `loopvar`, but the methods those callers invoke
 *    -- #380 (`f(int)`) and #265 (`a(boolean)`) -- read `a:I` ambiently
 *    WITHOUT writing it first, and `e(int)`(#374) writes it on the way in.
 *    So the field must carry #264's terminal value out, and all three loops
 *    below now step `bScalars.bField68` directly.
 *  - `d:[B]`(#157) -- `LegacySubsystemArrays.dByte`, `new byte[6]`
 *    (matches the field's existing 6-element allocation exactly). WRITE
 *    reads it via `#157` at exactly 2 sites, both inside this method's own
 *    first loop; grep across the whole class shows ~30 further reads, all
 *    inside `private void e(int)` (#374, bytecode/b-javap.txt:2849..3343,
 *    the very next method after `a(int,int)`#271, NOT in scope -- kept as
 *    the `onE` callback). #264 is `dByte`'s only writer.
 *  - `b:I`(#135) -- ALREADY modeled (`bField135`). Seeded to 1000, then
 *    refined downward by the `g[0]` argmin search -- written here, and
 *    per that field's own `LegacySubsystemArrays` docblock, read by ~30
 *    further sites across ~12 other not-yet-ported methods, so the final
 *    minimum genuinely needs to reach the shared field (not stay a local
 *    -- see the correction note below about an existing file that got
 *    this wrong).
 *  - `e:[B]`(#162) / `g:[B]`(#177) / `f:[B]`(#169) -- `eByte`/`gArr`/
 *    `fByte`, already known.
 *  - `d:B`(#158) / `e:B`(#163) -- BOTH brand new, BOTH singular bytes
 *    distinct from `d:[B]`#157/`d:[[B]`#154/`d:[[[B]`#153/`d:I`#155 and
 *    `e:[B]`#162/`e:[[[B]`#161 respectively despite the shared letters.
 *    `grep -n "#158 "`/`grep -n "#163 "` across the whole class show
 *    every reference confined to this method's own offset range (5 and 3
 *    references respectively) -- genuine per-call locals, no
 *    `LegacySubsystemArrays` entry needed.
 *  - `c:B`(#144) -- ALREADY modeled (`bField144`). THE loop bound #267/
 *    #268 need; this is its only writer in the whole class.
 *  - `b:[[B]`(#129) -- `gridC`, already known (row-major, `gridC[y][x]`).
 *  - `d:[[[B]`(#153) / `e:[[[B]`(#161) -- `dCube` (read-only here) /
 *    `eCube` (written here), already known.
 *  - `h:[B]`(#181) -- `hArr`, already known.
 *  - `a:Lf;`(#60) then `f.b:[[B]` (#133 as read from here) -- `gridB`,
 *    already known (same field #267/#268 already write via the shared
 *    `copyHRowIntoGridB` idiom).
 *  - `a:(II)V`(#271) / `e:(I)V`(#374) / `a:(III)B`(#272) -- three unported
 *    callees, kept as `onRelativePreparation`/`onE`. (#272 was also a
 *    callback until 2026-09-08; it is a real call now -- see the wiring
 *    note at its call site.)
 *    `a(III)B`#272 (bytecode/b-javap.txt:4536+) is a DIFFERENT method from
 *    `a(III)I`#266 above (same erased parameter types, different return
 *    type -- legal at the class-file level even though `javac` would
 *    never emit two Java-source overloads differing only by return type;
 *    confirmed via each one's own distinct constant-pool index and
 *    descriptor).
 *
 * Control flow (#264, offsets 0..597, entire body wrapped by ONE exception
 * range):
 *
 *   onRelativePreparation(arg3-arg1, arg4-arg2);                  // 0..8    (#271)
 *   for (a=0; a<3; a++) { dByte[a*2]=arg1; dByte[a*2+1]=arg2; }    // 11..62
 *   onE(arg5);                                                     // 65..68  (#374)
 *   b = 1000;                                                      // 71..75  (bField135)
 *   for (a=0; a<3; a++) if (eByte[a] < b) { b = eByte[a]; g[0]=a; } // 78..141
 *   g[1] = (g[0]+1) % 3; g[2] = (g[0]+2) % 3;                       // 144..177
 *   d = 0; c = 0;                                                   // 178..185 (bField144)
 *   if (eByte[g[0]] <= 0) return;                                   // 188..199
 *   for (a=0; a < fByte[g[0]]; a++) {                                // 207..592
 *     e = d;                                                         // 225..230 (prev d)
 *     x6 = dCube[g[0]][0][a]; y7 = dCube[g[0]][1][a];                 // 233..271
 *     d = (gridC[y7][x6]===0) ? 0 : a(x6, y7, arg5);   // 273..301 (#272)
 *
 *     if (e===0 && d!==0) {                                          // "opening a run"
 *       if (c >= 10) return;                                         // 318..327
 *       eCube[0][0][c] = a===0 ? arg1 : dCube[g[0]][0][a-1];          // 330..374
 *       eCube[0][1][c] = a===0 ? arg2 : dCube[g[0]][1][a-1];          // 375..419
 *       eCube[0][2][c] = a-1;                                        // 420..439
 *       eCube[1][0][c] = -1;                                         // 440..453
 *       c = c+1;                                                     // 454..462
 *     } else if (e!==0 && d===0) {                                   // "closing a run"
 *       eCube[1][0][c-1] = x6; eCube[1][1][c-1] = y7; eCube[1][2][c-1] = a;  // 482..535
 *       hArr[c-1] = gridB[y7][x6];                                   // 536..559
 *       gridB[y7][x6] = 256 - c;  // == (byte) -c                    // 560..581
 *     }
 *     // else: no state transition, nothing happens this iteration.
 *   }
 *
 * Exception table: `[0,595] -> 596`, `Class java/lang/Exception`, handler
 * `pop` then falls through to the shared `597: return`. The direct
 * `return` at offset 595 (loop-condition-false exit), the early returns at
 * 199/327 (both plain `goto`s to a `return`, not exceptional), and the
 * handler's own fallthrough all reach the SAME void return -- but exactly
 * like #267/#268, catching also skips whatever body writes had not yet
 * run, which is a real difference this port reproduces with a real
 * try/catch around the whole body (matching the exact offset range, not
 * inventing a narrower or wider one).
 *
 * ---------------------------------------------------------------------
 * CORRECTION surfaced while tracing #266 for `onComputeQR` above: this
 * project's existing `LegacySubsystemP.ts` (`checkLegacyAvgDistance`)
 * models `a(int,int,int):int` (#266) as an unconditional guaranteed throw
 * ("unconditionally dereferences the confirmed-permanently-null b:[S]
 * (#132) and throws"). That premise is now known false -- `b:[S]`(#132,
 * `saveOffsets`) was itself retracted and confirmed real on 2026-09-07
 * (see `LegacySubsystemEntityTransform.ts`'s own retraction, and
 * `docs/unknowns.md`'s 2026-09-07 sweep). Reading #266's full body here
 * (offsets 0..499, bytecode/b-javap.txt:7280..7560) independently
 * confirms it is ordinary field/table arithmetic with no unconditional
 * null dereference anywhere -- it reads `saveOffsets` at several
 * `saload`-computed indices (all real, all in-bounds by construction) and
 * returns either a clamped packed-table lookup or the sentinel `200`.
 * NOT fixed here (out of this port's assigned scope -- #266 itself is
 * still unported, and `LegacySubsystemP.ts` is a different file with a
 * different owner), but flagged for follow-up: `checkLegacyAvgDistance`'s
 * "always throws" stub is now a known-stale conclusion, not a confirmed
 * one.
 *
 * A second, independent issue surfaced the same way: this project also
 * already has a `LegacyPathPreparation.ts` (`prepareLegacyPath`,
 * `LegacyRuntimeState.ts`'s dead/unwired `preparePathLive`) that ports
 * this SAME method (#264). Cross-checking it against the bytecode found
 * two real bugs: (1) its first loop writes `input.pathData[0][0/1][index]`
 * -- i.e. `LegacySubsystemArrays.d` (`dCube`, #153, the 3-row/2-col/96-
 * col cube) -- where the real bytecode targets `d:[B]`(#157, the flat
 * 6-byte `dByte` array), a completely different field despite the shared
 * "d" letter; (2) the `b:I`(#135) minimum is kept as a pure local
 * (`minimum`) and never written back to the shared field, even though
 * `LegacySubsystemArrays.bField135` is genuinely cross-method (see above).
 * Neither bug is currently observable (that file's own `onE`/#374 callback
 * -- the only reader of `dByte` -- is unimplemented, and none of
 * `bField135`'s dozen other readers are ported yet), and the function is
 * not called from anywhere live, so it was left as-is rather than edited
 * -- also out of this port's assigned file scope. This file
 * (`LegacySubsystemPairSetup.ts`) is the one actually wired into
 * `LegacySubsystemScore.ts`/`LegacyRuntimeState.ts` below.
 */

function toByte(value: number): number {
  return (value << 24) >> 24;
}

export type LegacySubsystemDInput = {
  /** b.e:[[[B] (#161), LegacySubsystemArrays.e. */
  readonly eCube: readonly Int8Array[][];
  /** b.d:[[[B] (#153), LegacySubsystemArrays.d. */
  readonly dCube: readonly Int8Array[][];
  /** b.g:[B] (#177), LegacySubsystemArrays.g. */
  readonly gArr: Int8Array;
  /** b.f:[B] (#169), LegacySubsystemArrays.fByte. */
  readonly fByte: Int8Array;
  /** b.B:I (#8), entityBValue(id) -- precomputed by the caller. */
  readonly bThreshold: number;
  readonly bScalars: Pick<LegacySubsystemArrays, "bField198" | "bField201" | "bField212" | "bField215">;
  /** `private int a(int,int,int)` (#266), b-javap.txt lines 7280..7560. Not ported. */
  readonly onComputeQR?: (arg1: number, arg2: number, arg3: number) => number;
};

/**
 * `private void d(int)` (#366), b-javap.txt lines 1508..1808. See the file
 * header for the full derivation. `loopvar` is the caller's own `a:I`
 * (#68) value at the moment of the call (see the field-identity note
 * above) -- threaded through explicitly rather than via a shared field.
 */
export function stepLegacySubsystemD(input: LegacySubsystemDInput, loopvar: number, arg1: number): void {
  const { eCube, dCube, gArr, fByte, bThreshold, bScalars } = input;

  const e00 = eCube[0]![0]![loopvar]!;
  const e01 = eCube[0]![1]![loopvar]!;
  input.onComputeQR?.(e00, e01, arg1);

  const dq0 = bScalars.bField212 - e00;
  const dr0 = bScalars.bField215 - e01;
  bScalars.bField198 = dq0 * dq0 + dr0 * dr0;
  bScalars.bField201 = -1;

  if (bScalars.bField198 <= bThreshold) return;

  const bChoice = fByte[gArr[1]!]! <= fByte[gArr[2]!]! ? 2 : 1;
  const n = fByte[gArr[bChoice]!]! * 2;

  for (let j = 0; j < n; j += 1) {
    const gIdx = gArr[(j & 1) + 1]!;
    if (fByte[gIdx]! <= j >> 1) continue;

    const dx = dCube[gIdx]![0]![j >> 1]!;
    const dy = dCube[gIdx]![1]![j >> 1]!;
    const kdq = bScalars.bField212 - dx;
    const kdr = bScalars.bField215 - dy;
    const k = kdq * kdq + kdr * kdr;
    if (k >= bScalars.bField198) continue;

    bScalars.bField198 = k;
    bScalars.bField201 = j;

    const result = input.onComputeQR?.(dx, dy, arg1) ?? 0;
    if (Math.trunc(result / 10) <= bThreshold) return;
  }
}

export type LegacySubsystemPairSetupInput = {
  /** b.d:[B] (#157), LegacySubsystemArrays.dByte, new byte[6]. Only this method writes it. */
  readonly dByte: Int8Array;
  /** b.e:[B] (#162), LegacySubsystemArrays.eByte. */
  readonly eByte: Int8Array;
  /** b.g:[B] (#177), LegacySubsystemArrays.g. Written here. */
  readonly gArr: Int8Array;
  /** b.f:[B] (#169), LegacySubsystemArrays.fByte. */
  readonly fByte: Int8Array;
  /** b.d:[[[B] (#153), LegacySubsystemArrays.d. Read-only here. */
  readonly dCube: readonly Int8Array[][];
  /** b.e:[[[B] (#161), LegacySubsystemArrays.e. Written here. */
  readonly eCube: readonly Int8Array[][];
  /** b.h:[B] (#181), LegacySubsystemArrays.h. Written here. */
  readonly hArr: Int8Array;
  /** b.b:[[B] (#129), game.gridC. Row-major: gridC[y][x]. */
  readonly gridC: readonly Int8Array[];
  /** f.b:[[B] (#133, via a:Lf;), game.gridB. Read then written. */
  readonly gridB: readonly Int8Array[];
  readonly bScalars: Pick<LegacySubsystemArrays, "bField68" | "bField135" | "bField144">;
  /** `private void a(int,int)` (#271), b-javap.txt lines 2776..2848. Not ported. */
  readonly onRelativePreparation?: (dx: number, dy: number) => void;
  /** `private void e(int)` (#374), b-javap.txt lines 2849..3343. Not ported. */
  readonly onE?: (mode: number) => void;
  /** `private byte a(int,int,int)` (#272), b-javap.txt lines 4536+. Not ported. */
  /**
   * b.a:[B] (#61) / f.e:[B -- the dense entity bank, forwarded to
   * checkLegacyCellCompatibility (#272).
   */
  readonly dense: Int8Array;
  /** b.v:I (#225) -- the ambient entity id, forwarded to #272. */
  readonly entityId: number;
  /** b.u:I (#222) -- game.bTeam, forwarded to #272. */
  readonly team: number;
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
  /** b.b:[S] (#132) -- saveOffsets, forwarded to #272. */
  readonly saveOffsets: Int16Array;
  /** f.a:[[[I] (#72 via a:Lf;) -- mainArrays.aInt, forwarded to #272. */
  readonly visibilityBits: readonly (readonly Int32Array[])[];
};

/**
 * `private void a(int,int,int,int,int)` (#264), b-javap.txt lines
 * 2405..2775. See the file header for the full derivation, including the
 * exception table (the whole body is wrapped, matching offsets [0,595]).
 */
export function stepLegacySubsystemPairSetup(
  input: LegacySubsystemPairSetupInput,
  arg1: number,
  arg2: number,
  arg3: number,
  arg4: number,
  arg5: number,
): void {
  const { dByte, eByte, gArr, fByte, dCube, eCube, hArr, gridC, gridB, bScalars } = input;

  // #272's own input bag, built once -- same shape LegacySubsystemFlagPass
  // uses for the identical callee.
  const compatInput: LegacyCellCompatibilityCheckInput = {
    state: input.dense,
    id: input.entityId,
    team: input.team,
    gridC,
    packedBytes: input.packedBytes,
    packedOffsets: input.packedOffsets,
    saveOffsets: input.saveOffsets,
    visibilityBits: input.visibilityBits,
  };

  try {
    input.onRelativePreparation?.(arg3 - arg1, arg4 - arg2);

    // Offsets 11..62. CORRECTED (2026-09-10): all three of this method's
    // loops step the real field `a:I`(#68), not a JS local. The old docblock
    // called it "a pure per-call local here" on the grounds that each loop
    // resets it before reading and #264 never reads it again afterwards --
    // both true, and both irrelevant, because #380 (`f(int)`) and #265
    // (`a(boolean)`) DO read `a:I` ambiently, without ever writing it first
    // (see LegacySubsystemFlagPass.ts's own field notes). Keeping it in a
    // local left `bField68` holding whatever `e(int)` last wrote, instead of
    // this method's own terminal value.
    for (bScalars.bField68 = 0; bScalars.bField68 < 3; bScalars.bField68 += 1) {
      const a = bScalars.bField68;
      dByte[a << 1] = toByte(arg1);
      dByte[(a << 1) + 1] = toByte(arg2);
    }

    input.onE?.(arg5);

    bScalars.bField135 = 1000;
    // Offsets 71..141 -- same `a:I`(#68) correction as the loop above.
    for (bScalars.bField68 = 0; bScalars.bField68 < 3; bScalars.bField68 += 1) {
      const a = bScalars.bField68;
      if (eByte[a]! < bScalars.bField135) {
        bScalars.bField135 = eByte[a]!;
        gArr[0] = toByte(a);
      }
    }
    gArr[1] = toByte(((gArr[0] ?? 0) + 1) % 3);
    gArr[2] = toByte(((gArr[0] ?? 0) + 2) % 3);

    let dScalar = 0;
    bScalars.bField144 = 0;

    const g0 = gArr[0]!;
    if (eByte[g0]! <= 0) return;

    // Offsets 202..592 -- same `a:I`(#68) correction again.
    for (bScalars.bField68 = 0; bScalars.bField68 < fByte[g0]!; bScalars.bField68 += 1) {
      const a = bScalars.bField68;
      const eScalar = dScalar;
      const x = dCube[g0]![0]![a]!;
      const y = dCube[g0]![1]![a]!;

      // Offsets 291..301: `d:B = a(x, y, arg5)`, constant pool #272 -- the SAME
      // `private byte a(int,int,int)` that #380 (LegacySubsystemFlagPass) calls
      // at its own offset 357, already ported as checkLegacyCellCompatibility.
      // WIRED 2026-09-08: this was an unwired `onCellCheck` callback, which
      // meant #264's run-detection loop could never fire, so c:B (bField144)
      // stayed 0 and #267/#268's loops were no-ops in real gameplay -- the
      // "already ported but unwired" pattern this codebase has hit repeatedly.
      dScalar = (gridC[y]?.[x] ?? 0) === 0
        ? 0
        : (checkLegacyCellCompatibility(compatInput, x, y, arg5) ? 1 : 0);

      if (eScalar === 0 && dScalar !== 0) {
        if (bScalars.bField144 >= 10) return;
        const c = bScalars.bField144;
        eCube[0]![0]![c] = toByte(a === 0 ? arg1 : dCube[g0]![0]![a - 1]!);
        eCube[0]![1]![c] = toByte(a === 0 ? arg2 : dCube[g0]![1]![a - 1]!);
        eCube[0]![2]![c] = toByte(a - 1);
        eCube[1]![0]![c] = -1;
        bScalars.bField144 = toByte(c + 1);
      } else if (eScalar !== 0 && dScalar === 0) {
        const c = bScalars.bField144;
        eCube[1]![0]![c - 1] = toByte(x);
        eCube[1]![1]![c - 1] = toByte(y);
        eCube[1]![2]![c - 1] = toByte(a);
        hArr[c - 1] = toByte(gridB[y]?.[x] ?? 0);
        if (gridB[y]) gridB[y]![x] = toByte(256 - c);
      }
    }
  } catch {
    // offset 596: pop, then the shared void return.
  }
}
