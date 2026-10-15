// Genuine INTEGRATION test (real cross-file import of LegacyGameplayCellLoop.ts),
// same reasoning/technique as verify-gameplay-cell-body-dispatch.mjs -- see
// LegacyGameplayOuterLoop.ts's own docblock.
import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";
import path from "node:path";

const srcDir = new URL("../src/j2me/", import.meta.url).pathname;
const context = vm.createContext({ Int8Array, Int16Array, Int32Array, console });
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

const { stepLegacyGameplayOuterLoop } = loadModule("./LegacyGameplayOuterLoop", srcDir);

function grid(rows, cols) {
  return Array.from({ length: rows }, () => new Int8Array(cols));
}

function freshViewport(overrides = {}) {
  return {
    columns: 2, rows: 1, originColumn: 0, originRow: 0,
    mapWidth: 20, mapHeight: 20, zWriteAiTarget: -100, zWriteAhTarget: -100,
    ...overrides,
  };
}

function freshState(overrides = {}) {
  return {
    sFlag: false, jFlag: false, zByte: 0,
    gridC: grid(20, 20), gridB: grid(20, 20), gridG: grid(20, 20),
    lFlag: false, nFlag: false, rowEndMarker: new Int8Array(2), phase: 7,
    ...overrides,
  };
}

// Basic traversal: viewport{columns:2,rows:1} -> ai in [-1,3] (5 outer
// iterations, since ai<rows+3=4 means ai up to 3), ah in [-1,2] (4 inner
// iterations per row, since ah starts at columns=2 and loops while ah>=-1).
// Confirms the exact (ah,ai) visit order: decreasing ah within each row,
// increasing ai across rows. Uses origin (1,1) rather than (0,0) so that
// even ai=-1/ah=-1 map to valid (row=0,column=0) positions -- with a (0,0)
// origin, stepLegacyGameplayCell's own bounds check (row<0/column<0)
// bails BEFORE calling classifyOccupancy, which would hide those two
// outer-loop-boundary iterations from this spy even though the loop still
// visits them (each one is just a no-op cell).
{
  const viewport = freshViewport({ originColumn: 1, originRow: 1 });
  const visits = [];
  // No gridCValue anywhere -> onUnhandledCellBody never fires; use a
  // classifyOccupancy spy instead to record every (ah,ai) actually visited
  // (it's called once per cell regardless of gridCValue).
  stepLegacyGameplayOuterLoop(viewport, freshState(), {
    classifyOccupancy: (x, y) => { visits.push([x, y]); return 0; },
  });
  // classifyOccupancy receives (column, row) = (ah+originColumn, ai+originRow).
  assert.deepEqual(visits, [
    [3, 0], [2, 0], [1, 0], [0, 0],
    [3, 1], [2, 1], [1, 1], [0, 1],
    [3, 2], [2, 2], [1, 2], [0, 2],
    [3, 3], [2, 3], [1, 3], [0, 3],
    [3, 4], [2, 4], [1, 4], [0, 4],
  ]);
}

// row >= mapHeight skips the ENTIRE inner loop for that ai (not just each
// cell bounds-checking itself out) -- confirmed by classifyOccupancy never
// firing for ai values whose row is out of bounds. Uses origin (1,1) (see
// the basic-traversal test above) so that ai=-1/ah=-1 are still individually
// valid, isolating this test to the outer `row<mapHeight` skip specifically,
// not the per-cell bounds check.
{
  const viewport = freshViewport({ originColumn: 1, originRow: 1, mapHeight: 3 });
  // row=ai+1<3 => ai in {-1,0,1} visited (row 0,1,2); ai in {2,3} (row 3,4) skipped entirely.
  // classifyOccupancy receives (column,row), so pushed values are rows, not ai.
  const state = freshState();
  const visits = [];
  stepLegacyGameplayOuterLoop(viewport, state, {
    classifyOccupancy: (x, y) => { visits.push(y); return 0; },
  });
  assert.deepEqual(visits, [0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2]);
}

