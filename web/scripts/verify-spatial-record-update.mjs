import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import vm from "node:vm";

const file = new URL("../src/j2me/LegacySpatialRecordUpdate.ts", import.meta.url).pathname;
const module = { exports: {} };
const output = ts.transpileModule(fs.readFileSync(file, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
vm.runInNewContext(output, { module, exports: module.exports, Int8Array, Int16Array, Int32Array, RangeError });
const { markLegacySpatialRecord, markLegacySpatialRect } = module.exports;

const packedBytes = new Int8Array(200);
const packedOffsets = new Int16Array(312);
packedOffsets[54] = 10; packedOffsets[55] = 20;
packedBytes[20 + 1] = 1;
packedBytes[10 + 1 + 0] = 2;
packedBytes[10 + 1 + 1] = 2;
const layers = [Array.from({ length: 3 }, () => new Int32Array(96)), Array.from({ length: 3 }, () => new Int32Array(96))];
// b.a(III) offsets 89..109 centre each row: d(x - (aY >> 1), row, aY).
// CORRECTED 2026-09-14: this expected bits 3..4 (uncentred); width 2 at x 3 is 2..3.
markLegacySpatialRecord({ packedBytes, packedOffsets, layers, layerIndex: 0, mapHeight: 96 }, 3, 4, 1);
assert.equal(layers[0][0][3], 0b1100);
assert.equal(layers[0][0][4], 0b1100);
assert.equal(layers[0][1][3], 0);

// b.d(III): a row starting left of segment 0 is right-shifted into it.
{
  const pb = new Int8Array(200); const po = new Int16Array(312); po[54] = 10; po[55] = 20;
  pb[20 + 0] = 0; pb[10 + 0] = 5; // span 0: one row, width 5
  const ls = [Array.from({ length: 3 }, () => new Int32Array(96)), Array.from({ length: 3 }, () => new Int32Array(96))];
  markLegacySpatialRecord({ packedBytes: pb, packedOffsets: po, layers: ls, layerIndex: 0, mapHeight: 96 }, 1, 6, 0);
  assert.equal(ls[0][0][6], 15, "start -1: a[5] >> 1 = 15 (cells 0..3)");
  assert.equal(ls[0][1][6], 0);
  // x past segment 0 writes nothing there; segment 1 gets a[4] << 6.
  pb[10 + 0] = 4;
  markLegacySpatialRecord({ packedBytes: pb, packedOffsets: po, layers: ls, layerIndex: 0, mapHeight: 96 }, 40, 7, 0);
  assert.deepEqual([ls[0][0][7], ls[0][1][7], ls[0][2][7]], [0, 960, 0]);
  // a:[I has 26 entries.
  pb[10 + 0] = 26;
  assert.throws(() => markLegacySpatialRecord({ packedBytes: pb, packedOffsets: po, layers: ls, layerIndex: 0, mapHeight: 96 }, 40, 8, 0), RangeError);
}

// b.a(int,int,int,int) -- the building/rect variant b.d() calls for id 1..30
// type>=12. Shares b.d(int,int,int) with b.a(III), so it marks the same layer:
// `for (aV = 0; aV < height; aV++) { row = y + aV; if (row < 0) continue;
// if (row >= f.d:S) return; d(x, row, width); }`.
const rectLayers = [Array.from({ length: 3 }, () => new Int32Array(96)), Array.from({ length: 3 }, () => new Int32Array(96))];
markLegacySpatialRect({ packedBytes, packedOffsets, layers: rectLayers, layerIndex: 1, mapHeight: 96 }, 3, 4, 2, 3);
assert.equal(rectLayers[1][0][4], 0b11000);
assert.equal(rectLayers[1][0][5], 0b11000);
assert.equal(rectLayers[1][0][6], 0b11000);
assert.equal(rectLayers[1][0][3], 0, "row y-1 is outside the rect");
assert.equal(rectLayers[1][0][7], 0, "row y+height is outside the rect");
assert.equal(rectLayers[0][0][4], 0, "b.d(III) writes only the b.S layer");

// The mapHeight bound is a `return`, not a `continue` (bytecode offset 42).
const boundLayers = [Array.from({ length: 3 }, () => new Int32Array(96)), Array.from({ length: 3 }, () => new Int32Array(96))];
markLegacySpatialRect({ packedBytes, packedOffsets, layers: boundLayers, layerIndex: 1, mapHeight: 6 }, 3, 4, 2, 5);
assert.equal(boundLayers[1][0][4], 0b11000);
assert.equal(boundLayers[1][0][5], 0b11000);
assert.equal(boundLayers[1][0][6], 0, "rows at/after mapHeight are never written");

console.log("b.a(III)/b.a(IIII) spatial record marking OK");
