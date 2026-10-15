import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";

const path = new URL("../src/j2me/LegacyMapMarkerScan.ts", import.meta.url).pathname;
const output = ts.transpileModule(fs.readFileSync(path, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(output, { module, exports: module.exports, Int8Array, Int16Array });
const {
  decayLegacyMapMarkerDenseState,
  scanLegacyTeamMarkers,
  scanLegacyResourceNodes,
  stepLegacyMapMarkerScan,
} = module.exports;

function grid3(dim1, dim2, dim3) {
  return Array.from({ length: dim1 }, () => Array.from({ length: dim2 }, () => new Int8Array(dim3)));
}

function freshState(overrides = {}) {
  return {
    dense: new Int8Array(20000),
    teamMarkerTable: [
      [new Int8Array(4), new Int8Array(4), new Int8Array(4), new Int8Array(4), new Int8Array(4)],
      [new Int8Array(4), new Int8Array(4), new Int8Array(4), new Int8Array(4), new Int8Array(4)],
    ],
    resourceNodeTable: grid3(1, 5, 30),
    packedBytes: new Int8Array(2000),
    packedOffsets: new Int16Array(400),
    originColumn: 0,
    originRow: 0,
    columns: 12,
    rows: 19,
    phase: 0,
    ...overrides,
  };
}

// Part 1: decay pass over indices 1..60 only (0 and 61 untouched).
{
  const dense = new Int8Array(20000);
  dense[8871 + 1] = 0b11; // low bit set -> should clear to 0b10
  dense[8871 + 0] = 0b11; // index 0, out of [1,60] range -> untouched
  dense[8871 + 61] = 0b11; // index 61, out of range -> untouched
  dense[9176 + 5] = 9; // >0 -> clamp to 5
  dense[9176 + 6] = -3; // <=0 -> untouched
  decayLegacyMapMarkerDenseState(dense);
  assert.equal(dense[8871 + 1], 0b10);
  assert.equal(dense[8871 + 0], 0b11);
  assert.equal(dense[8871 + 61], 0b11);
  assert.equal(dense[9176 + 5], 5);
  assert.equal(dense[9176 + 6], -3);
}

// Part 2: an entry that fails every gate condition draws nothing.
{
  const state = freshState();
  state.teamMarkerTable[0][0][2] = -1; // type<0
  const calls = [];
  scanLegacyTeamMarkers(state, { onSpriteDraw: (...a) => calls.push(a) });
  assert.deepEqual(calls, []);
}

// Part 2: a valid entry draws once per step where classifyOccupancy===0,
// at the exact bytecode-derived tile/pixel positions.
{
  const state = freshState();
  const [x, y] = [5, 5];
  state.teamMarkerTable[0][2][0] = x;
  state.teamMarkerTable[0][2][1] = y;
  state.teamMarkerTable[0][2][2] = 0; // type>=0
  state.teamMarkerTable[0][2][3] = 1; // flag===1
  state.packedOffsets[141] = 300;
  state.packedBytes[300 + 0] = 2; // dx for step 0
  state.packedBytes[300 + 9 + 0] = -1; // dy for step 0
  const classifyArgs = [];
  const draws = [];
  scanLegacyTeamMarkers(state, {
    classifyOccupancy: (tx, ty) => {
      classifyArgs.push([tx, ty]);
      return tx === x + 2 && ty === y - 1 ? 0 : 1; // only step 0's tile classifies as visible
    },
    onSpriteDraw: (...a) => draws.push(a),
  });
  assert.deepEqual(classifyArgs[0], [x + 2, y - 1]); // raw tile coords, no viewport-origin subtraction
  assert.deepEqual(draws, [[68, (x - 0 + 2) * 22, (y - 0 - 1) * 16, 0]]);
}

// Part 2: team-switch -- only team-0 slot-4 and team-1 slot-2 are valid;
// confirms the manual 0..4/0..4 unroll visits both teams (10 total slots).
{
  const state = freshState();
  state.teamMarkerTable[0][4][0] = 3;
  state.teamMarkerTable[0][4][1] = 3;
  state.teamMarkerTable[0][4][2] = 0;
  state.teamMarkerTable[0][4][3] = 1;
  state.teamMarkerTable[1][2][0] = 4;
  state.teamMarkerTable[1][2][1] = 4;
  state.teamMarkerTable[1][2][2] = 0;
  state.teamMarkerTable[1][2][3] = 1;
  const draws = [];
  scanLegacyTeamMarkers(state, {
    classifyOccupancy: () => 0,
    onSpriteDraw: (...a) => draws.push(a),
  });
  // 9 steps each for the two valid entries = 18 draws total.
  assert.equal(draws.length, 18);
}

// Part 2: entry outside the expanded viewport (columns+1/rows+1 bound) draws nothing.
{
  const state = freshState({ columns: 12, rows: 19 });
  state.teamMarkerTable[0][0][0] = 14; // originColumn(0) + columns(12) + 1 = 13 is the max; 14 is out
  state.teamMarkerTable[0][0][1] = 5;
  state.teamMarkerTable[0][0][2] = 0;
  state.teamMarkerTable[0][0][3] = 1;
  const calls = [];
  scanLegacyTeamMarkers(state, { classifyOccupancy: () => 0, onSpriteDraw: () => calls.push("draw") });
  assert.deepEqual(calls, []);
}

// Part 3: gate on column1!==3 skips the slot.
{
  const state = freshState();
  state.resourceNodeTable[0][1][0] = 2; // not 3
  state.resourceNodeTable[0][0][0] = 1;
  const calls = [];
  scanLegacyResourceNodes(state, { onSpriteDraw: () => calls.push("draw") });
  assert.deepEqual(calls, []);
}

// Part 3: gate on column0===0 skips the slot.
{
  const state = freshState();
  state.resourceNodeTable[0][1][0] = 3;
  state.resourceNodeTable[0][0][0] = 0; // ===0 -> skip
  const calls = [];
  scanLegacyResourceNodes(state, { onSpriteDraw: () => calls.push("draw") });
  assert.deepEqual(calls, []);
}

// Part 3: valid slot draws with record = 68 + (1 - column4) * 5.
{
  const state = freshState();
  state.resourceNodeTable[0][1][5] = 3;
  state.resourceNodeTable[0][0][5] = 1;
  state.resourceNodeTable[0][2][5] = 6; // x
  state.resourceNodeTable[0][3][5] = 7; // y
  state.resourceNodeTable[0][4][5] = 3; // type column
  const draws = [];
  scanLegacyResourceNodes(state, {
    classifyOccupancy: () => 0,
    onSpriteDraw: (...a) => draws.push(a),
  });
  // record = 68 + (1-3)*5 = 68-10 = 58
  assert.deepEqual(draws, [[58, 6 * 22, 7 * 16, 0]]);
}

// Part 3: classifyOccupancy!==0 skips the draw.
{
  const state = freshState();
  state.resourceNodeTable[0][1][5] = 3;
  state.resourceNodeTable[0][0][5] = 1;
  state.resourceNodeTable[0][2][5] = 6;
  state.resourceNodeTable[0][3][5] = 7;
  const calls = [];
  scanLegacyResourceNodes(state, { classifyOccupancy: () => 1, onSpriteDraw: () => calls.push("draw") });
  assert.deepEqual(calls, []);
}

// Top-level stepLegacyMapMarkerScan runs all three parts in order.
{
  const state = freshState();
  state.dense[9176 + 1] = 9;
  state.teamMarkerTable[0][0][2] = 0;
  state.teamMarkerTable[0][0][3] = 1;
  state.teamMarkerTable[0][0][0] = 1;
  state.teamMarkerTable[0][0][1] = 1;
  state.resourceNodeTable[0][1][0] = 3;
  state.resourceNodeTable[0][0][0] = 1;
  state.resourceNodeTable[0][2][0] = 2;
  state.resourceNodeTable[0][3][0] = 2;
  const draws = [];
  stepLegacyMapMarkerScan(state, { classifyOccupancy: () => 0, onSpriteDraw: (...a) => draws.push(a) });
  assert.equal(state.dense[9176 + 1], 5, "part 1 ran");
  assert.ok(draws.length > 0, "parts 2/3 drew something");
}

console.log("f.v() team/resource marker scan OK");
