// Integration test: LegacyRuntimeState's stepGameplayFramePrep() now wires
// onOffscreenDraw (f.m()'s offset 30..48, Graphics[3].drawImage(Image[c[1]],0,0,0))
// to LegacyOffscreenTargets.copy(). Node has no `document`, so
// this.offscreenTargets is undefined here (same as the existing onW/onU
// callbacks) -- this test only proves the real dispatch path (vByte===1,
// varying frameImageSlots[1]) never throws, in-range or out-of-range.
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

for (const slot of [0, 1, 3, 5, -1]) {
  const rt = new LegacyRuntimeState();
  rt.game.loopMode = 1;
  rt.game.frameImageSlots[1] = slot;
  rt.packedData = { shortTables: [], byteTables: [] };
  let threw = false;
  let errMsg = "";
  try {
    rt.stepGameplayFramePrep();
  } catch (err) {
    threw = true;
    errMsg = String(err);
  }
  assert.equal(threw, false, `frameImageSlots[1]=${slot} threw: ${errMsg}`);
}

console.log("f.m() onOffscreenDraw (Graphics[3].drawImage(Image[c[1]],0,0,0)) OK");
