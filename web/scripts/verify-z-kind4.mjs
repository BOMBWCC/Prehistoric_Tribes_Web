import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import vm from "node:vm";

const file = new URL("../src/render/LegacyZKind4.ts", import.meta.url).pathname;
const module = { exports: {} };
const output = ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
vm.runInNewContext(output, { module, exports: module.exports });
const { stepLegacyZKind4 } = module.exports;
const rows = Array.from({ length: 25 }, () => new Int8Array(16));
rows[21][3] = 5; rows[22][3] = 6; rows[23][3] = 20; rows[24][3] = 4;
const calls = [];
stepLegacyZKind4({ aI: 3, aJ: 10, aK: 20, byteRows: rows }, { onSetClip: (...args) => calls.push(args) });
stepLegacyZKind4({ aI: 1, aJ: 10, aK: 20, byteRows: rows }, { onSetClip: (...args) => calls.push(args) });
assert.deepEqual(calls, [[26, 34, 20, 4], [0, 0, 528, 704]]);
console.log("f.d(4,command) fill rectangles OK");
