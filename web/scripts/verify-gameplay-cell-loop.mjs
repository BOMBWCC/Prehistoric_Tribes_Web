import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";

const path = new URL("../src/render/LegacyGameplayCellLoop.ts", import.meta.url).pathname;
const output = ts.transpileModule(fs.readFileSync(path, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(output, { module, exports: module.exports, Int8Array });
const { stepLegacyGameplayCell } = module.exports;

const viewport = {
  columns: 12, rows: 19, originColumn: 0, originRow: 0,
  mapWidth: 40, mapHeight: 32, zWriteAiTarget: -100, zWriteAhTarget: -100,
};

function grid(rows, cols) {
  return Array.from({ length: rows }, () => new Int8Array(cols));
}

function freshState() {
  return {
    sFlag: false, jFlag: false, zByte: 0,
    gridC: grid(32, 40), gridB: grid(32, 40), gridG: grid(19, 12),
  };
}

// Out-of-bounds column -> handled:false, ahDecrement:0, no callbacks at all.
{
  const state = freshState();
  const calls = [];
  const result = stepLegacyGameplayCell(-1, 0, viewport, state, {
    classifyOccupancy: () => { calls.push("classify"); return 0; },
  });
  assert.deepEqual({ ...result }, { handled: false, ahDecrement: 0 });
  assert.deepEqual(calls, []);
}

// gridCValue===0: no marker/unhandled-body callback, but the epilogue still
// runs (occupancy dispatch still happens for class 1/2 -- fog draws over water too).
{
  const state = freshState();
  const calls = [];
  const result = stepLegacyGameplayCell(2, 3, viewport, state, {
    classifyOccupancy: () => 0,
    onMapMarkerArg1: () => calls.push("marker"),
    onUnhandledCellBody: () => { calls.push("unhandled"); return undefined; },
    onPackedPrimitive: (...a) => calls.push(["primitive", ...a]),
  });
  assert.deepEqual({ ...result }, { handled: true, ahDecrement: 0 });
  assert.deepEqual(calls, []); // occupancyClass 0 -> no fog draw either
}

// gridCValue!=0, occupancyClass<2, gridBValue in [180,231] -> marker, not unhandled.
{
  const state = freshState();
  state.gridC[3][2] = 5;
  state.gridB[3][2] = 200;
  const calls = [];
  stepLegacyGameplayCell(2, 3, viewport, state, {
    classifyOccupancy: () => 0,
    onMapMarkerArg1: (v) => calls.push(["marker", v]),
    onUnhandledCellBody: () => { calls.push("unhandled"); return undefined; },
  });
  assert.deepEqual(calls, [["marker", 200]]);
}

// gridBValue===243 also triggers the marker branch.
{
  const state = freshState();
  state.gridC[3][2] = 5;
  state.gridB[3][2] = 243;
  const calls = [];
  stepLegacyGameplayCell(2, 3, viewport, state, {
    classifyOccupancy: () => 1,
    onMapMarkerArg1: (v) => calls.push(["marker", v]),
    onUnhandledCellBody: () => { calls.push("unhandled"); return undefined; },
  });
  assert.deepEqual(calls, [["marker", 243]]);
}

// gridCValue!=0 but gridBValue outside the marker ranges -> unhandled body, not marker.
{
  const state = freshState();
  state.gridC[3][2] = 5;
  state.gridB[3][2] = 100;
  const calls = [];
  stepLegacyGameplayCell(2, 3, viewport, state, {
    classifyOccupancy: () => 0,
    onMapMarkerArg1: () => calls.push("marker"),
    onUnhandledCellBody: (...a) => { calls.push(["unhandled", ...a]); return undefined; },
  });
  assert.deepEqual(calls, [["unhandled", 2, 3, 44, 0, 5, 100, 48]]); // ai=3 -> rowPixelBase=48
}

// occupancyClass>=2 always goes to unhandled body regardless of gridBValue.
{
  const state = freshState();
  state.gridC[3][2] = 5;
  state.gridB[3][2] = 200; // would match the marker range if class were <2
  const calls = [];
  stepLegacyGameplayCell(2, 3, viewport, state, {
    classifyOccupancy: () => 2,
    onMapMarkerArg1: () => calls.push("marker"),
    onUnhandledCellBody: () => { calls.push("unhandled"); return undefined; },
  });
  assert.deepEqual(calls, ["unhandled"]);
}

// sFlag && !jFlag forces occupancyClass to 0 regardless of classifyOccupancy.
{
  const state = freshState();
  state.sFlag = true;
  state.jFlag = false;
  state.gridC[3][2] = 5;
  state.gridB[3][2] = 200;
  const calls = [];
  stepLegacyGameplayCell(2, 3, viewport, state, {
    classifyOccupancy: () => 2, // would be class 2 without the override
    onMapMarkerArg1: (v) => calls.push(["marker", v]),
    onUnhandledCellBody: () => calls.push("unhandled"),
  });
  // class forced to 0 -> takes the <2 marker path since gridB=200 is in range
  assert.deepEqual(calls, [["marker", 200]]);
}

// Secondary grid: value>0 fires onSecondaryCell with the pre-clear value,
// then clears it; guarded by ah in [0,columns) and ai>=0.
{
  const state = freshState();
  state.gridG[3][2] = 7;
  const calls = [];
  stepLegacyGameplayCell(2, 3, viewport, state, {
    classifyOccupancy: () => 0,
    onSecondaryCell: (v) => calls.push(["secondary", v]),
  });
  assert.deepEqual(calls, [["secondary", 7]]);
  assert.equal(state.gridG[3][2], 0);
}

// Secondary grid: value<=0 -> neither the callback nor the reset fires
// (both are gated by the SAME bytecode guard chain, offsets 1791..1865).
{
  const state = freshState();
  state.gridG[3][2] = 0;
  const calls = [];
  stepLegacyGameplayCell(2, 3, viewport, state, {
    onSecondaryCell: () => calls.push("secondary"),
  });
  assert.deepEqual(calls, []);
  assert.equal(state.gridG[3][2], 0);
}

// Secondary grid: ah outside [0,columns) suppresses both callback and reset
// even when the underlying value is >0.
{
  const state = freshState();
  const wideViewport = { ...viewport, columns: 2 };
  state.gridG[3][5] = 9;
  const calls = [];
  stepLegacyGameplayCell(5, 3, wideViewport, state, {
    onSecondaryCell: () => calls.push("secondary"),
  });
  assert.deepEqual(calls, []);
  assert.equal(state.gridG[3][5], 9); // NOT cleared
}

// occupancyClass===1: packed primitive record 12 at (columnPixelX-2, y-4),
// where y is f.u()'s local2 -- confirmed `ai * 16` (NOT a constant; a
// second pass found the offset-2124 `iinc` a plain istore_2 grep missed,
// see file header). No longer threaded through onUnhandledCellBody's
// return value; ai=3 here -> y=48.
{
  const state = freshState();
  state.gridC[3][2] = 5;
  state.gridB[3][2] = 50; // outside marker range -> reaches unhandled body
  const calls = [];
  stepLegacyGameplayCell(2, 3, viewport, state, {
    classifyOccupancy: () => 1,
    onUnhandledCellBody: () => undefined,
    onPackedPrimitive: (...a) => calls.push(a),
  });
  assert.deepEqual(calls, [[12, 44 - 2, 48 - 4]]);
}

// occupancyClass===2, all 4 neighbors also class 2, interior tile -> solid fill.
{
  const state = freshState();
  state.gridC[3][2] = 5;
  state.gridB[3][2] = 50;
  const calls = [];
  stepLegacyGameplayCell(2, 3, viewport, state, {
    classifyOccupancy: () => 2, // self and all neighbors
    onUnhandledCellBody: () => undefined,
    onFillHiddenTile: (...a) => calls.push(["fill", ...a]),
    onPackedPrimitive: (...a) => calls.push(["primitive", ...a]),
  });
  assert.deepEqual(calls, [["fill", 44, 48]]); // ai=3 -> y=48
}

// occupancyClass===2 but on the map edge (row===0) -> never solid-fills,
// always the edge-softened packed-primitive record 11. ai=0 here -> y=0.
{
  const state = freshState();
  state.gridC[0][2] = 5;
  state.gridB[0][2] = 50;
  const calls = [];
  stepLegacyGameplayCell(2, 0, viewport, state, {
    classifyOccupancy: () => 2,
    onUnhandledCellBody: () => undefined,
    onFillHiddenTile: (...a) => calls.push(["fill", ...a]),
    onPackedPrimitive: (...a) => calls.push(["primitive", ...a]),
  });
  assert.deepEqual(calls, [["primitive", 11, 44 - 3, 0 - 2]]);
}

// occupancyClass===2, interior, but one neighbor is class!=2 -> edge draw.
{
  const state = freshState();
  state.gridC[3][2] = 5;
  state.gridB[3][2] = 50;
  const calls = [];
  let classifyCall = 0;
  stepLegacyGameplayCell(2, 3, viewport, state, {
    classifyOccupancy: () => {
      classifyCall += 1;
      return classifyCall === 1 ? 2 : 0; // self=2, first neighbor breaks the run
    },
    onUnhandledCellBody: () => undefined,
    onFillHiddenTile: (...a) => calls.push(["fill", ...a]),
    onPackedPrimitive: (...a) => calls.push(["primitive", ...a]),
  });
  assert.deepEqual(calls, [["primitive", 11, 44 - 3, 48 - 2]]); // ai=3 -> y=48
}

// f.u()'s local2 really does vary per row: same cell shape, different `ai`
// -> different y, confirming this isn't accidentally still constant.
{
  const state = freshState();
  state.gridC[5][2] = 5;
  state.gridB[5][2] = 50;
  const calls = [];
  stepLegacyGameplayCell(2, 5, viewport, state, {
    classifyOccupancy: () => 1,
    onUnhandledCellBody: () => undefined,
    onPackedPrimitive: (...a) => calls.push(a),
  });
  assert.deepEqual(calls, [[12, 44 - 2, 5 * 16 - 4]]);
}

// ahDecrement passes through from onUnhandledCellBody's return value.
{
  const state = freshState();
  state.gridC[3][2] = 5;
  state.gridB[3][2] = 50;
  const result = stepLegacyGameplayCell(2, 3, viewport, state, {
    classifyOccupancy: () => 0,
    onUnhandledCellBody: () => ({ ahDecrement: 1 }),
  });
  assert.deepEqual({ ...result }, { handled: true, ahDecrement: 1 });
}

// Z-byte write only when ai/ah match the configured targets.
{
  const state = freshState();
  const matchViewport = { ...viewport, zWriteAiTarget: 3, zWriteAhTarget: 2 };
  state.gridC[3][2] = 5;
  state.gridB[3][2] = 50;
  stepLegacyGameplayCell(2, 3, matchViewport, state, {
    classifyOccupancy: () => 1,
    onUnhandledCellBody: () => undefined,
  });
  assert.equal(state.zByte, 1);
}
{
  const state = freshState();
  state.gridC[3][2] = 5;
  state.gridB[3][2] = 50;
  stepLegacyGameplayCell(2, 3, viewport, state, { // zWriteAiTarget/AhTarget don't match
    classifyOccupancy: () => 1,
    onUnhandledCellBody: () => undefined,
  });
  assert.equal(state.zByte, 0);
}

// A building cell's re-derived local3 (offsets 634..682) drives the epilogue and z:B.
{
  const state = freshState();
  const matchViewport = { ...viewport, zWriteAiTarget: 3, zWriteAhTarget: 2 };
  state.gridC[3][2] = -5;
  const prims = [];
  stepLegacyGameplayCell(2, 3, matchViewport, state, {
    classifyOccupancy: () => 0,
    onUnhandledCellBody: () => ({ ahDecrement: 0, occupancyClass: 1 }),
    onPackedPrimitive: (type) => prims.push(type),
  });
  assert.equal(state.zByte, 1);
  assert.deepEqual(prims, [12]);
}

console.log("f.u() cell-loop skeleton + fog-of-war dispatch OK");
