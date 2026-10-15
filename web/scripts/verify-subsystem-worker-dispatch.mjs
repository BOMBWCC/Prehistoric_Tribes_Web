// Regression test for LegacySubsystemWorkerDispatch.ts (private int a(int), #281),
// hand-derived from bytecode/b-javap.txt line 45448.
import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import vm from "node:vm";

const file = new URL("../src/j2me/LegacySubsystemWorkerDispatch.ts", import.meta.url).pathname;
const module = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { module, exports: module.exports, Int8Array, Int16Array });
const { stepLegacySubsystemWorkerDispatch } = module.exports;

function setup() {
  const state = new Int8Array(10000); const packedBytes = new Int8Array(1000); const packedOffsets = new Int16Array(300);
  packedOffsets[86] = 100; packedOffsets[87] = 200;
  const gridC = Array.from({ length: 20 }, () => new Int8Array(20));
  const aRows = [Array.from({ length: 10 }, () => new Int8Array(12)), Array.from({ length: 10 }, () => new Int8Array(12))];
  const bRows = [Array.from({ length: 5 }, () => new Int8Array(30)), Array.from({ length: 5 }, () => new Int8Array(30))];
  const log = [];
  const input = { state, packedBytes, packedOffsets, gridC, team: 0, fields: { v: 0 }, aRows, bRows,
    onChangeType: (id, type) => log.push(["a", id, type]), onN: (id) => log.push(["N", id]) };
  return { state, packedBytes, gridC, aRows, bRows, log, input };
}

// First loop: A[0][0][11] = record 5, owner 7 of type 58; first positive A[0][0][aO] at aO 2.
{
  const { state, packedBytes, gridC, aRows, log, input } = setup();
  aRows[0][0][11] = 5; aRows[0][0][2] = 3; state[8810 + 5] = 7; state[2828 + 7] = 58;
  packedBytes[100 + 2] = 44;
  state[7] = 4; state[101 + 7] = 6; gridC[6][4] = 7;
  assert.equal(stepLegacySubsystemWorkerDispatch(input, 9), 9);
  assert.deepEqual(log, [["a", 7, 44], ["N", 7]]);
  // Offset 70: b.v:I holds the dispatched unit (C() reads it) -- oracle run 10, frame 24335.
  assert.equal(input.fields.v, 7);
  assert.equal(aRows[0][0][10], 2);
}
// Owner not on its own cell -> 6161 = 3 instead of N(); 1313 < 0 skips.
{
  const { state, packedBytes, aRows, log, input } = setup();
  aRows[0][0][11] = 5; aRows[0][0][0] = 1; state[8810 + 5] = 7; state[2828 + 7] = 58;
  packedBytes[100] = 44;
  stepLegacySubsystemWorkerDispatch(input, 1);
  assert.deepEqual(log, [["a", 7, 44]]); assert.equal(state[6161 + 7], 3);
  log.length = 0; state[1313 + 7] = -1;
  stepLegacySubsystemWorkerDispatch(input, 1);
  assert.deepEqual(log, []);
}
// Second loop: record 3 (built, type 8, owner 9 of type 57, 8932 == 1) queued at B[0][0][1].
{
  const { state, packedBytes, bRows, log, input } = setup();
  state[8505 + 3] = 1; state[8749 + 3] = 8; state[8810 + 3] = 9; state[8932 + 3] = 1;
  state[2828 + 9] = 57; state[7979 + 9] = -1;
  bRows[0][0][0] = 4; bRows[0][0][1] = 3; bRows[0][1][1] = 6; bRows[0][2][1] = 5;
  packedBytes[200 + 6] = 55;
  stepLegacySubsystemWorkerDispatch(input, 0);
  assert.deepEqual(log, [["a", 9, 55]]);
  assert.deepEqual([state[4040 + 9], state[7979 + 9], state[6161 + 9], state[9237 + 3]], [3, -17, 3, 1]);
}
// B[0][2][aO] < 0: the slot is dropped (rows shift left from aO, [0][29] = 0) and
// the same record retried; the shifted-in slot is 0, so nothing is dispatched.
{
  const { state, bRows, log, input } = setup();
  state[8505 + 3] = 1; state[8749 + 3] = 8; state[8810 + 3] = 9; state[8932 + 3] = 1; state[2828 + 9] = 57;
  bRows[0][0][0] = 4; bRows[0][0][1] = 3; bRows[0][2][1] = -1; bRows[0][4][2] = 12; bRows[0][0][29] = 8;
  stepLegacySubsystemWorkerDispatch(input, 0);
  assert.deepEqual(log, []);
  assert.deepEqual([bRows[0][0][1], bRows[0][4][1], bRows[0][0][28], bRows[0][0][29]], [0, 12, 8, 0]);
}
// Owner off its cell with 8932 != 1: skipped entirely.
{
  const { state, bRows, log, input } = setup();
  state[8505 + 3] = 1; state[8749 + 3] = 8; state[8810 + 3] = 9; state[8932 + 3] = 2; state[2828 + 9] = 57;
  bRows[0][0][0] = 3; bRows[0][2][0] = 1;
  stepLegacySubsystemWorkerDispatch(input, 0);
  assert.deepEqual(log, []);
}
console.log("private int a(int) (worker dispatch) OK");
