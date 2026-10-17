import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import vm from "node:vm";

const file = new URL("../src/text/LegacyCScanDraw.ts", import.meta.url).pathname;
const module = { exports: {} };
const output = ts.transpileModule(fs.readFileSync(file, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
vm.runInNewContext(output, { module, exports: module.exports, Int8Array, Int16Array, RangeError });
const { drawLegacyCScan } = module.exports;

function makeState(overrides = {}) {
  return {
    b: 0,
    c: 0,
    k: 0,
    l: 0,
    m: 0,
    n: 0,
    o: 0,
    rowFShort: new Int16Array(33),
    rowDShort: new Int16Array(33),
    rowEShort: new Int16Array(33),
    rowDByte: new Int8Array(33),
    rowEByte: new Int8Array(33),
    geometryB: Array.from({ length: 33 }, () => new Int8Array(25)),
    geometryC: Array.from({ length: 33 }, () => new Int8Array(25)),
    ...overrides,
  };
}

// --- Test 1: single matching slot (k=13 only), one item, real RNG callback. ---
{
  const state = makeState({ b: 1, c: 0 });
  state.rowFShort[13] = 7;
  state.rowDShort[13] = 6;
  state.rowEShort[13] = 2;
  state.rowDByte[13] = 1;
  state.rowEByte[13] = 3;
  state.geometryC[13][0] = 2;
  state.geometryB[13][0] = 4;

  const packedOffsets = new Int16Array(320);
  packedOffsets[282] = 100;
  packedOffsets[283] = 200;
  packedOffsets[284] = 300;
  const packedBytes = new Int8Array(500);
  // glyphOffset = 100 + 2*21 + 4 = 146
  packedBytes[146] = 10; // value2 (masked) -> sourceX
  packedBytes[147] = 30; // value1 (masked)
  packedBytes[305] = -5; // packedOffsets[284]+3+geometryC(2) = 305, RAW (unmasked) sourceY base
  packedBytes[203] = -2; // packedOffsets[283]+3 = 203, RAW (unmasked) height-scale multiplier
  packedBytes[205] = -7; // packedOffsets[283]+3+geometryC(2) = 205, RAW (unmasked) height

  const randomCalls = [];
  const drawCalls = [];
  drawLegacyCScan(state, packedBytes, packedOffsets, 7, 50, 80, {
    onRandomRemainder: (mask, divisor) => {
      randomCalls.push([mask, divisor]);
      return 42;
    },
    onDrawIcon: (sourceX, sourceY, width, height, x, y, anchor) => {
      drawCalls.push({ sourceX, sourceY, width, height, x, y, anchor });
    },
  });

  assert.deepEqual(randomCalls, [[255, 5]], "f.a(II)I (#81) called once as f.a(255,5)");
  assert.equal(drawCalls.length, 1);
  assert.deepEqual(drawCalls[0], {
    sourceX: 10, // packedBytes[146] & 0xff, masked
    sourceY: -11, // -5 + 3*(-2), both operands RAW/unmasked
    width: 20, // (30&0xff) - (10&0xff)
    height: -7, // RAW/unmasked
    x: 98, // 11 + m, m = 50 - trunc(6/2) + 42 - 2 = 87
    y: 79, // 8 + n, n = 80 - 5 - 2*2 = 71
    anchor: 20,
  });
  assert.equal(state.o, 20);
  assert.equal(state.m, 108, "m += o + 1 after the single item");
  assert.equal(state.l, 1);
  assert.equal(state.k, 14, "loop stops once k === 13+b");
}

// --- Test 2: no match at the only slot -> onDrawIcon/onRandomRemainder never fire. ---
{
  const state = makeState({ b: 1, c: 0 });
  state.rowFShort[13] = 99; // does not match arg1 below
  state.m = -1;
  state.n = -1;

  const packedOffsets = new Int16Array(320);
  const packedBytes = new Int8Array(500);
  const randomCalls = [];
  const drawCalls = [];
  drawLegacyCScan(state, packedBytes, packedOffsets, 7, 50, 80, {
    onRandomRemainder: (...args) => { randomCalls.push(args); return 0; },
    onDrawIcon: (...args) => drawCalls.push(args),
  });

  assert.equal(randomCalls.length, 0, "rand helper only called inside the matching branch");
  assert.equal(drawCalls.length, 0);
  assert.equal(state.m, -1, "m/n untouched when the slot does not match");
  assert.equal(state.n, -1);
  assert.equal(state.k, 14);
}

// --- Test 3: ring wraparound (k starts at 32, wraps via 12 -> 13) plus a
// two-item matching row exercising m's running accumulation and n staying
// fixed across items within one slot. ---
{
  const state = makeState({ b: 1, c: 19 }); // k starts at 13+19=32, terminates at 13+1=14
  state.rowFShort[32] = 0; // no match at k=32
  state.rowFShort[13] = 9; // matches at k=13, after the wrap
  state.rowDShort[13] = 4;
  state.rowEShort[13] = 1;
  state.rowDByte[13] = 2;
  state.rowEByte[13] = 2;
  state.geometryC[13][0] = 0; state.geometryB[13][0] = 0;
  state.geometryC[13][1] = 1; state.geometryB[13][1] = 2;

  const packedOffsets = new Int16Array(320);
  packedOffsets[282] = 0;
  packedOffsets[283] = 50;
  packedOffsets[284] = 100;
  const packedBytes = new Int8Array(200);
  // item 0: glyphOffset = 0 + 0*21 + 0 = 0
  packedBytes[0] = 5; packedBytes[1] = 15; // width0 = 15-5 = 10, sourceX0 = 5
  packedBytes[103] = 8; // packedOffsets[284]+3+geometryC(0)
  packedBytes[53] = 4;  // packedOffsets[283]+3 (height-scale multiplier, rowEByte=2) AND also
                         // packedOffsets[283]+3+geometryC(0) for item0's height (same index, coincidental)
  // item 1: glyphOffset = 0 + 1*21 + 2 = 23
  packedBytes[23] = 1; packedBytes[24] = 11; // width1 = 11-1 = 10, sourceX1 = 1
  packedBytes[104] = 20; // packedOffsets[284]+3+geometryC(1)
  packedBytes[54] = 6;   // packedOffsets[283]+3+geometryC(1), item1's height

  const randomCalls = [];
  const drawCalls = [];
  drawLegacyCScan(state, packedBytes, packedOffsets, 9, 30, 40, {
    onRandomRemainder: (mask, divisor) => { randomCalls.push([mask, divisor]); return 3; },
    onDrawIcon: (sourceX, sourceY, width, height, x, y, anchor) => {
      drawCalls.push({ sourceX, sourceY, width, height, x, y, anchor });
    },
  });

  assert.deepEqual(randomCalls, [[255, 5]], "rand helper fires exactly once, only for the matching slot k=13");
  assert.equal(drawCalls.length, 2);
  // m0 = 30 - trunc(4/2) + 3 - 2 = 29; n = 40 - 5 - 1*2 = 33 (fixed across both items)
  assert.deepEqual(drawCalls[0], { sourceX: 5, sourceY: 16, width: 10, height: 4, x: 40, y: 41, anchor: 20 });
  // m1 = 29 + 10 + 1 = 40
  assert.deepEqual(drawCalls[1], { sourceX: 1, sourceY: 28, width: 10, height: 6, x: 51, y: 41, anchor: 20 });
  assert.equal(state.m, 51, "m advances by o+1 after each item, across two items");
  assert.equal(state.l, 2);
  assert.equal(state.k, 14, "k wraps 32 -> 12 -> 13 -> 14, stopping at 13+b");
}

// --- Test 4: masking asymmetry -- sourceX is masked (&0xff), sourceY's base
// term and height are read raw/signed (no mask); onRandomRemainder omitted
// defaults to 0. ---
{
  const state = makeState({ b: 1, c: 0 });
  state.rowFShort[13] = 1;
  state.rowDByte[13] = 1;
  state.geometryC[13][0] = 0;
  state.geometryB[13][0] = 0;

  const packedOffsets = new Int16Array(320);
  packedOffsets[282] = 0;
  packedOffsets[283] = 10;
  packedOffsets[284] = 20;
  const packedBytes = new Int8Array(200);
  packedBytes[0] = -1; // sourceX source byte -> masked to 255
  packedBytes[1] = -1; // width upper operand, also masked; width = 255-255 = 0
  packedBytes[23] = -1; // packedOffsets[284]+3+geometryC(0) -> sourceY base, RAW (stays -1)
  packedBytes[13] = -1; // packedOffsets[283]+3+geometryC(0) -> height, RAW (stays -1)

  const drawCalls = [];
  drawLegacyCScan(state, packedBytes, packedOffsets, 1, 0, 5, {
    onDrawIcon: (sourceX, sourceY, width, height, x, y, anchor) => {
      drawCalls.push({ sourceX, sourceY, width, height, x, y, anchor });
    },
  });

  assert.equal(drawCalls.length, 1);
  assert.deepEqual(drawCalls[0], { sourceX: 255, sourceY: -1, width: 0, height: -1, x: 9, y: 8, anchor: 20 });
}

// --- Test 5: packed-table bounds guard (matches LegacyGeometryRenderer.ts's
// own offsetAt/byteAt convention for this same packedBytes/packedOffsets pair). ---
{
  const state = makeState({ b: 1, c: 0 });
  state.rowFShort[13] = 1;
  state.rowDByte[13] = 1;
  const tinyOffsets = new Int16Array(5); // too short to hold index 282
  const packedBytes = new Int8Array(200);
  assert.throws(
    () => drawLegacyCScan(state, packedBytes, tinyOffsets, 1, 0, 0),
    RangeError,
  );
}

console.log("c.a(int,int,int) (LegacyCScanDraw) OK");
