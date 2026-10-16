// Regression test for the deferred-release i() fix (2026-08-22): a release
// while the repeat-guard (o:Z/#347) is held sets p:Z(#351)=true (offset
// 226..230 of keyReleased(int)) but was never wired to anything -- so
// stepLegacyGameplayTick's own already-correct `pFlag` block (offset
// 660..674 of private void h(), clears p:Z and re-invokes the real i()
// (#610)) was permanently dead code: nothing ever set game.pFlag=true.
// LegacyInputState.release() now fires onPendingRelease on the real p:Z
// set-point, wired here to game.pFlag = true; the reset itself still only
// happens on the NEXT tick, exactly matching the bytecode's own timing.
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

const { LegacyRuntimeState } = loadModule("./LegacyRuntimeState", srcDir);
const { OriginalKey } = loadModule("./Input", srcDir);

{
  const rt = new LegacyRuntimeState();
  assert.equal(rt.game.pFlag, false);

  // Pressing any non-star/hash key sets the repeat-guard (o:Z) unconditionally.
  rt.input.press(OriginalKey.UP);
  assert.equal(rt.game.inputUp, true);

  // Releasing while the guard is still held defers -- p:Z(#351)=true, and
  // e/f/g/h (inputUp here) must NOT clear yet (matches offset 219..231's
  // early return, before the actionUp/etc clearing branches).
  rt.input.release(OriginalKey.UP);
  assert.equal(rt.game.pFlag, true);
  assert.equal(rt.game.inputUp, true);

  // Force a real, observable divergence from i()'s reset values so the next
  // tick's real dispatch chain is what proves the fix, not a coincidence.
  rt.game.staticL = true;
  rt.game.staticM = true;
  rt.game.inputV = true;
  rt.game.iFlag = true;
  rt.game.E = 99;
  rt.game.wFlag = true;
  rt.game.iByte = 77;
  rt.game.inputT = true;
  rt.game.nInt = 42;

  // Next tick: stepLegacyGameplayTick's own pFlag block must fire, clearing
  // p:Z and re-invoking the real 13-field i()(#610) reset.
  rt.stepGameplayFrame();
  assert.equal(rt.game.pFlag, false);
  assert.equal(rt.game.staticL, false);
  assert.equal(rt.game.staticM, false);
  assert.equal(rt.game.inputUp, false);
  assert.equal(rt.game.inputV, false);
  assert.equal(rt.game.iFlag, false);
  assert.equal(rt.game.E, 4);
  assert.equal(rt.game.wFlag, false);
  assert.equal(rt.game.iByte, -1);
  assert.equal(rt.game.inputT, false);
  assert.equal(rt.game.nInt, 0);
}

{
  // A normal (non-deferred) release must NOT set pFlag.
  const rt = new LegacyRuntimeState();
  rt.input.press(OriginalKey.UP);
  rt.input.clearRepeatGuard(); // f.h() clears o:Z (offsets 92/366/378)
  rt.input.endTick();
  rt.input.release(OriginalKey.UP);
  assert.equal(rt.game.pFlag, false);
  assert.equal(rt.game.inputUp, false);
}

console.log("deferred-release p:Z(#351) -> real i() reset wiring OK");
