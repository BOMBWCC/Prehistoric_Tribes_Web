// Regression test for the runSceneDispatch (final void b(int)) i() fix
// (2026-08-22): its own i() call (#610, offset 1) used to be a hand-rolled
// 3-field reset with iByte=0, which doesn't match i()'s real reset value
// (-1) and has no bytecode justification anywhere in b(int)/S()/T().
// iByte=0 would spuriously trigger stepLegacyGameplayTick's "enter
// map"/mode-load branch on the very next tick; -1 does not.
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

{
  const rt = new LegacyRuntimeState();
  rt.game.iFlag = true;
  rt.game.staticL = true;
  rt.game.inputV = true;
  rt.game.E = 99;
  rt.game.iByte = 5;
  rt.runSceneDispatch(37);
  assert.equal(rt.game.iByte, -1);
  assert.equal(rt.game.iFlag, false);
  assert.equal(rt.game.staticL, false);
  assert.equal(rt.game.inputV, false);
  assert.equal(rt.game.E, 4);
}

// iByte===-1 does NOT take stepLegacyGameplayTick's iByte===0 mode-load branch.
{
  const rt = new LegacyRuntimeState();
  rt.runSceneDispatch(37);
  rt.game.vByte = 1;
  // Prime b.n() before the frame. game.c starts at -1 and b.g() only calls
  // b.n() when `c % 10 === 0` (b-javap.txt offsets 0..14), so on a frame with
  // c === -1 the marker-bucket cube b.c:[[[B](#151) is still the all-zero
  // f.g() allocation rather than the all -1 fill b.n() writes at its own
  // offsets 0..52. -1 is the terminator for the `ak = a[layer][ak]` bucket
  // walk in b.a(byte,byte,byte,byte) (offsets 40..58 / 856..869), so a zero
  // cube makes that walk spin -- in the ORIGINAL too, not just here. The
  // original never reaches it because a scene dispatch never lands on frame
  // one of a fresh game; this test used to, because it drove runSceneDispatch
  // on a runtime that had never ticked. See docs/unknowns.md 2026-09-07.
  rt.game.c = 0;
  rt.stepGameplayFrame();
  assert.notEqual(rt.game.iByte, 0);
}

console.log("runSceneDispatch (final void b(int)) real i() wiring OK");
