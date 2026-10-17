import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import vm from "node:vm";

const file = new URL("../src/sim/world/LegacyAuxiliaryModeWrites.ts", import.meta.url).pathname;
const module = { exports: {} };
const output = ts.transpileModule(fs.readFileSync(file, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
vm.runInNewContext(output, { module, exports: module.exports, Int8Array, Int16Array });
const { applyLegacyAuxiliaryModeWrites } = module.exports;

const dense = new Int8Array(10000);
const offsets = new Int16Array(312);
offsets[31] = 100; offsets[32] = 200; offsets[112] = 300; offsets[113] = 400;
dense[8282 + 4] = 1;
let result = applyLegacyAuxiliaryModeWrites({ mode: 2, B: 0, x: 5, y: 7, offsetX: 2, offsetY: -1, v: 4, dense, packedOffsets: offsets });
assert.equal(result.accepted, true); assert.equal(result.returnedTrue, true);
assert.equal(dense[300 + 4 + 5 + 2], 7);
assert.equal(dense[400 + 4 + 7 - 1], 6);

result = applyLegacyAuxiliaryModeWrites({ mode: 3, B: 0, x: 5, y: 7, offsetX: 2, offsetY: -1, v: 4, dense, packedOffsets: offsets });
assert.equal(result.returnedTrue, true);
assert.equal(dense[100 + 4 + 5 + 2 + 1], 8);

let continued = false;
result = applyLegacyAuxiliaryModeWrites({ mode: 4, B: 95, x: 1, y: 2, offsetX: 0, offsetY: 0, v: 1, dense, packedOffsets: offsets, onMode4Continuation: () => { continued = true; } });
assert.equal(result.accepted, true); assert.equal(result.returnedTrue, false); assert.equal(continued, true);
assert.equal(applyLegacyAuxiliaryModeWrites({ mode: 4, B: 94, x: 0, y: 0, offsetX: 0, offsetY: 0, v: 1, dense, packedOffsets: offsets }).accepted, false);
console.log("b.a(IIII) mode 1..4 write segment OK");
