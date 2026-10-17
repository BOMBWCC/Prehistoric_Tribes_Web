// class b's `private void d(int)` (#366, bytecode/b-javap.txt lines
// 1508..1808) and `private void a(int,int,int,int,int)` (#264, lines
// 2405..2775), ported as `stepLegacySubsystemD`/`stepLegacySubsystemPairSetup`
// in LegacySubsystemPairSetup.ts. See that file's own docblock for the full
// derivation; this script calls both functions DIRECTLY (not through
// #267/#268) so their own inputs -- gArr/fByte/dCube/eCube/gridC/gridB and
// the remaining onComputeQR/onRelativePreparation/onE/onCellCheck
// callbacks -- can be controlled precisely, without the cascading real-call
// side effects that make full #267/#268-level integration tests
// (verify-subsystem-score.mjs) impractically deep to hand-derive for every
// branch.
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

const { stepLegacySubsystemD, stepLegacySubsystemPairSetup } = loadModule("./sim/tribe/LegacySubsystemPairSetup", srcDir);

function byteMatrix(rows, cols) {
  return Array.from({ length: rows }, () => new Int8Array(cols));
}

function byteCube(depth, rows, cols) {
  return Array.from({ length: depth }, () => byteMatrix(rows, cols));
}

function toByte(v) {
  return (v << 24) >> 24;
}

// =======================================================================
// stepLegacySubsystemD (#366) -- offsets 0..461, no exception table.
// =======================================================================

function makeDInput(over = {}) {
  return {
    eCube: byteCube(2, 3, 10),
    dCube: byteCube(3, 2, 96),
    gArr: new Int8Array(3),
    fByte: new Int8Array(3),
    bThreshold: 0,
    bScalars: { bField198: 0, bField201: 0, bField212: 0, bField215: 0 },
    ...over,
  };
}

// Early return (offsets 116..124): l <= B. onComputeQR is called exactly
// ONCE regardless (offset 0..31, its result always discarded), m:I is
// unconditionally set to -1 (offset 111..113) before the check, and the
// bChoice/loop machinery below is never reached.
{
  const calls = [];
  const input = makeDInput({ onComputeQR: (...a) => (calls.push(a), 999) });
  input.eCube[0][0][2] = 5;
  input.eCube[0][1][2] = 0;
  input.bScalars.bField212 = 0;
  input.bScalars.bField215 = 0; // l = (0-5)^2 + (0-0)^2 = 25
  input.bThreshold = 25; // 25 <= 25 -> early return

  stepLegacySubsystemD(input, 2, 7);

  assert.deepEqual(calls, [[5, 0, 7]], "onComputeQR fires once, unconditionally, before the threshold check");
  assert.equal(input.bScalars.bField198, 25, "l:I = the computed squared distance");
  assert.equal(input.bScalars.bField201, -1, "m:I unconditionally -1 before the early return");
}

// Not an early return, but n=0 (fByte[gArr[bChoice]] is 0) -> the search
// loop's own `for (j=0;j<n;)` never runs a single pass. m:I stays -1.
{
  const input = makeDInput();
  input.eCube[0][0][0] = 5;
  input.eCube[0][1][0] = 0; // l = 25
  input.bThreshold = -1; // 25 <= -1 is false -> continue past the early return
  // fByte all zero -> bChoice = fByte[gArr[1]](0)<=fByte[gArr[2]](0) ? 2 : 1 -> 2; n = fByte[gArr[2]]*2 = 0.

  stepLegacySubsystemD(input, 0, 0);

  assert.equal(input.bScalars.bField198, 25);
  assert.equal(input.bScalars.bField201, -1, "loop bound n=0 -> m stays at its unconditional -1");
}

