// Regression test for the private void o() wiring fix (2026-08-22):
// p()'s own bytecode offset 0..3 unconditionally calls o() as its first
// instruction (stepLegacySubsystemBVoidO, already fully ported/tested in
// isolation), but LegacyRuntimeState.ts's real stepSubsystemP() never
// actually called it despite LegacySubsystemP.ts's own docblock claiming
// it was "already handled by the caller". Confirmed via grep: zero real
// call sites anywhere before this fix.
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

{
  const rt = new LegacyRuntimeState();
  const id = 5;

  // o()'s three real effects, forced dirty first so the test can't pass by accident.
  rt.denseState[4848 + id] = 3; // above threshold 1 -> must reset to 0
  rt.denseState[808 + id] = 42; // must be overwritten (b(IIII):B is provably constant 0)
  assert.equal(rt.game.subsystemBLocalFlags[2], false);

  rt.stepSubsystemP(id);

  assert.equal(rt.denseState[4848 + id], 0);
  assert.equal(rt.denseState[808 + id], 0);
  assert.equal(rt.game.subsystemBLocalFlags[2], true);
}

{
  // Counter at or below 1 is left untouched by o(); still zeroed by o()'s own 808 write.
  const rt = new LegacyRuntimeState();
  const id = 9;
  rt.denseState[4848 + id] = 1;
  rt.stepSubsystemP(id);
  assert.equal(rt.denseState[4848 + id], 1);
  assert.equal(rt.denseState[808 + id], 0);
  assert.equal(rt.game.subsystemBLocalFlags[2], true);
}

console.log("private void o() -> stepSubsystemP() real wiring OK");
