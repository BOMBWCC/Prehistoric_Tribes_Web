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
const { stepLegacyAf } = module.exports;

const map = Array.from({ length: 4 }, () => new Int8Array(4));
map[1][1] = 2; map[2][1] = 3;
const dense = new Int8Array(10000); dense[1921] = 1; dense[1922] = 1;
const a4 = new Int8Array(50);
const state = { uFlag: true, tFlag: true, F: 1, k: 9, C: 0, E: 2, B: 0, D: 2, w: 0 };
const events = [];
stepLegacyAf({ state, map, dense, a4, onAI: () => events.push("AI"), onFourFlags: (v) => events.push(v.join(",")) });
assert.equal(state.uFlag, false); assert.equal(state.tFlag, false); assert.equal(state.w, 1); assert.equal(state.F, 4);
assert.deepEqual([state.B, state.C, state.D, state.E], [0, 0, 0, 0], "the window is cleared");
assert.deepEqual(Array.from(a4.slice(0, 2)), [2, 3]); assert.equal(dense[911], 4); assert.equal(dense[912], 4); assert.deepEqual(Array.from(events), ["AI"], "aF() does not call a(ZZZZ)");

// A lone unit in the window is handed to d(byte) instead (offsets 236..280).
a4.fill(0); state.F = 4; state.w = 1; state.D = 2; state.E = 2; map[2][1] = 0;
stepLegacyAf({ state, map, dense, a4, onD: (id) => events.push(["d", id]) });
assert.equal(a4[0], 0); assert.equal(dense[911], 0); assert.equal(state.F, -1); assert.deepEqual(events.at(-1), ["d", 2]);

console.log("f.aF() raw entity-list scan OK");
