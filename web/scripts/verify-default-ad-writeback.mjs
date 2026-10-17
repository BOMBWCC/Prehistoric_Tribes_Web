// Regression test for the f.aD() (stepDefaultAd) bridge fix (2026-09-09).
//
// The bridge used to copy only 6 of LegacyAdState's 21 fields in and the same
// 6 back out (Q/q/R/H/vInt/vByte). Everything else the two branches compute
// landed on the throwaway `this.adState` object and was silently dropped --
// including `A:Z` (#36), f.n()'s one-shot full-redraw trigger, and the four
// saved-state restores the Q=28 gameplay-entry branch performs.
//
// Measured live before the fix: after stepDefaultAd() with Q=28,
// `adState.AFlag === true` while `game.AFlag` stayed false, and the terrain
// window was never redrawn into the offscreen buffer (slot 1 stayed at 0
// non-black pixels for the whole session).
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

// Q=28, bytecode/f-javap.txt offsets 122..235: c:Z=false, y:B=z:B, A:B=B:B,
// I:B=J:B, K:B=L:B, A:Z=true, v:B=1, i().
{
  const rt = new LegacyRuntimeState();
  const g = rt.game;
  g.screen = 28;
  g.zByte = 3; g.BByte = 5; g.JByte = 7; g.cameraSavedKByte = 9;
  g.cursorColumn = 0; g.cursorRow = 0; g.cameraColumn = 0; g.cameraRow = 0;
  g.AFlag = false; g.cFlag = true; g.loopMode = 0;
  rt.stepDefaultAd();
  assert.equal(g.cursorColumn, 3, "y:B = z:B must reach game.cursorColumn");
  assert.equal(g.cursorRow, 5, "A:B = B:B must reach game.cursorRow (a BYTE copy, not `true`)");
  assert.equal(g.cameraColumn, 7, "I:B = J:B must reach game.cameraColumn");
  assert.equal(g.cameraRow, 9, "K:B = L:B must reach game.cameraRow (L:B is cameraSavedKByte, NOT LByte)");
  assert.equal(g.AFlag, true, "A:Z = true must reach game.AFlag -- f.n()'s redraw trigger");
  assert.equal(g.cFlag, false, "c:Z = false must reach game.cFlag");
  assert.equal(g.loopMode, 1, "v:B = 1 must reach game.loopMode");
}

// Q=31, bytecode offsets 0..112. The `t < s && q < 7` arm sets T:B=0/R:B=18
// and bumps q:B; both arms share the tail `b:B(#243) = c:B(#265)`.
{
  const rt = new LegacyRuntimeState();
  const g = rt.game;
  g.screen = 31;
  g.tByte = 1; g.sByte = 4; g.mission = 2;
  g.actionT = 9; g.progressC = 6; g.difficulty = 0;
  rt.stepDefaultAd();
  assert.equal(g.mission, 5, "q:B = s:B then +1 (s=4 >= 1) must reach game.mission");
  assert.equal(g.actionT, 0, "T:B = 0 must reach game.actionT");
  assert.equal(g.R, 18, "R:B = 18");
  assert.equal(g.screen, 22, "Q:B = 22");
  assert.equal(g.difficulty, 6, "b:B = c:B must reach game.difficulty");
}

// The other Q=31 arm: t >= s takes T:B=2/R:B=28 and still runs the shared tail.
{
  const rt = new LegacyRuntimeState();
  const g = rt.game;
  g.screen = 31;
  g.tByte = 4; g.sByte = 1; g.mission = 2;
  g.actionT = 9; g.progressC = 6; g.difficulty = 0;
  rt.stepDefaultAd();
  assert.equal(g.actionT, 2, "T:B = 2");
  assert.equal(g.R, 28, "R:B = 28");
  assert.equal(g.mission, 2, "q:B untouched on this arm");
  assert.equal(g.difficulty, 6, "b:B = c:B still runs -- it is the shared tail");
}

console.log("f.aD() (stepDefaultAd) full state write-back OK");
