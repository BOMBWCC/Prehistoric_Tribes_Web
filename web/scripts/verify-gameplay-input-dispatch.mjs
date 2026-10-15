// Integration test for LegacyRuntimeState's stepLegacyD/stepLegacyE/
// stepLegacyA2/stepLegacyF (private void d(byte)/e(byte)/a(byte,byte)/
// f(byte), bytecode/f-javap.txt offsets 20028..20819). These are V()'s
// movement/target dispatch targets, now wired for real via
// stepLegacyGameplayInput's onD/onE/onF callbacks (see
// verify-gameplay-input.mjs for the dispatch-routing tests). Tested here
// directly via bracket notation since they're private methods.
import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";
import path from "node:path";

const srcDir = new URL("../src/j2me/", import.meta.url).pathname;
const context = vm.createContext({ Int8Array, Int16Array, Int32Array, Array, console, Math });
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

const { LegacyRuntimeState } = loadModule("./LegacyRuntimeState", srcDir);

// --- stepLegacyD ---

// nInt>1 branch.
{
  const rt = new LegacyRuntimeState();
  rt.game.nInt = 5;
  rt.game.IByte = 10; rt.game.KByte = 8;
  rt.game.viewportO = 12; rt.game.viewportP = 19;
  rt.game.frameLayoutL = 7; rt.game.kByte = 7;
  // Two living team-0 units on screen, one off it (the window is columns
  // I..I+O-1, rows K..K+P-1).
  for (const [id, x, y] of [[4, 12, 9], [6, 20, 20], [8, 40, 40]]) {
    rt.denseState[1919 + id] = 10; rt.gridC[y][x] = id;
  }
  rt["stepLegacyD"](3);
  assert.equal(rt.game.nInt, 0);
  // d(byte)'s window B..E and u/t are consumed by aF() (offset 60), which
  // clears them again (WIRED 2026-09-23 -- this used to be a no-op).
  assert.deepEqual([rt.game.BCounter, rt.game.CCounter, rt.game.DCounter, rt.game.ECounter], [0, 0, 0, 0]);
  assert.equal(rt.game.uFlag, false);
  assert.equal(rt.game.inputT, false);
  assert.deepEqual(Array.from(rt.mainArrays.aByte[4].slice(0, 3)), [4, 6, 0], "both on-screen units selected");
  assert.equal(rt.denseState[909 + 4], 4);
  assert.equal(rt.game.FByte, 4);
  assert.equal(rt.game.wByte, 1);
  assert.equal(rt.game.frameLayoutL, 0);
  assert.equal(rt.game.kByte, 0);
}

// nInt<=1, dense[1919+arg]>0 branch.
{
  const rt = new LegacyRuntimeState();
  rt.game.nInt = 0;
  rt.denseState[1919 + 3] = 1;
  rt["stepLegacyD"](3);
  assert.equal(rt.game.wByte, 1);
  assert.equal(rt.game.frameLayoutL, 3);
  assert.equal(rt.game.kByte, 3);
  assert.equal(rt.game.FByte, -1);
}

// nInt<=1, dense[1919+arg]<=0 -> no-op.
{
  const rt = new LegacyRuntimeState();
  rt.game.nInt = 0;
  rt.game.wByte = 9;
  rt["stepLegacyD"](3);
  assert.equal(rt.game.wByte, 9);
}

// --- stepLegacyA2 (private void a(byte,byte)) ---

// b.a(12,target,0) early-return gate: dense[505+target]<10 && outerLoopNFlag.
{
  const rt = new LegacyRuntimeState();
  rt.denseState[505 + 5] = 0;
  rt.game.outerLoopNFlag = true;
  rt["stepLegacyA2"](5, -20);
  assert.equal(rt.denseState[3131 + 5], 0); // never reached the main body
}

// classifyLegacyNegativeEntity(source)===0 && dense[8749-source]===6 -> qCounter/wByte, no main-body writes,
// and Z() (stepFrameSelectionTransition) fires for real -- 2026-08-18, reusing the SAME already-wired
// method f.W()'s own Z-command dispatch uses, not a fresh port.
{
  const rt = new LegacyRuntimeState();
  rt.denseState[505 + 5] = 20; // avoid the b.a() gate
  rt.denseState[8749 - -10] = 6; // 8749+10
  let zCalls = 0;
  const originalZ = rt.stepFrameSelectionTransition.bind(rt);
  rt.stepFrameSelectionTransition = () => { zCalls += 1; return originalZ(); };
  rt["stepLegacyA2"](5, -10);
  assert.equal(rt.game.qCounter, 10);
  assert.equal(rt.game.wByte, 2);
  assert.equal(rt.denseState[3131 + 5], 0); // main body never reached
  assert.equal(zCalls, 1);
}

