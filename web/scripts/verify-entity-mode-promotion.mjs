import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";
import { denseRequire } from "./dense-layout-require.mjs";

const path = `${new URL("../src/sim/units/LegacyEntityModePromotion.ts", import.meta.url).pathname}`;
const output = ts.transpileModule(fs.readFileSync(path, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(output, { require: denseRequire, module, exports: module.exports, Int8Array });
const { promoteLegacyEntityMode, selectLegacyEntityTypeAfterQ } = module.exports;

const state = new Int8Array(5000);
assert.equal(promoteLegacyEntityMode(state, 3, 9), 10);
assert.equal(state[2929 + 3], 10);
state[1414 + 3] = 12;
assert.equal(selectLegacyEntityTypeAfterQ(state, 3, (id, type) => { state[2828 + id] = type; }), 69);
assert.equal(state[2828 + 3], 69);
state[1414 + 3] = 11;
assert.equal(selectLegacyEntityTypeAfterQ(state, 3, (id, type) => { state[2828 + id] = type; }), 17);
console.log("b.P()/b.Q() entity mode/type helpers OK");
