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
vm.runInNewContext(output, { require: denseRequire, module, exports: module.exports, Int8Array, Int16Array, Math });
const { stepLegacyAh } = module.exports;

const a = Array.from({ length: 4 }, () => new Int8Array(50));
const dense = new Int8Array(10000);
a[2][0] = 7; a[2][1] = 8;
const state = { wFlag: true, w: 0, I: 4, i: 7, F: 1, k: 9 };
const events = [];
stepLegacyAh({ state, a, dense, onAI: () => events.push("AI"), onFourFlags: (v) => events.push(v.join(",")) });
assert.equal(state.F, 2); assert.equal(state.w, 1); assert.equal(state.k, 0); assert.equal(state.wFlag, false);
assert.equal(dense[916], 2); assert.equal(dense[917], 2); assert.deepEqual(events, ["AI", "true,true,false,false"]);

const same = { wFlag: false, w: 1, I: 0, i: 7, F: 2, k: 0 };
const sameA = Array.from({ length: 4 }, () => new Int8Array(50)); sameA[2][0] = 11;
stepLegacyAh({ state: same, a: sameA, dense, onJump: (id, value) => events.push([id, value]) });
assert.deepEqual(events.at(-1), [11, 0]); assert.equal(same.F, 2);

console.log("f.aH() raw list switch OK");
