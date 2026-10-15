// class b's `private void a(boolean)` (#265, bytecode/b-javap.txt lines
// 4006..4536) and `private void f(int)` (#380, lines 3344..4006), ported as
// `stepLegacySubsystemFlagPass`/`stepLegacySubsystemFCall` in
// LegacySubsystemFlagPass.ts. See that file's own docblock for the full
// derivation; this script calls both functions DIRECTLY (not through
// #267/#268) so their own inputs can be controlled precisely -- see
// verify-subsystem-pair-setup.mjs's own header for why that matters more
// than it would seem: #380 in particular resets fByte[gArr[1]]/[2] and
// localFlags[0]/[1] on every call, so testing it through the real #267/#268
// call chain would require re-deriving most of this file's own state from
// scratch at every call site.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import vm from "node:vm";

const srcDir = new URL("../src/j2me/", import.meta.url).pathname;
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

const { stepLegacySubsystemFlagPass, stepLegacySubsystemFCall } = loadModule("./LegacySubsystemFlagPass", srcDir);

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
// stepLegacySubsystemFlagPass (#265) -- offsets 0..836, NO exception table
// (user-confirmed).
// =======================================================================

function makeFlagPassInput(over = {}) {
  return {
    localFlags: [false, false, false],
    fByte: new Int8Array(3),
    gArr: new Int8Array(3),
    eByte: new Int8Array(3),
    dCube: byteCube(3, 2, 96),
    eCube: byteCube(2, 3, 10),
    dense: new Int8Array(10000),
    dScratch: new Int8Array(6),
    gridB: byteMatrix(96, 96),
    gridC: byteMatrix(96, 96),
    packedBytes: new Int8Array(256),
    packedOffsets: new Int16Array(64),
    saveOffsets: new Int16Array(64),
    visibilityBits: [],
    mapWidth: 96,
    mapHeight: 96,
    entityId: 4,
    team: 0,
    scalars: { bField68: 0, bField135: 0, bField144: 0, bField164: 0, bField178: 0, bField183: 0, bField187: 0 },
    ...over,
  };
}

// doSwap (offset 0..78) is immediately followed, later in the SAME call, by
// an UNCONDITIONAL gArr[0]<->gArr[2] swap (offset 411..443) that runs no
// matter what doSwap decided. So the four cases below assert the FINAL gArr
// after BOTH swaps: doSwap's own conditional swap (gArr[1]<->gArr[2], if it
// fires) composed with the later unconditional one (gArr[0]<->gArr[2]).

// doSwap = true via `!localFlags[0]` (offset 0..10): [0,1,2] -conditional->
// [0,2,1] -unconditional-> [1,2,0].
{
  const input = makeFlagPassInput();
  input.gArr.set([0, 1, 2]);
  input.localFlags[0] = false;

  stepLegacySubsystemFlagPass(input, false);

  assert.deepEqual(Array.from(input.gArr.slice(0, 3)), [1, 2, 0], "swap fires: !localFlags[0]");
}

// doSwap = false via localFlags[0]=true && fByte[gArr[1]]<=fByte[gArr[2]] --
// the "already in the right order" case: no conditional swap, so only the
// unconditional one runs: [0,1,2] -> [2,1,0].
{
  const input = makeFlagPassInput();
  input.gArr.set([0, 1, 2]);
  input.localFlags[0] = true;
  input.fByte.set([0, 3, 9]); // fByte[gArr[1]=1]=3 <= fByte[gArr[2]=2]=9

  stepLegacySubsystemFlagPass(input, false);

  assert.deepEqual(Array.from(input.gArr.slice(0, 3)), [2, 1, 0], "no conditional swap: fByte[gArr[1]]<=fByte[gArr[2]]");
}

// doSwap = false via localFlags[0]=true && fByte[gArr[1]]>fByte[gArr[2]] &&
// !localFlags[1] -- the "out of order, but localFlags[1] doesn't confirm
// it" fallback: no conditional swap either, same [0,1,2] -> [2,1,0].
{
  const input = makeFlagPassInput();
  input.gArr.set([0, 1, 2]);
  input.localFlags[0] = true;
  input.localFlags[1] = false;
  input.fByte.set([0, 9, 3]); // fByte[gArr[1]]=9 > fByte[gArr[2]]=3

  stepLegacySubsystemFlagPass(input, false);

  assert.deepEqual(Array.from(input.gArr.slice(0, 3)), [2, 1, 0], "no conditional swap: !localFlags[1] overrides the fByte order");
}

