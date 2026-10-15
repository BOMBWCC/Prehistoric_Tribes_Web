import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import vm from "node:vm";

const file = new URL("../src/j2me/LegacyZI.ts", import.meta.url).pathname;
const output = ts.transpileModule(fs.readFileSync(file, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(output, { module, exports: module.exports });
const { resetLegacyZI } = module.exports;

const state = {
  staticM: true, staticL: true, inputRight: true, inputLeft: true,
  inputDown: true, inputUp: true, inputV: true, iFlag: true,
  E: 99, wFlag: true, iByte: 7, inputT: true,
  nInt: 42,
};
resetLegacyZI(state);
assert.deepEqual(state, {
  staticM: false, staticL: false, inputRight: false, inputLeft: false,
  inputDown: false, inputUp: false, inputV: false, iFlag: false,
  E: 4, wFlag: false, iByte: -1, inputT: false,
  nInt: 0,
});

console.log("resetLegacyZI (private void i(), #610) OK");
