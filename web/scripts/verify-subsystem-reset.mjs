import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";

const path = `${new URL("../src/j2me/LegacySubsystemArrays.ts", import.meta.url).pathname}`;
const output = ts.transpileModule(fs.readFileSync(path, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(output, { module, exports: module.exports, Int8Array, Array });
const arrays = new module.exports.LegacySubsystemArrays();
arrays.c[0][0][0] = 7;
arrays.c[4][5][5] = 12;
arrays.resetNCube();
for (const layer of arrays.c) {
  for (const row of layer) assert.deepEqual([...row], [-1, -1, -1, -1, -1, -1]);
}
console.log("b.n() confirmed c[5][6][6] reset OK");
