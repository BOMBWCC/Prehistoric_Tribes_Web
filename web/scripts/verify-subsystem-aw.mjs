// Regression test for LegacySubsystemAw.ts (private void aw()).
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

const { stepLegacySubsystemAw } = loadModule("./LegacySubsystemAw", srcDir);

function makeGrid() {
  return Array.from({ length: 20 }, () => new Int8Array(20));
}

function makeInput(overrides = {}) {
  return {
    state: new Int8Array(10000),
    packedBytes: new Int8Array(4000),
    packedOffsets: new Int16Array(400),
    gridC: makeGrid(),
    team: 1,
    nByte: 0,
    oByte: 0,
    aR: 0,
    sceneQ: 0,
    simulationCounter: 0,
    ...overrides,
  };
}

// No selected units at all -> aU===0 -> oByte resets to -1.
{
  const input = makeInput();
  const result = stepLegacySubsystemAw(input, {});
  assert.equal(result.oByte, -1);
}

// A selected unit NOT on its own cell -> type=87, mode=3, local1 becomes
// false, so oByte only increments if the aR/time-budget check passes.
{
  const input = makeInput({ oByte: 5, aR: 0, simulationCounter: 0 }); // aR(0) < (5+1)*150+0=900 -> increments
  const v = 51; // team1 base
  input.state[1919 + v] = 10;
  input.state[1414 + v] = 20;
  input.state[7979 + v] = 64; // selected
  input.state[v] = 3;
  input.state[101 + v] = 4;
  input.gridC[4][3] = 999; // not occupied by v -- off cell
  const result = stepLegacySubsystemAw(input, {});
  assert.equal(input.state[2828 + v], 87);
  assert.equal(input.state[6161 + v], 3);
  // local1 became false (off-cell), aR(0) < (5+1)*150+0=900 -> oByte
  // increments to 6; with the default all-zero packedBytes the readiness
  // threshold is 0, and oByte(6)>=0, so it resets to -1 at the tail.
  assert.equal(result.oByte, -1);
}

// A selected unit ON its own cell, idle -> computes rally target and sets mode=3/type=69.
{
  const input = makeInput({ sceneQ: 2, nByte: 5, oByte: 1 });
  const v = 51;
  input.state[1919 + v] = 10;
  input.state[1414 + v] = 20;
  input.state[7979 + v] = 64;
  input.state[v] = 3;
  input.state[101 + v] = 4;
  input.gridC[4][3] = v; // on own cell
  input.state[6161 + v] = 0; // idle
  input.packedOffsets[239] = 100;
  input.packedOffsets[240] = 200;
  input.packedBytes[200 + 2] = 7; // packedBytes[po240+q]&255 = 7
  input.packedOffsets[237] = 300;
  input.packedOffsets[238] = 400;
  input.packedBytes[400 + 2] = 3; // inner = packedBytes[po238+q]
  input.packedBytes[300 + 3] = 9; // packedBytes[po237+inner] = 9 (N = 0 would read this)
  input.packedBytes[300 + 3 + 5] = 20; // N indexes t237: packedBytes[po237+inner+N] = 20 (oracle run 15)
  // aT = 100 + 7 + 20 + O(1)*2 = 129
  input.packedBytes[129] = 44; // targetX
  input.packedBytes[130] = 55; // targetY
  stepLegacySubsystemAw(input, {});
  assert.equal(input.state[6262 + v], 44);
  assert.equal(input.state[3131 + v], 44);
  assert.equal(input.state[6363 + v], 55);
  assert.equal(input.state[3232 + v], 55);
  assert.equal(input.state[6161 + v], 3);
  assert.equal(input.state[2828 + v], 69);
}

// A selected unit ON its own cell but NOT idle -> local1 becomes false, no target write.
{
  const input = makeInput();
  const v = 51;
  input.state[1919 + v] = 10;
  input.state[1414 + v] = 20;
  input.state[7979 + v] = 64;
  input.state[v] = 3;
  input.state[101 + v] = 4;
  input.gridC[4][3] = v;
  input.state[6161 + v] = 5; // busy
  stepLegacySubsystemAw(input, {});
  assert.equal(input.state[6262 + v], 0, "no rally write since it was busy");
}

// onCheckOccupancy>69 clears local1 even when the unit was otherwise
// idle-on-own-cell (only checked while local1 is still true).
{
  const input = makeInput({ oByte: 0, aR: -1000 }); // aR very negative -> the local1===false branch's time-budget check would pass
  const v = 51;
  input.state[1919 + v] = 10;
  input.state[1414 + v] = 20;
  input.state[7979 + v] = 64;
  input.state[v] = 3;
  input.state[101 + v] = 4;
  input.gridC[4][3] = v;
  input.state[6161 + v] = 0;
  let gateArgs;
  stepLegacySubsystemAw(input, {
    onCheckOccupancy: (id, x, y, arg) => { gateArgs = [id, x, y, arg]; return 99; }, // >69 -> clears local1
  });
  assert.deepEqual(gateArgs, [v, 3, 4, 0]);
}

// local1 stays true (all processed units idle-on-cell, occupancy check
// <=69) -> oByte unconditionally increments regardless of the aR/time check.
{
  const input = makeInput({ oByte: 3, aR: -999999 }); // would fail the local1===false branch's condition
  const v = 51;
  input.state[1919 + v] = 10;
  input.state[1414 + v] = 20;
  input.state[7979 + v] = 64;
  input.state[v] = 3;
  input.state[101 + v] = 4;
  input.gridC[4][3] = v;
  input.state[6161 + v] = 0;
  const result = stepLegacySubsystemAw(input, { onCheckOccupancy: () => 0 });
  // oByte started at 3, incremented to 4 (local1 stayed true) -- unless the
  // final threshold reset kicks in; with all-zero packedBytes threshold=0,
  // aU=1!==0 and oByte(4)>=threshold(0) -> resets to -1.
  assert.equal(result.oByte, -1);
}

// Offsets 439..471: O advances only once aR + (O+1)*150 < f.c (oracle 2026-10-08).
{
  const at = (c) => {
    const input = makeInput({ oByte: 0, aR: 0, simulationCounter: c });
    input.packedBytes[100] = 50; input.packedOffsets[236] = 100; // threshold
    const v = 51;
    input.state[1919 + v] = 10; input.state[1414 + v] = 20; input.state[7979 + v] = 64;
    input.state[v] = 3; input.state[101 + v] = 3; // gridC[3][3] != v -> local1 false
    return stepLegacySubsystemAw(input, {}).oByte;
  };
  assert.equal(at(100), 0, "150 ticks not yet elapsed");
  assert.equal(at(151), 1);
}

console.log("b.aw() muster-march/readiness OK");
