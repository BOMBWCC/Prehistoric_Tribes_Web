// Regression test for the f(int,int) camera-jump sync (fixed 2026-09-09).
//
// f.b(int) reaches `f(int,int)` at five sites (bytecode/f-javap.txt offsets
// 251/283/308/349/369) and f.U() at one (offset 216). In the original all
// three methods touch the same I:B/J:B/K:B/L:B instance fields. This port
// used to snapshot those four into `stateCommandState` and write the snapshot
// back, so the jump landed and was then overwritten with the pre-jump values.
//
// Measured on the tutorial map before the fix: IByte went 0 -> 10 (aO's
// viewport normalize), 10 -> 1 (this jump, centring on villager id 5), then
// 1 -> 10 (the write-back), leaving the player's units off-screen to the left.
// KEmulator on the real device shows them centred.
//
// Both halves of the sync have a reader in the bytecode: b(int)'s
// `an === -100 && ai === 51` branch writes I:B = 8 / K:B = 67 immediately
// BEFORE its call (offsets 332..349), and its `an < 0` branch reads I:B back
// AFTER the call to add 4 (offsets 369..398), as does U()'s `J:B = I:B;
// L:B = K:B` tail (offsets 457..540).
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

// 2026-09-23: stateCommandState is now a live view of these game fields, so
// there is nothing to push or pull -- the bag and game.* are one storage.
{
  const rt = new LegacyRuntimeState();
  const bag = rt["stateCommandState"];
  bag.I = 9; bag.K = 8; bag.J = 7; bag.L = 6;
  assert.deepEqual([rt.game.cameraColumn, rt.game.cameraRow, rt.game.JByte, rt.game.cameraSavedKByte], [9, 8, 7, 6]);
  rt.game.cameraColumn = 1; rt.game.cameraRow = 2; rt.game.JByte = 3; rt.game.cameraSavedKByte = 4;
  assert.deepEqual([bag.I, bag.K, bag.J, bag.L], [1, 2, 3, 4]);
}

// Integration against the real callee: a negative pre-clamp column, the same
// fixture verify-viewport-field-fix.mjs uses for aK()'s clamp.
{
  const rt = new LegacyRuntimeState();
  rt.game.cursorTargetColumn = 0;
  rt.game.cursorTargetRow = 0;
  const id = 61;
  rt.denseState[0 + id] = -5;
  rt.denseState[101 + id] = 0;
  const bag = rt["stateCommandState"];
  bag.I = 9; bag.K = 9;
  rt["stepEntityCoordinateUpdate"](id, 0);
  assert.equal(bag.I, 0, "the bag carries aK()'s clamp, not the stale 9");
  assert.equal(bag.K, 0);
}

console.log("f.b(int)/f.U() -> f(int,int) shared camera-jump sync OK");
