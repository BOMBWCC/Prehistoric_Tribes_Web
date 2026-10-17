import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";
import { denseRequire } from "./dense-layout-require.mjs";

const path = `${new URL("../src/ui/LegacyStateMachine.ts", import.meta.url).pathname}`;
const output = ts.transpileModule(fs.readFileSync(path, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(output, { require: denseRequire, module, exports: module.exports, Int8Array, Int16Array });
const { stepLegacyAm } = module.exports;

const packedBytes = new Int8Array(17638);
const packedOffsets = new Int16Array(312);
packedOffsets[303] = 100;
packedBytes[100 + 3] = 44;

const t0 = { Q: 22, R: 18, H: false, T: 0, q: 3, uCounter: 0, tByte: 0, W: true, vInt: 0, A: false, vByte: 0, mByte: 9 };
const events0 = [];
stepLegacyAm({ state: t0, packedBytes, packedOffsets, onGByte: () => { throw new Error("T=0 must not use boolean resource callback"); }, onMapEntry: () => { t0.Q = 18; }, onSelectionSync: (...v) => events0.push(["selection", ...v]), onBByte: (v) => events0.push(["b", v]) });
assert.equal(t0.Q, 18);
assert.equal(t0.H, true);
assert.equal(t0.mByte, 0);
assert.deepEqual(events0, [["selection", true, true, false, false], ["b", 44]]);

const t1 = { Q: 22, R: 11, H: false, T: 1, q: 2, uCounter: 4, tByte: 0, W: true, vInt: 0, A: false, vByte: 0, mByte: 0 };
const calls1 = [];
stepLegacyAm({ state: t1, packedBytes, packedOffsets, onGByte: () => { throw new Error("T=1 should use explicit resource callback"); }, onResourceAction: (v) => { calls1.push(v); return false; }, onN: () => calls1.push("n"), onU: () => calls1.push("u") });
assert.equal(t1.tByte, -1);
assert.equal(t1.vInt, 66);
assert.equal(t1.R, 11);
assert.equal(t1.A, true);
assert.equal(t1.vByte, 0);
assert.deepEqual(calls1, [1, "n", "u"]);

const t2 = { Q: 22, R: 11, H: false, T: 2, q: 8, uCounter: 0, tByte: 0, W: true, vInt: 0, A: false, vByte: 0, mByte: 0 };
stepLegacyAm({ state: t2, packedBytes, packedOffsets, onGByte: () => false, onD: () => false });
assert.equal(t2.R, 11);
assert.equal(t2.T, 0);
assert.equal(t2.Q, 23);
console.log("f.am() raw T=0/1/2 branches OK");