// Full search-loop mechanics in one hand-derived case: bChoice=1 selection,
// gIdx alternation (gArr[(j&1)+1]), the `fByte[gIdx]<=j>>1` skip, the
// `k>=l` reject-without-update skip, and successive updates each calling
// onComputeQR exactly once (only on update, never on a skip/reject).
//
// gArr=[0,1,2] (default). fByte=[_,3,1] -> fByte[gArr[1]=1](3) <=
// fByte[gArr[2]=2](1)? false -> bChoice=1, n=fByte[gArr[1]]*2=6, j=0..5.
//  j=0: gIdx=gArr[1]=1, j>>1=0, fByte[1]=3<=0? no -> evaluated.
//  j=1: gIdx=gArr[2]=2, j>>1=0, fByte[2]=1<=0? no -> evaluated.
//  j=2: gIdx=gArr[1]=1, j>>1=1, fByte[1]=3<=1? no -> evaluated.
//  j=3: gIdx=gArr[2]=2, j>>1=1, fByte[2]=1<=1? YES -> skipped (continue).
//  j=4: gIdx=gArr[1]=1, j>>1=2, fByte[1]=3<=2? no -> evaluated.
//  j=5: gIdx=gArr[2]=2, j>>1=2, fByte[2]=1<=2? YES -> skipped.
// Target at origin (bField212=bField215=0). Initial l (from eCube[0][*][loopvar]
// with e00=20,e01=0) = 400, bThreshold=-1000 (never triggers the in-loop
// early return, however negative onComputeQR's own result is -- we return 0
// from it every time, trunc(0/10)=0 > -1000 always).
//  j=0 (dCube[1][0/1][0]=15,0): k=(0-15)^2=225 < 400 -> UPDATE (l=225,m=0), onComputeQR(15,0,arg1).
//  j=1 (dCube[2][0/1][0]=50,0): k=2500 >= 225 -> reject, no onComputeQR call.
//  j=2 (dCube[1][0/1][1]=5,0): k=25 < 225 -> UPDATE (l=25,m=2), onComputeQR(5,0,arg1).
//  j=4 (dCube[1][0/1][2]=3,0): k=9 < 25 -> UPDATE (l=9,m=4), onComputeQR(3,0,arg1).
// Final: l=9, m=4. onComputeQR called 4 times total (1 initial + 3 updates).
{
  const calls = [];
  const input = makeDInput({ onComputeQR: (...a) => (calls.push(a), 0) });
  input.gArr.set([0, 1, 2]);
  input.fByte.set([0, 3, 1]);
  input.eCube[0][0][0] = 20;
  input.eCube[0][1][0] = 0;
  input.bThreshold = -1000;
  input.dCube[1][0][0] = 15; input.dCube[1][1][0] = 0;
  input.dCube[2][0][0] = 50; input.dCube[2][1][0] = 0;
  input.dCube[1][0][1] = 5; input.dCube[1][1][1] = 0;
  input.dCube[1][0][2] = 3; input.dCube[1][1][2] = 0;

  stepLegacySubsystemD(input, 0, 7);

  assert.deepEqual(calls, [
    [20, 0, 7], // the unconditional initial call
    [15, 0, 7], // j=0 update
    [5, 0, 7], // j=2 update
    [3, 0, 7], // j=4 update -- j=1 (rejected) and j=3/j=5 (skipped) never call onComputeQR
  ]);
  assert.equal(input.bScalars.bField198, 9, "l:I ends at the best (smallest) k found, from j=4");
  assert.equal(input.bScalars.bField201, 4, "m:I = the winning j");
}

// bChoice=2 selection (fByte[gArr[1]]<=fByte[gArr[2]]): loop bound comes
// from fByte[gArr[2]] instead, proven by reaching j=5 (which needs n=6,
// only possible if bChoice picked gArr[2]'s fByte=3, not gArr[1]'s fByte=1).
// j=0/1/3 are also evaluated (not skipped by the fByte cap: fByte[1]=1<=0?
// no; fByte[2]=3<=0? no; fByte[2]=3<=1? no) -- each is deliberately placed
// far from the target so it is rejected (k>=l), leaving only j=5 to win.
{
  const input = makeDInput();
  input.gArr.set([0, 1, 2]);
  input.fByte.set([0, 1, 3]); // fByte[gArr[1]=1](1) <= fByte[gArr[2]=2](3) -> bChoice=2, n=6
  input.eCube[0][0][0] = 20;
  input.eCube[0][1][0] = 0; // l=400
  input.bThreshold = -1000;
  input.dCube[1][0][0] = 100; input.dCube[1][1][0] = 100; // j=0 (gIdx=1): k=20000, rejected
  input.dCube[2][0][0] = 100; input.dCube[2][1][0] = 100; // j=1 (gIdx=2): k=20000, rejected
  input.dCube[2][0][1] = 100; input.dCube[2][1][1] = 100; // j=3 (gIdx=2): k=20000, rejected
  // j=5: gIdx=gArr[(5&1)+1]=gArr[2]=2, j>>1=2. fByte[2]=3<=2? no -> evaluated.
  input.dCube[2][0][2] = 1; input.dCube[2][1][2] = 0; // k=1, far better than l=400 -> the only winner

  stepLegacySubsystemD(input, 0, 0);

  assert.equal(input.bScalars.bField198, 1, "j=5 was reachable -> loop bound used fByte[gArr[2]], proving bChoice=2");
  assert.equal(input.bScalars.bField201, 5);
}