// doSwap = true via localFlags[0]=true && fByte[gArr[1]]>fByte[gArr[2]] &&
// localFlags[1] -- all three conditions confirm out-of-order: conditional
// swap fires too, same composition as the first case: [1,2,0].
{
  const input = makeFlagPassInput();
  input.gArr.set([0, 1, 2]);
  input.localFlags[0] = true;
  input.localFlags[1] = true;
  input.fByte.set([0, 9, 3]);

  stepLegacySubsystemFlagPass(input, false);

  assert.deepEqual(Array.from(input.gArr.slice(0, 3)), [1, 2, 0], "swap fires: all three conditions hold");
}

// First copy loop (offset 81..186): bField164<=eCube[0][2][bField68].
// Negative bound (the usual -1 "opening sentinel" left by #264) -> zero
// iterations. fByte[gArr[2]] is still set to (eCube[0][2][bField68]+1)
// regardless of how many iterations ran.
{
  const input = makeFlagPassInput();
  input.gArr.set([0, 1, 2]);
  input.localFlags[0] = true; // doSwap=false (localFlags[1] stays false)
  input.eCube[0][2][0] = -1; // bField68 defaults 0
  input.dCube[0][0][0] = 55; // would be copied if the loop ran

  stepLegacySubsystemFlagPass(input, false);

  assert.equal(input.dCube[2][0][0], 0, "zero iterations: nothing copied from dCube[gArr[0]]");
  assert.equal(input.fByte[2], 0, "fByte[gArr[2]] = eCube[0][2][0]+1 = -1+1 = 0, set unconditionally");
}

// Same loop, positive bound -> N+1 real iterations, real copies.
{
  const input = makeFlagPassInput();
  input.gArr.set([0, 1, 2]);
  input.localFlags[0] = true; // doSwap=false (localFlags[1] stays false)
  input.eCube[0][2][0] = 2; // 3 iterations: j=0,1,2
  input.scalars.bField187 = 80; // headroom for the SECOND copy loop's own clamp not to override this
  input.dCube[0][0][0] = 10; input.dCube[0][1][0] = 11;
  input.dCube[0][0][1] = 20; input.dCube[0][1][1] = 21;
  input.dCube[0][0][2] = 30; input.dCube[0][1][2] = 31;

  stepLegacySubsystemFlagPass(input, false);

  assert.equal(input.dCube[2][0][0], 10); assert.equal(input.dCube[2][1][0], 11);
  assert.equal(input.dCube[2][0][1], 20); assert.equal(input.dCube[2][1][1], 21);
  assert.equal(input.dCube[2][0][2], 30); assert.equal(input.dCube[2][1][2], 31);
  assert.equal(input.fByte[2], 3, "fByte[gArr[2]] = eCube[0][2][0]+1 = 2+1 = 3 (second loop's own clamp leaves it, fByte[gArr[1]]=0)");
}

