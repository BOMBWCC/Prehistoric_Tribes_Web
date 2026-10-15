// Behaviour test for LegacySubsystemBBoolean2.ts: private boolean p()
// (#409), bytecode/b-javap.txt line 31706, offsets 0..385. Expected values
// read off the bytecode. The nearby-marker scan itself has its own coverage
// in verify-subsystem-nearby-marker-lookup.mjs, so it is stubbed here and
// only p()'s own loop control, tail arithmetic and H() handoff are asserted.
import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";
import path from "node:path";

const srcDir = new URL("../src/j2me/", import.meta.url).pathname;
const context = vm.createContext({ Int8Array, Int16Array, Int32Array, Array, console, Math });
const cache = new Map();
const scans = [];

function loadModule(specifier, fromDir) {
  const absPath = path.resolve(fromDir, specifier) + ".ts";
  if (cache.has(absPath)) return cache.get(absPath).exports;
  const module = { exports: {} };
  cache.set(absPath, module);
  const output = ts.transpileModule(fs.readFileSync(absPath, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const localRequire = (spec) => loadModule(spec, path.dirname(absPath));
  const fn = vm.compileFunction(output, ["module", "exports", "require"], { parsingContext: context });
  fn(module, module.exports, localRequire);
  return module.exports;
}

// Stub the scan before the method under test pulls it in.
const lookupPath = path.resolve(srcDir, "LegacySubsystemNearbyMarkerLookup") + ".ts";
cache.set(lookupPath, {
  exports: {
    stepLegacySubsystemNearbyMarkerLookup: (input) => {
      scans.push(input.layer);
      if (typeof stubFind === "function") stubFind(input);
    },
  },
});
let stubFind = null;

const { stepLegacySubsystemBBoolean2 } = loadModule("./LegacySubsystemBBoolean2", srcDir);

const V = 4;

function fixture(overrides = {}) {
  const packedBytes = new Int8Array(2000);
  const packedOffsets = new Int16Array(320);
  // Real t119 entries are priority classes (>= 1); a 0 would make the
  // offset-235 compare match the freshly-reset y:B and break immediately.
  for (let layer = 0; layer < 32; layer += 1) packedBytes[100 + layer] = 6;
  packedOffsets[119] = 100;  // per-layer top priority class
  packedOffsets[120] = 110;  // ag -> layer
  packedOffsets[122] = 130;  // unit type -> priority it will abandon
  const state = new Int8Array(10000);
  const gridC = Array.from({ length: 64 }, () => new Int8Array(64));
  const arrays = { bField232: 0, bField115: 0, bField235: 0, bField6: 0, bField17: 0 };
  const aFlag = { value: true };
  const bByte = { value: 0 };
  const calls = [];
  state[V] = 5; state[101 + V] = 6; state[4949 + V] = 2;
  state[2828 + V] = 5;
  const input = {
    state, entityId: V, sceneQ: 0, fByte: 0, team: 0,
    packedBytes, packedOffsets, saveOffsets: new Int16Array(320), gridC, arrays,
    bFlag: false, aFlag, zInt: 0, bValue: 3, bByte,
    onH: () => calls.push("H"),
    ...overrides,
  };
  return { input, state, arrays, aFlag, bByte, calls, packedBytes, gridC };
}

// Offsets 0..39: the two early-return gates are the only way out without
// scanning at all.
{
  scans.length = 0;
  const { input, calls } = fixture({ sceneQ: 3, fByte: 5 });
  assert.equal(stepLegacySubsystemBBoolean2(input), false);
  assert.deepEqual(scans, []);
  assert.deepEqual(calls, []);

  scans.length = 0;
  assert.equal(stepLegacySubsystemBBoolean2(fixture({ sceneQ: 2, fByte: 1 }).input), false);
  assert.deepEqual(scans, []);
}

// Offsets 85..251: three layers for team 0 on a non-3 mission, taken from
// t120[ag]; nothing found -> false, and H() never runs.
{
  scans.length = 0;
  stubFind = null;
  const { input, calls, packedBytes } = fixture();
  packedBytes[110] = 7; packedBytes[111] = 8; packedBytes[112] = 9;
  assert.equal(stepLegacySubsystemBBoolean2(input), false);
  assert.deepEqual(scans, [7, 8, 9]);
  assert.deepEqual(calls, []);
}

// Offsets 139..161: on mission 3 the loop starts at u*6 and skips ag === 1.
{
  scans.length = 0;
  const { input, packedBytes } = fixture({ sceneQ: 3, fByte: 0, team: 0 });
  packedBytes[110] = 7; packedBytes[111] = 8; packedBytes[112] = 9;
  stepLegacySubsystemBBoolean2(input);
  assert.deepEqual(scans, [7, 9], "ag === 1 is skipped");
}

// Team 1 starts at u * 3 = 3.
{
  scans.length = 0;
  const { input, packedBytes } = fixture({ team: 1 });
  packedBytes[113] = 20; packedBytes[114] = 21; packedBytes[115] = 22;
  stepLegacySubsystemBBoolean2(input);
  assert.deepEqual(scans, [20, 21, 22]);
}

// Offsets 214..238: a find of the layer's own top class stops the loop.
{
  scans.length = 0;
  const { input, packedBytes, arrays } = fixture();
  packedBytes[110] = 7; packedBytes[111] = 8; packedBytes[112] = 9;
  packedBytes[100 + 8] = 4;  // t119[layer 8]
  stubFind = (scan) => { if (scan.layer === 8) arrays.bField232 = 4; };
  stepLegacySubsystemBBoolean2(input);
  assert.deepEqual(scans, [7, 8], "layer 9 is never scanned");
  stubFind = null;
}

// Offsets 261..383: a find hands off to H() after narrowing a:Z and setting
// B:B from the found cell. t122[type] (2) < y (4) keeps a:Z set.
{
  scans.length = 0;
  const { input, state, arrays, aFlag, bByte, calls, packedBytes, gridC } = fixture();
  packedBytes[130 + 5] = 2;
  gridC[12][11] = 9;
  stubFind = () => { arrays.bField232 = 4; arrays.bField235 = 11; arrays.bField6 = 12; };
  assert.equal(stepLegacySubsystemBBoolean2(input), true);
  assert.equal(aFlag.value, true);
  assert.equal(bByte.value, 9, "B:B = gridC[A][z]");
  assert.deepEqual(calls, ["H"]);
  stubFind = null;
}

// ... and a find the unit will not abandon its current job for clears a:Z,
// because neither z:I/10 > B:I nor an:I <= B:I holds.
{
  const { input, arrays, aFlag } = fixture({ zInt: 10, bValue: 3 });
  input.packedBytes[130 + 5] = 9;  // t122[type] (9) >= y (4)
  stubFind = () => { arrays.bField232 = 4; arrays.bField115 = 99; };
  assert.equal(stepLegacySubsystemBBoolean2(input), true);
  assert.equal(aFlag.value, false, "10 / 10 is not > 3");
  stubFind = null;
}

// ... while a far-but-close find keeps it.
{
  const { input, arrays, aFlag } = fixture({ zInt: 90, bValue: 3 });
  input.packedBytes[130 + 5] = 9;
  stubFind = () => { arrays.bField232 = 4; arrays.bField115 = 1; };
  stepLegacySubsystemBBoolean2(input);
  assert.equal(aFlag.value, true, "90 / 10 > 3 and an (1) <= 3");
  stubFind = null;
}

// b:Z set, or a type above 9, leaves a:Z completely alone.
{
  const { input, arrays, aFlag } = fixture({ bFlag: true, zInt: 0, bValue: 3 });
  input.packedBytes[130 + 5] = 9;
  stubFind = () => { arrays.bField232 = 4; arrays.bField115 = 99; };
  stepLegacySubsystemBBoolean2(input);
  assert.equal(aFlag.value, true);

  const second = fixture({ zInt: 0, bValue: 3 });
  second.state[2828 + V] = 20;
  stepLegacySubsystemBBoolean2(second.input);
  assert.equal(second.aFlag.value, true);
  stubFind = null;
}

console.log("p() #409 marker scan OK");
