import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import vm from "node:vm";
import { denseRequire } from "./dense-layout-require.mjs";

const file = new URL("../src/sim/world/LegacyAuxiliaryMode4.ts", import.meta.url).pathname;
const module = { exports: {} };
const output = ts.transpileModule(fs.readFileSync(file, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
vm.runInNewContext(output, { require: denseRequire, module, exports: module.exports, Int8Array });
const { stepLegacyAuxiliaryMode4 } = module.exports;

const dense = new Int8Array(10000);
dense[1] = 12; dense[101 + 1] = 13; dense[3131 + 1] = 30; dense[3232 + 1] = 31;
const events = [];
assert.equal(stepLegacyAuxiliaryMode4({ B: 5, v: 1, dense, onO: () => events.push("o"), onNeighborMetric: () => 100, onG2: () => events.push("g2") }), false);
assert.deepEqual(events, ["o"]); assert.equal(dense[4444 + 1], -1);

dense[808 + 1] = 1; dense[6161 + 1] = 0; dense[2828 + 1] = 10;
assert.equal(stepLegacyAuxiliaryMode4({ B: 20, v: 1, dense, onG2: () => events.push("g2") }), true);
assert.equal(dense[6262 + 1], 30); assert.equal(dense[6363 + 1], 31);
console.log("b.a(IIII) mode 4 continuation OK");
