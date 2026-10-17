// Regression test for LegacySubsystemAr.ts (private void ar()).
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

const { stepLegacySubsystemAr } = loadModule("./sim/tribe/LegacySubsystemAr", srcDir);

function makeGrid() {
  return Array.from({ length: 10 }, () => new Int8Array(10));
}

function makeInput(overrides = {}) {
  return {
    state: new Int8Array(10000),
    packedBytes: new Int8Array(2000),
    packedOffsets: new Int16Array(312),
    gridC: makeGrid(),
    pByte: -1,
    sceneQ: 0,
    simulationCounter: 32, // 32&31===0 -> periodicA true
    ...overrides,
  };
}

// Throttle: neither periodic condition true -> no-op, pByte unchanged.
{
  const input = makeInput({ simulationCounter: 1 }); // 1&31!==0
  input.packedOffsets[241] = 5;
  input.packedBytes[5 + 0] = 0; // period = 0*10 = 0 -> periodicB false (guarded against div-by-zero style)
  let called = false;
  const result = stepLegacySubsystemAr(input, { onV: () => {}, onPlaceEntity: () => { called = true; return 1; } });
  assert.equal(called, false);
  assert.equal(result.pByte, -1);
}

// Empty loop range (upperBound===lowerBound): no scan, no candidate, no placeEntity call.
{
  const input = makeInput();
  input.packedOffsets[247] = 9;
  input.packedBytes[9 + 0] = 5; // lower
  input.packedBytes[9 + 0 + 1] = 5; // upper === lower -> empty loop
  let called = false;
  const result = stepLegacySubsystemAr(input, { onV: () => {}, onPlaceEntity: () => { called = true; return 1; } });
  assert.equal(called, false);
  assert.equal(result.pByte, -1);
}

// aT===0 (empty grid cell), pByte===-1, on a periodicB frame with (c&31)!==0 ->
// records the candidate row (offsets 351..385: `ifeq 388` skips (c&31)===0).
{
  const input = makeInput({ simulationCounter: 10 });
  input.packedOffsets[241] = 5;
  input.packedBytes[5] = 1; // period = 10 -> periodicB
  input.packedOffsets[247] = 9;
  input.packedBytes[9] = 0; // lower
  input.packedBytes[9 + 1] = 1; // upper -> one iteration, aS=0
  input.packedOffsets[246] = 20; // row lookup
  input.packedOffsets[245] = 30; // col lookup
  input.packedBytes[20 + 0] = 2; // row
  input.packedBytes[30 + 0] = 3; // col
  input.gridC[2][3] = 0; // empty cell -> aT = -0 = 0
  let called = false;
  // Once the loop ends, pByte is no longer -1 (a candidate row 0 got
  // recorded), so the method proceeds to its placeEntity tail using that
  // row -- matching the real bytecode's own single-pass structure.
  const result = stepLegacySubsystemAr(input, { onV: () => {}, onPlaceEntity: () => { called = true; return 1; } });
  assert.equal(called, true, "candidate row 0 was recorded, so the placeEntity tail runs using it");
  assert.equal(result.pByte, -1, "placeEntity succeeded (return 1 > 0), so pByte resets");
}

// aT in [31,60]: gates on kind/active/busy, then calls onBuildingAction on the (c&31)===0 schedule.
{
  const input = makeInput({ simulationCounter: 32 }); // periodicA
  input.packedOffsets[247] = 9;
  input.packedBytes[9] = 0;
  input.packedBytes[9 + 1] = 1;
  input.packedOffsets[246] = 20;
  input.packedOffsets[245] = 30;
  input.packedBytes[20 + 0] = 1;
  input.packedBytes[30 + 0] = 1;
  input.gridC[1][1] = -40; // building id 40, in [31,60]
  input.state[8749 + 40] = 2; // kind
  input.packedOffsets[243] = 50;
  input.packedBytes[50 + 0] = 2; // matches kind
  input.state[8505 + 40] = 20; // active
  input.state[8627 + 40] = 0; // not busy
  input.state[8566 + 40] = 40; // dense[8566+aT]/4 = 10
  let calledWith;
  // 20 >= 10: not damaged enough, no repair (offsets 256..284, `if_icmpge 388`).
  stepLegacySubsystemAr(input, { onV: () => {}, onBuildingAction: (id, flag) => { calledWith = [id, flag]; } });
  assert.equal(calledWith, undefined);
  input.state[8505 + 40] = 9; // below a quarter -> repair
  stepLegacySubsystemAr(input, { onV: () => {}, onBuildingAction: (id, flag) => { calledWith = [id, flag]; } });
  assert.deepEqual(calledWith, [40, false]);
}