// The in-loop early return (offset 437..447): `Math.trunc(result/10) <=
// bThreshold` truncates toward 0 (idiv semantics), and stops the scan
// immediately -- later, even-better candidates are never evaluated.
{
  const calls = [];
  const input = makeDInput({
    onComputeQR: (...a) => {
      calls.push(a);
      return -47; // trunc(-47/10) = -4 (toward 0, not -5)
    },
  });
  input.gArr.set([0, 1, 2]);
  input.fByte.set([0, 2, 0]); // bChoice: fByte[1](2)<=fByte[2](0)? no -> bChoice=1, n=4
  input.eCube[0][0][0] = 20;
  input.eCube[0][1][0] = 0; // l=400
  input.bThreshold = -4; // trunc(-47/10) = -4 <= -4 -> true, stop after the FIRST update
  input.dCube[1][0][0] = 19; input.dCube[1][1][0] = 0; // j=0: k=19^2=361 < 400 -> update, then early return
  input.dCube[1][0][1] = 0; input.dCube[1][1][1] = 0; // j=2: k=0, would be an even better update if reached

  stepLegacySubsystemD(input, 0, 0);

  assert.deepEqual(calls, [[20, 0, 0], [19, 0, 0]], "only the initial call plus the ONE update that triggers the return");
  assert.equal(input.bScalars.bField198, 361, "l stays at j=0's k -- j=2's better candidate (k=0) never evaluated");
  assert.equal(input.bScalars.bField201, 0, "m stuck at j=0, the loop stopped before reaching j=2");
}

// =======================================================================
// stepLegacySubsystemPairSetup (#264) -- offsets 0..597, whole body wrapped
// by one exception range [0,595]->596.
// =======================================================================

function makePairSetupInput(over = {}) {
  return {
    dByte: new Int8Array(6),
    eByte: new Int8Array(3),
    gArr: new Int8Array(3),
    fByte: new Int8Array(3),
    dCube: byteCube(3, 2, 96),
    eCube: byteCube(2, 3, 10),
    hArr: new Int8Array(10),
    gridC: byteMatrix(96, 96),
    gridB: byteMatrix(96, 96),
    bScalars: { bField135: 0, bField144: 0 },
    // #272 (checkLegacyCellCompatibility) is a real call inside #264 as of
    // 2026-09-08, so it needs its own inputs rather than an onCellCheck stub.
    // The vision planes are fully explored so #272's `team===0 && mode===0`
    // visibility gate does not reject.
    dense: new Int8Array(10000),
    entityId: 4,
    team: 0,
    packedBytes: new Int8Array(20000),
    packedOffsets: new Int16Array(312),
    saveOffsets: new Int16Array(570),
    visibilityBits: [
      Array.from({ length: 3 }, () => new Int32Array(96).fill(-1)),
      Array.from({ length: 3 }, () => new Int32Array(96).fill(-1)),
    ],
    ...over,
  };
}

// Prologue (offsets 0..75, always runs regardless of anything later):
// onRelativePreparation(arg3-arg1, arg4-arg2), three (dByte[a*2],dByte[a*2+1])
// writes of (toByte(arg1), toByte(arg2)) each, onE(arg5). Byte overflow: 200
// wraps to -56, -200 wraps to 56 (two's-complement i2b).
{
  const preps = [];
  const es = [];
  const input = makePairSetupInput({
    onRelativePreparation: (dx, dy) => preps.push([dx, dy]),
    onE: (mode) => es.push(mode),
  });

  stepLegacySubsystemPairSetup(input, 200, -200, 10, 20, 3);

  assert.deepEqual(preps, [[10 - 200, 20 - (-200)]]);
  assert.deepEqual(es, [3]);
  for (let a = 0; a < 3; a += 1) {
    assert.equal(input.dByte[a * 2], toByte(200), `dByte[${a * 2}] wraps 200 -> -56`);
    assert.equal(input.dByte[a * 2 + 1], toByte(-200), `dByte[${a * 2 + 1}] wraps -200 -> 56`);
  }
}

