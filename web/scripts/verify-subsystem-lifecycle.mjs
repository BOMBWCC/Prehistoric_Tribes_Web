import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";
import { denseRequire } from "./dense-layout-require.mjs";

const path = `${new URL("../src/sim/tribe/LegacySubsystemLifecycle.ts", import.meta.url).pathname}`;
const output = ts.transpileModule(fs.readFileSync(path, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(output, { require: denseRequire, module, exports: module.exports, Int8Array });
const { runLegacyL, runLegacyM } = module.exports;

const state = new Int8Array(9983);
state[1919 + 1] = 5;
state[1919 + 60] = 5;
state[1919 + 51] = 5;
state[1919 + 100] = 5;
const events = [];
const input = {
  state,
  onPrimaryStep: (id, flag) => events.push(["primary", id, flag]),
  onEntityCleanup: (id) => events.push(["cleanup", id]),
  onRecordMaintenance: (id) => events.push(["maintain", id]),
  onAuxiliaryPass: (index) => events.push(["aux", index]),
};
runLegacyL(input);
assert.deepEqual(events.slice(0, 2), [["primary", 1, false], ["primary", 2, false]]);
assert.deepEqual(events.slice(60, 64), [["cleanup", 1], ["maintain", 1], ["cleanup", 51], ["maintain", 51]]);
assert.deepEqual(events.slice(-2), [["aux", 20], ["aux", 21]]);

events.length = 0;
runLegacyM(input);
assert.deepEqual(events.slice(0, 4), [["cleanup", 51], ["maintain", 51], ["cleanup", 60], ["maintain", 60]]);
assert.deepEqual(events.slice(-1), [["aux", 21]]);
console.log("b.l()/b.m() raw lifecycle scan OK");
