import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import vm from "node:vm";

const file = new URL("../src/text/LegacyGeometryRenderer.ts", import.meta.url).pathname;
const source = fs.readFileSync(file, "utf8");
const output = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(output, { module, exports: module.exports });
const { LegacyGeometryRenderer } = module.exports;

const packedBytes = new Int8Array(512);
const packedOffsets = new Int16Array(312);
packedOffsets[281] = 100;
packedOffsets[283] = 120;
packedOffsets[284] = 130;
packedBytes[126] = 3;
packedBytes[134] = 4;
packedBytes[135] = 7;
packedBytes[136] = 7;

const tables = {
  rowFShort: new Int16Array([50, 80]),
  rowDByte: new Int8Array([1, 1]),
  rowEByte: new Int8Array([2, 2]),
  rowEShort: new Int16Array([20, 30]),
  geometryC: [new Int8Array([0]), new Int8Array([0])],
  geometryB: [new Int8Array([14, 17]), new Int8Array([14, 17])],
  rowZh: [null, null],
};
const renderer = new LegacyGeometryRenderer(packedBytes, packedOffsets, tables, () => 2);
const commands = renderer.emit();
assert.equal(commands[0].height, 3);
assert.equal(commands[0].x, 11 + 50 - Math.trunc((3 + 0) / 2));
assert.equal(commands[1].height, 3);
assert.equal(commands[1].x, 11 + 80 - Math.trunc((3 + 3) / 2));
assert.equal(commands[1].sourceX, 4);
console.log("c.a(Graphics) geometry renderer parity OK");
