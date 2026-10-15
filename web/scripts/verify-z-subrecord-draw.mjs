import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import vm from "node:vm";

const file = new URL("../src/j2me/LegacyZSubrecordDraw.ts", import.meta.url).pathname;
const module = { exports: {} };
const output = ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
vm.runInNewContext(output, { module, exports: module.exports });
const { stepLegacyZSubrecordDraw } = module.exports;
const shortRows = Array.from({ length: 8 }, () => new Int16Array(16));
const byteRows = Array.from({ length: 12 }, () => new Int8Array(16));
shortRows[5][2] = 4; byteRows[9][2] = 3; shortRows[6][5] = 10; byteRows[10][5] = 2; byteRows[11][5] = 3;
let call;
stepLegacyZSubrecordDraw({ shortRows, byteRows }, 2, 30, 40, 1, { onSpriteRecord: (...args) => { call = args; } });
assert.deepEqual(call, [10, 32, 43]);
console.log("f.d(IIII) subrecord positioning OK");
