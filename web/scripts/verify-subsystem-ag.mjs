// Regression test for LegacySubsystemAg.ts (private void ag()).
//
// REDERIVED 2026-09-07: the "dense[9711+v] < dense[9689+v]" tail
// (offset 365..757) previously stubbed as a guaranteed throw on
// `b:[[[B]`(#134) is real -- that field is not permanently null (it's
// `f.g()`-allocated, `new byte[2][22][5]`, LegacySubsystemArrays.b). See
// the file's own docblock for the full derivation.
import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";
import path from "node:path";

const srcDir = new URL("../src/", import.meta.url).pathname;
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

const { stepLegacySubsystemAg } = loadModule("./sim/tribe/LegacySubsystemAg", srcDir);

function makeGridC() {
  return Array.from({ length: 96 }, () => new Int8Array(96));
}

function makeCandidateCells() {
  return [
    Array.from({ length: 22 }, () => new Int8Array(5)), // [0]: column list
    Array.from({ length: 22 }, () => new Int8Array(5)), // [1]: row list
  ];
}

function baseInput(overrides = {}) {
  return {
    state: new Int8Array(10000),
    packedBytes: new Int8Array(2000),
    packedOffsets: new Int16Array(320),
    localFlags: [false, false, false],
    gridC: makeGridC(),
    candidateCells: makeCandidateCells(),
    slot: 3,
    frame: 0,
    zValue: 0,
    onAi: () => {},
    ...overrides,
  };
}

// gate1<=0 branch: z=0, dense[9601]=0 -> gate1 = 0-0 = 0 <= 0.
// dense[9557]&0xff <= 7 -> dense[9579] reset to 0. dense[9579]===0 so continues.
// dense[9447]===0 -> onAi() fires. dense[9601]===0 && dense[9447]<19 -> +=1, return.
{
  const input = baseInput();
  input.state[9557 + 3] = 3;
  input.state[9447 + 3] = 0;
  let aiCalled = false;
  stepLegacySubsystemAg({ ...input, onAi: () => { aiCalled = true; } });
  assert.equal(aiCalled, true);
  assert.equal(input.state[9447 + 3], 1);
  assert.equal(input.state[9579 + 3], 0);
}

// gate1<=0, dense[9579]!==0 after the mode>7 skip -> early return before onAi.
{
  const input = baseInput();
  input.state[9557 + 3] = 200; // &0xff = 200 > 7 -> skip the dense[9579]=0 reset
  input.state[9579 + 3] = 5; // stays nonzero
  let aiCalled = false;
  stepLegacySubsystemAg({ ...input, onAi: () => { aiCalled = true; } });
  assert.equal(aiCalled, false);
  assert.equal(input.state[9579 + 3], 5); // untouched
}

// gate1<=0, dense[9601]!==0 or dense[9447]>=19 -> falls to the "reset" tail
// (dense[9447]=0, dense[9491]=z%10) instead of the increment.
{
  const input = baseInput({ zValue: 5 }); // trunc(5/10)=0, gate1=0<=0
  input.state[9447 + 3] = 19;
  stepLegacySubsystemAg(input);
  assert.equal(input.state[9447 + 3], 0);
  assert.equal(input.state[9491 + 3], 5 % 10);
}

