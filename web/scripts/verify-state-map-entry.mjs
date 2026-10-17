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
vm.runInNewContext(output, { require: denseRequire, module, exports: module.exports });
const { stepLegacyMapEntry } = module.exports;
const state = { q: 0 }; const events = [];
stepLegacyMapEntry(state, 3, {
  onAM: () => events.push("aM"),
  onAN: () => events.push("aN"),
  onAO: () => events.push("aO"),
});
assert.equal(state.q, 3); assert.deepEqual(events, ["aM", "aN", "aO"]);
stepLegacyMapEntry(state, 4, { onAM: () => { throw new Error("original catch boundary"); }, onAN: () => events.push("no") });
assert.equal(state.q, 4); assert.deepEqual(events, ["aM", "aN", "aO"]);
console.log("f.g(byte) map-entry chain OK");
