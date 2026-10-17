import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import vm from "node:vm";
import { denseRequire } from "./dense-layout-require.mjs";

const file = new URL("../src/sim/world/LegacyAuxiliaryModes67.ts", import.meta.url).pathname;
const module = { exports: {} };
const output = ts.transpileModule(fs.readFileSync(file, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
vm.runInNewContext(output, { require: denseRequire, module, exports: module.exports, Int8Array, Int16Array });
const { stepLegacyAuxiliaryModes67 } = module.exports;

const dense = new Int8Array(10000);
dense[1919 + 60] = 1; dense[7979 + 3] = 3;
const positive = [];
assert.equal(stepLegacyAuxiliaryModes67({ mode: 7, B: 60, C: 0, x: 0, y: 0, offsetX: 0, offsetY: 0, u: 0, v: 3, dense, packedBytes: new Int8Array(200), packedOffsets: new Int16Array(312), onMode7Positive: (id) => positive.push(id) }), true);
assert.deepEqual(positive, [60]); assert.equal(dense[7979 + 3], 2);

const mode6 = []; dense[1919 + 51] = 1; dense[9601 + 2] = 0;
assert.equal(stepLegacyAuxiliaryModes67({ mode: 6, B: 51, C: 0, x: 4, y: 5, offsetX: 1, offsetY: -1, u: 0, v: 2, dense, packedBytes: new Int8Array(200), packedOffsets: new Int16Array(312), onMode6Record: (...args) => mode6.push(args) }), true);
assert.deepEqual(mode6, [[5, 4, 51, 50]]);
console.log("b.a(IIII) mode 6/7 gates OK");
