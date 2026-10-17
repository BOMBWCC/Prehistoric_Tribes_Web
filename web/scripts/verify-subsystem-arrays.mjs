import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";

const path = `${new URL("../src/core/LegacySubsystemArrays.ts", import.meta.url).pathname}`;
const source = fs.readFileSync(path, "utf8");
const output = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(output, { module, exports: module.exports });
const arrays = new module.exports.LegacySubsystemArrays();
assert.deepEqual([arrays.a.length, arrays.a[0].length, arrays.a[0][0].length], [2, 101, 80]);
assert.deepEqual([arrays.b.length, arrays.b[0].length, arrays.b[0][0].length], [2, 22, 5]);
assert.deepEqual([arrays.d.length, arrays.d[0].length, arrays.d[0][0].length], [3, 2, 96]);
assert.deepEqual([arrays.e.length, arrays.e[0].length, arrays.e[0][0].length], [2, 3, 10]);
assert.deepEqual([arrays.gRows.length, arrays.gRows[0].length], [3, 20]);
assert.equal(arrays.j.length, 50);
assert.deepEqual([...arrays.j], Array.from({ length: 50 }, (_, index) => index));
assert.deepEqual([...arrays.jInts], [56, 55, 51, 57, 49]);
console.log("b subsystem allocation shapes OK");
