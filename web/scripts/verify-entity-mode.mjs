import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";
import { denseRequire } from "./dense-layout-require.mjs";

const path = `${new URL("../src/sim/units/LegacyEntityMode.ts", import.meta.url).pathname}`;
const output = ts.transpileModule(fs.readFileSync(path, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(output, { require: denseRequire, module, exports: module.exports, Int8Array, Int16Array });
const { setLegacyEntityMode } = module.exports;

const state = new Int8Array(9983);
const packedBytes = new Int8Array(17638);
const packedOffsets = new Int16Array(312);
packedOffsets[138] = 100;
state[8993 + 4] = 7;
state[4545 + 7] = 9;
state[4545 + 9] = 0;
state[9115 + 4] = 2;
state[8749 + 4] = 3;
packedBytes[100 + (7 + 2) * 26 + 3] = 11;
const events = [];
const input = {
  state,
  packedBytes,
  packedOffsets,
  onStatusQuery: (id) => events.push(["status", id]),
  onLinkedRecord: (...args) => events.push(["linked", ...args]),
};
setLegacyEntityMode(input, 4, true);
assert.deepEqual(events, [["status", 4], ["linked", 7, 4, false, false], ["linked", 9, 4, false, false]]);
assert.equal(state[8627 + 4], 1);
assert.equal(state[8566 + 4], 11);

events.length = 0;
setLegacyEntityMode(input, 4, false);
assert.deepEqual(events, [["status", 4], ["linked", 7, 4, false, false], ["linked", 9, 4, false, false]]);
assert.equal(state[8627 + 4], 2);
console.log("f.b(int,boolean) raw entity mode OK");
