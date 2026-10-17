// Regression test for the private void al() (stepLegacyAl) i() fix
// (2026-08-22): its own onResetInput was never passed at all (silent
// no-op), and LegacyAkState/LegacyAlState's eFlag/fFlag/vFlag fields
// picked up the wrong, orphaned game.eFlag/fFlag/vFlag via structural
// typing instead of the real e:Z/f:Z/v:Z fields (game.inputUp/inputDown/
// inputV, confirmed via direct bytecode read of ak()'s own offsets
// 113/140/154).
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

// al()'s own onResetInput now fires the real i() reset via stepStateMachine's onAl.
{
  const rt = new LegacyRuntimeState();
  rt.game.screen = 27;
  rt.game.iFlag = true;
  rt.game.staticL = false;
  rt.game.inputV = true;
  rt.game.E = 1;
  rt.game.R = 22;
  rt.game.S = 23;
  rt.stepStateMachine({ onAm: () => {}, onAo: () => {}, onAd: () => {} });
  assert.equal(rt.game.iFlag, false);
  assert.equal(rt.game.inputV, false);
  assert.equal(rt.game.E, 4);
}

// ak()'s own confirmation-block gate reads game.inputUp/inputDown (e:Z/f:Z),
// not the orphaned game.eFlag/fFlag.
{
  const rt = new LegacyRuntimeState();
  rt.game.screen = 14;
  rt.game.iFlag = false;
  rt.game.staticL = false;
  rt.game.staticM = false;
  rt.game.jFlag = false;
  rt.game.inputUp = true;
  let fired = false;
  rt.stepStateMachine({ onAb: () => { fired = true; }, onAd: () => {} });
  assert.equal(fired, true);
}

console.log("private void al()/ak() real i()/inputUp/inputDown wiring OK");
