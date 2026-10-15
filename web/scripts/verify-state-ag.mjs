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
const { stepLegacyAg } = module.exports;

const a = Array.from({ length: 4 }, () => new Int8Array(50));
const dense = new Int8Array(10000);
const state = { wFlag: true, w: 1, I: 4, i: 7, F: -1, k: 6 };
const events = [];
stepLegacyAg({ state, a, dense, onEntityTick: (id) => events.push(id), onFourFlags: (v) => events.push(v.join(",")) });
assert.equal(state.w, 1); assert.equal(state.F, 2); assert.equal(state.k, 0);
assert.equal(state.wFlag, false, "w:Z cleared (a different field from w:B)"); assert.equal(state.I, 0);
assert.equal(a[0][0], 6); assert.equal(a[2][0], 6); assert.deepEqual(Array.from(events), [6, "true,true,false,false"]);
assert.equal(dense[915], 2);

const copy = Array.from({ length: 4 }, () => new Int8Array(50));
copy[1][0] = 9; copy[1][1] = 10; dense[918] = 1; dense[919] = 1;
const state2 = { wFlag: false, w: 0, I: 0, i: 9, F: 1, k: 0 };
stepLegacyAg({ state: state2, a: copy, dense, onEntityTick: (id) => events.push(["copy", id]) });
assert.equal(state2.F, 3); assert.equal(copy[0][0], 9); assert.equal(copy[3][1], 10); assert.equal(dense[918], 3);

console.log("f.aG() raw entity-list rebuild OK");
