// Regression test for the f.aD() (stepDefaultAd) i() fix (2026-08-22):
// its own onInputReset was wired to the unrelated resetInputTransientState()
// instead of the real private void i() (#610, offset 232 of aD()).
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

const { LegacyRuntimeState } = loadModule("./core/LegacyRuntimeState", srcDir);

// f.aD()'s Q===28 exit branch fires onInputReset -> the real i() reset.
{
  const rt = new LegacyRuntimeState();
  rt.game.screen = 28; // stepDefaultAd() copies this into adState.Q before dispatch
  rt.game.iFlag = true;
  rt.game.staticL = true;
  rt.game.inputV = true;
  rt.game.E = 99;
  rt.stepDefaultAd();
  assert.equal(rt.game.iFlag, false);
  assert.equal(rt.game.staticL, false);
  assert.equal(rt.game.inputV, false);
  assert.equal(rt.game.E, 4);
}

console.log("f.aD() (stepDefaultAd) real i() wiring OK");
