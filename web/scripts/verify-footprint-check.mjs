import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";

const path = `${new URL("../src/j2me/LegacyFootprintCheck.ts", import.meta.url).pathname}`;
const output = ts.transpileModule(fs.readFileSync(path, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(output, { module, exports: module.exports, Int8Array, Int16Array });
const { canPlaceLegacyFootprint } = module.exports;

const packedBytes = new Int8Array(17638);
const packedOffsets = new Int16Array(312);
packedOffsets[138] = 100;
packedBytes[100 + 104 + 3] = 2;
packedBytes[100 + 130 + 3] = 2;
const map = Array.from({ length: 5 }, () => new Int8Array(5));
const queried = [];
const input = {
  map, packedBytes, packedOffsets, mapWidth: 5, mapHeight: 5,
  occupancyClass: (x, y) => { queried.push([x, y]); return 1; },
};

// f.a(int,int,int,boolean) offsets 96..117: with the flag set, a cell passes
// only when `a(x, y)` (#447, the occupancy class) is 0 -- `ifeq 119`. This
// file used to assert the opposite at both of the lines below, matching the
// port's own inverted condition rather than the bytecode (fixed 2026-09-09).
assert.equal(canPlaceLegacyFootprint(input, 1, 1, 3, true), false, "class 1 with the flag set rejects");
assert.deepEqual(queried, [[1, 1], [2, 1], [1, 2], [2, 2]], "row-major, yy outer / xx inner");
map[2][2] = 9;
assert.equal(canPlaceLegacyFootprint(input, 1, 1, 3, false), false, "a non-zero map cell rejects regardless of the flag");
map[2][2] = 0;
assert.equal(canPlaceLegacyFootprint({ ...input, occupancyClass: () => 0 }, 1, 1, 3, false), true);
assert.equal(canPlaceLegacyFootprint({ ...input, occupancyClass: () => 0 }, 1, 1, 3, true), true, "class 0 with the flag set accepts");

// Offsets 64..76: `b(x, y)` (#533, the bounds test) is `ifeq 116` -- an
// out-of-bounds cell REJECTS the placement. This line used to assert the
// opposite ("skips cells outside f.c/f.d rather than rejecting them"), which
// let buildings straddle the map edge.
assert.equal(canPlaceLegacyFootprint({ ...input, occupancyClass: () => 0 }, 5, 5, 3, true), false);
assert.equal(canPlaceLegacyFootprint({ ...input, occupancyClass: () => 0 }, 4, 4, 3, true), false, "partially out of bounds also rejects");
console.log("f.a(int,int,int,boolean) raw footprint check OK");
