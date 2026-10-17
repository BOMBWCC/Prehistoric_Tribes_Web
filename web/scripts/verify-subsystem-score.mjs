// b.b(int,int,int,int):byte (#332), the score accumulator o()'s tail stores
// into dense[808+v]. RETRACTED 2026-09-07: this call used to be inlined as a
// literal 0 via a chain rooted in "d:[[B](#154) is permanently null"; f.g()
// allocates it as new byte[2][50]. 2026-09-08: its two callees, #267
// (`private byte a(int,int,int,int)`) and #268 (`private byte
// a(int,int,int,int,int,int)`), are now ported too as
// computeLegacySubsystemBound / computeLegacySubsystemPairScore. See
// LegacySubsystemScore.ts's docblock for the full derivation.
//
// 2026-09-08 REPAIR: as of the same day, #267/#268's four remaining callees
// -- onPairSetup/onDCall (#264/#366, LegacySubsystemPairSetup.ts) and
// onFCall/onFlagToggle (#380/#265, LegacySubsystemFlagPass.ts) -- stopped
// being callback spies and became real calls. That broke most of this
// file's cases in one of two ways:
//   (a) cases that asserted on `onPairSetup`/`onDCall`/`onFlagToggle`/
//       `onFCall` mock functions passed via `makeInput({...})` -- those
//       options are no longer read by the real code at all, so the mocks
//       silently never fire.
//   (b) cases that preset `input.bScalars.bField144` (c:B) directly to force
//       the #267/#268 loop to "run". #264 is c:B's ONLY writer in the whole
//       class and it is now called for real at the TOP of every
//       computeLegacySubsystemBound/PairScore invocation, UNCONDITIONALLY
//       resetting c:B to 0 (and only leaving it nonzero if #264's own
//       run-detection loop -- gated by the still-unported onCellCheck/#272
//       callback -- opens a run). A preset c:B is simply overwritten before
//       the loop condition is ever read.
// A further, less obvious consequence discovered while re-deriving this
// file by hand: #380 (onFCall) is called at the TOP of every #267/#268 loop
// pass, BEFORE the `!flags[0]&&!flags[1]` check, and it unconditionally
// zeroes `fByte[gArr[1]]`/`fByte[gArr[2]]` and sets
// `localFlags[bField164-1]=false` for whichever of gArr[1]/gArr[2] it is
// currently processing -- so a preset `localFlags`/`fByte[gArr[1..2]]` is
// ALSO overwritten before #267/#268 read it, unless #380's own real
// direction-scan discovers a `gridB` "occupied" sentinel and sets a flag
// back to true itself. Every case below that needs c:B>0 or flags-true now
// drives that state through the REAL #264/#380/#366/#265, by hand-deriving
// exact packedBytes/packedOffsets/gridC/gridB values from the bytecode
// (documented inline at each site) rather than presetting fields the real
// code immediately overwrites.
//
// Exhaustive branch/exception coverage of #264/#366 (LegacySubsystemPairSetup.ts)
// and #380/#265 (LegacySubsystemFlagPass.ts) themselves now lives in
// verify-subsystem-pair-setup.mjs and verify-subsystem-flag-pass.mjs, which
// call those functions directly and can control their inputs precisely.
// This file stays focused on #267/#268/b(IIII): that the real calls are
// wired with the right arguments, that c:B's new real value actually drives
// the loops, and that b(IIII)'s own exception/accumulation behavior holds.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import vm from "node:vm";

const srcDir = new URL("../src/", import.meta.url).pathname;
const context = vm.createContext({ Int8Array, Int16Array, Int32Array, Array, console, Math, RangeError });
const cache = new Map();