// eByte argmin (offsets 78..141): ties resolve to the FIRST (lowest-index)
// occurrence, via a strict `<` comparison -- gArr[0] ends at index 1, not 2,
// even though eByte[1]===eByte[2].
{
  const input = makePairSetupInput();
  input.eByte.set([5, 2, 2]);

  stepLegacySubsystemPairSetup(input, 0, 0, 0, 0, 0);

  assert.equal(input.bScalars.bField135, 2, "b:I ends at the minimum value found");
  assert.equal(input.gArr[0], 1, "g[0] = the FIRST index achieving the minimum (strict <, not <=)");
  assert.equal(input.gArr[1], 2, "g[1] = (g[0]+1)%3");
  assert.equal(input.gArr[2], 0, "g[2] = (g[0]+2)%3");
}

// Early return (offset 188..199): eByte[g0]<=0. The prologue AND the armin
// loop (which writes gArr) still ran first -- only the run-detection loop
// itself (and therefore onCellCheck) never starts.
{
  const calls = [];
  const input = makePairSetupInput({ onCellCheck: (...a) => (calls.push(a), 9) });
  input.eByte.set([0, 0, 0]); // g0 stays 0 (all tie at 0), eByte[g0]=0 <= 0 -> return
  input.fByte[0] = 5; // if the loop DID run, this would drive several iterations

  stepLegacySubsystemPairSetup(input, 1, 2, 3, 4, 0);

  assert.equal(input.bScalars.bField144, 0, "c:B reset to 0 by the prologue, loop never entered");
  assert.equal(calls.length, 0, "onCellCheck never called: the early return precedes the run-detection loop");
  assert.equal(input.dByte[0], toByte(1), "the unconditional prologue writes still happened");
}

// "Opening a run" on the FIRST iteration (a===0): eCube[0][0/1][c] takes
// arg1/arg2 directly (not dCube[g0][*][a-1], which would be out of range
// for a=0 anyway). eCube[0][2][c]=a-1=-1, eCube[1][0][c]=-1 (sentinel).
{
  const input = makePairSetupInput();
  input.eByte.set([2, 2, 2]);
  input.fByte[0] = 1;
  input.dCube[0][0][0] = 11; // point coordinates read for the gridC/#272 lookup
  input.dCube[0][1][0] = 11;
  input.gridC[11][11] = 5; // nonzero -> triggers #272 instead of forcing dScalar=0

  stepLegacySubsystemPairSetup(input, 30, 40, 0, 0, 0);

  assert.equal(input.bScalars.bField144, 1);
  assert.equal(input.eCube[0][0][0], 30, "a===0: eCube[0][0][0] = arg1, not dCube[g0][0][-1]");
  assert.equal(input.eCube[0][1][0], 40, "a===0: eCube[0][1][0] = arg2");
  assert.equal(input.eCube[0][2][0], -1, "a-1 = -1");
  assert.equal(input.eCube[1][0][0], -1, "opening sentinel");
}

// "Opening a run" on a LATER iteration (a>0): eCube[0][0/1][c] instead
// reads dCube[g0][0/1][a-1] -- the PREVIOUS point's own coordinates, not
// arg1/arg2. Point 0 stays neutral (empty cell, dScalar=0, matching the
// initial eScalar=0 -> no transition); point 1 opens.
{
  const input = makePairSetupInput();
  input.eByte.set([2, 2, 2]);
  input.fByte[0] = 2;
  input.dCube[0][0][0] = 77; input.dCube[0][1][0] = 88; // point 0: empty cell, no transition
  input.dCube[0][0][1] = 5; input.dCube[0][1][1] = 5; // point 1: occupied -> opens
  input.gridC[5][5] = 5; // nonzero at point 1 only (point 0's cell (88,77) stays default 0)

  stepLegacySubsystemPairSetup(input, 30, 40, 0, 0, 0);

  assert.equal(input.bScalars.bField144, 1, "point 0 caused no transition; point 1 opened once");
  assert.equal(input.eCube[0][0][0], 77, "a=1: eCube[0][0][0] = dCube[g0][0][a-1=0] = point 0's own x");
  assert.equal(input.eCube[0][1][0], 88, "a=1: eCube[0][1][0] = dCube[g0][1][0] = point 0's own y");
  assert.equal(input.eCube[0][2][0], 0, "a-1 = 0 this time (a=1)");
}