// gate1>0 (z large enough), dense[9711]>=dense[9689] -> runs the assign
// block; f.c%period===0 -> reaches onFinishBucketAssign; result!==0 ->
// onAnimReset NOT called; then re-checks 9711<9689 -- now real: since the
// candidate cell's own gridC slot is occupied, bails via the reset path
// (dense[9689]=dense[9711]=0, throttle reset), no direction/claim writes.
{
  const input = baseInput({ zValue: 100 }); // trunc(100/10)=10, gate1=10-0=10>0
  input.state[9711 + 3] = 5;
  input.state[9689 + 3] = 5; // >= -> enters the assign block
  input.state[9535 + 3] = 1; // throttle base (also selects the period-table row below)
  input.packedOffsets[179] = 100;
  input.packedBytes[100 + 1] = 4; // period=4 (indexed by dense[9535+v]===1)
  input.frame = 8; // 8%4===0 -> reach the assign
  // Candidate at cursor 0 (dense[9711] resets to 0 inside the assign block).
  input.candidateCells[0][3][0] = 15; // col
  input.candidateCells[1][3][0] = 25; // row
  input.gridC[25][15] = 7; // occupied
  let assignCalled = false;
  stepLegacySubsystemAg({
    ...input,
    onFinishBucketAssign: () => { assignCalled = true; return 7; }, // nonzero result -> dense[9689]=7
  });
  assert.equal(assignCalled, true);
  assert.equal(input.state[9689 + 3], 0, "occupied candidate resets 9689");
  assert.equal(input.state[9711 + 3], 0, "occupied candidate resets 9711");
  assert.equal(input.state[9557 + 3], 11, "throttle reset: 10+dense[9535]");
  assert.equal(input.state[9579 + 3], 0);
  assert.equal(input.state[9491 + 3], 0, "no direction code written on the occupied path");
}

// Same setup but onFinishBucketAssign returns 0 -> if dense[9711] ends up
// still >= dense[9689] (0>=0), the candidate branch is not entered at all;
// onAnimReset fires when localFlags[2].
{
  const input = baseInput({ zValue: 100, localFlags: [false, false, true] });
  input.state[9711 + 3] = 5;
  input.state[9689 + 3] = 5;
  input.packedOffsets[179] = 100;
  input.packedBytes[100 + 0] = 4;
  input.frame = 8;
  let resetCalled = false;
  stepLegacySubsystemAg({
    ...input,
    onFinishBucketAssign: () => 0,
    onAnimReset: () => { resetCalled = true; },
  });
  assert.equal(resetCalled, true);
}

// dense[9711]<dense[9689] from the very start -> skip the assign block
// entirely, go straight to the candidate branch. Candidate's gridC cell is
// FREE: derives an 8-direction code from the zero delta (candidate ===
// entity's own position), provisionally claims the new cell, advances the
// cursor, resets dense[9447].
{
  const input = baseInput({ zValue: 100 });
  input.state[9711 + 3] = 2; // cursor
  input.state[9689 + 3] = 9;
  input.state[9359 + 3] = 10; // entity's own column
  input.state[9381 + 3] = 20; // entity's own row
  input.candidateCells[0][3][2] = 10; // same column -> delta 0
  input.candidateCells[1][3][2] = 20; // same row -> delta 0
  input.gridC[20][10] = 0; // free
  input.packedOffsets[4] = 50; // direction table base
  input.packedBytes[50 + (1 * 3 + 1)] = 2; // (0,0) delta -> dirIndex 4 -> code 2
  input.packedOffsets[1] = 70; // 8-direction delta table base
  input.packedBytes[70 + 2] = 3; // column delta for code 2
  input.packedBytes[70 + 8 + 2] = 7; // row delta for code 2
  input.state[9447 + 3] = 9; // will be reset to 0
  let assignCalled = false;
  stepLegacySubsystemAg({
    ...input,
    onFinishBucketAssign: () => { assignCalled = true; return 0; },
  });
  assert.equal(assignCalled, false, "assign block skipped when 9711<9689 from the start");
  assert.equal(input.state[9491 + 3], 2, "direction code stored");
  // CORRECTED 2026-09-22: offset 619 is `iconst_2`, so this branch writes
  // `2 + dense[9535]`, the WALKING animation -- not the `10 + kind` idle reset
  // the two bail-outs use. It is the only write in the class that brings 9557
  // to <= 7, which is exactly ah()'s entry condition.
  assert.equal(input.state[9557 + 3], 2, "walking animation: 2+dense[9535] (0 here)");
  assert.ok((input.state[9557 + 3] & 0xff) <= 7, "... and that is what lets ah() move the animal");
  assert.equal(input.gridC[27][13], -128, "new cell (origin + delta) provisionally claimed");
  assert.equal(input.state[9711 + 3], 3, "cursor advanced");
  assert.equal(input.state[9447 + 3], 0);
}

console.log("private void ag() (AI scratch tail, part 2) OK");
