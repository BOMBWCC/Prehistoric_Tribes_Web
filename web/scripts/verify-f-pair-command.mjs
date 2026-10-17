import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import vm from "node:vm";
import { denseRequire } from "./dense-layout-require.mjs";

const file = new URL("../src/ui/LegacyFPairCommand.ts", import.meta.url).pathname;
const module = { exports: {} };
const output = ts.transpileModule(fs.readFileSync(file, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
vm.runInNewContext(output, { require: denseRequire, module, exports: module.exports, Int8Array, Int16Array });
const { stepLegacyFPairCommand } = module.exports;

const dense = new Int8Array(10000);
const map = Array.from({ length: 96 }, () => new Int8Array(96));
const packedBytes = new Int8Array(17638);
const packedOffsets = new Int16Array(312);
const subsystem = { v: 9 };
dense[1919 + 1] = 1;
dense[101 + 1] = 4;
dense[1] = 5;
map[4][6] = 7;
packedOffsets[1] = 100;
packedBytes[0] = 3;
dense[1111 + 1] = 0;
dense[3131] = 6;
dense[3232] = 4;
const probes = [];
const continuations = [];
stepLegacyFPairCommand({
  dense, map, subsystem, packedBytes, packedOffsets,
  onFootprintProbe: (...args) => { probes.push(args); return true; },
  onRecordAction: (...args) => continuations.push(args),
}, 6, 4);
assert.equal(map[4][5], 0);
assert.deepEqual(probes, [[1, 127, 6, 4]]);
assert.equal(subsystem.v, 0);
assert.deepEqual(continuations, [[6, 4, 0]]);
assert.equal(dense[1], 6); assert.equal(dense[101 + 1], 4);
assert.equal(dense[2828 + 1], 69); assert.equal(dense[2929 + 1], 8);
assert.equal(map[4][6], 1);

// Offset 82 `ifeq 124`: an empty target cell skips only the probe. Mission 4's regroup at (52, 7):
// the first record lands on the cell itself, the next one probes because the cell is now taken.
{
  const dense = new Int8Array(10000);
  const map = Array.from({ length: 64 }, () => new Int8Array(64));
  const probes = [];
  for (const [id, x, y] of [[1, 56, 25], [2, 42, 54]]) { dense[1919 + id] = 99; dense[id] = x; dense[101 + id] = y; map[y][x] = id; }
  dense[3131] = 53; dense[3232] = 7;
  stepLegacyFPairCommand({
    dense, map, subsystem: { v: 4 }, packedBytes: new Int8Array(17638), packedOffsets: new Int16Array(312),
    onFootprintProbe: (...args) => { probes.push(args); return true; },
  }, 52, 7);
  assert.deepEqual(probes, [[1, 127, 52, 7]]);
  assert.deepEqual([dense[1], dense[101 + 1], dense[2], dense[101 + 2]], [52, 7, 53, 7]);
  assert.equal(map[7][52], 1); assert.equal(map[7][53], 2); assert.equal(map[25][56], 0); assert.equal(map[54][42], 0);
}

// Offsets 143..362: the -128 cell is c[y + t1[8 + facing]][x + t1[facing]], tested against
// t15[(606 & 1) * 9 + 1010 - 7777] (no `1111 & 15` in the index).
{
  const dense = new Int8Array(10000);
  const map = Array.from({ length: 64 }, () => new Int8Array(64));
  const packedBytes = new Int8Array(17638), packedOffsets = new Int16Array(312);
  packedOffsets[1] = 200; packedOffsets[15] = 300;
  dense[1919 + 1] = 99; dense[1] = 10; dense[101 + 1] = 20; dense[606 + 1] = 2; dense[1010 + 1] = 3; dense[1111 + 1] = 1;
  packedBytes[300 + 3] = 4; // threshold (4 + 1) / 2 = 2 > 1
  packedBytes[200 + 2] = 1; packedBytes[200 + 8 + 2] = -1; // dx = 1, dy = -1
  map[19][11] = -128; map[20][9] = -128;
  stepLegacyFPairCommand({ dense, map, subsystem: { v: 0 }, packedBytes, packedOffsets }, 30, 30);
  assert.equal(map[19][11], 0); assert.equal(map[20][9], -128);
}
console.log("f.b(int,int) raw port OK");
