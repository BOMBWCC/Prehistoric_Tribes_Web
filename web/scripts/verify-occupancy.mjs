import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";

const path = `${new URL("../src/sim/world/LegacyOccupancyClass.ts", import.meta.url).pathname}`;
const source = fs.readFileSync(path, "utf8");
const output = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(output, { module, exports: module.exports });
const { legacyOccupancyClass } = module.exports;

const layers = Array.from({ length: 2 }, () =>
  Array.from({ length: 3 }, () => new Int32Array(96)),
);
assert.equal(legacyOccupancyClass(layers, 3, 3), 2);
layers[0][0][3] = 1 << 3;
assert.equal(legacyOccupancyClass(layers, 3, 3), 1);
layers[1][0][3] = 1 << 3;
assert.equal(legacyOccupancyClass(layers, 3, 3), 0);
assert.equal(legacyOccupancyClass(layers, 3, 3 + 32), 2);
console.log("f.a(int,int) occupancy class lookup OK");
