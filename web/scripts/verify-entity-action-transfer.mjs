import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";
import { denseRequire } from "./dense-layout-require.mjs";

const path = `${new URL("../src/sim/units/LegacyEntityActionTransfer.ts", import.meta.url).pathname}`;
const output = ts.transpileModule(fs.readFileSync(path, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(output, { require: denseRequire, module, exports: module.exports, Int8Array });
const { transferLegacyEntityAction } = module.exports;

const state = new Int8Array(10000); state[2828 + 3] = 93; state[8810 + 2] = 3;
state[3] = 4; state[103] = 5; let completed = 0; let reset;
transferLegacyEntityAction({ state, entityId: 3, record: 2, moveFlag: true, resetFlag: true, readEntityCell: () => 3, onRecordCompletion: () => { completed += 1; }, onLifecycleReset: (...args) => { reset = args; } });
assert.equal(completed, 1); assert.deepEqual(reset, [2, false]); assert.equal(state[2828 + 3], 69); assert.equal(state[6161 + 3], 2);
// Offsets 310..408: a plain (non-92/93/106) non-owner is sent out: 87, 6161 = 3 (oracle run 8, frame 19191).
{
  const st = new Int8Array(10000); st[2828 + 7] = 65; st[8810 + 4] = 0; st[8749 + 4] = 2;
  transferLegacyEntityAction({ state: st, entityId: 7, record: 4, moveFlag: false, resetFlag: false, readEntityCell: () => 7 });
  assert.equal(st[2828 + 7], 87); assert.equal(st[6161 + 7], 3);
}
// Offsets 135..151 -> 287 -> 298: a plain owner off its own cell becomes 87 with 6161 = 3, then the reset call.
{
  const st = new Int8Array(10000); st[2828 + 5] = 65; st[8810 + 4] = 5; st[8749 + 4] = 6; let r;
  transferLegacyEntityAction({ state: st, entityId: 5, record: 4, moveFlag: false, resetFlag: true, readEntityCell: () => 0, onLifecycleReset: (...a) => { r = a; } });
  assert.equal(st[2828 + 5], 87); assert.equal(st[6161 + 5], 3); assert.deepEqual(r, [4, false]);
}
// Offset 247: a plain owner on its cell becomes 69 too, with 6161 = 3.
{
  const st = new Int8Array(10000); st[2828 + 5] = 65; st[8810 + 4] = 5; st[8749 + 4] = 6; st[5] = 8; st[106] = 9;
  transferLegacyEntityAction({ state: st, entityId: 5, record: 4, moveFlag: false, resetFlag: false, readEntityCell: () => 5 });
  assert.equal(st[2828 + 5], 69); assert.equal(st[6161 + 5], 3); assert.deepEqual([st[3131 + 5], st[3232 + 5]], [8, 9]);
}
console.log("f.a(int,int,boolean,boolean) transfer OK");
