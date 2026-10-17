import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import vm from "node:vm";
import { denseRequire } from "./dense-layout-require.mjs";

const file = new URL("../src/sim/world/LegacyNearestCandidateSearch.ts", import.meta.url).pathname;
const output = ts.transpileModule(fs.readFileSync(file, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(output, { require: denseRequire, module, exports: module.exports });
const { findLegacyNearestCandidate } = module.exports;

const grid = () => Array.from({ length: 30 }, () => new Int8Array(30));

// Three candidates (arg1*3+0/1/2). Candidate 0 is closest but occupied and
// rejected by checkCompatibility; candidate 1 is occupied but ACCEPTED by
// checkCompatibility (still eligible); candidate 2 is empty and farthest.
// Expect candidate 1 to win (closer than 2, and not skipped like 0).
{
  const state = new Int8Array(20000);
  const id = 5;
  const arg1 = 2, arg2 = 9;
  state[id] = 10; state[101 + id] = 10; // my position
  state[8383 + arg2] = 0; state[8444 + arg2] = 0; // origin

  const packedBytes = new Int8Array(2000);
  const packedOffsets = new Int16Array(200);
  packedOffsets[20] = 0; packedOffsets[21] = 100; packedOffsets[22] = 200; packedOffsets[23] = 300;
  packedBytes[packedOffsets[20] + arg1] = 3; // 3 candidates

  // candidate offsets (relative to origin 0,0), all distinct cells:
  const base = arg1 * 3;
  packedBytes[packedOffsets[22] + base + 0] = 9; packedBytes[packedOffsets[23] + base + 0] = 9; // (9,9) close
  packedBytes[packedOffsets[22] + base + 1] = 11; packedBytes[packedOffsets[23] + base + 1] = 11; // (11,11) mid
  packedBytes[packedOffsets[22] + base + 2] = 20; packedBytes[packedOffsets[23] + base + 2] = 20; // (20,20) far
  packedBytes[packedOffsets[21] + base + 0] = 7;
  packedBytes[packedOffsets[21] + base + 1] = 8;
  packedBytes[packedOffsets[21] + base + 2] = 9;

  const gridC = grid();
  gridC[9][9] = 1; // occupied
  gridC[11][11] = 1; // occupied
  // (20,20) left empty (0)

  const checkCompatibility = (x, y) => {
    if (x === 9 && y === 9) return true; // reject candidate 0
    if (x === 11 && y === 11) return false; // accept candidate 1 despite occupancy
    return false;
  };

  const input = { state, id, gridC, mapWidth: 30, mapHeight: 30, packedBytes, packedOffsets, checkCompatibility };
  findLegacyNearestCandidate(input, arg1, arg2);
  assert.equal(state[3131 + id], 11);
  assert.equal(state[3232 + id], 11);
  assert.equal(state[4040 + id], 8);
}

// Out-of-bounds candidates are skipped entirely (never reach the compatibility check).
{
  const state = new Int8Array(20000);
  const id = 3;
  const arg1 = 0, arg2 = 0;
  state[id] = 5; state[101 + id] = 5;

  const packedBytes = new Int8Array(2000);
  const packedOffsets = new Int16Array(200);
  packedOffsets[20] = 0; packedOffsets[21] = 100; packedOffsets[22] = 200; packedOffsets[23] = 300;
  packedBytes[packedOffsets[20]] = 2;
  packedBytes[packedOffsets[22] + 0] = -50; packedBytes[packedOffsets[23] + 0] = 0; // x<0 -> out of bounds
  packedBytes[packedOffsets[22] + 1] = 6; packedBytes[packedOffsets[23] + 1] = 6; // valid
  packedBytes[packedOffsets[21] + 1] = 42;

  let compatibilityCalls = 0;
  const input = {
    state, id, gridC: grid(), mapWidth: 10, mapHeight: 10, packedBytes, packedOffsets,
    checkCompatibility: () => { compatibilityCalls += 1; return false; },
  };
  findLegacyNearestCandidate(input, arg1, arg2);
  assert.equal(state[3131 + id], 6);
  assert.equal(state[3232 + id], 6);
  assert.equal(state[4040 + id], 42);
  assert.equal(compatibilityCalls, 0); // both cells empty (gridC default 0) -> never called
}

console.log("findLegacyNearestCandidate (b(int,int):void, #333) OK");
