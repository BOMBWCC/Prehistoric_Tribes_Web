import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";

const path = `${new URL("../src/core/LegacyNumericSequence.ts", import.meta.url).pathname}`;
const output = ts.transpileModule(fs.readFileSync(path, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(output, { module, exports: module.exports, Int32Array, Int16Array });
const { acceptLegacyNumericValue } = module.exports;

const state = {
  i: new Int32Array(6),
  j: new Int32Array([10, 20, 30, 40, 50, 55]),
  aShort0: new Int16Array(26),
  ae: false, af: false, ag: false, u: 0, q: 0,
};
for (const value of [10, 20, 30, 40, 50, 55]) acceptLegacyNumericValue(state, value);
assert.equal(state.af, false);
assert.deepEqual([...state.i], [0, 20, 30, 40, 50, 55]);
acceptLegacyNumericValue(state, 10);
for (const value of [20, 30, 40, 50, 49]) acceptLegacyNumericValue(state, value);
assert.equal(state.af, true);

const reset = {
  i: new Int32Array(6),
  j: new Int32Array([10, 20, 30, 40, 50, 55]),
  aShort0: new Int16Array(26),
  ae: false, af: false, ag: false, u: 0, q: 0,
};
acceptLegacyNumericValue(reset, 10);
for (const value of [20, 30, 40, 50, 55]) acceptLegacyNumericValue(reset, value);
assert.equal(reset.aShort0[0], 100);
console.log("f.m(int) numeric sequence helper OK");
