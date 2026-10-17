import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";
import { denseRequire } from "./dense-layout-require.mjs";

const path = `${new URL("../src/sim/world/LegacyBSpatialPass.ts", import.meta.url).pathname}`;
const source = fs.readFileSync(path, "utf8");
const output = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(output, { require: denseRequire, module, exports: module.exports });
const { clearSecondIntLayers, mergeIntLayers, runLegacySpatialPass } = module.exports;
const layers = Array.from({ length: 2 }, () =>
  Array.from({ length: 3 }, () => new Int32Array(96)),
);
layers[1][0][4] = 0x0f;
layers[1][1][95] = 0x30;
clearSecondIntLayers(layers);
assert.equal(layers[1][0][4], 0);
assert.equal(layers[1][1][95], 0);
layers[0][0][4] = 0x03;
layers[1][0][4] = 0x0c;
mergeIntLayers(layers);
assert.equal(layers[0][0][4], 0x0f);

const state = new Int8Array(9983);
const packedBytes = new Int8Array(17638);
const packedOffsets = new Int16Array(312);
packedOffsets[138] = 100;
packedBytes[100 + 104 + 12] = 4;
packedBytes[100 + 130 + 12] = 2;
state[1919 + 1] = 1;
state[1] = 3;
state[101 + 1] = 4;
state[4949 + 1] = 5;
state[1919 + 51] = 1;
state[2929 + 51] = 23;
state[2828 + 51] = 3;
state[51] = 6;
state[101 + 51] = 7;
state[8505 + 1] = 1;
state[8749 + 1] = 12;
state[8383 + 1] = 8;
state[8444 + 1] = 9;
const calls = [];
runLegacySpatialPass({
  state, packedBytes, packedOffsets, layers,
  onPrimarySpatialUpdate: (...args) => calls.push(["point", ...args]),
  onRectSpatialUpdate: (...args) => calls.push(["rect", ...args]),
});
assert.deepEqual(calls, [["point", 3, 4, 5], ["point", 6, 7, 0], ["rect", 8, 9, 4, 2]]);
console.log("b.d confirmed spatial pass operations OK");
