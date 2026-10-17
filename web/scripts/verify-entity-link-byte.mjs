import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import vm from "node:vm";
import { denseRequire } from "./dense-layout-require.mjs";

function loadModule(file) {
  const module = { exports: {} };
  const output = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(output, { require: denseRequire, module, exports: module.exports, Int8Array });
  return module.exports;
}

const { writeLegacyEntityLinkByte } = loadModule(
  new URL("../src/sim/units/LegacyEntityLinkByte.ts", import.meta.url).pathname,
);

const state = new Int8Array(10000);
const bCube = [
  Array.from({ length: 5 }, () => new Int8Array(30)),
  Array.from({ length: 5 }, () => new Int8Array(30)),
];
state[8810 + 4] = 12;
bCube[0][0][3] = 4;
assert.equal(writeLegacyEntityLinkByte({ state, entityId: 12, value: 85, bCube }), 3);
assert.equal(bCube[0][4][3], 85);

const other = new Int8Array(10000);
const otherCube = [
  Array.from({ length: 5 }, () => new Int8Array(30)),
  Array.from({ length: 5 }, () => new Int8Array(30)),
];
other[8810 + 31] = 60; otherCube[1][0][2] = 31;
assert.equal(writeLegacyEntityLinkByte({ state: other, entityId: 60, value: -1, bCube: otherCube }), 2);
assert.equal(otherCube[1][4][2], -1);

console.log("f.a(int,byte) entity link write OK");
