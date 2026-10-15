// Regression test for LegacySubsystemEntityAnimOffset.ts (private void E()).
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

const { stepLegacySubsystemEntityAnimOffset } = loadModule("./LegacySubsystemEntityAnimOffset", srcDir);

function makeTables() {
  const packedBytes = new Int8Array(2000);
  const packedOffsets = new Int16Array(20);
  packedOffsets[15] = 100; // cycle-length table
  packedOffsets[1] = 200; // direction-delta table
  packedOffsets[12] = 300; // base-offset table
  packedOffsets[5] = 400; // x sprite table (w=0)
  packedOffsets[7] = 500; // y sprite table (w=0)
  return { packedBytes, packedOffsets };
}

// Non-mid-cycle frame: w=0, l=0, cycleLen=4, xDelta=2, yDelta=3.
{
  const { packedBytes, packedOffsets } = makeTables();
  packedBytes[100 + 0] = 4;
  packedBytes[200 + 0] = 2;
  packedBytes[200 + 8] = 3;
  packedBytes[300 + 0] = 7;
  packedBytes[400 + 9] = 55; // subX = (4+1*2)%4 = 2 -> index 7+2=9
  packedBytes[500 + 10] = 66; // subY = (4+1*3)%4 = 3 -> index 7+3=10

  const state = new Int8Array(10000);
  state[606 + 5] = 0;
  state[1010 + 5] = 5;
  state[7777 + 5] = 5; // l = 0
  state[1111 + 5] = 0; // becomes 1 after increment -> frameOffset=1

  const result = stepLegacySubsystemEntityAnimOffset(state, packedBytes, packedOffsets, 5);
  assert.equal(result.w, 0);
  assert.equal(result.l, 0);
  assert.equal(state[1111 + 5], 1);
  assert.equal(state[202 + 5], 55);
  assert.equal(state[303 + 5], 66);
}

// dense[4848+id]===120 and both offsets land on 0 -> flips to 1.
{
  const { packedBytes, packedOffsets } = makeTables();
  packedBytes[100 + 0] = 4;
  packedBytes[200 + 0] = 0;
  packedBytes[200 + 8] = 0;
  packedBytes[300 + 0] = 0;
  // subX = (4+1*0)%4 = 0 -> table(5,0)=0 (default); subY same -> 0.
  const state = new Int8Array(10000);
  state[4848 + 5] = 120;
  stepLegacySubsystemEntityAnimOffset(state, packedBytes, packedOffsets, 5);
  assert.equal(state[202 + 5], 0);
  assert.equal(state[303 + 5], 0);
  assert.equal(state[4848 + 5], 1);
}

// Mid-cycle frame with negative deltas -> +22/+16 correction applied.
{
  const { packedBytes, packedOffsets } = makeTables();
  packedBytes[100 + 0] = 4; // cycleLen=4, even
  packedBytes[200 + 0] = -2; // xDelta<0
  packedBytes[200 + 8] = -3; // yDelta<0
  packedBytes[300 + 0] = 0;
  const state = new Int8Array(10000);
  state[606 + 5] = 0;
  state[1111 + 5] = 1; // becomes 2 -> frameOffset=2 === (4+1)>>1=2 -> mid-cycle
  const result = stepLegacySubsystemEntityAnimOffset(state, packedBytes, packedOffsets, 5);
  // subX = (4 + 2*-2)%4 = 0%4=0 -> table(5,0)=0, then +22 correction.
  assert.equal(state[202 + 5], 22);
  assert.equal(state[303 + 5], 16);
  assert.equal(result.l, 0);
}

console.log("private void E() (walk-cycle animation offset) OK");
