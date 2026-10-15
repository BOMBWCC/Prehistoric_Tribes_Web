import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import vm from "node:vm";

const file = new URL("../src/j2me/LegacyPathE.ts", import.meta.url).pathname;
const module = { exports: {} };
const output = ts.transpileModule(fs.readFileSync(file, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
vm.runInNewContext(output, { module, exports: module.exports, Int8Array, Math });
const { stepLegacyPathE } = module.exports;

// ---------------------------------------------------------------------------
// Case 1: directionMask 0, c = [2, 1]. Hand-executed straight off
// bytecode/b-javap.txt offsets 0..776, not captured from the port's output --
// this file previously encoded the port's own three bugs as the spec (see
// LegacyPathE.ts's "THREE BUGS FIXED" note), so every number below is derived
// from the instruction stream.
//
//   phase 1 (0..59):    f[0..2] = c[0]+c[1] = 3, e[0..2] = 0
//   phase 2 (59..396):  route 0 walks a = 0,1 (terminator 2-3*e = 2);
//                       route 1 walks a = 1,0 (terminator -1, step -1)
//   phase 3 (396..776): the Bresenham split, deltas at
//                       packedOffsets[0] + directionMask*4 + k
// ---------------------------------------------------------------------------
{
  const deltas = new Int8Array(3);
  const c = Int8Array.from([2, 1]);
  const dScratch = new Int8Array(6);
  const pathData = Array.from({ length: 3 }, () => [new Int8Array(8), new Int8Array(8)]);
  const eCounts = new Int8Array(3);
  const map = Array.from({ length: 16 }, () => new Int8Array(16));
  map[0][0] = 1; map[0][1] = 1; map[0][2] = 1; map[0][3] = 1; map[1][0] = 1;
  const seen = [];
  const state = { a: 0, b: 0, e: 0, f: 0, g: 0, cCursor: 0 };
  stepLegacyPathE({
    mode: 0, directionMask: 0, deltas, c, dScratch, pathData, eCounts, map,
    readPackedDelta: (offset) => ({ 0: 1, 1: 0, 2: 0, 3: 1 }[offset] ?? 0),
    onCellValue: (x, y, mode) => { seen.push([x, y, mode]); return 1; },
    state,
  });

  assert.deepEqual(Array.from(deltas), [3, 3, 3]);

  // Route 0: (1,0) (2,0) then the a=1 leg's (2,1).
  assert.deepEqual(Array.from(pathData[0][0].slice(0, 3)), [1, 2, 2]);
  assert.deepEqual(Array.from(pathData[0][1].slice(0, 3)), [0, 0, 1]);
  // Route 1: the a=1 leg FIRST -- (0,1) -- then the a=0 leg. Before the
  // terminator fix this loop ran zero times and route 1 stayed all zeros.
  assert.deepEqual(Array.from(pathData[1][0].slice(0, 3)), [0, 1, 2]);
  assert.deepEqual(Array.from(pathData[1][1].slice(0, 3)), [1, 1, 1]);
  // Route 2: two primary-axis steps (b stays >= 50 while e < c[0]) then one
  // secondary step.
  assert.deepEqual(Array.from(pathData[2][0].slice(0, 3)), [1, 2, 2]);
  assert.deepEqual(Array.from(pathData[2][1].slice(0, 3)), [0, 0, 1]);

  // Only cells whose map entry is nonzero call #272; (2,1) and (1,1) do not.
  assert.deepEqual(Array.from(eCounts), [2, 1, 2]);
  assert.deepEqual(seen, [[1, 0, 0], [2, 0, 0], [0, 1, 0], [1, 0, 0], [2, 0, 0]]);

  // The scalars the caller (#264) and #380/#265 read afterwards.
  assert.deepEqual(state, { a: 3, b: 100, e: 2, f: 1, g: 100, cCursor: 3 });
}

// ---------------------------------------------------------------------------
// Case 2: directionMask 1 with readPackedDelta = identity, so the table index
// itself is observable. Every read must carry the `directionMask * 4` term
// (offsets 121..204 and 506..649 alike) -- phase 3 used to drop it.
// ---------------------------------------------------------------------------
{
  const deltas = new Int8Array(3);
  const c = Int8Array.from([1, 1]);
  const dScratch = new Int8Array(6);
  const pathData = Array.from({ length: 3 }, () => [new Int8Array(8), new Int8Array(8)]);
  const eCounts = new Int8Array(3);
  const map = Array.from({ length: 16 }, () => new Int8Array(16));
  stepLegacyPathE({
    mode: 2, directionMask: 1, deltas, c, dScratch, pathData, eCounts, map,
    readPackedDelta: (offset) => offset,
    onCellValue: () => { throw new Error("map is all zeros; #272 must never be called"); },
    state: { a: 0, b: 0, e: 0, f: 0, g: 0, cCursor: 0 },
  });

  assert.deepEqual(Array.from(deltas), [2, 2, 2]);
  assert.deepEqual(Array.from(pathData[0][0].slice(0, 2)), [4, 10]);
  assert.deepEqual(Array.from(pathData[0][1].slice(0, 2)), [5, 12]);
  assert.deepEqual(Array.from(pathData[1][0].slice(0, 2)), [6, 10]);
  assert.deepEqual(Array.from(pathData[1][1].slice(0, 2)), [7, 12]);
  // Phase 3: one primary step (indices 4/5), then one secondary step (6/7).
  assert.deepEqual(Array.from(pathData[2][0].slice(0, 2)), [4, 10]);
  assert.deepEqual(Array.from(pathData[2][1].slice(0, 2)), [5, 12]);
}

console.log("b.e(int) path table preparation OK");
