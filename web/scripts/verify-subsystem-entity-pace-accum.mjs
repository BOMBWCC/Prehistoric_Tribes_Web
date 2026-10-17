// Regression test for LegacySubsystemEntityPaceAccum.ts (private void R()).
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

const { stepLegacySubsystemEntityPaceAccum } = loadModule("./sim/tribe/LegacySubsystemEntityPaceAccum", srcDir);

function baseInput(state, overrides = {}) {
  return {
    state,
    packedBytes: new Int8Array(2000),
    packedOffsets: new Int16Array(320),
    id: 3,
    team: 0,
    randomRemainder: () => 0,
    onQueueAction: () => {},
    ...overrides,
  };
}

// dense[5858]<dense[5959] -> accumulates, carries, increments; still <= dense[5959] -> S() not called.
{
  const state = new Int8Array(10000);
  state[5858 + 3] = 0;
  state[5959 + 3] = 5;
  state[5454 + 3] = 0;
  state[5656 + 3] = 10;
  state[5555 + 3] = 0;
  state[5757 + 3] = 20;
  let sCalled = false;
  stepLegacySubsystemEntityPaceAccum(baseInput(state, { onQueueAction: () => { sCalled = true; } }));

  // carryX = trunc((0+10+11+66)/22)-3 = trunc(87/22)-3 = 3-3=0
  assert.equal(state[5454 + 3], 10);
  assert.equal(state[5252 + 3], 0);
  // carryY = trunc((0+20+8+48)/16)-3 = trunc(76/16)-3=4-3=1
  assert.equal(state[5555 + 3], 20 - 16);
  assert.equal(state[5353 + 3], 1);
  assert.equal(state[5858 + 3], 1);
  assert.equal(sCalled, false);
}

// dense[5858]>=dense[5959] -> skip accumulation; increment pushes over -> S() called.
{
  const state = new Int8Array(10000);
  state[5858 + 3] = 5;
  state[5959 + 3] = 5;
  let sCalled = false;
  stepLegacySubsystemEntityPaceAccum(baseInput(state, { onQueueAction: () => { sCalled = true; } }));
  assert.equal(state[5858 + 3], 6);
  assert.equal(sCalled, true);
  assert.equal(state[5959 + 3], 0); // S() resets it
}

console.log("private void R() (pace accumulator) OK");
