import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import vm from "node:vm";

const files = ["LegacyZElementCoordinates.ts", "LegacyZElementScan.ts"];
const module = { exports: {} };
let output = "";
for (const name of files) output += ts.transpileModule(fs.readFileSync(new URL(`../src/j2me/${name}`, import.meta.url).pathname, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
vm.runInNewContext(output, { module, exports: module.exports, require: () => module.exports, Int8Array, Int16Array });
const { scanLegacyZElementPrefix } = module.exports;

const packedBytes = new Int8Array(500); const packedOffsets = new Int16Array(312); packedOffsets[195] = 0;
packedBytes[40] = 0; packedBytes[60] = 0; const byteRows = Array.from({ length: 25 }, () => new Int8Array(8));
byteRows[0][0] = 1; byteRows[1][0] = 7; byteRows[2][0] = 9; byteRows[3][0] = 128;
const shortRows = [new Int16Array(8), new Int16Array(8)]; shortRows[0][0] = 0; shortRows[1][0] = 33;
const state = { packedBytes, packedOffsets, byteRows, shortRows, d: new Int16Array(8), k: new Int8Array(8), cBytes: new Int8Array([1]), bFlags: Array.from({ length: 20 }, () => false), ae: 0, aE: 0, N: 0, aI: 0, aJ: 0, aK: 0, aF: 0, aG: 0, aH: 0, v: -1, w: 0, y: 0, z: 0, l: 0 };
let ready;
assert.equal(scanLegacyZElementPrefix(state, 0, 11, 13, { onC: () => true, onReady: (...args) => { ready = args; } }), true);
assert.equal(ready[0], 0); assert.equal(ready[1].aI, 33); assert.equal(ready[1].aJ, 18); assert.equal(ready[1].aK, 22); assert.equal(state.bFlags[0], false);

console.log("f.a(byte,int,int) scan prefix OK");
