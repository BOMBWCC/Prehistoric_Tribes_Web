// Regression test for LegacySubsystemUnitTraining.ts (private void Z(),
// the AI's own "train a new unit" trigger).
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

const { stepLegacySubsystemUnitTraining } = loadModule("./sim/tribe/LegacySubsystemUnitTraining", srcDir);

function makeInput(overrides = {}) {
  return {
    state: new Int8Array(10000),
    team: 0,
    mainShort: [new Int16Array(30), new Int16Array(30)],
    populationThreshold: 10,
    teamOneFlags: 5,
    sceneGateActive: false,
    subsystemQByte: 0,
    allocateRecord: () => 1,
    ...overrides,
  };
}

// Scene gate active -> no-op entirely, no allocateRecord call.
{
  const input = makeInput({ sceneGateActive: true });
  input.state[8505 + 1] = 1;
  input.state[8749 + 1] = 2;
  let called = false;
  input.allocateRecord = () => { called = true; return 1; };
  stepLegacySubsystemUnitTraining(input);
  assert.equal(called, false);
}

// Team 1 population gate: aShort[1][11] >= threshold resets aShort[1][18]
// to 0, and since 0 !== -1, the whole call returns without scanning.
{
  const input = makeInput({ team: 1, populationThreshold: 10 });
  input.mainShort[1][11] = 10;
  input.mainShort[1][18] = -1;
  input.state[8505 + 31] = 1; // team1 base = 31
  input.state[8749 + 31] = 2;
  input.state[8627 + 31] = 0;
  let called = false;
  input.allocateRecord = () => { called = true; return 1; };
  stepLegacySubsystemUnitTraining(input);
  assert.equal(input.mainShort[1][18], 0);
  assert.equal(called, false);
}

// Team 1: aShort[1][18] !== -1 (and population below threshold, so not
// reset this call either) -> return without scanning.
{
  const input = makeInput({ team: 1, populationThreshold: 10 });
  input.mainShort[1][11] = 3;
  input.mainShort[1][18] = 2;
  input.state[8505 + 31] = 1;
  input.state[8749 + 31] = 2;
  input.state[8627 + 31] = 0;
  let called = false;
  input.allocateRecord = () => { called = true; return 1; };
  stepLegacySubsystemUnitTraining(input);
  assert.equal(called, false);
}

// Building eligibility gates: each of the four base checks excludes a
// building from consideration for team 0.
{
  for (const [field, passVal, failVal] of [
    [8505, 1, 0],
    [8749, 2, 3],
    [8627, 0, 1],
    [8932, 3, 4],
  ]) {
    const input = makeInput({ team: 0 });
    const aH = 5;
    input.state[8505 + aH] = 1;
    input.state[8749 + aH] = 2;
    input.state[8627 + aH] = 0;
    input.state[8932 + aH] = 3;
    input.state[9237 + aH] = 9; // ready to spawn if it reaches the gate
    input.state[field + aH] = failVal;
    let called = false;
    input.allocateRecord = () => { called = true; return -1; };
    stepLegacySubsystemUnitTraining(input);
    assert.equal(called, false, `field ${field} should gate out the building`);
  }
}

// Team 0 progress accumulation: dense[9237+aH] < 3 -> skip entirely
// (no increment), continue to next building.
{
  const input = makeInput({ team: 0 });
  const aH = 5;
  input.state[8505 + aH] = 1;
  input.state[8749 + aH] = 2;
  input.state[8627 + aH] = 0;
  input.state[8932 + aH] = 0;
  input.state[9237 + aH] = 1;
  stepLegacySubsystemUnitTraining(input);
  assert.equal(input.state[9237 + aH], 1, "no increment below 3");
}

