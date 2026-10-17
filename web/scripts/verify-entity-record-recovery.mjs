// Behaviour test for LegacyEntityRecordRecovery.ts: r() (#412, offsets
// 0..491), ap() (#323, 0..66) and ao() (#322, 0..285). Expected values read
// off bytecode/b-javap.txt lines 6888 / 46438 / 46281.
import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";
import { denseRequire } from "./dense-layout-require.mjs";

const path = new URL("../src/sim/units/LegacyEntityRecordRecovery.ts", import.meta.url).pathname;
const output = ts.transpileModule(fs.readFileSync(path, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(output, { require: denseRequire, module, exports: module.exports, Int8Array, Int16Array, Math });
const { stepLegacyEntityAo, stepLegacyEntityAp, stepLegacyEntityRecordRecovery } = module.exports;

const V = 4;

const slots = () => [
  Array.from({ length: 5 }, () => new Int8Array(30)),
  Array.from({ length: 5 }, () => new Int8Array(30)),
];

// --- ao() ---

// A live kind-8 record owned by this unit is removed from the queue: every
// later entry shifts one slot left across all 5 rows, slot 29 row 0 is
// cleared, and dense[9237 + record] goes to 0.
{
  const state = new Int8Array(10000);
  const slotTable = slots();
  const record = 3;
  state[8505 + record] = 5;
  state[8749 + record] = 8;
  state[8810 + record] = V;
  state[9237 + record] = 7;
  slotTable[0][0].set([9, record, 11, 12], 0);
  slotTable[0][2].set([90, 91, 92, 93], 0);
  stepLegacyEntityAo({ state, v: V, team: 0, slotTable });
  assert.deepEqual(Array.from(slotTable[0][0].slice(0, 4)), [9, 11, 12, 0]);
  assert.deepEqual(Array.from(slotTable[0][2].slice(0, 4)), [90, 92, 93, 0]);
  assert.equal(slotTable[0][0][29], 0);
  assert.equal(state[9237 + record], 0);
}

// A kind-8 record owned by someone else is left alone.
{
  const state = new Int8Array(10000);
  const slotTable = slots();
  state[8505 + 3] = 5; state[8749 + 3] = 8; state[8810 + 3] = 99; state[9237 + 3] = 7;
  slotTable[0][0].set([3, 11], 0);
  stepLegacyEntityAo({ state, v: V, team: 0, slotTable });
  assert.deepEqual(Array.from(slotTable[0][0].slice(0, 2)), [3, 11]);
  assert.equal(state[9237 + 3], 7);
}

// --- ap() ---

// ap() runs ao(), retypes the unit to 57, calls N(), and REASSIGNS v from the
// worker dispatch before scoring and running p() on the new unit.
{
  const state = new Int8Array(10000);
  const slotTable = slots();
  state[8] = 21; state[101 + 8] = 22;   // the dispatched unit's position
  const calls = [];
  const scratch = { v: 0, z: 0 };
  stepLegacyEntityAp({
    state, v: V, team: 0, slotTable, scratch,
    onChangeType: (id, type) => calls.push(["type", id, type]),
    onN: () => calls.push("N"),
    onWorkerDispatch: (id) => { calls.push(["dispatch", id]); return 8; },
    onOccupancy: (x, y, mode) => { calls.push(["occ", x, y, mode]); return 40; },
    onP: (id) => calls.push(["p", id]),
  });
  assert.deepEqual(calls, [["type", V, 57], "N", ["dispatch", V], ["occ", 21, 22, 0], ["p", 8]]);
  assert.equal(scratch.v, 8, "the ambient v really is reassigned");
  assert.equal(scratch.z, 40);
}

// --- r() ---

function rFixture(type) {
  const packedBytes = new Int8Array(2000);
  const packedOffsets = new Int16Array(320);
  packedOffsets[27] = 300; packedOffsets[57] = 700; packedOffsets[174] = 900;
  const state = new Int8Array(10000);
  state[2828 + V] = type;
  const calls = [];
  const flags = { a: false, b: false };
  const input = {
    state, packedBytes, packedOffsets, v: V, flags,
    onGroupMode: (arg) => calls.push(["g", arg]),
    onQ: () => calls.push("Q"),
    onBVoid: (flag) => calls.push(["bVoid", flag]),
    onChangeType: (id, t) => calls.push(["type", id, t]),
    onIUpdate: (arg) => calls.push(["i", arg]),
    onPBoolean: () => { calls.push("p?"); return false; },
    onAp: () => calls.push("ap"),
  };
  return { input, state, calls, flags, packedBytes };
}

// Offsets 1..64: type 2/7 picks g(1) or Q() by 7979 bit 7.
{
  const { input, state, calls } = rFixture(2);
  stepLegacyEntityRecordRecovery(input);
  assert.deepEqual(calls, [["g", 1]]);

  const second = rFixture(7);
  second.state[7979 + V] = 128;
  stepLegacyEntityRecordRecovery(second.input);
  assert.deepEqual(second.calls, ["Q"]);
}

// Offsets 68..215: type 92 rebuilds its type from the record's kind and slot.
{
  const { input, state, calls, packedBytes } = rFixture(92);
  packedBytes[900 + 3] = 4;
  packedBytes[700 + 4 + 2] = 77;
  state[4444 + V] = 7; state[8749 + 7] = 3; state[4646 + V] = 2;
  stepLegacyEntityRecordRecovery(input);
  assert.deepEqual(calls, [["bVoid", false], ["type", V, 77], ["i", 0]]);
  assert.equal(state[3030 + V], -1);
}

// Offsets 217..269: with t27 bit 0 set, a child just gets Q().
{
  const { input, state, calls, packedBytes } = rFixture(30);
  packedBytes[300 + 30] = 1;
  state[1414 + V] = 5;
  stepLegacyEntityRecordRecovery(input);
  assert.deepEqual(calls, ["Q"]);
}

// Offsets 273..450: an adult flips a type-0/3 unit with 6565 === 9, sets both
// flags, and parks its target on its own cell when the mode is above 7.
{
  const { input, state, calls, flags, packedBytes } = rFixture(3);
  packedBytes[300 + 3] = 1;
  state[1414 + V] = 20;
  state[6565 + V] = 9;
  state[2929 + V] = 20;
  state[V] = 31; state[101 + V] = 32;
  stepLegacyEntityRecordRecovery(input);
  assert.equal(state[2828 + V], 2, "type 3 ^ 1 = 2");
  assert.deepEqual(flags, { a: true, b: true });
  assert.deepEqual(calls, ["p?", "Q"]);
  assert.deepEqual([state[3131 + V], state[3232 + V]], [31, 32]);
}

// Offsets 452..491: types 94..96 finish with ap().
{
  const { input, calls } = rFixture(95);
  stepLegacyEntityRecordRecovery(input);
  assert.deepEqual(calls, ["ap"]);
}

console.log("r() #412 / ap() #323 / ao() #322 OK");