// rowPixelBase (bytecode local2, confirmed ai*16) is threaded correctly
// through onUnhandledCellBody across different rows -- not a constant.
{
  const viewport = freshViewport({ mapHeight: 5 });
  const state = freshState();
  state.gridC[0][0] = 5; // ai=0,ah=0 -> row=0,column=0 -> nonzero gridCValue
  state.gridC[1][0] = 5; // ai=1,ah=0
  state.gridB[0][0] = 50; // outside marker range -> reaches onUnhandledCellBody
  state.gridB[1][0] = 50;
  const seen = [];
  stepLegacyGameplayOuterLoop(viewport, state, {
    classifyOccupancy: () => 0,
    onUnhandledCellBody: (col, row, x, occ, gc, gb, rowPixelBase) => {
      seen.push([row, rowPixelBase]);
      return undefined;
    },
  });
  const ai0 = seen.find((s) => s[0] === 0);
  const ai1 = seen.find((s) => s[0] === 1);
  assert.deepEqual(ai0, [0, 0]); // ai=0 -> rowPixelBase=0
  assert.deepEqual(ai1, [1, 16]); // ai=1 -> rowPixelBase=16
}

// ahDecrement causes a "double decrement": the loop's own -1 PLUS the
// reported ahDecrement, matching the original bytecode where the positive
// branch's left-neighbor check mutates the SAME shared ah field the outer
// loop later decrements again. Uses originColumn:1 (see basic-traversal
// test above) so ah=-1 maps to a still-valid column=0, letting the full
// [3,2,1,0,-1]-shaped ah sweep be observed via classifyOccupancy.
{
  const viewport = freshViewport({ columns: 3, originColumn: 1 }); // ah starts at 3, loops 3,2,1,0,-1; column=ah+1
  const state = freshState();
  state.gridC[0][2] = 5; // ah=1 -> column=1+1=2, ai=0 -> nonzero, reaches onUnhandledCellBody
  state.gridB[0][2] = 50;
  const visitedColumns = [];
  stepLegacyGameplayOuterLoop(viewport, state, {
    classifyOccupancy: (x, y) => { if (y === 0) visitedColumns.push(x); return 0; },
    onUnhandledCellBody: (col, row) => {
      if (row === 0 && col === 2) return { ahDecrement: 1 }; // consume an extra column
      return undefined;
    },
  });
  // Normal (no ahDecrement) would visit columns [4,3,2,1,0] for ai=0 (ah=3..-1, column=ah+1).
  // With ahDecrement=1 firing exactly when column=2 (ah=1), the NEXT ah
  // should jump from 1 to 1-1-1=-1 (column=0), skipping ah=0 (column=1) entirely.
  assert.deepEqual(visitedColumns, [4, 3, 2, 0]);
}

// End-of-row draw: fires when (lFlag||nFlag) AND rowEndMarker[1]-originRow===ai.
{
  const viewport = freshViewport({ rows: 1, mapHeight: 3, originRow: 0, originColumn: 0 });
  const state = freshState({ lFlag: true, phase: 9 });
  state.rowEndMarker[0] = 5; // q[0]
  state.rowEndMarker[1] = 2; // q[1] -> fires when ai === q[1]-originRow === 2
  const calls = [];
  stepLegacyGameplayOuterLoop(viewport, state, {
    classifyOccupancy: () => 0,
    onRowEndDraw: (...a) => calls.push(a),
  });
  // Fires exactly once, at ai=2, with x=(q[0]-originColumn)*22=(5-0)*22=110,
  // y=rowPixelBase at ai=2 (=2*16=32), phase=9.
  assert.deepEqual(calls, [[105, 110, 32, 9]]);
}

// End-of-row draw: neither lFlag nor nFlag -> never fires, even if the
// rowEndMarker condition would otherwise match.
{
  const viewport = freshViewport({ rows: 1, mapHeight: 3 });
  const state = freshState({ lFlag: false, nFlag: false });
  state.rowEndMarker[1] = 2;
  const calls = [];
  stepLegacyGameplayOuterLoop(viewport, state, {
    classifyOccupancy: () => 0,
    onRowEndDraw: (...a) => calls.push(a),
  });
  assert.deepEqual(calls, []);
}

// End-of-row draw: nFlag alone (not lFlag) is sufficient.
{
  const viewport = freshViewport({ rows: 1, mapHeight: 3 });
  const state = freshState({ lFlag: false, nFlag: true });
  state.rowEndMarker[1] = 1;
  const calls = [];
  stepLegacyGameplayOuterLoop(viewport, state, {
    classifyOccupancy: () => 0,
    onRowEndDraw: () => calls.push("fired"),
  });
  assert.deepEqual(calls, ["fired"]);
}

console.log("f.u() outer loop driver (offsets 20..2140 + end-of-row draw) OK");
