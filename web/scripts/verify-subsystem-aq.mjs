// Regression test for LegacySubsystemAq.ts (private void aq()).
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

const { stepLegacySubsystemAq } = loadModule("./LegacySubsystemAq", srcDir);

function make3D(teams, rows, cols) {
  return Array.from({ length: teams }, () => Array.from({ length: rows }, () => new Int8Array(cols)));
}
function make2D(rows, cols) {
  return Array.from({ length: rows }, () => new Int8Array(cols));
}
function makeGrid() {
  return Array.from({ length: 20 }, () => new Int8Array(20));
}

function makeInput(overrides = {}) {
  return {
    state: new Int8Array(10000),
    packedBytes: new Int8Array(4000),
    packedOffsets: new Int16Array(400),
    mainShort: [new Int16Array(30), new Int16Array(30)],
    gridC: makeGrid(),
    scoutMemory: make3D(2, 10, 12), // rows need >=12 columns: index 11 holds aP
    buildingQueue: make3D(2, 4, 30),
    freeSlotTable: make2D(4, 30),
    team: 1,
    fByte: 0,
    qByte: 0,
    rByte: 0,
    sceneQ: 0,
    simulationCounter: 0,
    ...overrides,
  };
}

// Gate: fByte>=50 -> no-op entirely, not even ar()/as().
{
  const input = makeInput({ fByte: 50 });
  let called = false;
  stepLegacySubsystemAq(input, { onAr: () => { called = true; }, onAs: () => { called = true; } });
  assert.equal(called, false);
}

// Offsets 10..61: M = t220[q], A = t216[q] * 500 are stored (putfield #36/#7)
// before ar()/as() run -- av() reads both.
{
  const input = makeInput({ sceneQ: 1 });
  input.packedOffsets[216] = 100; input.packedBytes[101] = 16;
  input.packedOffsets[220] = 200; input.packedBytes[201] = 3;
  const order = [];
  stepLegacySubsystemAq(input, { onPrologue: (m, a) => order.push(["prologue", m, a]), onAs: () => order.push(["as"]) });
  assert.deepEqual(order, [["prologue", 3, 8000], ["as"]]);
}
// ar() gated on aShort[u][11]>0 && Q<1; as() always called (when fByte<50).
{
  const input = makeInput({ qByte: 0 });
  input.mainShort[1][11] = 5;
  let arCalled = false;
  let asCalled = false;
  stepLegacySubsystemAq(input, { onAr: () => { arCalled = true; }, onAs: () => { asCalled = true; } });
  assert.equal(arCalled, true);
  assert.equal(asCalled, true);
}
{
  const input = makeInput({ qByte: 1 }); // Q>=1 -> ar() skipped
  input.mainShort[1][11] = 5;
  let arCalled = false;
  stepLegacySubsystemAq(input, { onAr: () => { arCalled = true; } });
  assert.equal(arCalled, false);
}
{
  const input = makeInput({ qByte: 0 });
  input.mainShort[1][11] = 0; // <=0 -> ar() skipped
  let arCalled = false;
  stepLegacySubsystemAq(input, { onAr: () => { arCalled = true; } });
  assert.equal(arCalled, false);
}

// Section 1 tick gate: period1=0 (packedBytes default 0) never fires.
{
  const input = makeInput({ simulationCounter: 50 });
  input.scoutMemory[1][0][11] = 5; // would be eligible if the section ran
  let nCalls = [];
  stepLegacySubsystemAq(input, { onN: (arg) => nCalls.push(arg) });
  assert.deepEqual(nCalls, []);
}

// Section 1: aP<=0 skips this aN entirely.
{
  const input = makeInput({ simulationCounter: 50 });
  input.packedOffsets[264] = 10;
  input.packedBytes[10 + 0] = 1; // period1 = 1*50=50, 50%50===0... need ===50 exactly per real formula
  // real gate is `c % period === 50`, so with period=50, c%50 must equal 50 -- impossible (remainder<divisor).
  // Use a period > 50 instead so a remainder of exactly 50 is reachable.
  input.packedBytes[10 + 0] = 2; // period1 = 100
  input.simulationCounter = 50; // 50 % 100 === 50 -- gate passes
  input.scoutMemory[1][0][11] = 0; // aP<=0
  let nCalls = [];
  stepLegacySubsystemAq(input, { onN: (arg) => nCalls.push(arg) });
  assert.deepEqual(nCalls, []);
}

// Section 1: full happy path through the first aO loop's write (index/value not swapped).
{
  const input = makeInput({ simulationCounter: 50 });
  input.packedOffsets[264] = 10;
  input.packedBytes[10] = 2; // period1=100, 50%100===50 -- gate passes
  input.scoutMemory[1][0][11] = 7; // aP
  // Slots 0..8 all empty: offsets 177..241 go on only for such a row.
  // aO loop (0..1): v = aO*3..4. For aO=0, v=0,1,2. Force the flag check to hit on v=0.
  input.packedOffsets[109] = 50;
  input.packedBytes[50 + 0] = 4; // packedBytes[po109+v=0] = 4 -> slotIndex=4
  input.mainShort[1][5 + 4] = 9; // aShort[u][5+4] !== 0 -> match
  input.packedOffsets[265] = 60;
  input.packedBytes[60 + 0 * 5 + 0] = 77; // q=0, aO=0 -> value
  stepLegacySubsystemAq(input, {});
  assert.equal(input.scoutMemory[1][0][4], 77, "written at slotIndex(4), not at aO(0) -- confirms the corrected index/value order");
}