// Main body, double tap (n:I > 1; fixed 2026-10-08, the port had `<= 1`), dense[7777+target]===0 -> block-A write.
// classifyLegacySubsystemB (b.b(int)#543) runs between the dense[7777+target]=3
// write and the packedOffsetsBase write -- set dense[1414+target]>=12/
// [7979+target]&2===0/[3535+target]===0/[6565+target]!==1 so it hits its own
// "dense[7777+target]>0 -> return 7" path and leaves 7777 untouched (survives
// the real bytecode's own re-check at offset 194..204).
{
  const rt = new LegacyRuntimeState();
  rt.denseState[505 + 5] = 20;
  rt.game.nInt = 2; // double tap: n:I > 1
  rt.game.yByte = 1; rt.game.IByte = 2; rt.game.AByte = 3; rt.game.KByte = 4;
  rt.denseState[7777 + 5] = 0;
  rt.denseState[1414 + 5] = 12;
  rt.denseState[606 + 5] = 0; // nibble=0
  rt.packedOffsets[129] = 50; rt.packedOffsets[130] = 60;
  rt.denseState[1010 + 5] = 10;
  rt.packedBytes[60 + 10 - 5] = 7; // inner
  rt.denseState[1111 + 5] = 0; // & 15 = 0, & 240 = 0
  rt.packedBytes[50 + 7 + 0] = 9; // outer
  rt["stepLegacyA2"](5, 1);
  assert.equal(rt.denseState[7777 + 5], 3);
  assert.equal(rt.denseState[1111 + 5], 0 + 9); // X(=0) + outer(=9)
  assert.equal(rt.game.cQFlag, true);
  assert.equal(rt.denseState[3131 + 5], 1 + 2); // yByte+IByte
  assert.equal(rt.denseState[3232 + 5], 3 + 4); // AByte+KByte
  assert.equal(rt.denseState[6161 + 5], 2);
  assert.equal(rt.denseState[4747 + 5], 1);
  assert.equal(rt.game.cAbByte, 3);
  assert.equal(rt.game.cAcByte, 7);
}

// Same shape as above, but classifyLegacySubsystemB resets dense[7777+target]
// back to 0 (dense[1414+target]<12 -> its own "return 6" path) -- the real
// bytecode's re-check (offset 194..204) then skips the packedOffsetsBase
// write entirely. BUG FIX (2026-08-22): this call and re-check used to be
// missing altogether, so this write would have fired unconditionally.
{
  const rt = new LegacyRuntimeState();
  rt.denseState[505 + 5] = 20;
  rt.game.nInt = 2;
  rt.game.yByte = 1; rt.game.IByte = 2; rt.game.AByte = 3; rt.game.KByte = 4;
  rt.denseState[7777 + 5] = 0;
  rt.denseState[1414 + 5] = 0; // < 12 -> classify resets 7777 back to 0
  rt.denseState[606 + 5] = 0;
  rt.packedOffsets[129] = 50; rt.packedOffsets[130] = 60;
  rt.denseState[1010 + 5] = 10;
  rt.packedBytes[60 + 10 - 5] = 7;
  rt.denseState[1111 + 5] = 42; // must stay untouched
  rt.packedBytes[50 + 7 + 0] = 9;
  rt["stepLegacyA2"](5, 1);
  assert.equal(rt.denseState[7777 + 5], 0);
  assert.equal(rt.denseState[1111 + 5], 42);
}

