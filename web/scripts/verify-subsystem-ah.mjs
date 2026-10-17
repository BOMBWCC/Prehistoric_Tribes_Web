// Regression test for LegacySubsystemAh.ts (private void ah()).
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

const { stepLegacySubsystemAh } = loadModule("./sim/tribe/LegacySubsystemAh", srcDir);

function makeGrid() {
  const grid = [];
  for (let i = 0; i < 20; i += 1) grid.push(new Int8Array(20));
  return grid;
}

function makeTables() {
  const packedBytes = new Int8Array(2000);
  const packedOffsets = new Int16Array(320);
  packedOffsets[179] = 100; // period table
  packedOffsets[15] = 200; // cycle-length table
  packedOffsets[1] = 300; // direction-delta table
  packedOffsets[12] = 400; // base-offset table
  packedOffsets[5] = 500; // x sprite table (w=0)
  packedOffsets[7] = 600; // y sprite table (w=0)
  return { packedBytes, packedOffsets };
}

// Mode gate fails (>7) -> no-op entirely.
{
  const { packedBytes, packedOffsets } = makeTables();
  const state = new Int8Array(10000);
  state[9557 + 4] = 8;
  state[9623 + 4] = 5;
  stepLegacySubsystemAh({ state, packedBytes, packedOffsets, gridC: makeGrid(), slot: 4 });
  assert.equal(state[9623 + 4], 5); // untouched
}

// Non-mid-cycle frame: sub-pixel offsets computed, no gridC/position change.
{
  const { packedBytes, packedOffsets } = makeTables();
  packedBytes[100 + 0] = 0; // period = table(179, kind=0) = 0
  packedBytes[200 + 0] = 4; // cycleLen = table(15, w*9+period=0) = 4
  packedBytes[300 + 0] = 2; // xDelta = table(1, dense[9491]=0) = 2
  packedBytes[300 + 8] = 3; // yDelta = table(1, 8+0) = 3
  packedBytes[400 + 0] = 7; // base = table(12, period=0) = 7

  const state = new Int8Array(10000);
  state[9557 + 4] = 0;
  state[9491 + 4] = 0;
  state[9535 + 4] = 0;
  state[9623 + 4] = 0; // becomes 1 -> counter=1, half=(4+1)/2 trunc=2, not mid-cycle
  state[9359 + 4] = 10;
  state[9381 + 4] = 10;
  // subX = (4+1*2)%4 = 2 -> index 7+2=9
  packedBytes[500 + 9] = 55;
  // subY = (4+1*3)%4 = 3 -> index 7+3=10
  packedBytes[600 + 10] = 66;

  const gridC = makeGrid();
  gridC[10][10] = 3;
  stepLegacySubsystemAh({ state, packedBytes, packedOffsets, gridC, slot: 4 });

  assert.equal(state[9403 + 4], 55);
  assert.equal(state[9425 + 4], 66);
  assert.equal(state[9359 + 4], 10); // unchanged
  assert.equal(gridC[10][10], 3); // untouched
}

// Mid-cycle frame with negative deltas -> clears old cell, applies delta,
// +22/+16 correction, re-places marked as slot+101.
{
  const { packedBytes, packedOffsets } = makeTables();
  packedBytes[100 + 0] = 1; // period=1
  packedBytes[200 + 0] = 2; // cycleLen=2 (even, required for the +22/+16 correction)
  packedBytes[300 + 0] = -1; // xDelta<0
  packedBytes[300 + 8] = -1; // yDelta<0
  packedBytes[400 + 1] = 0; // base = table(12, period=1) = 0
  // subX = (2 + 1*-1) % 2 = 1 -> index base+1=1
  packedBytes[500 + 1] = 0;
  packedBytes[600 + 1] = 0;

  const state = new Int8Array(10000);
  state[9557 + 4] = 0;
  state[9491 + 4] = 0;
  state[9535 + 4] = 1;
  state[9623 + 4] = 0; // becomes 1 -> counter=1, half=(2+1)/2 trunc=1 -> mid-cycle!
  state[9359 + 4] = 10;
  state[9381 + 4] = 10;

  const gridC = makeGrid();
  gridC[10][10] = 3;
  stepLegacySubsystemAh({ state, packedBytes, packedOffsets, gridC, slot: 4 });

  assert.equal(gridC[10][10], 0); // cleared
  assert.equal(state[9359 + 4], 9); // 10 + (-1)
  assert.equal(state[9381 + 4], 9);
  assert.equal(state[9403 + 4], 22); // 0 + 22 correction
  assert.equal(state[9425 + 4], 16);
  assert.equal(gridC[9][9], 4 + 101); // re-placed, marked slot+101
}

console.log("private void ah() (AI scratch tail, part 3 -- walk-cycle animation) OK");