function loadModule(specifier, fromDir) {
  const absPath = path.resolve(fromDir, specifier) + ".ts";
  if (cache.has(absPath)) return cache.get(absPath).exports;
  const module = { exports: {} };
  cache.set(absPath, module);
  const source = fs.readFileSync(absPath, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const localRequire = (spec) => loadModule(spec, path.dirname(absPath));
  const fn = vm.compileFunction(output, ["module", "exports", "require"], { parsingContext: context });
  fn(module, module.exports, localRequire);
  return module.exports;
}

const { stepLegacySubsystemScore, computeLegacySubsystemBound, computeLegacySubsystemPairScore } =
  loadModule("./sim/tribe/LegacySubsystemScore", srcDir);

function byteCube(depth, rows, cols) {
  return Array.from({ length: depth }, () => Array.from({ length: rows }, () => new Int8Array(cols)));
}

function byteMatrix(rows, cols) {
  return Array.from({ length: rows }, () => new Int8Array(cols));
}

function makeScalars() {
  return {
    bField68: 0,
    bField135: 0,
    bField144: 0,
    bField164: 0,
    bField178: 0,
    bField183: 0,
    bField187: 0,
    bField192: 0,
    bField198: 0,
    bField201: 0,
    bField212: 0,
    bField215: 0,
  };
}

function makeInput(over = {}) {
  return {
    dRows: [new Int8Array(50), new Int8Array(50)],
    localFlags: [false, false],
    q: 0,
    dCube: byteCube(3, 2, 96),
    eCube: byteCube(2, 3, 10),
    aCube: byteCube(2, 101, 80),
    bCube: byteCube(2, 22, 5),
    gridB: byteMatrix(96, 96),
    gridC: byteMatrix(96, 96),
    gArr: new Int8Array(3),
    hArr: new Int8Array(10),
    fByte: new Int8Array(3),
    eByte: new Int8Array(3),
    dByte: new Int8Array(6),
    dense: new Int8Array(10000),
    entityId: 4,
    team: 0,
    bThreshold: 0,
    packedBytes: new Int8Array(256),
    packedOffsets: new Int16Array(64),
    saveOffsets: new Int16Array(64),
    visibilityBits: [
      Array.from({ length: 3 }, () => new Int32Array(96).fill(-1)),
      Array.from({ length: 3 }, () => new Int32Array(96).fill(-1)),
    ], // fully explored: #272's mode-0 visibility gate must not reject
    mapWidth: 96,
    mapHeight: 96,
    bScalars: makeScalars(),
    ...over,
  };
}

// ---------------------------------------------------------------------
// computeLegacySubsystemBound (#267)
// ---------------------------------------------------------------------

// c:B (bField144) === 0 -> the outer loop never runs. dIndex starts at 1
// (offsets 20..22) and is only ever incremented inside the loop, so the
// "loop completed" tail runs immediately: l:I=0, dRows[*][1]=arg4/arg3,
// return (byte) 1. The two prologue writes (dRows[*][0]=arg2/arg1) always
// happen regardless (offsets 0..19). c:B=0 here is the REAL, default
// outcome of calling the now-real #264 with all-default eByte (see the
// next case), not a manual preset.
{
  const input = makeInput();
  const r = computeLegacySubsystemBound(input, 7, 8, 9, 10);
  assert.equal(r, 1);
  assert.equal(input.dRows[0][0], 8, "dRows[0][0] = arg2");
  assert.equal(input.dRows[1][0], 7, "dRows[1][0] = arg1");
  assert.equal(input.bScalars.bField198, 0, "l:I reset on the loop-completed tail");
  assert.equal(input.dRows[0][1], 10, "dRows[0][dIndex] = arg4");
  assert.equal(input.dRows[1][1], 9, "dRows[1][dIndex] = arg3");
}

// #264 is now a real call (stepLegacySubsystemPairSetup), not the old
// `onPairSetup` spy. Two things to verify: (1) it is invoked with the right
// swapped/forwarded arguments -- proven via its own still-unported
// `onRelativePreparation`(#271)/`onE`(#374) callbacks, which #264 itself
// calls with (arg3-arg1, arg4-arg2) and (arg5) respectively (offsets 0..8 /
// 65..68 of #264); and (2) with default (all-zero) eByte, #264's own early
// return (`if (eByte[g0]<=0) return`, offset 188..199) fires immediately,
// so c:B (bField144) really does end at exactly 0 -- not just "some number".
{
  const seenPrep = [];
  const seenE = [];
  const input = makeInput({
    onRelativePreparation: (dx, dy) => seenPrep.push([dx, dy]),
    onE: (mode) => seenE.push(mode),
  });
  assert.equal(input.bScalars.bField144, 0, "c:B starts at 0");
  computeLegacySubsystemBound(input, 1, 2, 3, 4);
  // #267 calls stepLegacySubsystemPairSetup(input, arg2=2, arg1=1, arg4=4, arg3=3, 0):
  // onRelativePreparation(inner_arg3-inner_arg1, inner_arg4-inner_arg2) = (4-2, 3-1) = (2, 2).
  assert.deepEqual(seenPrep, [[2, 2]], "#264 forwards (arg2,arg1,arg4,arg3,0), proven via onRelativePreparation");
  assert.deepEqual(seenE, [0], "#264's own arg5 (hardcoded 0 from #267) reaches onE");
  assert.equal(input.bScalars.bField144, 0, "c:B stays 0: eByte[g0]<=0 triggers #264's own early return");
}

// #264 CAN drive c:B nonzero for real: its own run-detection loop (offsets
// 207..592) needs (1) eByte[g0]>0 to avoid the early return, (2)
// fByte[g0]>=1 so the loop body runs at least once, and (3) a nonzero
// onCellCheck(#272) result at a gridC cell that is itself nonzero (offset
// 273..301: `dScalar = gridC[y][x]===0 ? 0 : onCellCheck(x,y,arg5)`) to
// "open a run" on that first iteration (offsets 318..462): eCube[0][0/1][0]
// gets the CALLER's own (arg1,arg2) (here, #264's own inner args -- #267's
// outer arg2/arg1, since #267 swaps them), eCube[0][2][0]=a-1=-1,
// eCube[1][0][0]=-1, and c:B becomes 1.
{
  // #272 is a real call now (see LegacySubsystemPairSetup.ts's 2026-09-08
  // wiring note), so instead of stubbing its result this drives the real
  // checkLegacyCellCompatibility: gridC[1][1] nonzero and in [1,122], the
  // vision plane explored, and nothing on the reject paths.
  const input = makeInput();
  input.eByte.set([2, 2, 2]); // ties -> #264's own armin keeps g[0]=0
  input.fByte[0] = 1; // one pass through #264's own loop (a=0 only)
  input.dCube[0][0][0] = 1;
  input.dCube[0][1][0] = 1;
  input.gridC[1][1] = 5; // nonzero -> #264 calls #272 instead of forcing dScalar=0

  computeLegacySubsystemBound(input, 10, 20, 30, 40);

  assert.equal(input.bScalars.bField144, 1, "c:B becomes 1 for real: #264 opened one run");
  // inner arg1 = outer arg2 = 20, inner arg2 = outer arg1 = 10 (#267's own swap).
  assert.equal(input.eCube[0][0][0], 20, "eCube[0][0][0] = #264's own arg1 (outer arg2)");
  assert.equal(input.eCube[0][1][0], 10, "eCube[0][1][0] = #264's own arg2 (outer arg1)");
  assert.equal(input.eCube[0][2][0], -1, "eCube[0][2][0] = a-1 = -1 (a=0)");
  assert.equal(input.eCube[1][0][0], -1, "eCube[1][0][0] = -1 (opening sentinel)");
}

// Full real chain, both flags naturally clear: #264 opens a run (c:B=1, as
// above), then #380 (onFCall, now real) runs once before the flag check --
// with all-default (zero) packedBytes/packedOffsets it is a genuine no-op
// (every direction delta is 0, so the very first scan position always
// matches the anchor exactly and the middle loop breaks immediately without
// ever committing anything), leaving fByte[gArr[1]]/fByte[gArr[2]] at 0 and
// localFlags untouched (both already false). That means #366 (onDCall, now
// real) ALWAYS sees fByte[gArr[bChoice]]===0 here, so its own search loop
// never runs (n=0) and m:I (bField201) is left at its unconditional -1
// (offset 111..113) -- #267's own "m<0" read path is therefore the only
// naturally-reachable one through this full stack (see the m>=0 note
// below). #267 then reads eCube[0][0/1][loopvar] for the pair write, and
// the shared gridB-copy idiom skips the write because eCube[1][0][0] is
// still the -1 opening sentinel (negative column -> `if (col>=0)` guard
// fails).
{
  // #272 is a real call now (see LegacySubsystemPairSetup.ts's 2026-09-08
  // wiring note), so instead of stubbing its result this drives the real
  // checkLegacyCellCompatibility: gridC[1][1] nonzero and in [1,122], the
  // vision plane explored, and nothing on the reject paths.
  const input = makeInput();
  input.eByte.set([2, 2, 2]);
  input.fByte[0] = 1;
  input.dCube[0][0][0] = 1;
  input.dCube[0][1][0] = 1;
  input.gridC[1][1] = 5;
  input.gridB[3][5] = 9; // pre-existing value, must survive (negative-column guard)

  const r = computeLegacySubsystemBound(input, 10, 20, 30, 40);

  assert.equal(input.bScalars.bField201, -1, "m:I stays -1: fByte[gArr[bChoice]] is 0 after #380's real no-op run");
  assert.equal(input.dRows[0][1], 20, "m<0 path: dRows[0][dIndex] = eCube[0][0][loopvar]");
  assert.equal(input.dRows[1][1], 10, "m<0 path: dRows[1][dIndex] = eCube[0][1][loopvar]");
  assert.equal(r, 1, "early return: (byte) dIndex, unchanged at 1");
  assert.equal(input.gridB[3][5], 9, "untouched: eCube[1][0][0] stayed at the -1 opening sentinel");
  // NOTE on m>=0: reaching it for real requires fByte[gArr[1]] or
  // fByte[gArr[2]] to be nonzero AFTER #380 runs, which only happens if
  // #380's own direction scan genuinely "commits" a step (offsets
  // 925..1024) -- itself requiring hand-crafted, asymmetric packedBytes
  // direction tables. #366's own m>=0 branch (reading dCube[gIdx][*][m>>1]
  // instead of eCube[0][*][loopvar]) is exhaustively covered directly in
  // verify-subsystem-pair-setup.mjs, where stepLegacySubsystemD is called
  // without going through #264/#380's real side effects first.
}

// The shared gridB-copy idiom (copyHRowIntoGridB, used by both #267 and
// #268) DOES get exercised with a real positive column when #264's own
// run-detection both opens AND closes a run (two dCube points: the first
// with a nonzero onCellCheck result, the second landing on an empty gridC
// cell so dScalar reverts to 0). Closing (offsets 482..581) writes
// eCube[1][0/1/2][c-1] to the REAL current (x,y), captures
// hArr[c-1]=gridB[y][x] BEFORE overwriting it, and then itself writes
// gridB[y][x]=(byte)(256-c). #267's own later copyHRowIntoGridB call
// (offsets 201..290) then overwrites that same cell again with the
// captured hArr[c-1] value -- a real, hand-verified two-writer interaction.
{
  // #272 is a real call now (see LegacySubsystemPairSetup.ts's 2026-09-08
  // wiring note), so instead of stubbing its result this drives the real
  // checkLegacyCellCompatibility: gridC[1][1] nonzero and in [1,122], the
  // vision plane explored, and nothing on the reject paths.
  const input = makeInput();
  input.eByte.set([2, 2, 2]);
  input.fByte[0] = 2; // two passes: a=0 opens, a=1 closes
  input.dCube[0][0][0] = 1;
  input.dCube[0][1][0] = 1; // opens (gridC[1][1] nonzero -> #272)
  input.dCube[0][0][1] = 2;
  input.dCube[0][1][1] = 2; // closes (gridC[2][2] stays 0 -> dScalar=0 directly)
  input.gridC[1][1] = 5; // nonzero -> #264 calls #272 for the a=0 point, opening the run

  computeLegacySubsystemBound(input, 10, 20, 30, 40);

  assert.equal(input.bScalars.bField144, 1, "c:B still 1: closing a run does not increment it");
  assert.equal(input.eCube[1][0][0], 2, "closing writes the real (x,y), not the -1 sentinel");
  assert.equal(input.eCube[1][1][0], 2);
  // #264 itself first writes gridB[2][2] = (byte)(256-1) = -1, having
  // already captured hArr[0] = 0 (gridB[2][2]'s value at read time, before
  // that write). #267's own copyHRowIntoGridB then overwrites gridB[2][2]
  // with that captured hArr[0]=0, so the FINAL value is 0, not -1.
  assert.equal(input.gridB[2][2], 0, "copyHRowIntoGridB overwrites #264's own -1 write with the captured hArr[0]=0");
  assert.equal(input.bScalars.bField192, 1, "j:I (shared idiom cursor) left at bound=1 on exit");
}

// flags[0]||flags[1] true -> b-selection (offsets 296..345). Reaching this
// branch for real (rather than the always-false state #380 leaves flags in
// by default) requires #380's OWN direction scan to genuinely discover a
// `gridB` "occupied" sentinel (offsets 496..529 / 641..648) and set a flag
// back to true within the SAME call that just reset it. Derived by hand
// from the bytecode: with the run-opened-at-(20,10) state from above, the
// very first bScratch value #380 computes (via the `packedBytes[po[3] +
// dirIndexBase + dirIndexRow*3 + 4]` lookup, offsets 85..91) lands at
// packedBytes index 8 when `packedOffsets[3]=50` (50 + (dCube[0][0][0]=1 -
// eCube[0][0][0]=20) + (dCube[0][1][0]=1 - eCube[0][1][0]=10)*3 + 4 = 50-19-27+4
// = 8) -- setting packedBytes[8]=1 makes bScratch start ODD (1) instead of
// the harmless default 0. With direction tables left at their all-zero
// default (packedOffsets[1]=100, so directions 0 and 2 both have a (0,0)
// delta), an odd bScratch immediately enters the `(bScratch&1)!==0` gridB
// check (offset 385..443) on its very first pass, reading gridB at the
// anchor position itself (both h=gArr[1]'s rotated direction 2 and
// h=gArr[2]'s rotated direction 0 resolve to the SAME (0,0) delta, so both
// land on the same cell). Setting gridB[10][20]=-5 (within [-bField68, -10)
// with bField68=0) makes BOTH h passes find it: eByte[gArr[1]]=eByte[gArr[2]]=4,
// localFlags=[true,true], fByte[gArr[1]]=fByte[gArr[2]]=0 (never reaches the
// "commit" branch that would increment fByte).
{
  // #272 is a real call now (see LegacySubsystemPairSetup.ts's 2026-09-08
  // wiring note), so instead of stubbing its result this drives the real
  // checkLegacyCellCompatibility: gridC[1][1] nonzero and in [1,122], the
  // vision plane explored, and nothing on the reject paths.
  const input = makeInput();
  input.eByte.set([2, 2, 2]);
  input.fByte[0] = 1;
  input.dCube[0][0][0] = 1;
  input.dCube[0][1][0] = 1;
  input.gridC[1][1] = 5;
  input.packedOffsets[1] = 100; // direction-delta table base (all zero -> both directions 0/2 are (0,0))
  input.packedOffsets[3] = 50; // initial-bScratch lookup base
  input.packedBytes[8] = 1; // makes the initial bScratch odd (1)
  input.gridB[10][20] = -5; // the "occupied" sentinel both h-passes discover

  const r = computeLegacySubsystemBound(input, 10, 20, 30, 40);

  assert.deepEqual(input.localFlags, [true, true], "#380 itself set both flags true via the real gridB sentinel");
  assert.equal(input.eByte[1], 4, "eByte[gArr[1]] = -(xv+1) = -(-5+1) = 4");
  assert.equal(input.eByte[2], 4, "eByte[gArr[2]] = 4 (same sentinel, symmetric directions)");
  assert.equal(input.fByte[1], 0, "fByte[gArr[1]] stays 0: the sentinel path never reaches the commit branch");
  assert.equal(input.fByte[2], 0);
  // b-selection: flags[0]&&fByte[g1]<fByte[g2] -> 0<0 false -> flags[1]?2:1 -> b=2.
  assert.equal(input.bScalars.bField135, 2, "b := 2 via the flags[1] fallback (fByte[g1]===fByte[g2])");
  // gb=gArr[2]=2, dCube[2] untouched -> dRows[*][1]=0; loopvar=eByte[gArr[2]]+1=5>=c:B(1) -> loop exits normally.
  assert.equal(input.dRows[0][1], 0);
  assert.equal(input.dRows[1][1], 0);
  assert.equal(input.dRows[0][2], 40, "loop-completed tail: dRows[0][dIndex=2] = arg4");
  assert.equal(input.dRows[1][2], 30, "dRows[1][2] = arg3");
  assert.equal(r, 2, "dIndex incremented once by the b-branch (no i2b until the final return)");
  // Achieving flags=[true,false] specifically (to isolate the OTHER two
  // sub-branches of this same three-way ternary) needs an asymmetric
  // direction table that only makes ONE of h=gArr[1]/gArr[2]'s rotated
  // directions land on a sentinel, which spirals into a much longer,
  // harder-to-hand-verify commit sequence for the other h (see the module
  // comment at the top of this file). Not pursued here: the ternary itself
  // is a simple boolean/comparison expression, already exercised once above
  // with genuinely real flags.
}

// ---------------------------------------------------------------------
// computeLegacySubsystemPairScore (#268)
// ---------------------------------------------------------------------

// i:I (bField187) is set from arg6 alone, offsets 0..12, before anything
// else runs -- unaffected by the #264/#380/#366/#265 wiring change.
{
  const zero = makeInput();
  computeLegacySubsystemPairScore(zero, 0, 0, 0, 0, 0, 0);
  assert.equal(zero.bScalars.bField187, 80, "arg6 === 0 -> 80");

  const nonzero = makeInput();
  computeLegacySubsystemPairScore(nonzero, 0, 0, 0, 0, 0, 1);
  assert.equal(nonzero.bScalars.bField187, 5, "arg6 !== 0 -> 5");
}

// #264 (now real) forwarding proof for #268, same technique as #267's own
// case above: #268 calls stepLegacySubsystemPairSetup(input, arg2, arg1,
// arg4, arg3, arg6) -- note arg6 (not a hardcoded 0) reaches #264's own
// arg5/onE this time.
{
  const seenPrep = [];
  const seenE = [];
  computeLegacySubsystemPairScore(
    makeInput({
      onRelativePreparation: (dx, dy) => seenPrep.push([dx, dy]),
      onE: (mode) => seenE.push(mode),
    }),
    1, 2, 3, 4, 5, 6,
  );
  // inner arg1=2, arg2=1, arg3=4, arg4=3, arg5=6 -> onRelativePreparation(4-2, 3-1).
  assert.deepEqual(seenPrep, [[2, 2]]);
  assert.deepEqual(seenE, [6], "#268's own arg6 reaches #264's arg5/onE, unlike #267's hardcoded 0");
}

// c:B === 0 -> the loop never runs (default eByte, same real early return as
// #267's own case); the return is simply fByte[g[0]], possibly rewritten by
// the post-loop clamp (offsets 299..339). With fByte[g[0]]+arg5 < i, it
// passes through unchanged.
{
  const input = makeInput({ localFlags: [false, false] });
  input.fByte[0] = 70; // g[0] defaults to 0
  const r = computeLegacySubsystemPairScore(input, 0, 0, 0, 0, 0, 0); // arg6=0 -> i=80
  assert.equal(r, 70, "70 + 0 < 80, no rewrite");
}

// Same, but fByte[g[0]] + arg5 >= i triggers the rewrite to (i - arg5).
{
  const input = makeInput({ localFlags: [false, false] });
  input.fByte[0] = 90;
  const r = computeLegacySubsystemPairScore(input, 0, 0, 0, 0, 0, 0); // i=80
  assert.equal(r, 80, "90 >= 80, so fByte[g0] := 80 - 0");
}

// Both flags naturally clear (real #380 no-op, same reasoning as #267's own
// case) -> the m<0 early branch (offsets 79..106):
// fByte[g[0]] = (byte)(eCube[0][2][loopvar] + 1). #264 opens one run first
// (single dCube point, no closing), so eCube[0][2][0] is the -1 opening
// sentinel and fByte[g[0]] becomes (byte)(-1+1) = 0.
{
  const input = makeInput({
    localFlags: [false, false],
    onCellCheck: (x, y) => (x === 1 && y === 1 ? 9 : 0),
  });
  input.eByte.set([2, 2, 2]);
  input.fByte[0] = 1;
  input.dCube[0][0][0] = 1;
  input.dCube[0][1][0] = 1;
  input.gridC[1][1] = 5;

  const r = computeLegacySubsystemPairScore(input, 10, 20, 30, 40, 0, 0); // i=80, loopvar starts 0

  assert.equal(input.bScalars.bField201, -1, "m:I stays -1, same real #380 no-op as #267's own case");
  assert.equal(input.fByte[0], 0, "fByte[g[0]] = eCube[0][2][loopvar]+1 = -1+1 = 0");
  assert.equal(r, 0, "0 + arg5(0) < i(80), so the post-loop clamp leaves it unchanged");
}

// flags[0]&&flags[1] true, driven for real by the SAME gridB-sentinel
// recipe used in #267's own "flags true" case above (identical eCube/dCube
// values result from the identical (arg2,arg1)=(20,10) swap, since arg6=0
// here matches #267's hardcoded 0) -> the `else` branch fires:
// stepLegacySubsystemFlagPass(input, true) is now a REAL call to #265.
// Hand-traced in full from #265's own control flow:
//  - doSwap: localFlags[0]=true, but fByte[gArr[1]](0)<=fByte[gArr[2]](0) ->
//    doSwap=false.
//  - First copy loop: bField164<=eCube[0][2][0](-1) is false immediately (no
//    iterations); fByte[gArr[2]]=eCube[0][2][0]+1=0.
//  - Second copy loop: bField164(0)<=fByte[gArr[1]](0) && ...<bField187(80)
//    -> one pass, copying dCube[gArr[1]=1][*][0](=0,0, untouched) into
//    dCube[gArr[2]=2][*][0]; fByte[gArr[2]]=clamp(0+0,0,80)=0.
//  - Unconditional swap: gArr[0],gArr[2] = gArr[2](2),gArr[0](0) -> gArr
//    becomes [2,1,0].
//  - flag=true and fByte[gArr[0]=2](0)<80 -> continues past the early return.
//  - bField178=eCube[1][2][eByte[gArr[1]=1]=4]=0 (untouched index).
//    bField183=fByte[gArr[1]=1](0)-0+eCube[0][2][0](-1)+1=0.
//  - Third copy loop: bField164(0)<=fByte[gArr[2]=0](1)-0 &&
//    0+fByte[gArr[0]=2](0)<80 -> TWO passes (j=0,1), copying
//    dCube[gArr[2]=0][*][0/1] (the (1,1) run-open point, and the untouched
//    default at index 1) into dCube[gArr[0]=2][*][0/1].
//    fByte[gArr[0]=2]=clamp(0+fByte[gArr[2]=0](1)-0,0,80)=1.
//  - bField68=eByte[gArr[1]=1]=4; bField164=5. Tail loop: 5<c:B(1) is false
//    -> no iterations.
// Back in #268: fByte[gArr[0]]=fByte[2]=1 (using the NEW, swapped gArr[0]),
// 1+arg5(0)<80 -> loopvar++ -> loop exits via the bound check (loopvar=1
// not < c:B=1). g0Outer was captured BEFORE #264 ever ran (=0, unaffected
// by #265's later swap), so every remaining read (`fByte[g0]` clamp check,
// the second dCube->aCube loop, and the final return) uses fByte[0] and
// dCube[0] -- NOT the swapped gArr[0]=2 -- a real quirk of the bytecode
// capturing g:I once at entry.
{
  // #272 is a real call now (see LegacySubsystemPairSetup.ts's 2026-09-08
  // wiring note), so instead of stubbing its result this drives the real
  // checkLegacyCellCompatibility: gridC[1][1] nonzero and in [1,122], the
  // vision plane explored, and nothing on the reject paths.
  const input = makeInput();
  input.eByte.set([2, 2, 2]);
  input.fByte[0] = 1;
  input.dCube[0][0][0] = 1;
  input.dCube[0][1][0] = 1;
  input.gridC[1][1] = 5;
  input.packedOffsets[1] = 100;
  input.packedOffsets[3] = 50;
  input.packedBytes[8] = 1;
  input.gridB[10][20] = -5;

  const r = computeLegacySubsystemPairScore(input, 10, 20, 30, 40, 0, 0);

  assert.deepEqual(input.localFlags, [true, true], "#380 sets both flags true; #265 never touches localFlags");
  assert.deepEqual(Array.from(input.gArr), [2, 1, 0], "#265's own unconditional gArr[0]<->gArr[2] swap, for real");
  assert.equal(input.fByte[2], 1, "fByte[gArr[0]=2] ends at 1 via #265's third copy loop + clamp");
  assert.equal(input.dCube[2][0][0], 1, "#265's third copy loop pulled dCube[0](the run-open point) into dCube[2]");
  assert.equal(input.dCube[2][1][0], 1);
  assert.equal(r, 1, "return fByte[g0Outer=0], captured BEFORE #264/#265 ever touched gArr");
  assert.equal(input.aCube[0][input.entityId][0], 1, "second loop uses g0Outer=0 too: dCube[0][0][0]");
  assert.equal(input.aCube[1][input.entityId][0], 1);
  assert.equal(
    input.dense[2929 + input.entityId],
    14,
    "arg6===0 tail: P() (stepLegacySubsystemEntityRevertIdle) still runs for real",
  );
}

// The shared gridB-copy idiom (copyHRowIntoGridB) is the SAME function
// #267's own test above already exercises with a real positive column; not
// re-derived a second time here.

// Second loop (offsets 339..528): arg6 === 0 writes aCube, else bCube;
// source is always dCube[g[0]][*][loopvar2]. Deliberately keeps the first
// loop inert (default localFlags/eByte -> c:B stays 0, per #264's own real
// early return), so this is unaffected by the #264/#380/#366/#265 wiring
// change and needed no rework.
{
  const input = makeInput({ localFlags: [false, false] });
  input.fByte[0] = 2; // second loop runs twice (loopvar2 = 0, 1)
  input.dCube[0][0][0] = 11; input.dCube[0][1][0] = 12;
  input.dCube[0][0][1] = 13; input.dCube[0][1][1] = 14;
  computeLegacySubsystemPairScore(input, 0, 0, 0, 0, 3, 0); // arg5=3, arg6=0 -> aCube
  assert.equal(input.aCube[0][4][3], 11);
  assert.equal(input.aCube[1][4][3], 12);
  assert.equal(input.aCube[0][4][4], 13);
  assert.equal(input.aCube[1][4][4], 14);
  assert.equal(input.bCube[0][4][3], 0, "bCube untouched when arg6 === 0");

  const input2 = makeInput({ localFlags: [false, false] });
  input2.fByte[0] = 1;
  input2.dCube[0][0][0] = 21; input2.dCube[0][1][0] = 22;
  computeLegacySubsystemPairScore(input2, 0, 0, 0, 0, 0, 1); // arg6 !== 0 -> bCube
  assert.equal(input2.bCube[0][4][0], 21);
  assert.equal(input2.bCube[1][4][0], 22);
  assert.equal(input2.aCube[0][4][0], 0, "aCube untouched when arg6 !== 0");
}

// arg6 === 0 tail: dense[707+id]/dense[3030+id] reset to 0, and P() (#252,
// ALREADY ported as stepLegacySubsystemEntityRevertIdle) is called for
// real -- verified via its own documented side effect,
// dense[2929+id] = (deriveLegacyEntityStateCode(dense,id) % 7) + 8, which
// is 6 on an all-zero dense bank (level < 12), so 14. Also unaffected by
// the wiring change (default localFlags/eByte keeps the first loop inert).
{
  const input = makeInput({ localFlags: [false, false] });
  input.dense[707 + input.entityId] = 55;
  input.dense[3030 + input.entityId] = 66;
  computeLegacySubsystemPairScore(input, 0, 0, 0, 0, 0, 0);
  assert.equal(input.dense[707 + input.entityId], 0);
  assert.equal(input.dense[3030 + input.entityId], 0);
  assert.equal(input.dense[2929 + input.entityId], 14, "P()'s real side effect");
}

// arg6 !== 0 -> the whole dense/P() tail is skipped entirely.
{
  const input = makeInput({ localFlags: [false, false] });
  input.dense[707 + input.entityId] = 55;
  computeLegacySubsystemPairScore(input, 0, 0, 0, 0, 0, 1);
  assert.equal(input.dense[707 + input.entityId], 55, "untouched");
  assert.equal(input.dense[2929 + input.entityId], 0, "P() not called");
}

// ---------------------------------------------------------------------
// stepLegacySubsystemScore (#332, b(IIII)) -- integration, using the real
// #267/#268 now wired in directly.
// ---------------------------------------------------------------------

// h comes from the real computeLegacySubsystemBound: with c:B=0 it is
// always 1 (dIndex's initial value), so the accumulation loop runs exactly
// once even though no test drives it to 0 anymore (h=0 is not a reachable
// output of the real #267 -- dIndex only ever starts at 1 and increments).
{
  const input = makeInput({ localFlags: [false, false] });
  const r = stepLegacySubsystemScore(input, 1, 2, 3, 4);
  // h=1 -> one call into computeLegacySubsystemPairScore with
  // (dRows[1][0], dRows[0][0], dRows[1][1], dRows[0][1], i=0, 0). #267's own
  // prologue already wrote dRows[0][0]=arg2=2, dRows[1][0]=arg1=1, and (since
  // c:B=0 the loop never runs) its tail wrote dRows[0][1]=arg4=4, dRows[1][1]=arg3=3.
  assert.equal(input.dRows[1][0], 1);
  assert.equal(input.dRows[0][0], 2);
  // #268 (localFlags both false) hits its own m<0 default branch,
  // returning fByte[g[0]] (0, untouched by a 0-bound loop) -> i stays 0.
  assert.equal(r, 0);
}

// The q===3 clamp (offsets 136..156 of b(IIII)) still applies only when the
// accumulated i > 2. Force i > 2 by presetting fByte[g[0]] high enough that
// #268's post-loop clamp lands it above 2 while the outer flags stay clear
// so the outer loop runs exactly once. Unaffected by the wiring change:
// c:B stays 0 (default eByte), so #264 never touches fByte.
{
  const input = makeInput({ localFlags: [false, false], q: 3 });
  input.fByte[0] = 9; // 9 + arg5(0) >= i(80)? no -> passes through as 9
  const r = stepLegacySubsystemScore(input, 0, 0, 0, 0);
  assert.equal(r, 2, "i=9 > 2 and q===3 -> clamped to 2");

  const low = makeInput({ localFlags: [false, false], q: 3 });
  low.fByte[0] = 2;
  assert.equal(stepLegacySubsystemScore(low, 0, 0, 0, 0), 2, "i===2 is not > 2, falls through unclamped");

  const otherQ = makeInput({ localFlags: [false, false], q: 4 });
  otherQ.fByte[0] = 9;
  assert.equal(stepLegacySubsystemScore(otherQ, 0, 0, 0, 0), 9, "no clamp when q !== 3");
}

// flags both clear at the OUTER level -> break after the first iteration
// (offsets 101..119). A preset c:B=5 here is void (the real #264, called
// inside both computeLegacySubsystemBound and computeLegacySubsystemPairScore,
// resets it to 0 given default eByte, exactly like every other case above),
// so this now asserts the actual real-default outcome (r=0) instead of the
// old placeholder `typeof r === "number"` check.
{
  const input = makeInput({ localFlags: [false, false] });
  const r = stepLegacySubsystemScore(input, 0, 0, 0, 0);
  assert.equal(r, 0, "default (c:B=0) chain: h=1, one pass, i stays 0, no q===3 clamp");
}

// j+1 walking off the end of a too-small dRows still throws, exactly as it
// does in the JVM (b(IIII) has no exception table of its own). Reached here
// by reusing #267's own "flags true, real b-selection" recipe above, which
// hand-derives h=2 (computeLegacySubsystemBound(input,10,20,30,40) returns
// 2) -- so the accumulation loop's SECOND dAt(dRows,*,j+1=1) read is
// realistically forced to happen against a deliberately 1-entry-per-row
// dRows.
{
  const input = makeInput({
    dRows: [new Int8Array(1), new Int8Array(1)],
    onCellCheck: (x, y) => (x === 1 && y === 1 ? 9 : 0),
  });
  input.eByte.set([2, 2, 2]);
  input.fByte[0] = 1;
  input.dCube[0][0][0] = 1;
  input.dCube[0][1][0] = 1;
  input.gridC[1][1] = 5;
  input.packedOffsets[1] = 100;
  input.packedOffsets[3] = 50;
  input.packedBytes[8] = 1;
  input.gridB[10][20] = -5;

  assert.throws(
    () => stepLegacySubsystemScore(input, 10, 20, 30, 40),
    /out of bounds/,
  );
}

// Exception-table fidelity. Both #267/#268 funnel every path -- in-try
// return, normal fall-through and the caught handler -- to the same return
// value, so a throw is invisible in the RESULT; what it changes is that the
// rest of the body is skipped. The old versions of these two cases threw
// from mock `onFCall`/`onFlagToggle` callbacks that no longer exist (those
// options are silently ignored by the real code now). Reproduced instead
// with a REAL, bytecode-legitimate throw: `copyHRowIntoGridB`
// (LegacySubsystemScore.ts's own helper, shared by #267/#268) indexes
// `gridB[row][col]` WITHOUT optional chaining, unlike #264's/#380's own
// gridB reads -- so a deliberately undersized gridB throws there for real,
// while #264/#380 (both `?.`-safe) still run to completion beforehand.
{
  // #268's open+close recipe from above (real positive eCube[1][0/1][0]),
  // but with gridB sized to only 1 row so copyHRowIntoGridB's own write
  // (`gridB[2][2] = ...`) throws.
  const input = makeInput({
    gridB: [new Int8Array(96)],
    onCellCheck: (x, y) => (x === 1 && y === 1 ? 9 : 0),
  });
  input.eByte.set([2, 2, 2]);
  input.fByte[0] = 2;
  input.dCube[0][0][0] = 1; input.dCube[0][1][0] = 1; // opens
  input.dCube[0][0][1] = 2; input.dCube[0][1][1] = 2; // closes -> eCube[1][*][0] = (2,2)
  input.gridC[1][1] = 5;
  input.dense[707 + input.entityId] = 55;
  input.dense[3030 + input.entityId] = 66;

  const r = computeLegacySubsystemPairScore(input, 10, 20, 30, 40, 0, 0);

  // m<0 branch still ran and wrote fByte[gArr[0]=0] before the throw
  // (fByte[0]=eCube[0][2][0]+1=-1+1=0); g0Outer=0 too, so the shared return
  // is fByte[0]=0, same value a non-throwing run would also produce here.
  assert.equal(r, 0, "handler funnels to the same return: fByte[g0Outer]");
  assert.equal(
    input.dense[707 + input.entityId],
    55,
    "the dense-reset/P() tail (AFTER copyHRowIntoGridB) never ran -- real skip, not a mock spy",
  );
  assert.equal(input.dense[2929 + input.entityId], 0, "P() was never reached");
}

console.log("b.b(int,int,int,int):byte score accumulator + #267/#268 OK");