// "Closing a run" (offsets 482..581): eCube[1][0/1/2][c-1] takes the
// CURRENT (x,y) for real; hArr[c-1] captures gridB[y][x] BEFORE the
// method's own write; then, only `if (gridB[y])` is truthy, gridB[y][x] is
// overwritten with (byte)(256-c).
{
  const input = makePairSetupInput();
  input.eByte.set([2, 2, 2]);
  input.fByte[0] = 2;
  input.dCube[0][0][0] = 1; input.dCube[0][1][0] = 1; // opens (c: 0->1)
  input.dCube[0][0][1] = 9; input.dCube[0][1][1] = 9; // closes (empty cell -> dScalar=0)
  input.gridC[1][1] = 5;
  input.gridB[9][9] = 42; // pre-existing value, captured into hArr[0]

  stepLegacySubsystemPairSetup(input, 0, 0, 0, 0, 0);

  assert.equal(input.bScalars.bField144, 1, "closing does not change c:B");
  assert.equal(input.eCube[1][0][0], 9, "eCube[1][0][c-1] = the CURRENT x (real coordinate, not the -1 sentinel)");
  assert.equal(input.eCube[1][1][0], 9);
  assert.equal(input.eCube[1][2][0], 1, "eCube[1][2][c-1] = a (the closing iteration index)");
  assert.equal(input.hArr[0], 42, "hArr[c-1] captured gridB[y][x] BEFORE this method's own write");
  assert.equal(input.gridB[9][9], toByte(256 - 1), "then gridB[y][x] := (byte)(256-c) = -1");
}

// The closing branch's `if (gridB[y])` gate: a falsy row (gridB has fewer
// rows than the y coordinate needs) skips the gridB[y][x] write entirely,
// while hArr[c-1] is still safely computed as 0 via optional chaining.
{
  const input = makePairSetupInput({ gridB: [] }); // no rows at all
  input.eByte.set([2, 2, 2]);
  input.fByte[0] = 2;
  input.dCube[0][0][0] = 1; input.dCube[0][1][0] = 1;
  input.dCube[0][0][1] = 9; input.dCube[0][1][1] = 9;
  input.gridC[1][1] = 5;

  stepLegacySubsystemPairSetup(input, 0, 0, 0, 0, 0);

  assert.equal(input.hArr[0], 0, "gridB[9] is undefined -> `gridB[y]?.[x] ?? 0` safely yields 0");
  // No assertion on gridB itself: with zero rows there is nothing to read
  // back, which is exactly the point -- `if (gridB[y])` (falsy) skipped the
  // write without throwing.
}

// "No state transition" -- BOTH sub-cases (offset ~304..318, the trailing
// `else` in the source): two consecutive empty cells (eScalar===0 &&
// dScalar===0), and two consecutive occupied cells (eScalar!==0 &&
// dScalar!==0). Neither touches eCube or c:B.
{
  const input = makePairSetupInput();
  input.eByte.set([2, 2, 2]);
  input.fByte[0] = 2;
  // both points empty (gridC stays 0 everywhere) -> eScalar=0,dScalar=0 both iterations.
  input.dCube[0][0][0] = 1; input.dCube[0][1][0] = 1;
  input.dCube[0][0][1] = 2; input.dCube[0][1][1] = 2;

  stepLegacySubsystemPairSetup(input, 0, 0, 0, 0, 0);

  assert.equal(input.bScalars.bField144, 0, "two empty cells in a row: never opens, c:B stays 0");
}
{
  const input = makePairSetupInput();
  input.eByte.set([2, 2, 2]);
  input.fByte[0] = 2;
  input.dCube[0][0][0] = 1; input.dCube[0][1][0] = 1; // occupied
  input.dCube[0][0][1] = 2; input.dCube[0][1][1] = 2; // ALSO occupied
  input.gridC[1][1] = 5;
  input.gridC[2][2] = 5; // both cells nonzero -> onCellCheck fires both times, both dScalar!==0

  stepLegacySubsystemPairSetup(input, 0, 0, 0, 0, 0);

  assert.equal(input.bScalars.bField144, 1, "a=0 opens (eScalar was 0 initially)");
  // a=1: eScalar(prev dScalar, nonzero) !== 0 AND dScalar(now, also nonzero) !== 0
  // -> matches NEITHER the opening nor the closing condition -> no transition.
  assert.equal(input.eCube[1][0][0], -1, "still the opening sentinel: the second occupied cell never closed the run");
}

