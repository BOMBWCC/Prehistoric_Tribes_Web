import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import vm from "node:vm";

const file = new URL("../src/j2me/LegacyPathPreparation.ts", import.meta.url).pathname;
const module = { exports: {} };
const output = ts.transpileModule(fs.readFileSync(file, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
vm.runInNewContext(output, { module, exports: module.exports, Int8Array });
const { prepareLegacyPath } = module.exports;

const pathData = Array.from({ length: 3 }, () => [new Int8Array(8), new Int8Array(8), new Int8Array(8)]);
pathData[0][0].set([4, 5, 6]); pathData[0][1].set([2, 2, 2]);
const eRows = Array.from({ length: 2 }, () => Array.from({ length: 3 }, () => new Int8Array(10)));
const eValues = Int8Array.from([1, 3, 2]);
const h = new Int8Array(10);
const map = Array.from({ length: 8 }, () => new Int8Array(8));
const mapMirror = Array.from({ length: 8 }, () => new Int8Array(8));
map[2][4] = 1; map[2][5] = 1; map[2][6] = 0;
mapMirror[2][4] = 20; mapMirror[2][5] = 21;
const state = { d: 0, c: 0, b: 0, e: 0 };
const events = [];
prepareLegacyPath({
  arg1: 10, arg2: 11, arg3: 12, arg4: 13, mode: 0,
  pathData, eRows, eValues, f: Int8Array.from([3, 0, 0]), g: new Int8Array(3), h,
  map, mapMirror, state,
  onRelativePreparation: (dx, dy) => events.push(["relative", dx, dy]),
  onE: (mode) => {
    events.push(["e", mode]);
    pathData[0][0].set([4, 5, 6]); pathData[0][1].set([2, 2, 2]);
  },
  onCellValue: () => 1,
});
assert.deepEqual(events, [["relative", 2, 2], ["e", 0]]);
assert.equal(state.c, 1);
assert.deepEqual(Array.from(eRows[0][0].slice(0, 1)), [10]);
assert.deepEqual(Array.from(eRows[0][1].slice(0, 1)), [11]);
assert.equal(eRows[0][2][0], -1);
assert.equal(eRows[1][0][0], 6);
assert.equal(h[0], 0);
console.log("b.a(IIIII) path preparation OK");
