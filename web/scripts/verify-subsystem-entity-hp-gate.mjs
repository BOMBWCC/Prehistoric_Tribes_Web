// Regression test for LegacySubsystemEntityHpGate.ts (private boolean s()).
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

const { stepLegacySubsystemEntityHpGate } = loadModule("./sim/tribe/LegacySubsystemEntityHpGate", srcDir);

function makeGrid() {
  const grid = [];
  for (let i = 0; i < 20; i += 1) grid.push(new Int8Array(20));
  return grid;
}

// HP > 0 -> true, no side effects.
{
  const state = new Int8Array(10000);
  state[1919 + 5] = 3;
  const result = stepLegacySubsystemEntityHpGate({ state, gridC: makeGrid(), entityId: 5 });
  assert.equal(result, true);
}

// HP <= 0, self-occupied -> onVacate fires, returns false.
{
  const state = new Int8Array(10000);
  state[1919 + 5] = 0;
  state[5] = 2;
  state[101 + 5] = 3;
  const gridC = makeGrid();
  gridC[3][2] = 5;
  let vacateArgs = null;
  const result = stepLegacySubsystemEntityHpGate({
    state, gridC, entityId: 5, onVacate: (...a) => { vacateArgs = a; },
  });
  assert.equal(result, false);
  assert.deepEqual(vacateArgs, [19, 2, 3, 5]);
}

// HP <= 0, not self-occupied -> resets HP/regen-ceiling/mode/flag, returns true.
{
  const state = new Int8Array(10000);
  state[1919 + 5] = -3;
  state[8282 + 5] = 5; // some existing low bits, bit7 should get OR'd in
  const gridC = makeGrid();
  gridC[0][0] = 9; // not id 5, so not self-occupied
  const result = stepLegacySubsystemEntityHpGate({ state, gridC, entityId: 5 });
  assert.equal(result, true);
  assert.equal(state[1919 + 5], 1);
  assert.equal(state[6767 + 5], 1);
  assert.equal(state[6161 + 5], 2);
  // 5 | 128 = 133, which as a signed byte (Int8Array narrowing) is 133-256 = -123.
  assert.equal(state[8282 + 5], -123);
}

console.log("private boolean s() (HP gate) OK");
