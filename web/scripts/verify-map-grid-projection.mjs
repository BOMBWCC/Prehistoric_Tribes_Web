import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const module = { exports: {} };
const output = ts.transpileModule(
  fs.readFileSync(new URL("../src/j2me/LegacyMapGridProjection.ts", import.meta.url), "utf8"),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
).outputText;
vm.runInNewContext(output, { module, exports: module.exports, Int8Array });
const { projectLegacyMapGrids } = module.exports;

const raw = { width: 2, height: 2, tiles: Uint8Array.from([1, 175, 200, 3]) };
const overlay = { values: Int8Array.from([-126, -61, -124, -127]) };
const gridB = Array.from({ length: 4 }, () => new Int8Array(4).fill(9));
const gridC = Array.from({ length: 4 }, () => new Int8Array(4).fill(9));
projectLegacyMapGrids(raw, overlay, gridB, gridC);
assert.deepEqual([...gridB[0].slice(0, 2)], [1, -81]);
assert.deepEqual([...gridB[1].slice(0, 2)], [-56, 3]);
assert.deepEqual([...gridC[0].slice(0, 2)], [-126, -61]);
assert.deepEqual([...gridC[1].slice(0, 2)], [-124, -127]);
assert.equal(gridB[3][3], 0);
assert.equal(gridC[3][3], 0);
console.log("f.aN map grid projection checks passed");
