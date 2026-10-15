import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";

const source = fs.readFileSync(new URL("../src/j2me/LegacyMapRenderer.ts", import.meta.url), "utf8");
const output = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(output, { module, exports: module.exports });
const { renderLegacyMap } = module.exports;

// f.o(): per cell, gridB < 175 -> a(III), else a(gridB, 0); then gridC in
// [-123,-1] -> a(gridC, 0). Row-major; cells past the map edge are skipped.
const gridB = [new Int8Array([1, 175 - 256, 2, 9]), new Int8Array([3, 4, 5, 9])];
const gridC = [new Int8Array([0, -1, 0, 0]), new Int8Array([-124, -123, 7, 0])];
const calls = [];
renderLegacyMap({
  width: 3,
  height: 2,
  gridB,
  gridC,
  onComposite: (...args) => calls.push(["tile", ...args]),
  onMarker: (...args) => calls.push(["marker", ...args]),
}, { column: 0, row: 0 }, { fromColumn: 0, toColumn: 11, fromRow: 0, toRow: 18 });
assert.deepEqual(JSON.parse(JSON.stringify(calls)), [
  ["tile", 1, 0, 0],
  ["marker", 175, 1, 0],
  ["marker", -1, 1, 0],
  ["tile", 2, 44, 0],
  ["tile", 3, 0, 16],
  ["tile", 4, 22, 16],
  ["marker", -123, 1, 1],
  ["tile", 5, 44, 16],
]);

// The window origin offsets the grid read, not the draw position.
const shifted = [];
renderLegacyMap({
  width: 3,
  height: 2,
  gridB,
  gridC,
  onComposite: (...args) => shifted.push(args),
  onMarker: () => {},
}, { column: 2, row: 1 }, { fromColumn: 0, toColumn: 11, fromRow: 0, toRow: 18 });
assert.deepEqual(JSON.parse(JSON.stringify(shifted)), [[5, 0, 0]]);

// f.n()'s windows: aj..al x ak..am inclusive -- e.g. only the newly exposed column 2.
const column = [];
renderLegacyMap({
  width: 3, height: 2, gridB, gridC,
  onComposite: (...args) => column.push(args),
  onMarker: () => {},
}, { column: 0, row: 0 }, { fromColumn: 2, toColumn: 2, fromRow: 0, toRow: 1 });
assert.deepEqual(JSON.parse(JSON.stringify(column)), [[2, 44, 0], [5, 44, 16]]);

// D:Z (offsets 38..79): only cells flagged in a:[[Z], and the flag is cleared.
const dirty = [[false, false, true], [true, false, false]];
const dirtyCalls = [];
renderLegacyMap({
  width: 3, height: 2, gridB, gridC,
  onComposite: (...args) => dirtyCalls.push(args),
  onMarker: () => {},
}, { column: 0, row: 0 }, { fromColumn: 0, toColumn: 2, fromRow: 0, toRow: 1 }, dirty);
assert.deepEqual(JSON.parse(JSON.stringify(dirtyCalls)), [[2, 44, 0], [3, 0, 16]]);
assert.deepEqual(dirty, [[false, false, false], [false, false, false]]);
console.log("f.o() visible-cell map renderer OK");
