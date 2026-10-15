// Regression test for LegacySubsystemEntityTypeSettle.ts (private void Q()).
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

const { stepLegacySubsystemEntityTypeSettle } = loadModule("./LegacySubsystemEntityTypeSettle", srcDir);

{
  const state = new Int8Array(10000);
  state[1414 + 5] = 12;
  const calls = [];
  stepLegacySubsystemEntityTypeSettle(state, 5, (id, type) => calls.push([id, type]));
  assert.deepEqual(calls, [[5, 69]]);
}
{
  const state = new Int8Array(10000);
  state[1414 + 5] = 11;
  const calls = [];
  stepLegacySubsystemEntityTypeSettle(state, 5, (id, type) => calls.push([id, type]));
  assert.deepEqual(calls, [[5, 17]]);
}

console.log("private void Q() (type settle) OK");
