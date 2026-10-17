// Integration test for LegacyRuntimeState's subsystemBTeamSweep (`final
// void b()`, bytecode/b-javap.txt offsets 0..251). Wired via stepLegacyX's
// two cSInt===100 call sites (replacing the "documented no-op" markers).
// Also covers the corrected fN/fL/N/L wiring in stepEntityDecisionCheck's
// subsystemB/subsystemNOrchestrator calls: both now read
// game.callToArmsActive/outerLoopLFlag (confirmed via direct bytecode read
// of #37/#33 inside `private boolean b()`/`private boolean n()`, the SAME
// indices this method itself uses) instead of the misidentified
// game.nFlag/subsystemLFlag (a real, separate field with its own
// unrelated producer in LegacyGameplayTick.ts).
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

// --- subsystemBTeamSweep direct tests ---

// outerLoopNFlag===false: nested-table gate must hold for a write to happen.
// value1+value2<=1 -> no write (skip straight to next id).
{
  const rt = new LegacyRuntimeState();
  rt.game.callToArmsActive = false;
  rt.packedOffsets[41] = 200;
  rt.packedOffsets[100] = 300;
  rt.denseState[2828 + 4] = 5;
  rt.packedBytes[200 + 5] = 0; // table41A
  rt.packedBytes[300 + 0] = 0; // value1 = 0
  rt.denseState[6464 + 4] = 6;
  rt.packedBytes[200 + 6] = 0; // table41B
  rt.packedBytes[300 + 0] = 0; // value2 = 0 (same index, still 0) -> sum=0<=1
  rt["subsystemBTeamSweep"]();
  assert.equal(rt.denseState[7979 + 4], 0);
}

// outerLoopNFlag===false, gate fully satisfied -> writes dense[7979+id]|=96.
{
  const rt = new LegacyRuntimeState();
  rt.game.callToArmsActive = false;
  rt.game.formUpActive = false;
  rt.packedOffsets[41] = 200;
  rt.packedOffsets[100] = 300;
  const id = 4;
  rt.denseState[2828 + id] = 5;
  rt.packedBytes[200 + 5] = 1; // table41A
  rt.packedBytes[300 + 1] = 1; // value1 = 1
  rt.denseState[6464 + id] = 6;
  rt.packedBytes[200 + 6] = 2; // table41B
  rt.packedBytes[300 + 2] = 1; // value2 = 1 -> sum=2>1
  rt.denseState[6565 + id] = 0; // !==9
  rt.denseState[1717 + id] = 5; // >4 -> satisfies the OR
  rt["subsystemBTeamSweep"]();
  assert.equal(rt.denseState[7979 + id], 96);
}

// outerLoopNFlag===true: skips the nested-table gate entirely, goes straight to the L-check.
{
  const rt = new LegacyRuntimeState();
  rt.game.callToArmsActive = true;
  rt.game.formUpActive = false;
  const id = 4;
  rt["subsystemBTeamSweep"]();
  assert.equal(rt.denseState[7979 + id], 96);
}

// outerLoopLFlag===true AND bit64 already set -> id skipped, no write (no OR applied).
{
  const rt = new LegacyRuntimeState();
  rt.game.callToArmsActive = true;
  rt.game.formUpActive = true;
  const id = 4;
  rt.denseState[7979 + id] = 64;
  rt["subsystemBTeamSweep"]();
  assert.equal(rt.denseState[7979 + id], 64);
}

// outerLoopLFlag===true but bit64 NOT set -> write still happens.
{
  const rt = new LegacyRuntimeState();
  rt.game.callToArmsActive = true;
  rt.game.formUpActive = true;
  const id = 4;
  rt.denseState[7979 + id] = 0;
  rt["subsystemBTeamSweep"]();
  assert.equal(rt.denseState[7979 + id], 96);
}

// --- stepLegacyX wiring: both cSInt===100 call sites reach subsystemBTeamSweep for real ---
{
  const rt = new LegacyRuntimeState();
  rt.game.cRFlag = true;
  rt.game.cSInt = 100;
  rt.game.xOFlag = true;
  const calls = [];
  const original = rt["subsystemBTeamSweep"].bind(rt);
  rt["subsystemBTeamSweep"] = () => { calls.push(1); return original(); };
  rt["stepLegacyX"]();
  assert.deepEqual(calls, [1]);
  assert.equal(rt.game.callToArmsActive, true);
  assert.equal(rt.game.formUpActive, false);
}

{
  const rt = new LegacyRuntimeState();
  rt.game.cRFlag = true;
  rt.game.cSInt = 100;
  rt.game.xOFlag = false;
  rt.game.xMFlag = true;
  const calls = [];
  const original = rt["subsystemBTeamSweep"].bind(rt);
  rt["subsystemBTeamSweep"] = () => { calls.push(1); return original(); };
  rt["stepLegacyX"]();
  assert.deepEqual(calls, [1]);
  assert.equal(rt.game.formUpActive, true);
}

// --- stepEntityDecisionCheck: fN/fL/N/L now read outerLoopNFlag/outerLoopLFlag ---
// (previously read the unrelated, never-populated-for-this-purpose nFlag/subsystemLFlag).
{
  const rt = new LegacyRuntimeState();
  const id = 4;
  rt.denseState[1414 + id] = 12;
  rt.denseState[5050 + id] = 0;
  rt.denseState[6464 + id] = 12;
  // b() offsets 872..1170 run inside the idle-69 block (guards 672..834).
  rt.denseState[2828 + id] = 69;
  rt.denseState[6262 + id] = 3;
  rt.subsystemEntityTransform = () => {};
  rt.packedOffsets[41] = 200;
  rt.packedBytes[200 + 5] = 1;
  rt.packedBytes[200 + 12] = 0;
  rt.game.missionFrame = 1;
  rt.game.bTeam = 0;
  rt.game.subsystemQ = 0;
  rt.game.subsystemMByte = 5;
  // Force nFlag/subsystemLFlag (the WRONG fields) to true, proving the real
  // decision path no longer reads them at all.
  rt.game.nFlag = true;
  rt.game.subsystemLFlag = true;
  rt.game.callToArmsActive = false;
  rt.game.formUpActive = false;

  const calls = [];
  const originalChange = rt.changeEntityType.bind(rt);
  rt.changeEntityType = (entityId, type, onC) => { calls.push([entityId, type]); return originalChange(entityId, type, onC); };
  rt["stepEntityDecisionCheck"](id);
  assert.ok(calls.some(([entityId, type]) => entityId === id && type === 12), JSON.stringify(calls));
}

console.log("b.b() no-arg team sweep (subsystemBTeamSweep, wired via stepLegacyX) + fN/fL field-identity fix OK");
