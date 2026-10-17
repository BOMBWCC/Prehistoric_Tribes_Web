import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";

const path = `${new URL("../src/sim/world/LegacyMapRleDecoder.ts", import.meta.url).pathname}`;
const source = fs.readFileSync(path, "utf8");
const output = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(output, { module, exports: module.exports });
const { decodeLegacyMapTiles } = module.exports;

const packedBytes = new Int8Array(512);
const packedOffsets = new Int16Array(312);
const maBytes = new Uint8Array([251, 5, 6]);
const maOffsets = [0];
packedOffsets[149] = 10;
packedBytes[12] = 2;
packedBytes[13] = 3;
packedOffsets[248] = 20;
packedBytes[21] = 0;
packedOffsets[197] = 30;
packedBytes[30] = 10;
packedBytes[31] = 127;
packedBytes[37] = 7;
const result = decodeLegacyMapTiles({ packedBytes, packedOffsets, maBytes, maOffsets }, 1);
assert.deepEqual([result.width, result.height, result.streamSection, result.bytesConsumed], [2, 3, 0, 1]);
assert.deepEqual([...result.tiles], [7, 7, 7, 7, 7, 7]);
console.log("/ma raw map tile decoder OK");