// Second copy loop (offset 218..368): the TWO-condition while, each
// condition tested as the actual limiter in turn.
// (a) fByte[gArr[1]] is the limiter (smaller than the bField187 headroom).
{
  const input = makeFlagPassInput();
  input.gArr.set([0, 1, 2]);
  input.localFlags[0] = true; // doSwap=false: localFlags[1] stays false regardless of the fByte comparison
  input.eCube[0][2][0] = -1; // first loop: 0 iterations, fByte[gArr[2]] starts at 0
  input.fByte[1] = 2; // fByte[gArr[1]] = 2 -> loop runs j=0,1,2 (bField164<=2)
  input.scalars.bField187 = 80; // headroom is not the limiter here
  input.dCube[1][0][0] = 100; input.dCube[1][1][0] = 101;
  input.dCube[1][0][1] = 102; input.dCube[1][1][1] = 103;
  input.dCube[1][0][2] = 104; input.dCube[1][1][2] = 105;

  stepLegacySubsystemFlagPass(input, false);

  // fByte[gArr[2]] was 0 at loop start, so destination offset is 0.
  assert.equal(input.dCube[2][0][0], 100); assert.equal(input.dCube[2][1][0], 101);
  assert.equal(input.dCube[2][0][1], 102); assert.equal(input.dCube[2][0][2], 104);
  assert.equal(input.fByte[2], toByte(0 + 2), "clampToRange(0+fByte[gArr[1]]=2, 0, 80) = 2");
}
// (b) bField187 headroom is the limiter (smaller than fByte[gArr[1]]).
{
  const input = makeFlagPassInput();
  input.gArr.set([0, 1, 2]);
  input.localFlags[0] = true; // doSwap=false: localFlags[1] stays false regardless of the fByte comparison
  input.eCube[0][2][0] = 0; // first loop: 1 iteration -> fByte[gArr[2]] becomes 1
  input.dCube[0][0][0] = 9; input.dCube[0][1][0] = 9;
  input.fByte[1] = 50; // large, NOT the limiter
  input.scalars.bField187 = 2; // headroom: bField164 + fByte[gArr[2]](1) < 2 -> only bField164=0 qualifies
  input.dCube[1][0][0] = 200; input.dCube[1][1][0] = 201; // toByte-wrapped

  stepLegacySubsystemFlagPass(input, false);

  // Only j=0 copied (bField164=1: 1+1=2 < 2 is false -> loop stops after j=0).
  assert.equal(input.dCube[2][0][1], toByte(200), "destination offset = fByte[gArr[2]](1) + j(0) = 1");
  assert.equal(input.dCube[2][0][2], 0, "j=1 never ran: 1+1 < bField187(2) is false");
  assert.equal(input.fByte[2], 2, "clampToRange(1+50, 0, 2) = 2 (max-clamped)");
}

// clampToRange's MIN side (value<min -> min): reachable if fByte[gArr[2]]
// were ever negative going in -- not naturally produced by #264/#265's own
// writers, but the clamp helper itself is exercised identically at every
// one of its three call sites, so this pins its own min-branch down once,
// directly, rather than leaving it unverified.
{
  const input = makeFlagPassInput();
  input.gArr.set([0, 1, 2]);
  input.localFlags[0] = true; // doSwap=false (localFlags[1] stays false)
  input.fByte[2] = -50; // pre-existing negative (not naturally reachable, but a real byte value)
  input.fByte[1] = -50;
  input.scalars.bField187 = 80;

  stepLegacySubsystemFlagPass(input, false);

  assert.equal(input.fByte[2], 0, "clampToRange(-50+-50, 0, 80) = 0 (min-clamped)");
}

// Unconditional gArr[0]<->gArr[2] swap (offset 411..443) happens regardless
// of doSwap/localFlags.
{
  const input = makeFlagPassInput();
  input.gArr.set([7, 1, 2]); // arbitrary values -- not real gArr indices, just to see the swap happen
  input.localFlags[0] = true;
  input.fByte.set([0, 1, 1]); // doSwap=false path (ties)

  stepLegacySubsystemFlagPass(input, false);

  assert.equal(input.gArr[0], 2, "gArr[0] <- old gArr[2]");
  assert.equal(input.gArr[2], 7, "gArr[2] <- old gArr[0]");
}

// Early return via `!flag` (offset 444..466): everything up to the swap
// still ran, but bField178/bField183 and the tail loops never execute.
{
  const input = makeFlagPassInput();
  input.gArr.set([0, 1, 2]);
  input.localFlags[0] = true; // doSwap=false (localFlags[1] stays false)
  input.scalars.bField178 = 55; // sentinel: would be overwritten if the tail ran
  input.scalars.bField187 = 80;

  stepLegacySubsystemFlagPass(input, false); // flag=false -> early return

  assert.equal(input.scalars.bField178, 55, "tail never reached: bField178 untouched");
}

// Early return via `fByte[gArr[0]]>=bField187` (using the gArr[0] AFTER the
// unconditional swap). A direct preset of fByte[gArr[2]] does not survive:
// the FIRST copy loop unconditionally overwrites fByte[gArr[2]] with
// `eCube[0][2][bField68]+1` before anything else runs, so that field is
// what actually needs driving here -- eCube[0][2][0]=79 forces 80
// iterations of the first loop and leaves fByte[gArr[2]]=80 afterward
// (the second loop, with fByte[gArr[1]] at its default 0, then leaves it
// unchanged: clampToRange(80+0,0,80)=80).
{
  const input = makeFlagPassInput();
  input.gArr.set([0, 1, 2]);
  input.localFlags[0] = true; // doSwap=false (localFlags[1] stays false)
  input.eCube[0][2][0] = 79;
  input.scalars.bField187 = 80; // fByte[gArr[0]] (post-swap) ends at 80 -> 80 >= 80 -> early return
  input.scalars.bField178 = 55;

  stepLegacySubsystemFlagPass(input, true); // flag=true this time, only the fByte check blocks it

  assert.equal(input.scalars.bField178, 55, "tail never reached: fByte[gArr[0]] (post-swap) >= bField187");
}

