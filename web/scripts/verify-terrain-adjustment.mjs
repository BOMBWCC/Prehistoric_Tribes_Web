import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";

const path = `${new URL("../src/j2me/LegacyTerrainAdjustment.ts", import.meta.url).pathname}`;
const source = fs.readFileSync(path, "utf8");
const output = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(output, { module, exports: module.exports, Uint8Array });
const { applyLegacyTerrainAdjustment } = module.exports;

const raw = {
  width: 5,
  height: 1,
  tiles: new Uint8Array([0, 8, 9, 255, 1]),
  streamSection: 2,
  bytesConsumed: 4,
};
const calls = [];
const adjusted = applyLegacyTerrainAdjustment(raw, (mask, divisor) => {
  calls.push([mask, divisor]);
  return calls.length - 1;
});
assert.deepEqual([...raw.tiles], [0, 8, 9, 255, 1]);
assert.deepEqual([...adjusted.tiles], [0, 9, 9, 255, 3]);
assert.deepEqual(calls, [[3, 3], [3, 3], [3, 3]]);
console.log("f.aN terrain adjustment OK");
