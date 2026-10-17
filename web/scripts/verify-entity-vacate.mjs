// Regression test for LegacyEntityVacate.ts (private void a(int,int,int,byte), #283).
// Expected values derived by hand from bytecode/b-javap.txt 33634..33922.
import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";
import { denseRequire } from "./dense-layout-require.mjs";

const source = new URL("../src/sim/units/LegacyEntityVacate.ts", import.meta.url).pathname;
const output = ts.transpileModule(fs.readFileSync(source, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(output, { require: denseRequire, module, exports: module.exports, Int8Array, Int16Array, Math });
const { stepLegacyEntityVacate, releaseLegacyEntitySlotReservation } = module.exports;

function make(over = {}) {
  const state = new Int8Array(10000);
  const packedBytes = new Int8Array(2000);
  const packedOffsets = new Int16Array(320);
  packedOffsets[41] = 100;
  packedOffsets[183] = 200;
  packedOffsets[286] = 300;
  packedOffsets[287] = 400;
  packedOffsets[288] = 500;
  packedOffsets[291] = 600;
  const shortRows = [new Int16Array(26), new Int16Array(26)];
  const xSlots = [0, 1].map(() => [0, 1, 2, 3, 4].map(() => new Int8Array(30)));
  const log = [];
  const input = {
    state, packedBytes, packedOffsets, shortRows, xSlots,
    v: 5, fQ: 0, scratch: { subsystemGFFlagByte: 0 },
    onL: (id) => log.push(["l", id]),
    onSpatialAction: (...a) => log.push(["spatial", ...a]),
    onRectMark: (...a) => log.push(["rect", ...a]),
    onByteAction: (...a) => log.push(["queue", ...a]),
    onFinalizeEntity: (id) => log.push(["finalize", id]),
    onEntityRemoval: (id, flag) => log.push(["remove", id, flag]),
    onAuxiliary: (...a) => log.push(["aux", ...a]),
    onSceneDispatch: (v) => log.push(["scene", v]),
    ...over,
  };
  return { state, packedBytes, shortRows, xSlots, log, input };
}

// Kind 19, a team-0 adult: the job's work class picks the queue action, then
// finalize, the 2929/3030/4646 writes and the slot release.
{
  const { state, packedBytes, xSlots, log, input } = make();
  const id = 7;
  state[6464 + id] = 4;
  packedBytes[100 + 4] = 9; // t41[job] = 9 -> action 12
  state[1414 + id] = 30;
  xSlots[0][0][0] = 1; xSlots[0][2][0] = id; xSlots[0][1][0] = 1;
  xSlots[0][0][1] = 1; xSlots[0][2][1] = id; xSlots[0][1][1] = 3; // level 3 is kept
  stepLegacyEntityVacate(input, 19, 4, 6, id);
  assert.deepEqual(log, [["queue", 12, 4, 6, id], ["finalize", id]]);
  assert.equal(state[2929 + id], 43, "adult uses mode 43");
  assert.equal(state[3030 + id], -1, "id > v");
  assert.equal(state[4646 + id], -64);
  assert.equal(xSlots[0][2][0], -2, "reservation cancelled");
  assert.equal(xSlots[0][2][1], id, "level-3 reservation kept");
}

// A child's death uses mode 44, and `id <= v` stores 0 in 3030.
{
  const { state, log, input } = make({ v: 9 });
  const id = 3;
  stepLegacyEntityVacate(input, 19, 1, 1, id);
  assert.equal(state[2929 + id], 44);
  assert.equal(state[3030 + id], 0);
  assert.deepEqual(log, [["finalize", id]], "no queue action without a work class");
}

// The chief's death costs every adult 25 happiness, clamped to 0..99.
{
  const { state, shortRows, input } = make();
  const id = 6;
  shortRows[0][17] = id;
  state[1414 + 1] = 30; state[505 + 1] = 40;
  state[1414 + 2] = 30; state[505 + 2] = 10;
  state[1414 + 3] = 5; state[505 + 3] = 40; // a child is skipped
  stepLegacyEntityVacate(input, 19, 0, 0, id);
  assert.equal(state[505 + 1], 15);
  assert.equal(state[505 + 2], 0);
  assert.equal(state[505 + 3], 40);
}

// Kind 106 runs l(), the spatial action and the rect mark.
{
  const { state, packedBytes, log, input } = make();
  const id = 4;
  state[9535 + id] = 2;
  packedBytes[200 + 2] = 77;
  stepLegacyEntityVacate(input, 106, 8, 9, id);
  assert.deepEqual(log.slice(0, 3), [["l", id], ["spatial", 6, 8, 9, 77], ["rect", 8, 9, 1, 1]]);
}

// Kind 85 removes the entity; other kinds do nothing of the sort.
{
  const { log, input } = make();
  stepLegacyEntityVacate(input, 85, 0, 0, 12);
  assert.deepEqual(log, [["remove", 12, true]]);
}

// The tail fires for a kind-19 team-1 unit when t287 says 10, and bumps f:B by 50.
{
  const { packedBytes, log, input } = make();
  packedBytes[600 + 0] = 60; // t291[q]: f:B (0) is below it
  packedBytes[500 + 0] = 2;  // t288[q]
  packedBytes[400 + 2] = 10; // t287[t288[q] + f]
  packedBytes[300 + 2] = 31; // t286[...]
  stepLegacyEntityVacate(input, 19, 0, 0, 60);
  assert.deepEqual(log.slice(-2), [["aux", 0, 0, 1], ["scene", 31]]);
  assert.equal(input.scratch.subsystemGFFlagByte, 50);
  // A team-0 kind-19 death does not fire it.
  const second = make();
  second.packedBytes[600 + 0] = 60;
  second.packedBytes[500 + 0] = 2;
  second.packedBytes[400 + 2] = 10;
  stepLegacyEntityVacate(second.input, 19, 0, 0, 20);
  assert.deepEqual(second.log, [["finalize", 20]]);
  assert.equal(second.input.scratch.subsystemGFFlagByte, 0);
}

// e(int,int) stops at the first empty slot.
{
  const xSlots = [[0, 1, 2, 3, 4].map(() => new Int8Array(30))];
  xSlots[0][0][0] = 0; xSlots[0][2][0] = 9;
  xSlots[0][0][1] = 1; xSlots[0][2][1] = 9;
  releaseLegacyEntitySlotReservation(xSlots, 0, 9);
  assert.equal(xSlots[0][2][0], 9, "scan stops at slot 0");
  assert.equal(xSlots[0][2][1], 9);
}

console.log("private void a(int,int,int,byte) #283 (vacate/death) OK");
