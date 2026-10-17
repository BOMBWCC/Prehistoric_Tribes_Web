// Behaviour test for LegacyEntityRecordDoorRetarget.ts: private void q()
// (#411), bytecode/b-javap.txt line 6343, offsets 0..961. Expected values
// read off the bytecode.
import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";
import { denseRequire } from "./dense-layout-require.mjs";

const path = new URL("../src/sim/units/LegacyEntityRecordDoorRetarget.ts", import.meta.url).pathname;
const output = ts.transpileModule(fs.readFileSync(path, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(output, { require: denseRequire, module, exports: module.exports, Int8Array, Int16Array, Math });
const { stepLegacyEntityRecordDoorRetarget } = module.exports;

const V = 4;
const RECORD = 7;

// t26[type] -> row 40 (a "still alive?" counter), t27[type] -> bit 1 set,
// t28[type] -> row 50, so the door is dense[saveOffsets[50] + record] and
// dense[saveOffsets[51] + record].
function fixture(type = 30) {
  const packedBytes = new Int8Array(2000);
  const packedOffsets = new Int16Array(320);
  const saveOffsets = new Int16Array(320);
  packedOffsets[26] = 100; packedOffsets[27] = 300; packedOffsets[28] = 500;
  packedOffsets[57] = 700; packedOffsets[174] = 900;
  packedBytes[100 + type] = 40;
  packedBytes[300 + type] = 2;   // t27 bit 1 -> the method continues
  packedBytes[500 + type] = 50;
  saveOffsets[40] = 6000;        // the "alive" counter row
  saveOffsets[50] = 6100;        // door x row
  saveOffsets[51] = 6200;        // door y row

  const state = new Int8Array(10000);
  state[2828 + V] = type;
  state[4444 + V] = RECORD;
  state[6000 + RECORD] = 1;      // > 0, so r() is not called
  state[6100 + RECORD] = 13;     // door x
  state[6200 + RECORD] = 9;      // door y
  const calls = [];
  const input = {
    state, packedBytes, packedOffsets, saveOffsets, v: V, bValue: 5,
    scratch: { p: 0, n: 0 },
    onOccupancy: () => 0,
    onR: () => calls.push("r"),
    onBVoid: (flag) => calls.push(["bVoid", flag]),
    onChangeType: (id, t) => calls.push(["type", id, t]),
    onIUpdate: (a) => calls.push(["i", a]),
    onP: () => calls.push("p"),
    onQ: () => calls.push("Q"),
    onLinkByte: (id, value) => calls.push(["link", id, value]),
  };
  return { input, state, calls, packedBytes };
}

// Offsets 18..62: a record whose counter is <= 0 calls r() first.
{
  const { input, state, calls } = fixture();
  state[6000 + RECORD] = 0;
  stepLegacyEntityRecordDoorRetarget(input);
  assert.equal(calls[0], "r");
}

// Offsets 66..93: without t27 bit 1 the method stops before touching anything.
{
  const { input, state, calls, packedBytes } = fixture();
  packedBytes[300 + 30] = 0;
  state[3131 + V] = 1; state[3232 + V] = 2;
  stepLegacyEntityRecordDoorRetarget(input);
  assert.deepEqual([state[3131 + V], state[3232 + V]], [1, 2]);
  assert.deepEqual(calls, []);
}

// Offsets 534..642: an ordinary unit is re-pointed at its record's door.
{
  const { input, state, calls } = fixture();
  state[4949 + V] = 9;      // n (0) stays under 4949 + 2
  state[3131 + V] = 1; state[3232 + V] = 2;
  stepLegacyEntityRecordDoorRetarget(input);
  assert.deepEqual([state[3131 + V], state[3232 + V]], [13, 9]);
  assert.deepEqual(calls, [], "n (0) is not above bValue (5), so no p()");
}

// Offsets 418..530: already on the door -> nothing happens.
{
  const { input, state, calls } = fixture();
  state[4949 + V] = 9;
  state[3131 + V] = 13; state[3232 + V] = 9;
  stepLegacyEntityRecordDoorRetarget(input);
  assert.deepEqual(calls, []);
}

// Offsets 644..745: a high occupancy score also runs p(), and a type 94..97
// carrying 7979 & 16 gets f.a(v, 0) plus that bit cleared.
{
  const { input, state, calls } = fixture(95);
  input.onOccupancy = () => 90;   // n = 9 > bValue 5
  state[4949 + V] = 9;            // ... but still <= 4949 + 2, so no jump to 747
  state[7979 + V] = 16 | 1;
  stepLegacyEntityRecordDoorRetarget(input);
  assert.deepEqual(calls, ["p", ["link", V, 0]]);
  assert.equal(state[7979 + V], 1, "bit 4 cleared (& 239)");
}

// Offsets 133..283: type 92 past its 1818 allowance rebuilds its type and
// stops its animation.
{
  const { input, state, calls, packedBytes } = fixture(92);
  packedBytes[900 + 3] = 4;       // t174[record kind 3] = 4
  packedBytes[700 + 4 + 2] = 77;  // t57[4 + slot 2] = 77
  state[8749 + RECORD] = 3;
  state[4646 + V] = 2;
  state[1818 + V] = 1;
  input.onOccupancy = () => 50;   // n = 5 > 1818 (1)
  stepLegacyEntityRecordDoorRetarget(input);
  assert.deepEqual(calls, [["bVoid", false], ["type", V, 77], ["i", 0]]);
  assert.equal(state[3030 + V], -1);
}

// Offsets 396..414 -> 748..850: a drifted type <= 9 with no order parks on
// its own cell after Q().
{
  const { input, state, calls } = fixture(5);
  input.onOccupancy = () => 200;  // n = 20 > 4949 + 2
  state[4949 + V] = 1;
  state[V] = 21; state[101 + V] = 22;
  stepLegacyEntityRecordDoorRetarget(input);
  assert.deepEqual(calls, ["Q"]);
  assert.deepEqual([state[3131 + V], state[3232 + V]], [21, 22]);
}

// ... and the same drift with a route in progress (808 != 0) does nothing.
{
  const { input, state, calls } = fixture(5);
  input.onOccupancy = () => 200;
  state[4949 + V] = 1;
  state[808 + V] = 3;
  state[3131 + V] = 1; state[3232 + V] = 2;
  stepLegacyEntityRecordDoorRetarget(input);
  assert.deepEqual(calls, []);
  assert.deepEqual([state[3131 + V], state[3232 + V]], [1, 2]);
}

console.log("q() #411 record-door retarget OK");
