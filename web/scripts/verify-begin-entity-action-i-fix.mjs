// Regression test for the final void a(byte,byte,byte) (beginEntityAction)
// i() fix (2026-08-22): its own onTransientReset was a hand-rolled
// inputT/inputV/inputP clear that barely overlapped the real private void
// i() (#610, offset 54 of a(byte,byte,byte)). Also covers the method's
// other 5 previously-missing real writes (2026-08-22, continued): Z:I=0/
// o:I=0 (offset 43..50, before the i() call) and v:B=0/H:Z=true/
// v:I=12+arg1 (offset 62..83, right after it, no branch in between).
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
  rt.game.iFlag = true;
  rt.game.staticL = true;
  rt.game.inputV = true;
  rt.game.E = 99;
  rt.game.wFlag = true;
  rt.game.digitKey = 77;
  rt.game.inputT = true;
  rt.game.nInt = 42;
  rt.game.Z = 5; // MERGED (2026-08-31): was rt.game.zInt, same real field (#120) -- see game.Z's own docblock.
  rt.game.oInt = 6;
  rt.game.loopMode = 3;
  rt.game.H = false;
  rt.game.vInt = 0;
  rt.beginEntityAction(4, 0, 0);
  assert.equal(rt.game.iFlag, false);
  assert.equal(rt.game.staticL, false);
  assert.equal(rt.game.inputV, false);
  assert.equal(rt.game.E, 4);
  assert.equal(rt.game.wFlag, false);
  assert.equal(rt.game.digitKey, -1);
  assert.equal(rt.game.inputT, false);
  assert.equal(rt.game.nInt, 0);
  assert.equal(rt.game.Z, 0);
  assert.equal(rt.game.oInt, 0);
  assert.equal(rt.game.loopMode, 0);
  assert.equal(rt.game.H, true);
  assert.equal(rt.game.vInt, 16); // 12 + ap(4)
}

console.log("final void a(byte,byte,byte) (beginEntityAction) real i() wiring OK");
