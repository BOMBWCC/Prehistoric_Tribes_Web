// Regression test for LegacySubsystemEntityPaceReset.ts (private void S()).
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

const { stepLegacySubsystemEntityPaceReset } = loadModule("./LegacySubsystemEntityPaceReset", srcDir);

{
  const packedBytes = new Int8Array(2000);
  const packedOffsets = new Int16Array(320);
  packedOffsets[79] = 100;
  packedOffsets[102] = 200;
  const state = new Int8Array(10000);
  state[5959 + 3] = 9;
  state[2828 + 3] = 5; // type<=9
  packedBytes[100 + 5] = 42; // dispatch kind
  state[4444 + 3] = 7; // record
  state[1616 + 3] = 9; // /3 = 3
  state[6565 + 3] = 1;
  packedBytes[200 + 1] = 4; // roleTerm = 3+4=7
  state[7878 + 3] = 2;

  let calls = [];
  stepLegacySubsystemEntityPaceReset({
    state, packedBytes, packedOffsets, id: 3, team: 1,
    randomRemainder: (mask, divisor) => { assert.equal(mask, 65535); assert.equal(divisor, 11 - 2); return 5; },
    onQueueAction: (...args) => { calls.push(args); },
  });

  assert.equal(state[5959 + 3], 0);
  // arg7 = trunc(roleTerm(7) * (noise(5)+dense[7878](2)) / 10) = trunc(7*7/10) = trunc(4.9) = 4
  assert.deepEqual(calls, [[0, 0, 1, 42, 7, 0, 4, 1]]);
}

// Type dispatch fallback branches.
{
  const packedBytes = new Int8Array(2000);
  const packedOffsets = new Int16Array(320);
  const state = new Int8Array(10000);
  state[2828 + 3] = 92;
  let calls = [];
  stepLegacySubsystemEntityPaceReset({
    state, packedBytes, packedOffsets, id: 3, team: 0,
    randomRemainder: () => 0,
    onQueueAction: (...args) => { calls.push(args); },
  });
  assert.equal(calls[0][3], 1);
}
{
  const packedBytes = new Int8Array(2000);
  const packedOffsets = new Int16Array(320);
  const state = new Int8Array(10000);
  state[2828 + 3] = 93;
  let calls = [];
  stepLegacySubsystemEntityPaceReset({
    state, packedBytes, packedOffsets, id: 3, team: 0,
    randomRemainder: () => 0,
    onQueueAction: (...args) => { calls.push(args); },
  });
  assert.equal(calls[0][3], 2);
}
{
  const packedBytes = new Int8Array(2000);
  const packedOffsets = new Int16Array(320);
  const state = new Int8Array(10000);
  state[2828 + 3] = 106;
  let calls = [];
  stepLegacySubsystemEntityPaceReset({
    state, packedBytes, packedOffsets, id: 3, team: 0,
    randomRemainder: () => 0,
    onQueueAction: (...args) => { calls.push(args); },
  });
  assert.equal(calls[0][3], 5);
}
{
  const packedBytes = new Int8Array(2000);
  const packedOffsets = new Int16Array(320);
  const state = new Int8Array(10000);
  state[2828 + 3] = 50;
  let calls = [];
  stepLegacySubsystemEntityPaceReset({
    state, packedBytes, packedOffsets, id: 3, team: 0,
    randomRemainder: () => 0,
    onQueueAction: (...args) => { calls.push(args); },
  });
  assert.equal(calls[0][3], 0);
}

console.log("private void S() (pace reset + queue action) OK");
