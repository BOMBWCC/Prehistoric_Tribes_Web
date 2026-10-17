import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import vm from "node:vm";

const file = new URL("../src/sim/units/LegacyEntityRecordCompletion.ts", import.meta.url).pathname;
const module = { exports: {} };
const output = ts.transpileModule(fs.readFileSync(file, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
vm.runInNewContext(output, { module, exports: module.exports });
const { completeLegacyEntityRecord } = module.exports;

const armed = { w: 2, q: 12, P: false };
completeLegacyEntityRecord(armed, 12);
assert.equal(armed.P, true);

const wrongRecord = { w: 2, q: 12, P: false };
completeLegacyEntityRecord(wrongRecord, 13);
assert.equal(wrongRecord.P, false);

const wrongMode = { w: 1, q: 12, P: false };
completeLegacyEntityRecord(wrongMode, 12);
assert.equal(wrongMode.P, false);

console.log("f.d(int) entity record completion OK");
