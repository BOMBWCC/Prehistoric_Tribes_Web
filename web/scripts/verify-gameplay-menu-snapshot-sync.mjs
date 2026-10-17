// Regression test for the stepGameplayZAe / stepGameplayZAf snapshot sync
// (fixed 2026-09-14).
//
// Both runtime wrappers copy w/s/P/k/as/E/... into a local state bag, call the
// ported method, and write the bag back afterwards. The callbacks they pass in
// -- af() itself, l(int), aJ(), f(int,int) -- write game.* directly. In the
// original every one of these is a shared instance field of class f.
//
// Measured before the fix, through the real input chain: picking a building in
// the Build submenu ran l(0) (d[4]=33 "place the building.", zlX=w, the
// four-flag reset all landed) and set w=3, and each wrapper in turn overwrote
// it with the stale w=2, so placement mode never started.
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
  const output = ts.transpileModule(fs.readFileSync(absPath, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const fn = vm.compileFunction(output, ["module", "exports", "require"], { parsingContext: context });
  fn(module, module.exports, (spec) => loadModule(spec, path.dirname(absPath)));
  return module.exports;
}
const { LegacyRuntimeState } = loadModule("./core/LegacyRuntimeState", srcDir);

// --- stepGameplayZAf: af()'s `selectionFlags[6]` branch is
// `aJ(); l(0); s = table138[416 + r[as]]`. l(0) sets w=3. ---
{
  const rt = new LegacyRuntimeState();
  const g = rt.game;
  g.selectionFlags[6] = true;
  rt.mainArrays.r[0] = 2;
  g.menuCursor = 0;
  g.barMode = 2;
  g.pendingP = false;
  const seen = [];
  rt.stepLegacyL = function stub(value) {
    seen.push({ value, w: this.game.barMode });
    this.game.barMode = 3;
    this.game.pendingP = true;
  };
  rt["stepGameplayZAf"]();
  assert.deepEqual(seen, [{ value: 0, w: 2 }], "l(0) runs once and sees af()'s current w");
  assert.equal(g.barMode, 3, "w written by l(0) must survive af()'s write-back");
  assert.equal(g.pendingP, true, "so must P");
}

// --- stepGameplayZAe: `if (i || l) { i = l = v = false; E = 4; ...; af(); }`.
// Push: af() must see E = 4. Pull: whatever af() leaves in w must survive. ---
{
  const rt = new LegacyRuntimeState();
  const g = rt.game;
  g.nInt = 0;
  g.iFlag = true;
  g.zlYInt = 0;
  g.barMode = 2;
  g.E = 0;
  let seenE = null;
  rt.stepGameplayZAf = function stub() {
    seenE = this.game.E;
    this.game.barMode = 3;
  };
  rt["stepGameplayZAe"]();
  assert.equal(seenE, 4, "push: af() must see ae()'s E = 4 (offset set before the call)");
  assert.equal(g.barMode, 3, "pull: w written inside af() must survive ae()'s write-back");
  assert.equal(g.iFlag, false);
}

console.log("gameplay menu snapshot sync (ae/af) OK");
