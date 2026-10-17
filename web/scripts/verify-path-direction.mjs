import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import vm from "node:vm";

const file = new URL("../src/sim/world/LegacyPathDirection.ts", import.meta.url).pathname;
const module = { exports: {} };
const output = ts.transpileModule(fs.readFileSync(file, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
vm.runInNewContext(output, { module, exports: module.exports, Int8Array });
const { setLegacyPathDirection } = module.exports;

const state = { a: 0, c: new Int8Array(2) };
setLegacyPathDirection(state, 7, 3);
assert.equal(state.a, 7); assert.deepEqual(Array.from(state.c), [4, 3]);
setLegacyPathDirection(state, -2, 6);
assert.equal(state.a, 2); assert.deepEqual(Array.from(state.c), [4, 2]);
setLegacyPathDirection(state, -5, -1);
assert.equal(state.a, 1); assert.deepEqual(Array.from(state.c), [4, 1]);
console.log("b.a(II) path direction OK");
