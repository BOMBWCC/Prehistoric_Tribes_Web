import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";

const path = `${new URL("../src/sim/world/LegacyEntityPartition.ts", import.meta.url).pathname}`;
const source = fs.readFileSync(path, "utf8");
const output = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(output, { module, exports: module.exports });
const { legacyEntityPartition } = module.exports;

assert.equal(legacyEntityPartition(0), 2);
assert.equal(legacyEntityPartition(1), 0);
assert.equal(legacyEntityPartition(50), 0);
assert.equal(legacyEntityPartition(51), 1);
assert.equal(legacyEntityPartition(100), 1);
assert.equal(legacyEntityPartition(101), 2);
console.log("f.a(int) raw entity partition lookup OK");
