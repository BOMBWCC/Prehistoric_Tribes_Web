import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import vm from "node:vm";

const file = new URL("../src/render/LegacyZElementCoordinates.ts", import.meta.url).pathname;
const module = { exports: {} };
const output = ts.transpileModule(fs.readFileSync(file, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
vm.runInNewContext(output, { module, exports: module.exports, Int8Array, Int16Array });
const { prepareLegacyZElementCoordinates } = module.exports;

const byteRows = [new Int8Array(16), new Int8Array(16), new Int8Array(16)]; const shortRows = [new Int16Array(16), new Int16Array(16)];
shortRows[1][4] = (2 << 14) | (1 << 12) | 37; byteRows[1][4] = 8; byteRows[2][4] = 9;
const state = { byteRows, shortRows, aI: 0, aJ: 0, aK: 0 };
prepareLegacyZElementCoordinates(state, 4, 5, 11, 13);
assert.deepEqual([state.aI, state.aJ, state.aK], [37, 8 + 11 + 256, 9 + 13 + 128]);
prepareLegacyZElementCoordinates(state, 4, 14, 11, 13);
assert.deepEqual([state.aI, state.aJ, state.aK], [37, 8 + 120 + 256, 9 + 110 + 128]);

console.log("f.a(byte,int,int) coordinate prefix OK");