// Full continuation past the early return: bField178/bField183 computation,
// the third copy loop (both of its own limiting conditions), the resulting
// clamp, and the final tail loop over eCube[0/1][2][*].
{
  const input = makeFlagPassInput();
  input.gArr.set([0, 1, 2]);
  input.localFlags[0] = true; // doSwap=false: localFlags[1] stays false regardless of the fByte comparison
  input.eCube[0][2][0] = -1; // first loop: 0 iterations, fByte[gArr[2]] starts at eCube[0][2][0]+1=0
  input.fByte[1] = 0; // second loop: fByte[gArr[2]] stays clampToRange(0+0,0,80)=0
  input.scalars.bField187 = 80;
  // after the unconditional swap, gArr = [2,1,0] -- gArr[0]=2 has fByte[2]=0 < 80, so we continue.
  input.eByte[1] = 3; // eByte[gArr[1]=1] = 3, used for bField178 AND the post-swap bField68
  input.eCube[1][2][3] = 7; // bField178 = eCube[1][2][eByte[gArr[1]]] = eCube[1][2][3] = 7
  // bField183 = fByte[gArr[1]=1](0) - bField178(7) + eCube[0][2][bField68=0](-1) + 1 = 0-7-1+1 = -7
  input.fByte[0] = 5; // fByte[gArr[2]=0] (post-swap, index 0) -- third loop's own source-side count
  input.dCube[0][0][7] = 40; input.dCube[0][1][7] = 41; // j=0+bField178(7) -> dCube[gArr[2]=0][*][7]

  stepLegacySubsystemFlagPass(input, true);

  assert.equal(input.scalars.bField178, 7);
  assert.equal(input.scalars.bField183, -7);
  // Third loop: bField164<=fByte[gArr[2]=0](5)-bField178(7)=-2 -> 0<=-2 is FALSE -> zero iterations.
  assert.equal(input.dCube[2][0][0], 0, "gArr[0] (post-swap) = 2: zero iterations copied, dCube[2] untouched");
  assert.equal(input.fByte[2], 0, "clampToRange(0+5-7,0,80)=0 (min-clamped, -2<0)");
  // bField68 = eByte[gArr[1]=1] = 3; tail bField164 = 3+1 = 4; while(bField164<bField144(0)) -> false, no iterations.
  assert.equal(input.scalars.bField68, 3);
  assert.equal(input.eCube[0][2][4], 0, "tail loop never ran: bField144 stayed 0");
}

// The third copy loop DOES run for real when its own bound is positive:
// separate case, isolating just that loop's own mechanics and the final
// tail loop's real effect too.
{
  const input = makeFlagPassInput();
  input.gArr.set([0, 1, 2]);
  input.localFlags[0] = true; // doSwap=false: fByte[gArr[1]]<=fByte[gArr[2]] OR localFlags[1] stays false either way
  input.eCube[0][2][0] = -1;
  input.fByte[1] = 0;
  input.scalars.bField187 = 80;
  input.eByte[1] = 0;
  input.eCube[1][2][0] = 0; // bField178 = eCube[1][2][eByte[gArr[1]]] = eCube[1][2][0] = 0
  // bField183 = fByte[gArr[1]=1](0) - bField178(0) + eCube[0][2][0](-1) + 1 = 0
  input.fByte[0] = 3; // gArr[0] post-swap = 2, source is dCube[gArr[2]=0] with count fByte[0]=3
  input.dCube[0][0][0] = 71; input.dCube[0][1][0] = 72;
  input.dCube[0][0][1] = 73; input.dCube[0][1][1] = 74;
  input.dCube[0][0][2] = 75; input.dCube[0][1][2] = 76;
  input.scalars.bField144 = 6; // tail loop: bField164(1)<6 -> j=1..5 run
  input.eCube[0][2][1] = 10; input.eCube[1][2][1] = 20;
  input.eCube[0][2][5] = 11; input.eCube[1][2][5] = 21;

  stepLegacySubsystemFlagPass(input, true);

  // Third loop: bField164<=fByte[gArr[2]=0](3)-bField178(0)=3 && bField164+fByte[gArr[0]=2](0)<80 -> j=0,1,2,3.
  assert.equal(input.dCube[2][0][0], 71); assert.equal(input.dCube[2][1][0], 72);
  assert.equal(input.dCube[2][0][1], 73);
  assert.equal(input.dCube[2][0][2], 75);
  assert.equal(input.fByte[2], toByte(0 + 3 - 0), "clampToRange(0+3-0,0,80)=3");
  assert.equal(input.scalars.bField68, 0, "bField68 = eByte[gArr[1]=1] = 0");
  // Tail loop: bField164 starts at bField68+1=1, runs while <bField144(6): j=1..5.
  assert.equal(input.eCube[0][2][1], toByte(10 + 0), "bField183=0 this time, so +0 leaves it unchanged");
  assert.equal(input.eCube[1][2][1], toByte(20 + 0));
  assert.equal(input.eCube[0][2][5], toByte(11 + 0));
}