// Main body, single tap (n:I <= 1) to a new cell, dense[7777+target]>0 -> block-B write, clears 7777, q:Z untouched.
{
  const rt = new LegacyRuntimeState();
  rt.denseState[505 + 5] = 20;
  rt.game.nInt = 1;
  rt.game.yByte = 1; rt.game.IByte = 2; rt.game.AByte = 3; rt.game.KByte = 4;
  rt.denseState[3131 + 5] = 99; // mismatched -> position changed
  rt.denseState[7777 + 5] = 2;
  rt.denseState[606 + 5] = 1; // nibble=1
  rt.packedOffsets[133 + 2] = 70; rt.packedOffsets[133 + 3] = 80;
  rt.denseState[1010 + 5] = 5;
  rt.packedBytes[80 + 5 - 5] = 11; // inner
  rt.denseState[1111 + 5] = 3; // &15=3, &240=0
  rt.packedBytes[70 + 11 + 3] = 6; // outer
  rt["stepLegacyA2"](5, 1);
  assert.equal(rt.denseState[1111 + 5], 0 + 6);
  assert.equal(rt.denseState[7777 + 5], 0);
  assert.equal(rt.game.cQFlag, false);
}

// Occupancy tail: classify(source)===1 (51..100) routes through occupancyClass.
{
  const rt = new LegacyRuntimeState();
  rt.denseState[505 + 5] = 20;
  rt.game.nInt = 0;
  rt.game.yByte = 0; rt.game.IByte = 0; rt.game.AByte = 0; rt.game.KByte = 0;
  rt["stepLegacyA2"](5, 60); // classifyLegacyPositiveEntity(60) === 1
  // occupancyClass(0,0) on a fresh runtime is 2 (unexplored) !== 0 -> cAaByte=1
  assert.equal(rt.game.cAaByte, 1);
}

// --- stepLegacyE ---

// FByte===-1 -> dispatches once via kByte.
{
  const rt = new LegacyRuntimeState();
  rt.game.FByte = -1;
  rt.game.kByte = 5;
  rt.denseState[505 + 5] = 20;
  rt.game.nInt = 0;
  rt["stepLegacyE"](1);
  assert.equal(rt.denseState[3131 + 5], 0); // touched by stepLegacyA2's main body
  assert.equal(rt.game.nInt, 0); // reset at the end of e(byte) too
}

// FByte!==-1 -> loops mainArrays.aByte[FByte], dispatching for every >0
// entry. CORRECTION (2026-08-24): was game.teamEntitySlots, a disconnected
// duplicate of this same field (f.a:[[B]#130) with no real writer anywhere
// -- fixed to read the live mainArrays.aByte instead.
{
  const rt = new LegacyRuntimeState();
  rt.game.FByte = 2;
  rt.mainArrays.aByte[2][0] = 7;
  rt.mainArrays.aByte[2][10] = 9;
  rt.denseState[505 + 7] = 20;
  rt.denseState[505 + 9] = 20;
  rt.game.nInt = 0;
  rt["stepLegacyE"](1);
  assert.equal(rt.denseState[3131 + 7], 0);
  assert.equal(rt.denseState[3131 + 9], 0);
}

// --- stepLegacyF ---

// dense[8749+arg]===3 && mismatched marker -> mainArrays.r[0]/frameLayoutAS reset + l(4).
{
  const rt = new LegacyRuntimeState();
  rt.denseState[8749 + 3] = 3;
  rt.mainArrays.aShort[0][17] = 0;
  rt.denseState[4444 + 0] = 999; // !== arg(3)
  rt.mainArrays.r[0] = 5;
  rt.game.frameLayoutAS = 5;
  rt["stepLegacyF"](3);
  assert.equal(rt.mainArrays.r[0], 0);
  assert.equal(rt.game.frameLayoutAS, 0);
  assert.equal(rt.game.zlDShorts[4], 37); // l(4): 33+4
  assert.equal(rt.game.zlKBytes[4], 1);
  assert.equal(rt.game.wByte, 4); // l(4)'s Y>=3 branch
}

// Falls through to the outer dispatch (either gate condition false); Z() fires too.
{
  const rt = new LegacyRuntimeState();
  rt.denseState[8749 + 3] = 0; // !== 3, skip inner block
  let zCalls = 0;
  const originalZ = rt.stepFrameSelectionTransition.bind(rt);
  rt.stepFrameSelectionTransition = () => { zCalls += 1; return originalZ(); };
  rt["stepLegacyF"](3);
  assert.equal(rt.game.qCounter, 3);
  assert.equal(rt.game.wByte, 2);
  assert.equal(rt.game.kByte, 0);
  assert.equal(zCalls, 1);
}

console.log("f.d(byte)/f.e(byte)/f.a(byte,byte)/f.f(byte) (V()'s movement/target dispatch targets) OK");
