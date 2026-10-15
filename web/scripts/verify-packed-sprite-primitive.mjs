import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import vm from "node:vm";

const file = new URL("../src/j2me/LegacyPackedSpritePrimitive.ts", import.meta.url).pathname;
const module = { exports: {} };
const output = ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
vm.runInNewContext(output, { module, exports: module.exports });
const { drawLegacyPackedSpritePrimitive } = module.exports;
const rows = Array.from({ length: 25 }, () => new Int8Array(8));
rows[20][1] = 29; rows[21][1] = 2; rows[22][1] = 3; rows[23][1] = 9; rows[24][1] = 4;
const colors = Array.from({ length: 18 }, () => new Int8Array(8)); colors[17][0] = 1; colors[17][1] = 2; colors[17][2] = 3;
const calls = [];
drawLegacyPackedSpritePrimitive({ byteRows: rows, colorRows: colors, typeOverride: -1 }, 1, 10, 20, { onColor: (...args) => calls.push(["color", ...args]), onFillRect: (...args) => calls.push(["fill", ...args]) });
assert.deepEqual(calls, [["color", 0, 0, 0], ["fill", 12, 23, 9, 4]]);
console.log("packed sprite primitive branches OK");
