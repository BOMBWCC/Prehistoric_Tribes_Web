import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";
import { denseRequire } from "./dense-layout-require.mjs";

function compile(relativePath, dependencies = {}) {
  const path = `${new URL(relativePath, import.meta.url).pathname}`;
  const output = ts.transpileModule(fs.readFileSync(path, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(output, {
    module,
    exports: module.exports,
    require: (name) => dependencies[name],
    Int8Array,
    Int16Array,
    Math,
  });
  return module.exports;
}

const footprint = compile("../src/sim/world/LegacyFootprintCheck.ts", { "../../core/DataTables": denseRequire("core/DataTables") });
const { placeLegacyEntity } = compile("../src/sim/units/LegacyEntityPlacement.ts", {
  "../world/LegacyFootprintCheck": footprint,
  "../../core/DenseLayout": denseRequire("core/DenseLayout"),
  "../../core/DataTables": denseRequire("core/DataTables"),
});

const state = new Int8Array(9983);
const map = Array.from({ length: 8 }, () => new Int8Array(8));
const packedBytes = new Int8Array(17638);
const packedOffsets = new Int16Array(312);
const mainShort = [new Int16Array(26), new Int16Array(26)];
const typeZeroRows = Array.from({ length: 2 }, () =>
  Array.from({ length: 10 }, () => new Int8Array(12)),
);
const auxiliarySlots = Array.from({ length: 4 }, () => new Int8Array(30));
packedOffsets[138] = 100;
packedOffsets[113] = 300;
packedBytes[100 + 104] = 1;
packedBytes[100 + 130] = 1;
packedBytes[100 + 182] = 11;
packedBytes[300] = 7;

const events = [];
const id = placeLegacyEntity({
  state, map, packedBytes, packedOffsets, mainShort, typeZeroRows, auxiliarySlots,
  auxiliaryIndex: 0, mapWidth: 8, mapHeight: 8, occupancyClass: () => 0 /* class 0 == placeable (f.a(IIIZ) offset 113, `ifeq 119`); was 1 here, matching the port's own inverted check, fixed 2026-09-09 */,
  qByte: 0, qCounter: 0, frameS: 0, teamZeroSlotValue: 0, teamOneSlotValue: 0, suppressCounters: false,
  onFootprintMarked: (...args) => events.push(["footprint", ...args]),
  onTeamZeroSubsystem: (...args) => events.push(["subsystem", ...args]),
}, 0, 0, 2, 3, 0, false, -1);
assert.equal(id, 1);
assert.equal(state[8383 + id], 2);
assert.equal(state[8444 + id], 3);
assert.equal(state[8749 + id], 0);
assert.equal(state[8505 + id], 11);
assert.equal(state[9115 + id], 7);
assert.equal(map[3][2], -id);
assert.equal(typeZeroRows[0][0][11], id);
assert.equal(mainShort[0][14], 1);
assert.equal(mainShort[0][20], 1);
assert.deepEqual(events, [["footprint", 2, 3, 1, 1, 1], ["subsystem", 2, 3, 5]]);

// Special type 20 uses the raw f[4][30] table, while its counter is in a[2][10][12].
packedBytes[100 + 104 + 20] = 1;
packedBytes[100 + 130 + 20] = 1;
const specialId = placeLegacyEntity({
  state, map, packedBytes, packedOffsets, mainShort, typeZeroRows, auxiliarySlots,
  auxiliaryIndex: 0, mapWidth: 8, mapHeight: 8, occupancyClass: () => 0,
  // qCounter (not qByte) feeds auxiliarySlots[0][id] in the type 20..22
  // branch -- BUG FIX 2026-08-18, see LegacyEntityPlacement.ts's docblock.
  qByte: 0, qCounter: 4, frameS: 20, teamZeroSlotValue: 0, teamOneSlotValue: 0, suppressCounters: false,
}, 0, 20, 4, 4, 0, true, -1);
assert.equal(specialId, 0);
assert.equal(auxiliarySlots[0][0], 4);
assert.equal(auxiliarySlots[1][0], 20);
assert.equal(auxiliarySlots[2][0], 4);
assert.equal(auxiliarySlots[3][0], 4);
assert.equal(map[4][4], -111);

// Types 12..19 consume the ten-slot subsystem and override the packed state type.
packedBytes[100 + 104 + 12] = 1;
packedBytes[100 + 130 + 12] = 1;
packedBytes[100 + 182 + 12] = 12;
packedBytes[100 + 182 + 15] = 15;
const tenEvents = [];
const tenId = placeLegacyEntity({
  state, map, packedBytes, packedOffsets, mainShort, typeZeroRows, auxiliarySlots,
  auxiliaryIndex: 0, mapWidth: 8, mapHeight: 8, occupancyClass: () => 0 /* class 0 == placeable (f.a(IIIZ) offset 113, `ifeq 119`); was 1 here, matching the port's own inverted check, fixed 2026-09-09 */,
  qByte: 0, qCounter: 0, frameS: 0, teamZeroSlotValue: 15, teamOneSlotValue: 12, suppressCounters: true,
  onTenSlotAllocate: (value) => { tenEvents.push(["allocate", value]); return true; },
  onTenSlotRelease: (value) => tenEvents.push(["release", value]),
}, 1, 12, 5, 5, 0, false, -1);
assert.equal(tenId, 31);
assert.equal(state[9237 + tenId], 12);
assert.equal(state[8566 + tenId], 12);
assert.deepEqual(tenEvents, [["allocate", tenId]]);

// BUG FIX regression (2026-08-18): qByte and qCounter are genuinely
// different bytecode fields (f.q:B #357 vs f.q:I #356), confirmed via
// direct bytecode reads of placeEntity offset 546/558 (team===0's
// table-113 lookup, uses qByte) vs offset 239 (type 20..22's
// auxiliarySlots[0][id] write, uses qCounter). Use distinguishable
// values for each to prove they don't leak into each other.
packedOffsets[113] = 500;
packedBytes[500 + 24 + 0] = 9; // qByte===3 selects the "24" bucket: (q<2?0:q===2?12:24)
const crossState = new Int8Array(9983);
const crossMap = Array.from({ length: 8 }, () => new Int8Array(8));
const crossId = placeLegacyEntity({
  state: crossState, map: crossMap, packedBytes, packedOffsets, mainShort, typeZeroRows, auxiliarySlots,
  auxiliaryIndex: 0, mapWidth: 8, mapHeight: 8, occupancyClass: () => 0 /* class 0 == placeable (f.a(IIIZ) offset 113, `ifeq 119`); was 1 here, matching the port's own inverted check, fixed 2026-09-09 */,
  qByte: 3, qCounter: 99, frameS: 0, teamZeroSlotValue: 0, teamOneSlotValue: 0, suppressCounters: false,
}, 0, 0, 6, 6, 0, false, -1);
// type===0/team===0 path reads packedOffsets[113] + 24 (qByte===3) + type(0) -- must ignore qCounter entirely.
assert.equal(crossState[9115 + crossId], 9);

// Offsets 529..591: a nonzero `flags` IS the level (a finished site is placed
// with flags 1), for either team; only flags 0 falls back to t113. Fixed
// 2026-10-07 -- the port always used t113 for team 0, so a new hut was
// already at its max level and never offered UPGRADE.
for (const team of [0, 1]) {
  const flagState = new Int8Array(9983);
  const flagMap = Array.from({ length: 8 }, () => new Int8Array(8));
  const flagId = placeLegacyEntity({
    state: flagState, map: flagMap, packedBytes, packedOffsets, mainShort, typeZeroRows, auxiliarySlots,
    auxiliaryIndex: 0, mapWidth: 8, mapHeight: 8, occupancyClass: () => 0,
    qByte: 3, qCounter: 0, frameS: 0, teamZeroSlotValue: 0, teamOneSlotValue: 0, suppressCounters: false,
  }, team, 1, 1, 1, 1, true, -1);
  assert.equal(flagState[9115 + flagId], 1);
}

const crossAuxId = placeLegacyEntity({
  state: crossState, map: crossMap, packedBytes, packedOffsets, mainShort, typeZeroRows, auxiliarySlots,
  auxiliaryIndex: 0, mapWidth: 8, mapHeight: 8, occupancyClass: () => 0,
  qByte: 3, qCounter: 99, frameS: 20, teamZeroSlotValue: 0, teamOneSlotValue: 0, suppressCounters: false,
}, 0, 20, 1, 1, 0, true, -1);
// type 20..22's auxiliarySlots[0][id] write must reflect qCounter (99), not qByte (3).
assert.equal(auxiliarySlots[0][crossAuxId], 99);

console.log("f.a(byte,int,int,int,int,boolean,int) raw entity placement OK");
