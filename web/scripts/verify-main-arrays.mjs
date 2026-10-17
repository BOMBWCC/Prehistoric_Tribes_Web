import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";

const cache = new Map();
function loadModule(path) {
  if (cache.has(path)) return cache.get(path).exports;
  const module = { exports: {} };
  cache.set(path, module);
  const source = fs.readFileSync(path, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(output, { module, exports: module.exports, require: () => {
    throw new Error("LegacyMainArrays has no runtime imports");
  }});
  return module.exports;
}

const { LegacyMainArrays } = loadModule(
  `${new URL("../src/core/LegacyMainArrays.ts", import.meta.url).pathname}`,
);
const arrays = new LegacyMainArrays();
assert.deepEqual([arrays.g.length, arrays.g[0].length], [21, 11]);
assert.deepEqual([arrays.aInt.length, arrays.aInt[0].length, arrays.aInt[0][0].length], [2, 3, 96]);
assert.deepEqual([arrays.aByte.length, arrays.aByte[0].length], [5, 50]);
assert.deepEqual([arrays.aShort.length, arrays.aShort[0].length], [2, 26]);
assert.deepEqual([arrays.d.length, arrays.d[0].length], [7, 40]);
assert.equal(arrays.f.length, 12);
assert.deepEqual([arrays.e.length, arrays.e[0].length], [3, 30]);
assert.deepEqual([arrays.aByte3.length, arrays.aByte3[0].length, arrays.aByte3[0][0].length], [2, 10, 12]);
assert.deepEqual([arrays.f4.length, arrays.f4[0].length], [4, 30]);
// `b` (byte[2][5][30], f.b:[[[B]#237) removed 2026-08-24: it was a
// disconnected duplicate of game.xSlotTable, which already covers this
// shape -- see LegacyGameState.ts's own xSlotTable docblock.
assert.equal(arrays.b, undefined);
console.log("f.g allocation shapes OK");
