// Regression coverage for wiring f.u()'s post-loop tail (r() then s(),
// bytecode offsets 2141/2145, then the row-end-marker draw at
// offset 2148..2209) into stepGameplayOuterLoop() (2026-08-22).
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

// No active slots in either the r() (mainArrays.d) or s() (mainArrays.e)
// tables: both scans are genuine no-ops, no exception, no throw.
{
  const rt = new LegacyRuntimeState();
  assert.doesNotThrow(() => rt.stepGameplayOuterLoop());
}

// s() alone: an expiring effect slot (timer>=20) fires onSlotAction ->
// stepLegacyFD (final void d(int)) for real, setting pendingP when
// wByte===2 and the slot's id matches qCounter.
{
  const rt = new LegacyRuntimeState();
  rt.mainArrays.e[0][0] = 7; // slot 0: entity id 7
  rt.mainArrays.e[1][0] = 20; // timer already expired
  rt.game.wByte = 2;
  rt.game.qCounter = 7;
  rt.game.pendingP = false;
  rt.stepGameplayOuterLoop();
  assert.equal(rt.game.pendingP, true);
  assert.equal(rt.mainArrays.e[0][0], 0); // slot freed
}

// r(): an active kind-1 slot that passes the viewport/occupancy gate reads
// f.b:[S] (#245 = saveOffsets). CORRECTED 2026-09-28: this used to assert
// the retracted "permanently null" throw; r() now completes, so s() runs
// in the same tick and its expiring slot sets P.
{
  const rt = new LegacyRuntimeState();
  rt.game.IByte = 0;
  rt.game.KByte = 0;
  rt.game.viewportO = 100;
  rt.game.viewportP = 100;
  rt.mainArrays.d[0][0] = 5; // slot 0: record id 5 (active)
  rt.mainArrays.d[5][0] = 0; // aq index 0
  rt.mainArrays.d[6][0] = 1; // slotKind 1 -> triggers the null-deref branch
  rt.denseState[1919 + 0] = 1; // shouldDraw's extra slotKind===1 gate
  rt.occupancyClass = () => 0; // stub: force the "passable" class so the gate passes
  rt.mainArrays.e[0][1] = 9; // an s()-side expiring slot that should NOT fire this tick
  rt.mainArrays.e[1][1] = 20;
  rt.game.wByte = 2;
  rt.game.qCounter = 9;
  rt.game.pendingP = false;
  assert.doesNotThrow(() => rt.stepGameplayOuterLoop());
  assert.equal(rt.game.pendingP, true); // s() ran after r()
}

// Row-end-marker tail: ad===0 && ae===0 && outerLoopNFlag -> record 30 at (218,11).
{
  const rt = new LegacyRuntimeState();
  rt.game.ad = 0;
  rt.game.ae = 0;
  rt.game.outerLoopNFlag = true;
  rt.game.outerLoopLFlag = false;
  let spy;
  const orig = rt.stepZSubrecordDraw.bind(rt);
  rt.stepZSubrecordDraw = (record, x, y, phase, cb) => {
    if (record === 30 || record === 31) spy = [record, x, y];
    return orig(record, x, y, phase, cb);
  };
  rt.stepGameplayOuterLoop();
  assert.deepEqual(spy, [30, 218, 11]);
}

// Row-end-marker tail: N false, L true -> record 31.
{
  const rt = new LegacyRuntimeState();
  rt.game.ad = 0;
  rt.game.ae = 0;
  rt.game.outerLoopNFlag = false;
  rt.game.outerLoopLFlag = true;
  let spy;
  const orig = rt.stepZSubrecordDraw.bind(rt);
  rt.stepZSubrecordDraw = (record, x, y, phase, cb) => {
    if (record === 30 || record === 31) spy = record;
    return orig(record, x, y, phase, cb);
  };
  rt.stepGameplayOuterLoop();
  assert.equal(spy, 31);
}

// Row-end-marker tail: ad!==0 gates the whole block off, even with N/L set.
{
  const rt = new LegacyRuntimeState();
  rt.game.ad = 5;
  rt.game.outerLoopNFlag = true;
  let fired = false;
  const orig = rt.stepZSubrecordDraw.bind(rt);
  rt.stepZSubrecordDraw = (record, x, y, phase, cb) => {
    if (record === 30 || record === 31) fired = true;
    return orig(record, x, y, phase, cb);
  };
  rt.stepGameplayOuterLoop();
  assert.equal(fired, false);
}

// With r() no longer throwing, the row-end-marker tail runs too (2026-09-28).
{
  const rt = new LegacyRuntimeState();
  rt.game.IByte = 0;
  rt.game.KByte = 0;
  rt.game.viewportO = 100;
  rt.game.viewportP = 100;
  rt.mainArrays.d[0][0] = 5;
  rt.mainArrays.d[5][0] = 0;
  rt.mainArrays.d[6][0] = 1;
  rt.denseState[1919 + 0] = 1;
  rt.occupancyClass = () => 0;
  rt.game.ad = 0;
  rt.game.ae = 0;
  rt.game.outerLoopNFlag = true;
  let fired = false;
  const orig = rt.stepZSubrecordDraw.bind(rt);
  rt.stepZSubrecordDraw = (record, x, y, phase, cb) => {
    if (record === 30 || record === 31) fired = true;
    return orig(record, x, y, phase, cb);
  };
  assert.doesNotThrow(() => rt.stepGameplayOuterLoop());
  assert.equal(fired, true);
}

console.log("f.u() post-loop tail (r()/s()/row-end-marker wiring) OK");
