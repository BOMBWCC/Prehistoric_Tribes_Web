// Regression test for LegacyEntityMUpdate.ts (private void M(), #249),
// hand-derived from bytecode/b-javap.txt line 27625.
import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import vm from "node:vm";
import { denseRequire } from "./dense-layout-require.mjs";

const file = new URL("../src/sim/units/LegacyEntityMUpdate.ts", import.meta.url).pathname;
const module = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { require: denseRequire, module, exports: module.exports, Int8Array, Int16Array });
const { stepLegacyEntityMUpdate } = module.exports;

const state = new Int8Array(10000);
const packedBytes = new Int8Array(100);
const packedOffsets = new Int16Array(312);
packedOffsets[168] = 10; packedOffsets[169] = 30;
state[2828 + 12] = 5;
packedBytes[30 + 5] = 7;       // R = t169[3939 = 5]
packedBytes[10 + 7] = 2;       // t168[R]
packedBytes[10 + 7 + 2] = 6;   // t168[R + 2]
const raw = { R: 0 };
const calls = [];
stepLegacyEntityMUpdate({
  state, entityId: 12, packedBytes, packedOffsets, raw,
  // offset 33 is b.a(int,byte) (#275): the type change, after 3939 = 2828
  onChangeType: (id, type) => { calls.push(["a", id, type, state[3939 + 12]]); state[2828 + id] = type; },
  randomRemainder: (mask, divisor) => { calls.push(["rand", mask, divisor]); return 3; },
});
assert.deepEqual(calls, [["a", 12, 83, 5], ["rand", 0xffffff, 5]]);
assert.equal(state[3939 + 12], 5);
assert.equal(raw.R, 7, "R reads t169[3939], the saved type, not the new 83");
assert.equal(state[1313 + 12], 5, "t168[R] 2 + random 3");
console.log("b.M() OK");
