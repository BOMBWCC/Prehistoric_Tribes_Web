import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";

const path = `${new URL("../src/platform/BinaryResource.ts", import.meta.url).pathname}`;
const output = ts.transpileModule(fs.readFileSync(path, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(output, { module, exports: module.exports, Uint8Array });
const { findTableAReadFailure, replayTableAPrefix, diagnoseTableA } = module.exports;

const bytes = new Uint8Array(34 + 2);
bytes[0] = 0x20;
bytes[1] = 0x00;
bytes[34 + 0] = 0x3b;
bytes[34 + 1] = 0x3b;
assert.equal(JSON.stringify(findTableAReadFailure(bytes, 100)), JSON.stringify({ record: 1, length: 15163, offset: 32, end: 15195 }));
assert.equal(findTableAReadFailure(new Uint8Array([2, 0, 0xaa, 0xbb])), undefined);
const prefix = replayTableAPrefix(new Uint8Array([2, 0, 0xaa, 0xbb, 0x05, 0x00, 1, 2]));
assert.equal(prefix.loadedRecords, 1);
assert.deepEqual(Array.from(prefix.bytes.slice(0, 2)), [0xaa, 0xbb]);
assert.equal(prefix.offsets[1], 2);
assert.equal(JSON.stringify(prefix.firstInvalidRead), JSON.stringify({ record: 1, length: 5, offset: 2, end: 7 }));
const original = new Uint8Array(fs.readFileSync(new URL("../../extracted/a", import.meta.url)));
const originalFailure = findTableAReadFailure(original);
assert.equal(originalFailure, undefined);
const originalPrefix = replayTableAPrefix(original);
assert.equal(originalPrefix.loadedRecords, 312);
assert.equal(originalPrefix.offsets[311], 16951);
assert.equal(originalPrefix.bytes.length, 17638);
assert.equal(originalPrefix.offsets[149], 7262);
assert.equal(originalPrefix.offsets[197], 10162);
assert.equal(originalPrefix.offsets[248], 12263);
assert.equal(originalPrefix.offsets[280], 16084);
assert.equal(originalPrefix.offsets[281], 16212);
console.log("e.f() /a destination-read diagnostic OK");
