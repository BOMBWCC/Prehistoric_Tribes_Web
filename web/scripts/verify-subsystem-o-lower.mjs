import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import vm from "node:vm";

const file = new URL("../src/j2me/LegacySubsystemOLower.ts", import.meta.url).pathname;
const module = { exports: {} };
const output = ts.transpileModule(fs.readFileSync(file, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
vm.runInNewContext(output, { module, exports: module.exports, Int8Array });
const { stepLegacySubsystemOLower } = module.exports;

const dense = new Int8Array(10000); const flags = [false, false, false];
dense[4848 + 4] = 2; dense[101 + 4] = 11; dense[4] = 12; dense[3232 + 4] = 21; dense[3131 + 4] = 22;
const args = [];
stepLegacySubsystemOLower({ dense, flags, v: 4, onBFourByte: (...values) => { args.push(values); return -7; } });
assert.equal(dense[4848 + 4], 0); assert.equal(flags[2], true); assert.equal(dense[808 + 4], -7);
assert.deepEqual(args, [[11, 12, 21, 22]]);
console.log("b.o() state writes OK");