// c:B capped at 10 (offset 318..327): `if (bScalars.bField144 >= 10) return;`.
// Built programmatically: 21 points alternating empty/occupied so a fresh
// run opens on every even `a` (0,2,4,...,20) -- 11 opens attempted, but the
// 11th (a=20) hits the cap and returns immediately, so c:B stops at
// exactly 10. eCube[0][*] (LegacySubsystemArrays.e) has exactly 10 columns
// (`byteCube(2,3,10)`), so the cap is also array-size-consistent: a would-be
// 11th open has no column left to write into at all.
{
  const input = makePairSetupInput();
  input.eByte.set([2, 2, 2]);
  input.fByte[0] = 21;
  for (let a = 0; a <= 20; a += 1) {
    const x = 10 + a; // distinct coordinates per point, well within the 96x96 grid
    const y = 10;
    input.dCube[0][0][a] = x;
    input.dCube[0][1][a] = y;
    if (a % 2 === 0) input.gridC[y][x] = 5; // even a: occupied -> opens (or hits the cap)
    // odd a: gridC stays 0 -> empty -> closes the run just opened
  }

  stepLegacySubsystemPairSetup(input, 0, 0, 0, 0, 0);

  assert.equal(input.bScalars.bField144, 10, "capped at 10: the 11th attempted open (a=20) returns immediately");
  assert.equal(input.eCube[0][0].length, 10, "e's own column count -- no slot 10 exists to write into anyway");
  // The 10th open (a=18, c:9->10) is not the first iteration (a!==0), so it
  // reads dCube[g0][0][a-1=17] -- point 17's own x (10+17=27) -- not arg1/arg2.
  assert.equal(input.eCube[0][0][9], 27, "the 10th open (a=18) DID complete normally beforehand");
}

// Exception boundary: the whole body is wrapped in one try/catch (offsets
// [0,595]->596). A real throw from the still-unported onCellCheck callback
// -- a legitimate injection point, unlike #267/#268's own onFCall/onFlagToggle
// which are no longer callbacks at all -- proves writes made BEFORE the
// throw persist (the a=0 open) while writes that would come AFTER it do
// not (the a=1 close never happens; c:B never increments further).
{
  const input = makePairSetupInput({
    onCellCheck: (x) => {
      if (x === 1) return 9; // a=0's point: opens normally
      throw new Error("boom from an unported callee"); // a=1's point: throws
    },
  });
  input.eByte.set([2, 2, 2]);
  input.fByte[0] = 2;
  input.dCube[0][0][0] = 1; input.dCube[0][1][0] = 1; // opens for real
  input.dCube[0][0][1] = 9; input.dCube[0][1][1] = 9; // would close, but onCellCheck throws first
  input.gridC[1][1] = 5;
  input.gridC[9][9] = 5; // nonzero too, so a=1 also calls onCellCheck (and throws)

  // Does not throw out of stepLegacySubsystemPairSetup itself -- caught internally.
  stepLegacySubsystemPairSetup(input, 0, 0, 0, 0, 0);

  assert.equal(input.bScalars.bField144, 1, "a=0's open persisted (ran before the throw)");
  assert.equal(input.eCube[1][0][0], -1, "a=1's would-be close never ran: still the -1 opening sentinel");
}

console.log("b's private void d(int) (#366) + private void a(IIIII) (#264) OK");
