// Regression coverage for wiring f.u()'s post-loop tail (r() then s(),
// bytecode offsets 2141/2145, then the row-end-marker draw at
// offset 2148..2209) into stepGameplayOuterLoop() (2026-08-22).
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
const { stepDemolitionDust, stepHitEffects } = loadModule("./sim/world/MapUpkeep", srcDir);

// No active slots in either the r() (mainArrays.d) or s() (mainArrays.e)
// tables: both scans are genuine no-ops, no exception, no throw.
{
  const rt = new LegacyRuntimeState();
  assert.doesNotThrow(() => rt.stepGameplayOuterLoop());
}

// s()'s timers are the game step's since 2026-10-27 (sim/world/MapUpkeep.ts): the drawing
// leaves an expiring slot alone; stepDemolitionDust expires it, its onSlotAction ->
// stepLegacyFD (final void d(int)) setting pendingP when wByte===2 and the slot's id matches
// qCounter.
{
  const rt = new LegacyRuntimeState();
  rt.mainArrays.e[0][0] = 7; // slot 0: entity id 7
  rt.mainArrays.e[1][0] = 19; // reaches 20 on the next step
  rt.game.barMode = 2;
  rt.game.qCounter = 7;
  rt.game.pendingP = false;
  rt.stepGameplayOuterLoop();
  assert.equal(rt.game.pendingP, false);
  assert.equal(rt.mainArrays.e[0][0], 7);
  stepDemolitionDust(rt);
  assert.equal(rt.game.pendingP, true);
  assert.equal(rt.mainArrays.e[0][0], 0); // slot freed
}

// r(): an active kind-1 slot that passes the viewport/occupancy gate reads
// f.b:[S] (#245 = saveOffsets) and draws without throwing or writing; the
// step's stepHitEffects advances its frame.
{
  const rt = new LegacyRuntimeState();
  rt.game.cameraColumn = 0;
  rt.game.cameraRow = 0;
  rt.game.viewColumns = 100;
  rt.game.viewRows = 100;
  rt.mainArrays.d[0][0] = 5; // slot 0: record id 5 (active)
  rt.mainArrays.d[5][0] = 0; // aq index 0
  rt.mainArrays.d[6][0] = 1; // slotKind 1 -> triggers the null-deref branch
  rt.denseState[1919 + 0] = 1; // shouldDraw's extra slotKind===1 gate
  rt.occupancyClass = () => 0; // stub: force the "passable" class so the gate passes
  assert.doesNotThrow(() => rt.stepGameplayOuterLoop());
  assert.equal(rt.mainArrays.d[1][0], 0);
  stepHitEffects(rt);
  assert.equal(rt.mainArrays.d[0][0], 0); // byteRows[9][5] is 0 here: the first step ends it
}

// Row-end-marker tail: ad===0 && ae===0 && outerLoopNFlag -> record 30 at (218,11).
{
  const rt = new LegacyRuntimeState();
  rt.game.ad = 0;
  rt.game.ae = 0;
  rt.game.callToArmsActive = true;
  rt.game.formUpActive = false;
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
  rt.game.callToArmsActive = false;
  rt.game.formUpActive = true;
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
  rt.game.callToArmsActive = true;
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
  rt.game.cameraColumn = 0;
  rt.game.cameraRow = 0;
  rt.game.viewColumns = 100;
  rt.game.viewRows = 100;
  rt.mainArrays.d[0][0] = 5;
  rt.mainArrays.d[5][0] = 0;
  rt.mainArrays.d[6][0] = 1;
  rt.denseState[1919 + 0] = 1;
  rt.occupancyClass = () => 0;
  rt.game.ad = 0;
  rt.game.ae = 0;
  rt.game.callToArmsActive = true;
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
