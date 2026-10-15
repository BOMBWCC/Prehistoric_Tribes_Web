// Regression test for LegacySubsystemO.ts (private void O(), #251).
// Expected values derived by hand from bytecode/b-javap.txt 28208..28713.
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const module = { exports: {} };
const output = ts.transpileModule(fs.readFileSync(new URL("../src/j2me/LegacySubsystemO.ts", import.meta.url).pathname, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
vm.runInNewContext(output, { module, exports: module.exports, Int8Array, RangeError });
const { stepLegacySubsystemO } = module.exports;

const id = 4;
function fixture(type) {
  const state = new Int8Array(10000);
  state[2828 + id] = type;
  state[id] = 12;
  state[101 + id] = 23;
  const packedBytes = new Int8Array(200);
  const packedOffsets = new Int16Array(64);
  packedOffsets[27] = 10;
  const log = [];
  const input = {
    state, packedBytes, packedOffsets, id, team: 0,
    xSlots: [Array.from({ length: 5 }, () => new Int8Array(30))],
    orders: [Array.from({ length: 10 }, () => new Int8Array(12))],
    fRows: Array.from({ length: 4 }, () => new Int8Array(30)),
    onAp: () => log.push("ap"),
    onA: (kind) => { log.push(["a", kind]); return input.aResult; },
    onG: (arg) => log.push(["g", arg]),
    aResult: false,
  };
  return { state, packedBytes, log, input };
}

// Types 69/80/84/85: own cell, nothing else.
{
  const { state, log, input } = fixture(85);
  stepLegacySubsystemO(input);
  assert.deepEqual([state[3131 + id], state[3232 + id]], [12, 23]);
  assert.deepEqual(log, []);
}

// Type 94 following unit 3 -- no g(2).
{
  const { state, log, input } = fixture(94);
  state[4040 + id] = 12;
  input.xSlots[0][0][3] = 12;
  input.xSlots[0][2][3] = 3;
  state[3] = 14;
  state[101 + 3] = 15;
  stepLegacySubsystemO(input);
  assert.deepEqual([state[3131 + id], state[3232 + id], state[4444 + id], state[4747 + id]], [14, 15, 3, 3]);
  assert.deepEqual(log, []);
}

// Type 97: target from f.b rows 2/3, then g(2).
{
  const { state, log, input } = fixture(97);
  state[4040 + id] = 12;
  input.xSlots[0][0][3] = 12;
  input.xSlots[0][2][3] = 7;
  input.xSlots[0][3][3] = 8;
  stepLegacySubsystemO(input);
  assert.deepEqual([state[3131 + id], state[3232 + id]], [7, 8]);
  assert.deepEqual(log, [["g", 2]]);
}

// Type 95 with f.b[u][2][aO] < 0 -> ap(); an exhausted scan throws.
{
  const { log, input, state } = fixture(95);
  state[4040 + id] = 12;
  input.xSlots[0][0][0] = 12;
  input.xSlots[0][2][0] = -1;
  stepLegacySubsystemO(input);
  assert.deepEqual(log, ["ap"]);
  state[4040 + id] = 99;
  assert.throws(() => stepLegacySubsystemO(input), RangeError);
}

// Type 27: order 2 (record 6, owned) matches f.f slot 5.
{
  const { state, log, input } = fixture(27);
  state[8810 + 6] = id;
  input.orders[0][2][10] = 4;
  input.orders[0][2][11] = 6;
  input.fRows[0][5] = 6;
  input.fRows[1][5] = 18;
  input.fRows[2][5] = 21;
  input.fRows[3][5] = 22;
  stepLegacySubsystemO(input);
  assert.deepEqual([state[3131 + id], state[3232 + id]], [21, 22]);
  assert.deepEqual(log, [["g", 2]]);
}

// Type 27: the first owned order without an f.f match ends the method.
{
  const { state, log, input } = fixture(27);
  state[8810 + 6] = id;
  input.orders[0][1][11] = 6;
  input.orders[0][2][10] = 4;
  input.orders[0][2][11] = 6;
  input.fRows[0][5] = 6;
  input.fRows[1][5] = 18;
  stepLegacySubsystemO(input);
  assert.deepEqual([state[3131 + id], state[3232 + id]], [0, 0]);
  assert.deepEqual(log, []);
}

// t27 bit 64: 6262/6363 (or record 3434 for type 65), g(2), no a(6).
{
  const { state, packedBytes, log, input } = fixture(40);
  packedBytes[10 + 40] = 64;
  state[6262 + id] = 31;
  state[6363 + id] = 32;
  stepLegacySubsystemO(input);
  assert.deepEqual([state[3131 + id], state[3232 + id]], [31, 32]);
  assert.deepEqual(log, [["g", 2]]);
}
{
  const { state, packedBytes, log, input } = fixture(65);
  packedBytes[10 + 65] = 64;
  state[3434 + id] = 3;
  state[8383 + 3] = 41;
  state[8444 + 3] = 42;
  stepLegacySubsystemO(input);
  assert.deepEqual([state[3131 + id], state[3232 + id]], [41, 42]);
  assert.deepEqual(log, [["g", 2]]);
}

// Otherwise a(6): true -> g(2); false -> 4444 = -6.
{
  const { state, log, input } = fixture(21);
  input.aResult = true;
  state[4444 + id] = 9;
  stepLegacySubsystemO(input);
  assert.deepEqual(log, [["a", 6], ["g", 2]]);
  assert.equal(state[4444 + id], 9);
}
{
  const { state, log, input } = fixture(21);
  state[4444 + id] = 9;
  stepLegacySubsystemO(input);
  assert.deepEqual(log, [["a", 6]]);
  assert.equal(state[4444 + id], -6);
}

console.log("private void O() OK");
