// Regression test for stepLegacyL's onFourFlagReset/onNineFlagReset wiring
// fix (2026-08-22): the one real call site of stepLegacyZL passed no
// callbacks object at all, so both the value<=5 (a(ZZZZ)) and value>5
// (a(ZZZZZZZZZ)) branches silently no-op'd instead of refreshing selection
// state. Both are the same runSelectionFlagsRefresh overload already used
// elsewhere; onAh stays deliberately unwired (documented recursion risk).
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

// value<=5 branch: onFourFlagReset -> a(true,false,true,false).
{
  const rt = new LegacyRuntimeState();
  rt.game.selectionFlags.fill(false);
  rt.game.cameraRow = 99; // forced-dirty, only real refresh clears/sets it meaningfully
  rt.stepLegacyL(2);
  assert.equal(rt.game.selectionFlags[0], true);
  assert.equal(rt.game.selectionFlags[1], false);
  assert.equal(rt.game.selectionFlags[2], true);
  assert.equal(rt.game.selectionFlags[3], false);
}

// value>5 branch: onNineFlagReset -> a(flags[0],false,true,flags[4..9]).
{
  const rt = new LegacyRuntimeState();
  rt.game.selectionFlags[0] = true;
  rt.game.selectionFlags[4] = true;
  rt.game.selectionFlags[5] = true;
  rt.stepLegacyL(8);
  assert.equal(rt.game.selectionFlags[0], true);
  assert.equal(rt.game.selectionFlags[1], false);
  assert.equal(rt.game.selectionFlags[2], true);
  assert.equal(rt.game.selectionFlags[4], true);
  assert.equal(rt.game.selectionFlags[5], true);
}

console.log("stepLegacyL onFourFlagReset/onNineFlagReset wiring OK");