// =======================================================================
// stepLegacySubsystemFCall (#380) -- offsets 0..1052. Exception table
// [0,1050]->1051, Class java/lang/Exception (user-confirmed).
// =======================================================================

function makeFCallInput(over = {}) {
  const gArr = new Int8Array(3);
  gArr.set([0, 1, 2]);
  return {
    localFlags: [false, false, false],
    fByte: new Int8Array(3),
    gArr,
    eByte: new Int8Array(3),
    dCube: byteCube(3, 2, 96),
    eCube: byteCube(2, 3, 10),
    dense: new Int8Array(10000),
    dScratch: new Int8Array(6),
    gridB: byteMatrix(96, 96),
    gridC: byteMatrix(96, 96),
    packedBytes: new Int8Array(256),
    packedOffsets: new Int16Array(64),
    saveOffsets: new Int16Array(64),
    visibilityBits: [],
    mapWidth: 96,
    mapHeight: 96,
    entityId: 4,
    team: 0,
    scalars: { bField68: 0, bField135: 0, bField144: 0, bField164: 0, bField178: 0, bField183: 0, bField187: 0 },
    ...over,
  };
}

// Shared rigging for most #380 cases below: eCube[0][2][bField68]=0 (so the
// `dCube[gArr[0]][*][eCube[0][2][b68]+1]` lookup reads index 1), and
// dCube[gArr[0]][*][1] set equal to eCube[0][*][bField68] so dirIndexBase
// and dirIndexRow both come out to exactly 0 -- leaving packedOffsets[3]
// (set to 0) as the WHOLE index into packedBytes for the initial bScratch
// lookup (packedBytes[4]). packedOffsets[1]=100 is the direction-delta
// table base (x at 100+dir, y at 108+dir).
function rigAnchor(input, ax, ay) {
  input.eCube[0][2][0] = 0;
  input.eCube[0][0][0] = ax;
  input.eCube[0][1][0] = ay;
  input.dCube[0][0][1] = ax;
  input.dCube[0][1][1] = ay;
  input.packedOffsets[3] = 0;
  input.packedOffsets[1] = 100;
}

// localC===2 (out of map bounds, offset 368..375): bField135 forced to 130
// (the "stop scanning" sentinel), no fByte/dCube/eByte/localFlags writes.
{
  const input = makeFCallInput();
  rigAnchor(input, 20, 20);
  input.packedBytes[4] = 0; // initial bScratch = 0
  input.packedBytes[100] = 100; // direction 0's x-delta: way past mapWidth

  stepLegacySubsystemFCall(input, 0);

  assert.equal(input.scalars.bField135, 130, "out-of-bounds candidate sets the 130 sentinel");
  assert.equal(input.fByte[1], 0);
  assert.equal(input.fByte[2], 0);
  assert.deepEqual(input.localFlags, [false, false, false]);
}

