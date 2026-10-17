import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";
import { denseRequire } from "./dense-layout-require.mjs";

const path = `${new URL("../src/sim/tribe/LegacySubsystemRecord.ts", import.meta.url).pathname}`;
const output = ts.transpileModule(fs.readFileSync(path, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(output, { require: denseRequire, module, exports: module.exports, Int8Array, Int16Array });
const { allocateLegacySubsystemRecord } = module.exports;

const state = new Int8Array(9983);
const packedBytes = new Int8Array(17638);
const packedOffsets = new Int16Array(312);
const counters = new Int8Array(3);
const map = Array.from({ length: 4 }, () => new Int8Array(130));
packedOffsets[180] = 200;
packedOffsets[184] = 400;
packedBytes[200 + 6] = 17;
packedBytes[400 + 6] = 23;
for (let slot = 0; slot < 4; slot += 1) state[9513 + slot] = 1;
const randomCalls = [];
const slot = allocateLegacySubsystemRecord({
  state, map, packedBytes, packedOffsets,
  randomRemainder: (mask, divisor) => { randomCalls.push([mask, divisor]); return 7; },
  counters, q: 0,
}, 6, 2, 3, 1);
assert.equal(slot, 4);
assert.equal(counters[1], 1);
assert.deepEqual(randomCalls, [[255, 8]]);
assert.equal(state[9513 + slot], 17);
assert.equal(state[9535 + slot], 6);
assert.equal(state[9359 + slot], 2);
assert.equal(state[9645 + slot], 2);
assert.equal(state[9381 + slot], 3);
assert.equal(state[9667 + slot], 3);
assert.equal(state[9491 + slot], 7);
assert.equal(state[9469 + slot], 1);
assert.equal(state[9557 + slot], 23);
assert.equal(map[3][2], 101 + slot);

const q3Counters = new Int8Array(3);
const q3Slot = allocateLegacySubsystemRecord({
  state, map, packedBytes, packedOffsets, randomRemainder: () => 0,
  counters: q3Counters, q: 3,
}, 6, 2, 3, 1);
assert.equal(q3Slot, 5);
assert.equal(q3Counters[1], 0);
console.log("f.b(int,int,int,int) raw subsystem record OK");
