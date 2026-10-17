import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import vm from "node:vm";

const file = new URL("../src/ui/LegacyStateS.ts", import.meta.url).pathname;
const module = { exports: {} };
const output = ts.transpileModule(fs.readFileSync(file, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
vm.runInNewContext(output, { module, exports: module.exports, Int8Array, Int16Array });
const { stepLegacyStateS } = module.exports;

const packedBytes = new Int8Array(600);
const packedOffsets = new Int16Array(312);
packedOffsets[310] = 10; packedOffsets[311] = 100; packedOffsets[155] = 200;
packedOffsets[156] = 300; packedOffsets[157] = 320;
packedBytes[10] = 1; packedBytes[11] = 4; packedBytes[10 + 71] = 5;
packedBytes[100 + 229 + 1] = 27;
packedBytes[200 + 56 + 27] = 1;
packedBytes[320 + 5] = 2; packedBytes[320 + 6] = 4;
// arraycopy source is a_s[156] + t157[local] (offsets 403..469), without + local.
packedBytes[300 + 2] = 8; packedBytes[300 + 2 + 1] = 9;
packedBytes[300 + 2 + 5] = 77;
const state = {
  ai: 0, ak: 5, Z: 4, aT: 0, ao: 0, aj: 0, JFlag: false, v: 9, Q: 14, R: 0,
  aP: 0, K: 10, s: false, p: new Int8Array(10), dFlags: Array(9).fill(false),
};
let o = 0; let sync;
stepLegacyStateS({
  state, aFlags: [true, false, true, false, true, false, true, false, true, false],
  packedBytes, packedOffsets, onO: () => { o += 1; },
  onSelectionSync: (...args) => { sync = args; },
});
assert.equal(state.ak, 0); assert.equal(state.ao, 27); assert.equal(state.aj, 3);
assert.equal(state.Q, 17); assert.equal(state.R, 14); assert.equal(state.aP, 1);
assert.equal(o, 1); assert.deepEqual(sync, [true, true, false, false]);
assert.deepEqual(Array.from(state.p.slice(0, 2)), [8, 9]);
console.log("f.S() state preparation OK");