// Inner loop exhausts all 8 directions without finding anything (localC===1
// every time -> pure rotation, offset 382..443) -> the `else` tail sets
// `localFlags[2]=false` (hardcoded index, NOT bField164-1). checkLegacyCellCompatibility
// is forced to accept unconditionally by passing mode!==0 (every one of its
// own gates is `mode===0`-guarded).
{
  const input = makeFCallInput({ localFlags: [false, false, true] });
  rigAnchor(input, 20, 20);
  input.packedBytes[4] = 0; // initial bScratch = 0
  // all direction deltas stay 0 -> every candidate lands back on the anchor cell.
  input.gridC[20][20] = 7; // nonzero -> localC = checkLegacyCellCompatibility(...) with mode=1 -> always true -> 1

  stepLegacySubsystemFCall(input, 1); // mode=1: every internal gate in checkLegacyCellCompatibility is skipped

  assert.equal(input.localFlags[2], false, "inner loop exhausted for both h -> localFlags[2] forced false");
  assert.equal(input.fByte[1], 0, "no commit ever happens on a pure-rotation exhaust");
  assert.equal(input.fByte[2], 0);
}

// localC===0, even bScratch (skip the inner gridB check entirely), a
// single-step drift that returns to the anchor on the SECOND middle pass ->
// the "no change" break (offset 822). Hand-derived per-h because the
// asymmetric bField178 sign flip (+1 for h=gArr[1], -1 for h=gArr[2]) makes
// the two h's bScratch cycle in OPPOSITE directions through the same
// {0,2,4,6} set, so h=gArr[1] returns to the anchor after ONE commit while
// h=gArr[2] takes THREE (0->6 vs 0->2->4->6) before landing on the same
// "return" direction (6).
{
  const input = makeFCallInput();
  rigAnchor(input, 20, 20);
  input.packedBytes[4] = 0; // initial bScratch = 0 for both h
  input.packedBytes[100 + 0] = 1; // direction 0: x+1 (the only nonzero delta besides direction 6)
  input.packedBytes[100 + 6] = -1; // direction 6: x-1 (returns to the anchor from x+1)
  // gridC and gridB stay entirely default 0 -> every visited cell is "empty" and never a sentinel.

  stepLegacySubsystemFCall(input, 0);

  assert.equal(input.fByte[1], 1, "h=gArr[1]: bScratch cycles 0->6 in ONE step (bField178=+1), one commit then match");
  assert.equal(input.dCube[1][0][0], 21, "the single committed position: anchor x(20)+1");
  assert.equal(input.dCube[1][1][0], 20);

  assert.equal(input.fByte[2], 3, "h=gArr[2]: bScratch cycles 0->2->4->6 (bField178=-1), THREE commits before matching");
  assert.equal(input.dCube[2][0][0], 21);
  assert.equal(input.dCube[2][0][1], 21, "direction 2/4 both have a zero delta -> position doesn't move");
  assert.equal(input.dCube[2][0][2], 21);
}

// gridB sentinel found INSIDE the inner loop (bScratch odd, offset 496..529):
// eByte[h] set from the sentinel value, localFlags[bField164-1]=true,
// bField135 forced to 130. All direction deltas stay 0 so the "rotated"
// check lands exactly on the anchor cell for BOTH h (bField178's sign does
// not matter when every delta is 0).
{
  const input = makeFCallInput();
  rigAnchor(input, 20, 20);
  input.packedBytes[4] = 1; // initial bScratch = 1 (odd)
  input.gridB[20][20] = -5; // sentinel: -5 < -bField68(0) && -5 >= -10

  stepLegacySubsystemFCall(input, 0);

  assert.equal(input.eByte[1], 4, "eByte[gArr[1]] = -(xv+1) = -(-5+1) = 4");
  assert.equal(input.eByte[2], 4, "eByte[gArr[2]] = 4 (same sentinel cell, found by h=gArr[2] too)");
  assert.deepEqual(input.localFlags, [true, true, false]);
  assert.equal(input.fByte[1], 0, "no commit: the sentinel path breaks out before ever reaching a commit");
  assert.equal(input.fByte[2], 0);
}

// bScratch odd, gridB NOT a sentinel, but the rotated position matches the
// eCube anchor exactly (offset 641..648): bField135 forced to 130, nothing
// else changes (no eByte/localFlags write this time).
{
  const input = makeFCallInput();
  rigAnchor(input, 20, 20);
  input.packedBytes[4] = 1; // odd bScratch, same rigging as above, minus the gridB sentinel
  // gridB stays default 0 everywhere -> not a sentinel (0 is not < -bField68=0).

  stepLegacySubsystemFCall(input, 0);

  assert.deepEqual(input.localFlags, [false, false, false], "the anchor-match branch never touches localFlags");
  assert.equal(input.eByte[1], 0);
  assert.equal(input.eByte[2], 0);
  assert.equal(input.fByte[1], 0, "no commit: this branch also breaks out before reaching a commit");
}

