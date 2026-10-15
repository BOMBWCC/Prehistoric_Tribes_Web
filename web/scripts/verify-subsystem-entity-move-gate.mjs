// Regression test for LegacySubsystemEntityMoveGate.ts (private boolean d(int)).
// RETRACTED 2026-09-07: no longer a guaranteed throw -- real logic past
// the early gates, calling into a still-throwing (but SEPARATE, out of
// scope) onEntityTransform callback.
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

const { stepLegacySubsystemEntityMoveGate } = loadModule("./LegacySubsystemEntityMoveGate", srcDir);

function makeTables() {
  const packedBytes = new Int8Array(2000);
  const packedOffsets = new Int16Array(320);
  packedOffsets[138] = 1000;
  packedOffsets[41] = 1500;
  return { packedBytes, packedOffsets };
}

// level>=12, dense[8505] >= threshold -> return false immediately (the
// dense[8505]<=0 check at offset 58 is never reached on this path).
{
  const { packedBytes, packedOffsets } = makeTables();
  const state = new Int8Array(10000);
  state[8749 + 3] = 12;
  state[9237 + 3] = 0;
  packedBytes[1000 + 182 + 0] = 10;
  state[8505 + 3] = 20; // NOT < 10
  assert.equal(stepLegacySubsystemEntityMoveGate(state, packedBytes, packedOffsets, 3, 3, () => 0), false);
}

// level>=12, dense[8505] < threshold -> falls through to the shared offset-58
// check; dense[8505]<=0 there -> false.
{
  const { packedBytes, packedOffsets } = makeTables();
  const state = new Int8Array(10000);
  state[8749 + 3] = 12;
  packedBytes[1000 + 182 + 0] = 10;
  state[8505 + 3] = 0; // < 10, and also <=0
  assert.equal(stepLegacySubsystemEntityMoveGate(state, packedBytes, packedOffsets, 3, 3, () => 0), false);
}

// level<12 -> the threshold check is skipped entirely; dense[8505]<=0 -> false.
{
  const { packedBytes, packedOffsets } = makeTables();
  const state = new Int8Array(10000);
  state[8749 + 3] = 5;
  state[8505 + 3] = 0;
  assert.equal(stepLegacySubsystemEntityMoveGate(state, packedBytes, packedOffsets, 3, 3, () => 0), false);
}

// Past both gates (dense[8505]>0) -> calls onEntityTransform with the real
// args, then compares packedBytes[41+mByte] vs packedBytes[41+dense[2828+ambientId]].
{
  const { packedBytes, packedOffsets } = makeTables();
  const state = new Int8Array(10000);
  state[8749 + 3] = 5; // level<12, skip threshold check
  state[8505 + 3] = 5; // >0, reach the real body
  state[8383 + 3] = 11; // onEntityTransform arg1
  state[8444 + 3] = 22; // onEntityTransform arg2
  state[2828 + 7] = 4; // ambient entity's type
  packedBytes[1500 + 9] = 1; // table41[mByte=9]
  packedBytes[1500 + 4] = 1; // table41[type=4] -- equal -> true
  const calls = [];
  const result = stepLegacySubsystemEntityMoveGate(state, packedBytes, packedOffsets, 3, 7, () => 9, {
    onEntityTransform: (a, b, flag) => calls.push([a, b, flag]),
  });
  assert.deepEqual(calls, [[11, 22, true]]);
  assert.equal(result, true);
}

// Same shape but the table41 values differ -> false.
{
  const { packedBytes, packedOffsets } = makeTables();
  const state = new Int8Array(10000);
  state[8749 + 3] = 5;
  state[8505 + 3] = 5;
  state[2828 + 7] = 4;
  packedBytes[1500 + 9] = 1;
  packedBytes[1500 + 4] = 2; // different -> false
  const result = stepLegacySubsystemEntityMoveGate(state, packedBytes, packedOffsets, 3, 7, () => 9, {});
  assert.equal(result, false);
}

// Without an onEntityTransform callback (the default {}), the call is a
// silent no-op -- no throw -- and the real comparison still runs.
{
  const { packedBytes, packedOffsets } = makeTables();
  const state = new Int8Array(10000);
  state[8749 + 3] = 5;
  state[8505 + 3] = 5;
  state[2828 + 7] = 0;
  const result = stepLegacySubsystemEntityMoveGate(state, packedBytes, packedOffsets, 3, 7, () => 0);
  assert.equal(result, true); // packedBytes[41+0] === packedBytes[41+0]
}

// If onEntityTransform itself throws (matching the real, still-live
// LegacyRuntimeState.subsystemEntityTransform wiring), the throw propagates.
{
  const { packedBytes, packedOffsets } = makeTables();
  const state = new Int8Array(10000);
  state[8749 + 3] = 5;
  state[8505 + 3] = 5;
  assert.throws(() => stepLegacySubsystemEntityMoveGate(state, packedBytes, packedOffsets, 3, 7, () => 0, {
    onEntityTransform: () => { throw new Error("subsystemEntityTransform: still a real throw elsewhere"); },
  }));
}

console.log("private boolean d(int) (move gate, RETRACTED 2026-09-07, real logic) OK");
