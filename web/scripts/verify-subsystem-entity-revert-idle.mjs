// Regression test for LegacySubsystemEntityRevertIdle.ts (private void P()).
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

const { stepLegacySubsystemEntityRevertIdle } = loadModule("./LegacySubsystemEntityRevertIdle", srcDir);

// level<12 -> stateCode=6 -> (6%7)+8 = 14.
{
  const state = new Int8Array(10000);
  state[1414 + 5] = 11;
  stepLegacySubsystemEntityRevertIdle(state, 5);
  assert.equal(state[2929 + 5], 14);
}

// level>=12, bit2 clear, flag===0, role!==1, counter<=0 -> stateCode=0 -> 8.
{
  const state = new Int8Array(10000);
  state[1414 + 5] = 12;
  stepLegacySubsystemEntityRevertIdle(state, 5);
  assert.equal(state[2929 + 5], 8);
}

console.log("private void P() (revert to idle) OK");
