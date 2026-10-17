import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";

const path = new URL("../src/sim/units/LegacyEntityFootprintMark.ts", import.meta.url).pathname;
const output = ts.transpileModule(fs.readFileSync(path, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(output, { module, exports: module.exports, Int32Array });
const { markLegacyEntityFootprintRow, markLegacyEntityFootprint } = module.exports;

function freshLayers(rows = 10) {
  // 2 layers x 3 words x `rows` rows, matching f.a[2][3][96].
  return [0, 1].map(() => [0, 1, 2].map(() => new Int32Array(rows)));
}

const widthMasks = new Int32Array(40);
widthMasks[3] = 0b111;
widthMasks[5] = 0b11111;

// Single-word case, no boundary straddling: x=5, width=3 -> only word 0 touched.
{
  const layers = freshLayers();
  markLegacyEntityFootprintRow({ layer: 0, widthMasks, layers, mapHeight: 32 }, 5, 0, 3);
  assert.equal(layers[0][0][0], 0b111 << 5);
  assert.equal(layers[0][1][0], 0);
  assert.equal(layers[0][2][0], 0);
}

// Boundary-straddling case: x=30, width=5 spans word 0 (cols 30-31) and word 1 (cols 32-34).
{
  const layers = freshLayers();
  markLegacyEntityFootprintRow({ layer: 1, widthMasks, layers, mapHeight: 32 }, 30, 2, 5);
  assert.equal(layers[1][0][2], (0b11111 << 30) | 0); // low 2 bits of the mask land at bits 30-31
  assert.equal(layers[1][1][2], 0b11111 >> 2); // top 3 bits land at the bottom of word 1
  assert.equal(layers[1][2][2], 0);
}

// OR-merge: pre-existing bits in the plane are preserved, not overwritten.
{
  const layers = freshLayers();
  layers[0][0][0] = 0b1; // some other entity's bit already set
  markLegacyEntityFootprintRow({ layer: 0, widthMasks, layers, mapHeight: 32 }, 5, 0, 3);
  assert.equal(layers[0][0][0], (0b111 << 5) | 0b1);
}

// b.a(x,y,width,height): loops height rows starting at y, calling d() per row.
{
  const layers = freshLayers();
  markLegacyEntityFootprint({ layer: 0, widthMasks, layers, mapHeight: 32 }, 5, 3, 3, 4);
  for (const row of [3, 4, 5, 6]) {
    assert.equal(layers[0][0][row], 0b111 << 5, `row ${row} should be marked`);
  }
  assert.equal(layers[0][0][2], 0, "row before the range must be untouched");
  assert.equal(layers[0][0][7], 0, "row after the range must be untouched");
}

// row < 0 rows are skipped (continue), not fatal -- later in-bounds rows still get marked.
{
  const layers = freshLayers();
  markLegacyEntityFootprint({ layer: 0, widthMasks, layers, mapHeight: 32 }, 5, -2, 3, 4);
  // dy=0,1 -> row=-2,-1 skipped; dy=2,3 -> row=0,1 marked
  assert.equal(layers[0][0][0], 0b111 << 5);
  assert.equal(layers[0][0][1], 0b111 << 5);
}

// row >= mapHeight stops the WHOLE loop immediately (bytecode `return`, not `continue`).
{
  const layers = freshLayers(10);
  markLegacyEntityFootprint({ layer: 0, widthMasks, layers, mapHeight: 8 }, 5, 6, 3, 5);
  // dy=0 -> row=6 (marked), dy=1 -> row=7 (marked), dy=2 -> row=8 (>=mapHeight, RETURN)
  assert.equal(layers[0][0][6], 0b111 << 5);
  assert.equal(layers[0][0][7], 0b111 << 5);
  // dy=3/4 would be rows 9/10, which would have been in-bounds for the array
  // but must never be reached because the loop already returned at dy=2.
  assert.equal(layers[0][0][9] ?? 0, 0);
}

console.log("b.a(IIII)/b.d(III) entity footprint occupancy marking OK");