// The same empty cell on a (c&31)===0 frame is not recorded.
{
  const input = makeInput({ simulationCounter: 32 });
  input.packedOffsets[247] = 9;
  input.packedBytes[9] = 0;
  input.packedBytes[9 + 1] = 1;
  input.packedOffsets[246] = 20;
  input.packedOffsets[245] = 30;
  input.packedBytes[20 + 0] = 2;
  input.packedBytes[30 + 0] = 3;
  input.gridC[2][3] = 0;
  const result = stepLegacySubsystemAr(input, { onV: () => {}, onPlaceEntity: () => 1 });
  assert.equal(result.pByte, -1);
}

// aT in [31,60], NOT on the periodicA schedule -> uses the dense[9115+aT] threshold path, calls with flag=true.
{
  const input = makeInput({ simulationCounter: 1 }); // periodicA false
  input.packedOffsets[241] = 5;
  input.packedBytes[5] = 1; // period=10, 1%10!==0 -> periodicB false too... need at least one periodic true to run at all
  // Force periodicB true instead: simulationCounter % (packedBytes[po241+q]*10) === 0
  input.simulationCounter = 10;
  input.packedBytes[5] = 1; // period = 1*10 = 10, 10%10===0 -> periodicB true
  input.packedOffsets[247] = 9;
  input.packedBytes[9] = 0;
  input.packedBytes[9 + 1] = 1;
  input.packedOffsets[246] = 20;
  input.packedOffsets[245] = 30;
  input.packedBytes[20 + 0] = 1;
  input.packedBytes[30 + 0] = 1;
  input.gridC[1][1] = -40;
  input.state[8749 + 40] = 2;
  input.packedOffsets[243] = 50;
  input.packedBytes[50 + 0] = 2;
  input.state[8505 + 40] = 20;
  input.state[8627 + 40] = 0;
  input.state[9115 + 40] = 3;
  input.packedOffsets[244] = 60;
  input.packedBytes[60 + 0] = 10; // threshold: 3 < 10 -> passes
  let calledWith;
  stepLegacySubsystemAr(input, { onV: () => {}, onBuildingAction: (id, flag) => { calledWith = [id, flag]; } });
  assert.deepEqual(calledWith, [40, true]);
}

// After a full scan with a recorded candidate, calls placeLegacyEntity with the double-indexed
// type lookup and packedBytes-derived x/y; success resets pByte to -1.
{
  const input = makeInput({ pByte: 7 });
  input.packedOffsets[247] = 9;
  input.packedBytes[9] = 5;
  input.packedBytes[9 + 1] = 5; // empty scan range -- go straight to the placeEntity tail
  input.packedOffsets[243] = 50;
  input.packedBytes[50 + (7 & 255)] = 12; // inner lookup
  input.packedOffsets[138] = 100;
  input.packedBytes[100 + 416 + 12] = 33; // type
  input.packedOffsets[245] = 30;
  input.packedBytes[30 + (7 & 255)] = 44; // x
  input.packedOffsets[246] = 20;
  input.packedBytes[20 + (7 & 255)] = 55; // y
  let captured;
  let v = 51;
  const result = stepLegacySubsystemAr(input, {
    onV: (value) => { v = value; },
    onPlaceEntity: (...args) => { captured = [...args, v]; return 9; },
  });
  // Offset 432: v = t243[P] before f.a(BIIIIZI), which stores v as the site's 9237 (oracle run 15).
  assert.deepEqual(captured, [1, 33, 44, 55, 3, true, -1, 12]);
  assert.equal(result.pByte, -1);
}

// If placeLegacyEntity fails (<=0), pByte is NOT reset -- stays queued for next call.
{
  const input = makeInput({ pByte: 7 });
  input.packedOffsets[247] = 9;
  input.packedBytes[9] = 5;
  input.packedBytes[9 + 1] = 5;
  const result = stepLegacySubsystemAr(input, { onV: () => {}, onPlaceEntity: () => -1 });
  assert.equal(result.pByte, 7);
}

console.log("b.ar() scout/recruit trigger OK");
