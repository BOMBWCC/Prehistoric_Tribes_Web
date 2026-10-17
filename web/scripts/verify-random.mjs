import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";

const path = `${new URL("../src/platform/LegacyRandom.ts", import.meta.url).pathname}`;
const source = fs.readFileSync(path, "utf8");
const output = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(output, { module, exports: module.exports, BigInt });
const { LegacyRandom, legacyRandomRemainder } = module.exports;

const random = new LegacyRandom(1);
assert.deepEqual([random.nextInt(), random.nextInt(), random.nextInt()], [
  -1155869325,
  431529176,
  1761283695,
]);
const masked = new LegacyRandom(1);
assert.equal(legacyRandomRemainder(masked, 15, 7), 3);
assert.equal(legacyRandomRemainder(masked, 15, 7), 1);
console.log("java.util.Random(1) and f.a(int,int) helper OK");
