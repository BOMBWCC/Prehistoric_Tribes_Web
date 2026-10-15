import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";

const path = `${new URL("../src/j2me/LegacySubsystemDecision.ts", import.meta.url).pathname}`;
const output = ts.transpileModule(fs.readFileSync(path, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(output, { module, exports: module.exports, Int8Array });
const { legacySubsystemDecision } = module.exports;
const packedBytes = new Int8Array(17638);
const packedOffsets = new Int16Array(312);
packedOffsets[236] = 100;
packedOffsets[238] = 200;
packedBytes[200 + 2] = 3;
packedBytes[100 + 3] = 8;
const base = { fN: false, fL: false, bO: 10, bK: 50, bN: 3, fQ: 2, packedBytes, packedOffsets };
assert.equal(legacySubsystemDecision({ ...base, fV: 0 }), 1);
assert.equal(legacySubsystemDecision({ ...base, fV: 1, bK: 49 }), 2);
assert.equal(legacySubsystemDecision({ ...base, fV: 1, bK: 50 }), 1);
assert.equal(legacySubsystemDecision({ ...base, fV: 0, bO: 9 }), 0);
assert.equal(legacySubsystemDecision({ ...base, fV: 1, fN: true }), 1);
console.log("b.k() raw subsystem decision OK");