// Section 1: game.c<=A/3 skips the second aO loop (2..4) and its n(266) calls.
{
  const input = makeInput({ simulationCounter: 50 });
  input.packedOffsets[264] = 10;
  input.packedBytes[10] = 2;
  input.packedOffsets[216] = 70;
  input.packedBytes[70] = 1000; // A = 1000*500 -- huge, so game.c(50) <= A/3 easily
  input.scoutMemory[1][0][11] = 7;
  let nCalls = [];
  stepLegacySubsystemAq(input, { onN: (arg) => nCalls.push(arg) });
  assert.deepEqual(nCalls, [], "second aO loop (and its n(266) calls) never reached");
}

// Section 1: full path into the second aO loop -- writes freeSlotTable and marks gridC.
{
  const input = makeInput({ simulationCounter: 50, rByte: 0 });
  input.packedOffsets[264] = 10;
  input.packedBytes[10] = 2; // period1=100
  input.packedOffsets[216] = 70;
  input.packedBytes[70] = 0; // A=0 -> game.c(50) > A/3(0)
  input.packedOffsets[268] = 80;
  input.packedBytes[80] = 100; // (R&63)=0 < 100 -- passes
  input.scoutMemory[1][0][11] = 42; // aP
  input.packedOffsets[265] = 60;
  input.packedBytes[60 + 0 * 5 + 2] = 1; // count for aO=2 -> 1 iteration
  input.state[3131] = 5; // bare-index global x
  input.state[3232] = 6; // bare-index global y
  let nCalls = [];
  stepLegacySubsystemAq(input, { onN: (arg) => nCalls.push(arg) });
  assert.deepEqual(nCalls, [266]);
  assert.equal(input.freeSlotTable[0][0], 42, "aP written at the first free row");
  assert.equal(input.freeSlotTable[2][0], 5);
  assert.equal(input.freeSlotTable[3][0], 6);
  assert.equal(input.freeSlotTable[1][0], 2 + 18, "aO+18");
  assert.equal(input.gridC[6][5], -126);
}

// Section 1: a row with any of slots 0..8 set is skipped (`goto 738`).
{
  const input = makeInput({ simulationCounter: 50, rByte: 0 });
  input.packedOffsets[264] = 10;
  input.packedBytes[10] = 2;
  input.packedOffsets[268] = 80;
  input.packedBytes[80] = 100;
  input.scoutMemory[1][0][11] = 42;
  input.scoutMemory[1][0][3] = 1;
  input.packedOffsets[265] = 60;
  input.packedBytes[60 + 0 * 5 + 2] = 1;
  let nCalls = [];
  stepLegacySubsystemAq(input, { onN: (arg) => nCalls.push(arg) });
  assert.deepEqual(nCalls, []);
}

// Section 2: kind must be exactly 8, active, within the 30-slot team roster.
{
  const input = makeInput({ team: 0, simulationCounter: 50 });
  input.packedOffsets[269] = 90;
  input.packedBytes[90] = 2; // period2=100, 50%100===50
  input.packedOffsets[216] = 70;
  input.packedBytes[70] = 0; // A=0 -> game.c(50) > A/2(0)
  input.state[8505 + 5] = 1; // active
  input.state[8749 + 5] = 8; // kind===8
  input.packedOffsets[270] = 95;
  input.packedBytes[95] = 1; // limit=1 iteration
  input.state[3131] = 11;
  input.state[3232] = 22;
  let nCalls = [];
  stepLegacySubsystemAq(input, { onN: (arg) => nCalls.push(arg) });
  assert.deepEqual(nCalls, [271]);
  assert.equal(input.buildingQueue[0][0][0], 5, "aN written at the first free row");
  assert.equal(input.buildingQueue[0][2][0], 11);
  assert.equal(input.buildingQueue[0][3][0], 22);
  assert.equal(input.buildingQueue[0][1][0], 3);
}

// Section 2: kind!==8 excludes the building.
{
  const input = makeInput({ team: 0, simulationCounter: 50 });
  input.packedOffsets[269] = 90;
  input.packedBytes[90] = 2;
  input.state[8505 + 5] = 1;
  input.state[8749 + 5] = 2; // not 8
  input.packedOffsets[270] = 95;
  input.packedBytes[95] = 1;
  let nCalls = [];
  stepLegacySubsystemAq(input, { onN: (arg) => nCalls.push(arg) });
  assert.deepEqual(nCalls, []);
}

console.log("b.aq() team1 AI entry point OK");
