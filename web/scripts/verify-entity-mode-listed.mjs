// Regression test for checkLegacyEntityModeListed (private boolean l(), #398),
// hand-derived from bytecode/b-javap.txt line 26245.
import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import vm from "node:vm";
import { denseRequire } from "./dense-layout-require.mjs";

const file = new URL("../src/sim/tribe/LegacySubsystemEntityProbe.ts", import.meta.url).pathname;
const module = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { require: denseRequire, module, exports: module.exports, Int8Array, Int16Array, Math });
const { checkLegacyEntityModeListed } = module.exports;

const state = new Int8Array(10000); const packedBytes = new Int8Array(500); const packedOffsets = new Int16Array(300);
packedOffsets[164] = 100; packedOffsets[166] = 300;
state[2828 + 4] = 11;
packedBytes[300 + 11] = 3; packedBytes[300 + 12] = 6;       // rows 3..5
packedBytes[100 + 3] = 7; packedBytes[100 + 4] = -2; packedBytes[100 + 5] = 40;
const scratch = { A: 0 };
state[2929 + 4] = 40;
assert.equal(checkLegacyEntityModeListed(state, packedBytes, packedOffsets, 4, scratch), true);
assert.equal(scratch.A, 5, "A stops at the matching row");
state[2929 + 4] = 8;
assert.equal(checkLegacyEntityModeListed(state, packedBytes, packedOffsets, 4, scratch), false);
assert.equal(scratch.A, 6, "A ends at t166[type + 1]");
// t166 values are read as unsigned bytes
packedBytes[300 + 11] = -56; packedBytes[300 + 12] = -55; packedBytes[100 + 200] = 9; state[2929 + 4] = 9;
assert.equal(checkLegacyEntityModeListed(state, packedBytes, packedOffsets, 4, scratch), true);
console.log("private boolean l() OK");
