import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { denseRequire } from "./dense-layout-require.mjs";

function loadModule(file) {
  const module = { exports: {} };
  const output = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(output, { require: denseRequire, module, exports: module.exports, Int8Array, Int16Array });
  return module.exports;
}

const { stepLegacyEntityCoordinateUpdate } = loadModule(new URL("../src/ui/LegacyEntityCoordinateUpdate.ts", import.meta.url).pathname);
const dense = new Int8Array(10000);
const packedBytes = new Int8Array(312);
const packedOffsets = new Int16Array(312);
dense[5] = 21;
dense[106] = 31;
const state = { J: 8, I: 9, L: 10, K: 11, C: 3, D: 4, AFlag: false };
let normalized = 0;
stepLegacyEntityCoordinateUpdate({ state, id: 5, offset: 2, dense, packedBytes, packedOffsets, onViewportNormalize: () => { normalized += 1; } });
assert.deepEqual([state.J, state.L, state.I, state.K, state.AFlag], [9, 11, 18, 29, true]);
assert.equal(normalized, 1);

// id===-100: I = I-C, K = K-D+offset (bug fix 2026-08-18 -- was K-D-offset).
const negative = { J: 0, I: 5, L: 0, K: 6, C: 2, D: 3, AFlag: false };
stepLegacyEntityCoordinateUpdate({ state: negative, id: -100, offset: 1, dense, packedBytes, packedOffsets });
assert.deepEqual([negative.I, negative.K, negative.AFlag], [3, 4, true]);

console.log("f(int,int) coordinate branches passed");
