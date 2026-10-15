import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import vm from "node:vm";

const file = new URL("../src/j2me/LegacyStateTransitionCommand.ts", import.meta.url).pathname;
const module = { exports: {} };
const output = ts.transpileModule(fs.readFileSync(file, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
vm.runInNewContext(output, { module, exports: module.exports, Int8Array, Int16Array });
const { stepLegacyStateTransitionCommand } = module.exports;

const packedBytes = new Int8Array(700);
const packedOffsets = new Int16Array(312);
for (let i = 0; i < packedBytes.length; i += 1) packedBytes[i] = 0;
packedOffsets[154] = 10; packedOffsets[155] = 20; packedOffsets[311] = 30;
packedBytes[10 + 1] = 2;
packedBytes[30 + 229 + 0] = 0;
packedBytes[30 + 0] = 1;
packedBytes[30 + 458 + 0] = -100;
const state = {
  ai: 0, ak: 0, aj: 1, o: 8, v: 0, q: 0, aT: 0, aS: 0, aR: 0, al: 0,
  am: 0, an: 0, I: 0, K: 0, Q: 18, H: false, p: Int8Array.from([4, 0, 0]),
};
let uCalls = 0;
stepLegacyStateTransitionCommand({ state, packedBytes, packedOffsets, onReset: () => {}, onU: () => { uCalls += 1; } }, -1);
assert.equal(uCalls, 1);
assert.equal(state.ak, 0);

const positive = { ...state, ai: 0, ak: 0, aj: 2, H: false, p: Int8Array.from([4, 0, 0]) };
const actions = [];
stepLegacyStateTransitionCommand({ state: positive, packedBytes, packedOffsets, onRecordAction: (...args) => actions.push(args) }, 51);
assert.equal(positive.ai, 51);
assert.deepEqual(actions, [[-100, -2]]);
assert.equal(positive.I, 8);
assert.equal(positive.K, 67);
assert.equal(positive.H, true);
// Offsets 70..95: o:B = t154[q] + ak (the cutscene picture), not t154[q + ak] + ak.
{
  const page = { ...state, ai: 0, ak: 2, aj: 5, q: 0, H: false, p: Int8Array.from([4, 0, 0]) };
  packedBytes[10 + 0] = 0;
  packedBytes[10 + 3] = 9; // t154[q + new ak] -- must not be read
  stepLegacyStateTransitionCommand({ state: page, packedBytes, packedOffsets, onReset: () => {}, onU: () => {} }, -1);
  assert.equal(page.ak, 3);
  assert.equal(page.oByte, 3);
}
console.log("f.b(int) state transition command OK");
