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
}, { column: 0, row: 0, columns: 12, rows: 19 });
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
}, { column: 2, row: 1, columns: 12, rows: 19 });
assert.deepEqual(JSON.parse(JSON.stringify(shifted)), [[5, 0, 0]]);
console.log("f.o() visible-cell map renderer OK");