// Team 0 progress accumulation: 3 <= dense[9237+aH] < 9 -> increment and
// continue (no spawn yet).
{
  const input = makeInput({ team: 0 });
  const aH = 5;
  input.state[8505 + aH] = 1;
  input.state[8749 + aH] = 2;
  input.state[8627 + aH] = 0;
  input.state[8932 + aH] = 0;
  input.state[9237 + aH] = 5;
  let called = false;
  input.allocateRecord = () => { called = true; return 1; };
  stepLegacySubsystemUnitTraining(input);
  assert.equal(input.state[9237 + aH], 6, "incremented by 1");
  assert.equal(called, false);
}

// Team 0: dense[9237+aH] >= 9 -> ready, spawns via allocateRecord with the
// literal type=2 constant and flags 0 (offsets 440..483: the t212 flags are team 1's).
{
  const input = makeInput({ team: 0, teamOneFlags: 7 });
  const aH = 5;
  input.state[8505 + aH] = 1;
  input.state[8749 + aH] = 2;
  input.state[8627 + aH] = 0;
  input.state[8932 + aH] = 0;
  input.state[9237 + aH] = 9;
  input.state[8383 + aH] = 12; // x
  input.state[8444 + aH] = 34; // y
  let capturedArgs;
  input.mainShort[0][18] = 77;
  input.allocateRecord = (...args) => { capturedArgs = args; return 9; };
  stepLegacySubsystemUnitTraining(input);
  assert.deepEqual(capturedArgs, [0, 12, 34, 2, 0]);
  assert.equal(input.state[9237 + aH], 0, "progress reset before spawn");
  // Team 0 jumps from offset 203 straight to 390: a[0][18] is not reset (oracle run 8, frame 11338).
  assert.equal(input.mainShort[0][18], 77);
}

// Team 1: a hut inside the view (isInView true) is skipped -- team 1 only
// spawns off-screen (offsets 247..358).
{
  const input = makeInput({ team: 1 });
  const aH = 31;
  input.state[8505 + aH] = 1;
  input.state[8749 + aH] = 2;
  input.state[8627 + aH] = 0;
  input.state[8932 + aH] = 0;
  input.state[8383 + aH] = 1;
  input.state[8444 + aH] = 1;
  input.mainShort[1][18] = -1; // pass the population gate so the loop runs
  input.isInView = () => true;
  let called = false;
  input.allocateRecord = () => { called = true; return 1; };
  stepLegacySubsystemUnitTraining(input);
  assert.equal(called, false);
}

// Team 1: subsystemQByte > 0 aborts before allocateRecord is called, even
// though mainShort[team][18] is still reset to 0.
{
  const input = makeInput({ team: 1, subsystemQByte: 1 });
  const aH = 31;
  input.state[8505 + aH] = 1;
  input.state[8749 + aH] = 2;
  input.state[8627 + aH] = 0;
  input.state[8932 + aH] = 0;
  input.state[8383 + aH] = 1;
  input.state[8444 + aH] = 1;
  input.isInView = () => false;
  input.mainShort[1][18] = -1; // pass the population gate so the loop runs
  let called = false;
  input.allocateRecord = () => { called = true; return 1; };
  stepLegacySubsystemUnitTraining(input);
  assert.equal(input.mainShort[1][18], 0);
  assert.equal(called, false);
}

// Full spawn/init sequence (team 1, subsystemQByte===0): allocateRecord
// called with type=2 constant and the t212 flags (oracle run 15, play24 frame 75408).
{
  const input = makeInput({ team: 1, subsystemQByte: 0 });
  const aH = 31;
  input.state[8505 + aH] = 1;
  input.state[8749 + aH] = 2;
  input.state[8627 + aH] = 0;
  input.state[8932 + aH] = 2;
  input.state[8383 + aH] = 21; // x
  input.state[8444 + aH] = 43; // y
  input.state[8993 + aH] = 8; // existing linked-list head
  input.mainShort[1][18] = -1; // pass the population gate so the loop runs
  input.isInView = () => false;
  let capturedArgs;
  input.allocateRecord = (...args) => { capturedArgs = args; return 3; };
  stepLegacySubsystemUnitTraining(input);
  assert.deepEqual(capturedArgs, [1, 21, 43, 2, 5]);
  assert.equal(input.state[4444 + 3], aH, "record pointer set to spawning building");
  assert.equal(input.state[8932 + aH], 3, "training count incremented");
  assert.equal(input.state[4545 + 3], 8, "linked into previous list head");
  assert.equal(input.state[8993 + aH], 3, "building's list head now the new unit");
  assert.equal(input.state[1313 + 3], -3);
  assert.equal(input.state[2929 + 3], 71);
  assert.equal(input.state[3030 + 3], 0);
  assert.equal(input.state[2828 + 3], 59);
}