// gridB sentinel found in the POST-inner "commit attempt" (offset 847..922),
// distinct from the inner loop's own gridB check above: a single drift step
// (even bScratch, no rotation) lands on a gridB sentinel cell.
{
  const input = makeFCallInput();
  rigAnchor(input, 10, 10);
  input.packedBytes[4] = 0; // even bScratch
  input.packedBytes[100 + 0] = 1; // direction 0: x+1
  input.gridB[10][11] = -5; // sentinel at the drifted-to cell (10+1, 10)

  stepLegacySubsystemFCall(input, 0);

  assert.equal(input.eByte[1], 4, "found via the POST-inner commit-attempt check, not the inner-loop one");
  assert.equal(input.eByte[2], 4);
  assert.deepEqual(input.localFlags, [true, true, false]);
  assert.equal(input.fByte[1], 0, "found-target breaks middle directly -- no dCube/fByte commit for this step");
}

// The middle loop's own bound (bField135<80) can be exhausted with NO break
// firing at all -- every direction shares the same nonzero delta, so every
// pass "commits" a genuinely new position and neither the anchor-match nor
// the gridB-sentinel checks ever trigger, all the way to bField135=80.
{
  const input = makeFCallInput();
  rigAnchor(input, 10, 10);
  input.packedBytes[4] = 0;
  for (let dir = 0; dir < 8; dir += 1) input.packedBytes[100 + dir] = 1; // every direction: x+1, y+0
  // gridC/gridB stay entirely default 0 -> localC always 0, never a sentinel.

  stepLegacySubsystemFCall(input, 0);

  assert.equal(input.scalars.bField135, 80, "the while(bField135<80) condition itself ended the loop, no break");
  assert.equal(input.fByte[1], 80, "80 commits happened (one per pass)");
  assert.equal(input.fByte[2], 80, "same for h=gArr[2]: direction magnitude doesn't depend on bField178's sign here");
  assert.equal(input.dCube[1][0][79], 10 + 80, "last committed x: anchor(10) + 80 one-step drifts");
}

// bField178 sign flip: starts at 1, flips to -1 after h=gArr[1]'s own
// processing, flips back to 1 after h=gArr[2]'s.
{
  const input = makeFCallInput();
  rigAnchor(input, 20, 20);
  input.packedBytes[4] = 0;
  input.packedBytes[100] = 100; // out of bounds -> both h's finish in one pass (offset 368..375)

  stepLegacySubsystemFCall(input, 0);

  assert.equal(input.scalars.bField178, 1, "flips 1 -> -1 -> 1 across the two h iterations");
}

// Exception fidelity: `packedOffsets` accessed WITHOUT optional chaining
// (`packedOffsets[3] ?? 0`) is the real throw site if it is ever missing --
// reached AFTER fByte[gArr[1]]=0 and localFlags[0]=false already ran for
// h=gArr[1] (offsets before the packedOffsets read), but BEFORE anything
// for h=gArr[2]. The whole function still returns normally (caught by its
// own [0,1050]->1051 handler).
{
  const input = makeFCallInput({ packedOffsets: undefined });
  input.fByte[1] = 55; // will be reset to 0 before the throw
  input.fByte[2] = 66; // should survive: h=gArr[2] never starts
  input.localFlags[0] = true; // will be reset to false before the throw

  stepLegacySubsystemFCall(input, 0); // does not throw out of the function itself

  assert.equal(input.fByte[1], 0, "h=gArr[1]'s own top-of-loop reset ran before the throw");
  assert.equal(input.localFlags[0], false);
  assert.equal(input.fByte[2], 66, "h=gArr[2] never started: its own reset never ran");
  // bField178=1 is set unconditionally at the very top of the try block
  // (before the for-loop even starts), so it always becomes 1 regardless of
  // where the throw happens -- what the throw actually prevents is the
  // end-of-h=1 SIGN FLIP (`bField178=-bField178`), which never runs here.
  assert.equal(input.scalars.bField178, 1, "set once at entry; the end-of-h=1 flip to -1 never ran -- the throw preceded it");
}

console.log("b's private void a(boolean) (#265) + private void f(int) (#380) OK");
