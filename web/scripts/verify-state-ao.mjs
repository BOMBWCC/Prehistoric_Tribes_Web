import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";

const path = `${new URL("../src/j2me/LegacyStateMachine.ts", import.meta.url).pathname}`;
const output = ts.transpileModule(fs.readFileSync(path, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(output, { module, exports: module.exports, Int8Array, Int16Array, Math });
const { stepLegacyAo } = module.exports;

const bytes = new Int8Array(17638);
const offsets = new Int16Array(312);
offsets[151] = 200;
offsets[152] = 300;
offsets[153] = 100;
offsets[249] = 400;
offsets[305] = 500;
offsets[306] = 600;
offsets[307] = 700;
bytes[300 + 19] = 0;
bytes[200 + 0] = 0;
bytes[100 + 87 + 19] = 0;
bytes[200 + 0] = 5;
bytes[200 + 5] = 0;
const state = { Q: 19, R: 12, H: false, vInt: 0, V: 8, r: 0, q: 0, T: 0, Z: 0, mByte: 0, aaInt: 0, s: -1, eByte: 0, lInt: 0, af: false, KFlag: false, y: 4, z: 0, A: 5, B: 0, I: 6, J: 0, K: 7, L: 0, P: true, c: 0, pByte: 0, oInt: 0, wByte: 0 };
stepLegacyAo({ state, packedBytes: bytes, packedOffsets: offsets });
assert.equal(state.Q, 28);
assert.equal(state.z, 4);
assert.equal(state.B, 5);
assert.equal(state.J, 6);
assert.equal(state.L, 7);
assert.equal(state.H, true);

const valueBranch = { ...state, Q: 25, Z: 0, mByte: 0, KFlag: false, H: false };
bytes[200 + 5] = 2;
bytes[700] = 5;
bytes[501] = 3;
stepLegacyAo({ state: valueBranch, packedBytes: bytes, packedOffsets: offsets, onDShortWrite: (index, value) => { valueBranch.dShort = [index, value]; }, onBooleanFlag: (index, value) => { valueBranch.flag = [index, value]; } });
assert.equal(valueBranch.Z, 1);
assert.deepEqual(valueBranch.dShort, [4, 36]);
assert.deepEqual(valueBranch.flag, [2, true]);

const languageBranch = { ...state, Q: 14, R: 5, H: false };
const languageLoads = [];
let destroyed = false;
stepLegacyAo({
  state: languageBranch,
  packedBytes: bytes,
  packedOffsets: offsets,
  onDestroy: () => { destroyed = true; },
  onResourceLoad: (slot) => languageLoads.push(slot),
});
assert.equal(destroyed, false);
assert.deepEqual(languageLoads, [0, 1]);
assert.equal(languageBranch.Q, 16);
console.log("f.ao() raw table-driven branches OK");