// allocateRecord returning < 1 (allocation failed) aborts without any
// post-spawn field writes.
{
  const input = makeInput({ team: 0 });
  const aH = 5;
  input.state[8505 + aH] = 1;
  input.state[8749 + aH] = 2;
  input.state[8627 + aH] = 0;
  input.state[8932 + aH] = 0;
  input.state[9237 + aH] = 9;
  input.allocateRecord = () => -1;
  stepLegacySubsystemUnitTraining(input);
  assert.equal(input.state[2929 + 1] ?? 0, 0, "no spawn field writes happened");
}

// onG callback fires exactly once per successful spawn.
{
  const input = makeInput({ team: 0 });
  const aH = 5;
  input.state[8505 + aH] = 1;
  input.state[8749 + aH] = 2;
  input.state[8627 + aH] = 0;
  input.state[8932 + aH] = 0;
  input.state[9237 + aH] = 9;
  input.allocateRecord = () => 2;
  let onGCalls = 0;
  input.onG = () => { onGCalls += 1; };
  stepLegacySubsystemUnitTraining(input);
  assert.equal(onGCalls, 1);
}

// Team-0-vs-team-1 looping: team 0 continues scanning all 30 slots after a
// successful spawn (spawns at multiple buildings in one call); team 1
// returns immediately after its first successful spawn.
{
  const input = makeInput({ team: 0 });
  for (const aH of [5, 9]) {
    input.state[8505 + aH] = 1;
    input.state[8749 + aH] = 2;
    input.state[8627 + aH] = 0;
    input.state[8932 + aH] = 0;
    input.state[9237 + aH] = 9;
  }
  let spawnCount = 0;
  input.allocateRecord = () => { spawnCount += 1; return spawnCount; };
  stepLegacySubsystemUnitTraining(input);
  assert.equal(spawnCount, 2, "team 0 spawns at every eligible building in one call");
}
{
  const input = makeInput({ team: 1 });
  for (const aH of [31, 35]) {
    input.state[8505 + aH] = 1;
    input.state[8749 + aH] = 2;
    input.state[8627 + aH] = 0;
    input.state[8932 + aH] = 0;
    input.state[8383 + aH] = 1;
    input.state[8444 + aH] = 1;
  }
  input.mainShort[1][18] = -1; // pass the population gate so the loop runs
  input.isInView = () => false;
  let spawnCount = 0;
  input.allocateRecord = () => { spawnCount += 1; return spawnCount; };
  stepLegacySubsystemUnitTraining(input);
  assert.equal(spawnCount, 1, "team 1 returns after its first spawn");
}

// Team scoping: team 1's loop only considers slots 31..60, never touching
// team 0's 1..30 range.
{
  const input = makeInput({ team: 1 });
  input.mainShort[1][18] = -1; // pass the population gate so the loop runs
  input.isInView = () => false;
  input.state[8505 + 5] = 1; // team-0 slot, should never be touched
  input.state[8749 + 5] = 2;
  input.state[8627 + 5] = 0;
  let called = false;
  input.allocateRecord = () => { called = true; return 1; };
  stepLegacySubsystemUnitTraining(input);
  assert.equal(called, false, "team 1 must not scan team 0's slot range");
}

console.log("b.Z() AI unit-training trigger OK");
