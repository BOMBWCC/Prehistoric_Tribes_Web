// Integration test: LegacyRuntimeState's stepGameplayFramePrep() now wires
// onC to the newly-ported stepLegacyC2 (f.c(int,int)) and onO already runs
// inside stepLegacyS (f.S()). Exercises the main w:B branches (0/1/2/3)
// without throwing, using the real cross-file import graph.
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

for (const w of [0, 1, 2, 3]) {
  const rt = new LegacyRuntimeState();
  rt.game.barMode = w;
  // packedData is required by stepGameplayFramePrep's own early-return guard.
  rt.packedData = { shortTables: [], byteTables: [] };
  let threw = false;
  let errMsg = "";
  try {
    rt.stepGameplayFramePrep();
  } catch (err) {
    threw = true;
    errMsg = String(err);
  }
  assert.equal(threw, false, `w=${w} threw: ${errMsg}`);
}

// local5>0 branch (2026-08-24): wires c.a(int,int,int,String,int)/c.a(Graphics)
// via the already-ported LegacyGeometryDecoder/LegacyGeometryRenderer.
// offscreenTargets is undefined under Node (no `document`), so the
// `if (graphics)` guard short-circuits -- this only proves the new branch's
// own field/method access doesn't throw, real pixel output is checked live
// in-browser separately.
{
  const rt = new LegacyRuntimeState();
  rt.game.barMode = 1;
  rt.game.kByte = 1; // forces local5 = 1 > 0
  rt.packedData = { shortTables: [], byteTables: [] };
  let threw = false;
  let errMsg = "";
  try {
    rt.stepGameplayFramePrep();
  } catch (err) {
    threw = true;
    errMsg = String(err);
  }
  assert.equal(threw, false, `local5>0 branch threw: ${errMsg}`);
}

console.log("f.c(int,int)/f.O() (onC/onO in stepGameplayFramePrep) OK");
