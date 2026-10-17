import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";
import { denseRequire } from "./dense-layout-require.mjs";

const path = `${new URL("../src/sim/units/LegacyEntityUpdateCleanup.ts", import.meta.url).pathname}`;
const output = ts.transpileModule(fs.readFileSync(path, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(output, { require: denseRequire, module, exports: module.exports, Int8Array });
const { cleanupLegacyEntityUpdate } = module.exports;

const state = new Int8Array(9983);
const subsystemG = Array.from({ length: 3 }, () => new Int8Array(20));
const events = [];
const id = 4;
const associationIndex = 3;
state[9054 + id] = 0;
state[8627 + id] = 1;
state[9115 + id] = 7;
state[8810 + id] = 9;
state[9237 + id] = 12;
subsystemG[0][associationIndex] = id;
cleanupLegacyEntityUpdate({
  state, subsystemG, id, associationIndex,
  onEntityReset: (...args) => events.push(["reset", ...args]),
  onEntityFinalize: (...args) => events.push(["finalize", ...args]),
});
assert.deepEqual(events, [["reset", 4, 0], ["finalize", 4]]);
assert.equal(state[9054 + id], 0);
assert.equal(state[8627 + id], 0);
assert.equal(state[9115 + id], 8);
assert.equal(state[8810 + id], 12);
assert.equal(state[9237 + id], 0);
assert.equal(subsystemG[0][associationIndex], 0);
console.log("b.ad() raw entity-update cleanup OK");
