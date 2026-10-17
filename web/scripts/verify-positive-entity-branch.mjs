import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";
import { denseRequire } from "./dense-layout-require.mjs";

const path = new URL("../src/render/LegacyGameplayPositiveEntityBranch.ts", import.meta.url).pathname;
const output = ts.transpileModule(fs.readFileSync(path, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(output, { require: denseRequire, module, exports: module.exports, Int8Array });
const { stepLegacyPositiveEntityBranch } = module.exports;

function grid(rows, cols) {
  return Array.from({ length: rows }, () => new Int8Array(cols));
}

function freshState(overrides = {}) {
  return {
    dense: new Int8Array(20000),
    gridC: grid(32, 40),
    sFlag: false,
    ao: 0,
    columns: 12,
    originColumn: 0,
    gridG: grid(19, 12),
    ...overrides,
  };
}

// sFlag && ao===9 -> early skip, nothing fires.
{
  const state = freshState({ sFlag: true, ao: 9 });
  const calls = [];
  const result = stepLegacyPositiveEntityBranch(5, 0, 3, 2, 3, 2, 0, state, {
    onMapMarkerArg1: () => calls.push("marker"),
    onEntityAction: () => calls.push("action"),
  });
  assert.deepEqual(calls, []);
  assert.equal(result.ahDecrement, 0);
}

// markerValue classifies !=2 (e.g. -111, classifies to 0) -> marker draw fires
// with the raw dense-state value; e[2929+id] check also runs (same classifier gate).
{
  const state = freshState();
  const id = 7;
  state.dense[4545 + id] = -111;
  state.dense[2929 + id] = 5; // <=14, does not trigger the early skip
  const calls = [];
  stepLegacyPositiveEntityBranch(id, 0, 0, 0, -1, 0, 0, state, {
    onMapMarkerArg1: (v) => calls.push(["marker", v]),
    onEntityAction: () => calls.push("action"),
  });
  assert.deepEqual(calls, [["marker", -111], "action"]);
}

// markerValue classifies !=2 AND e[2929+id] > 14 -> returns early (no entity action).
{
  const state = freshState();
  const id = 7;
  state.dense[4545 + id] = -111; // classifies to 0, not 2
  state.dense[2929 + id] = 15; // > 14
  const calls = [];
  stepLegacyPositiveEntityBranch(id, 0, 0, 0, -1, 0, 0, state, {
    onMapMarkerArg1: (v) => calls.push(["marker", v]),
    onEntityAction: () => calls.push("action"),
  });
  assert.deepEqual(calls, [["marker", -111]]); // marker fired, but action did not
}

// markerValue classifies ===2 (e.g. -50, outside every named range) -> no marker
// draw, and the e[2929+id] check is skipped entirely (gate not evaluated).
{
  const state = freshState();
  const id = 7;
  state.dense[4545 + id] = -50; // classifyLegacyMarkerId(-50) === 2
  state.dense[2929 + id] = 100; // would trigger the skip if checked -- must NOT be checked
  const calls = [];
  stepLegacyPositiveEntityBranch(id, 0, 0, 0, -1, 0, 0, state, {
    onMapMarkerArg1: () => calls.push("marker"),
    onEntityAction: (...a) => calls.push(["action", ...a]),
  });
  assert.ok(!calls.some((c) => c === "marker"));
  assert.ok(calls.some((c) => Array.isArray(c) && c[0] === "action"));
}

// Left-neighbor check: matching table value + range -> decrements ah,
// clears gridG at the pre-decrement position, and redraws the marker at
// the new (decremented) column.
{
  const state = freshState();
  const id = 40; // classifyLegacyPositiveEntity(40)===0, no e[7979] gate
  const row = 5, column = 4, ai = 2, ah = 3;
  state.gridC[row][column - 1] = -70; // left neighbor value
  // tableVal = dense[9833 - leftNeighbor - 61] = dense[9833-(-70)-61] = dense[9842]
  state.dense[9833 - -70 - 61] = 5;
  // isLegacyMarkerIdInRangeMinus110to61(-70) === true (between -110 and -61)
  state.gridG[ai][ah] = 9; // should be cleared to 0
  const newColumn = ah - 1 + state.originColumn; // = 2
  state.gridC[row][newColumn] = 77;
  const calls = [];
  const result = stepLegacyPositiveEntityBranch(id, 0, row, column, ai, ah, 0, state, {
    onMapMarkerArg1: (v) => calls.push(v),
  });
  assert.equal(result.ahDecrement, 1);
  assert.equal(state.gridG[ai][ah], 0);
  assert.deepEqual(calls, [77]);
}

// Left-neighbor check: table value doesn't match -> no decrement, no extra marker.
{
  const state = freshState();
  const id = 40;
  const row = 5, column = 4, ai = 2, ah = 3;
  state.gridC[row][column - 1] = -70;
  state.dense[9833 - -70 - 61] = 3; // != 5
  const calls = [];
  const result = stepLegacyPositiveEntityBranch(id, 0, row, column, ai, ah, 0, state, {
    onMapMarkerArg1: (v) => calls.push(v),
  });
  assert.equal(result.ahDecrement, 0);
  assert.deepEqual(calls, []);
}

// ah-1 < 0 (no room to the left) -> left-neighbor check skipped entirely.
{
  const state = freshState();
  const id = 40;
  const result = stepLegacyPositiveEntityBranch(id, 0, 5, 0, 2, 0, 0, state, {});
  assert.equal(result.ahDecrement, 0);
}

// id in [51,100] (classifies to 1) with e[7979+id] bit 2 set -> returns before onEntityAction.
{
  const state = freshState();
  const id = 60;
  state.dense[7979 + id] = 2; // bit 2 set
  const calls = [];
  stepLegacyPositiveEntityBranch(id, 0, 0, 0, -1, 0, 0, state, { onEntityAction: () => calls.push("action") });
  assert.deepEqual(calls, []);
}

// id in [51,100] with bit 2 clear -> onEntityAction still fires.
{
  const state = freshState();
  const id = 60;
  state.dense[7979 + id] = 1; // bit 2 clear
  const calls = [];
  stepLegacyPositiveEntityBranch(id, 0, 0, 0, -1, 0, 0, state, { onEntityAction: () => calls.push("action") });
  assert.deepEqual(calls, ["action"]);
}

// Final onEntityAction argument formula, using rowPixelBase (bytecode
// local2, confirmed `ai*16` -- see LegacyGameplayCellLoop.ts's header),
// not a hardcoded -16.
{
  const state = freshState();
  const id = 10; // classifies to 0 (1..50), no e[7979] gate
  state.dense[202 + id] = 3;
  state.dense[303 + id] = 4;
  state.dense[606 + id] = 5;
  const calls = [];
  stepLegacyPositiveEntityBranch(id, 100, 0, 0, -1, 0, 48, state, {
    onEntityAction: (...a) => calls.push(a),
  });
  assert.deepEqual(calls, [[id, 100 + 3, 48 + 4, 5, 29]]);
}

console.log("f.u() positive-entity-id branch (offsets 225..522) OK");
