import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";
import { denseRequire } from "./dense-layout-require.mjs";

const path = new URL("../src/render/LegacyCameraFrame.ts", import.meta.url).pathname;
const output = ts.transpileModule(fs.readFileSync(path, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(output, { require: denseRequire, module, exports: module.exports, Int8Array, Int16Array });
const { stepLegacyCameraLetterbox, classifyLegacyCameraCell, stepLegacyCameraCursor } = module.exports;

function mockGraphics() {
  const calls = [];
  return {
    calls,
    setColor: (rgb) => calls.push(["setColor", rgb]),
    drawRect: (x, y, w, h) => calls.push(["drawRect", x, y, w, h]),
  };
}

// letterboxFlag=false: no-op, returns undefined (bytecode offset 0..4 early exit).
{
  const graphics = mockGraphics();
  const result = stepLegacyCameraLetterbox({
    letterboxFlag: false,
    boxAnchorColumn: 100, boxAnchorRow: 80,
    viewportOriginI: 10, viewportOriginK: 5,
    scrollY: 20, scrollA: 15,
  }, graphics);
  assert.equal(result, undefined);
  assert.deepEqual(graphics.calls, []);
}

// letterboxFlag=true: exact bytecode-derived rectangle geometry, offsets 7..296.
{
  const graphics = mockGraphics();
  const result = stepLegacyCameraLetterbox({
    letterboxFlag: true,
    boxAnchorColumn: 100, boxAnchorRow: 80,
    viewportOriginI: 10, viewportOriginK: 5,
    scrollY: 20, scrollA: 15,
  }, graphics);
  // result is an object literal constructed inside the vm sandbox realm, so
  // compare via spread into the outer realm rather than assert.deepEqual
  // directly (which also checks prototype identity across realms).
  // The left/top edge is the smaller of anchor and cursor (G - I = 90 vs y = 20 -> 20; H - K = 75
  // vs A = 15 -> 15), so b = 20 + 10 - 1, c = 15 + 5 - 1.
  assert.deepEqual({ ...result }, { b: 29, c: 19, d: 71, e: 61 });
  assert.deepEqual(graphics.calls, [
    ["setColor", 0],
    ["drawRect", 452, 249, 1562, 976],
    ["setColor", 0x10dd64],
    ["drawRect", 451, 248, 1562, 976],
  ]);
}

// Anchor left of / above the cursor: the anchor is the edge (G - I = 2 < y = 6).
{
  const graphics = mockGraphics();
  const result = stepLegacyCameraLetterbox({
    letterboxFlag: true,
    boxAnchorColumn: 3, boxAnchorRow: 4,
    viewportOriginI: 1, viewportOriginK: 1,
    scrollY: 6, scrollA: 7,
  }, graphics);
  assert.deepEqual({ ...result }, { b: 2, c: 3, d: 5, e: 5 });
}

// private static byte b(int) classifier, bytecode offsets 28941..28960.
assert.equal(classifyLegacyCameraCell(-1), 0);
assert.equal(classifyLegacyCameraCell(-30), 0);
assert.equal(classifyLegacyCameraCell(-15), 0);
assert.equal(classifyLegacyCameraCell(-31), 1);
assert.equal(classifyLegacyCameraCell(-60), 1);
assert.equal(classifyLegacyCameraCell(-45), 1);
assert.equal(classifyLegacyCameraCell(0), 2);
assert.equal(classifyLegacyCameraCell(-61), 2);
assert.equal(classifyLegacyCameraCell(5), 2);

// Cursor: cell classifies as 0 -> draws the 4-corner bracket at the
// bytecode-derived positions (offsets 297..496).
{
  const gridC = [new Int8Array(20), new Int8Array(20), new Int8Array(20), new Int8Array(20)];
  gridC[3][5] = -5; // row = K+A = 3, column = I+y = 5
  const dense = new Int8Array(10000);
  dense[8383 - -5] = 50; // 8388
  dense[8444 - -5] = 30; // 8449
  dense[8749 - -5] = 2; // 8754 -> index into the width/height table
  const packedOffsets = new Int16Array(200);
  packedOffsets[138] = 1000;
  const packedBytes = new Int8Array(2000);
  packedBytes[1000 + 104 + 2] = 3; // width factor
  packedBytes[1000 + 130 + 2] = 4; // height factor

  const corners = [];
  stepLegacyCameraCursor(
    { gridC, viewportOriginK: 3, scrollA: 0, viewportOriginI: 5, scrollY: 0, dense, packedBytes, packedOffsets },
    77,
    { onCorner: (...args) => corners.push(args) },
  );
  assert.deepEqual(corners, [
    [6, 990, 432, 77],
    [7, 1056, 432, 77],
    [8, 990, 496, 77],
    [9, 1056, 496, 77],
  ]);
}

// Cursor: cell classifies as non-zero -> no corners drawn.
{
  const gridC = [new Int8Array(20)];
  gridC[0][0] = 0; // classify(0) === 2
  const corners = [];
  stepLegacyCameraCursor(
    {
      gridC, viewportOriginK: 0, scrollA: 0, viewportOriginI: 0, scrollY: 0,
      dense: new Int8Array(10000), packedBytes: new Int8Array(10), packedOffsets: new Int16Array(200),
    },
    0,
    { onCorner: (...args) => corners.push(args) },
  );
  assert.deepEqual(corners, []);
}

console.log("f.w() letterbox + camera-cursor corner bracket OK");
