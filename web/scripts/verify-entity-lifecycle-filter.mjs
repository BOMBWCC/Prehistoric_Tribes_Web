import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";
import { denseRequire } from "./dense-layout-require.mjs";

const path = `${new URL("../src/sim/units/LegacyEntityLifecycleFilter.ts", import.meta.url).pathname}`;
const output = ts.transpileModule(fs.readFileSync(path, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(output, { require: denseRequire, module, exports: module.exports, Int8Array, Int16Array });
const { filterLegacyEntityLifecycle } = module.exports;

const state = new Int8Array(10000); const packedBytes = new Int8Array(1000); const packedOffsets = new Int16Array(200);
packedOffsets[18] = 100; packedOffsets[173] = 200; packedOffsets[174] = 300; packedOffsets[176] = 400; packedOffsets[177] = 500;
state[8993 + 1] = 2; state[4545 + 2] = 0; state[4646 + 2] = 1; state[2929 + 2] = 7; state[8749 + 1] = 10;
packedBytes[200 + 0] = 2; packedBytes[300 + 10] = 0; packedBytes[400 + 0] = 3; packedBytes[500 + 10] = 0;
let action;
filterLegacyEntityLifecycle({ state, packedBytes, packedOffsets, entityId: 1, enabled: true, onAction: (...args) => { action = args; } });
assert.deepEqual(action, [2, 1, 0, 0]);
console.log("f.a(int,boolean) lifecycle filter OK");
