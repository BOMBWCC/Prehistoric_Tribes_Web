import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";
import { denseRequire } from "./dense-layout-require.mjs";

const path = `${new URL("../src/sim/units/LegacyEntityHPrefix.ts", import.meta.url).pathname}`;
const output = ts.transpileModule(fs.readFileSync(path, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(output, { require: denseRequire, module, exports: module.exports, Int8Array });
const { stepLegacyEntityHPrefix } = module.exports;

// Hand-derived from b-javap.txt 5221, offsets 0..162.
const run = (type, flags, argument, m) => {
  const state = new Int8Array(10000);
  state[2828 + 3] = type; state[7979 + 3] = flags;
  stepLegacyEntityHPrefix({ state, entityId: 3, argument, k2: 9, m });
  return state;
};
assert.equal(run(10, 5, 1, 5)[4444 + 3], 9);
assert.equal(run(10, 5, 1, 5)[7979 + 3], 5, "m not 2/7: flags untouched");
assert.equal(run(10, 5, 1, 2)[7979 + 3], -123, "type 10, arg 1: | 128");
assert.equal(run(10, -1, 0, 2)[7979 + 3], 127, "arg 0: & 127");
assert.equal(run(60, -1, 1, 7)[7979 + 3], 127, "type 60: & 127");
assert.equal(run(2, 5, 1, 2)[7979 + 3], 5, "type 2, bit 128 clear: & 127");
assert.equal(run(7, -128, 1, 7)[7979 + 3], -128, "type 7, bit 128 set: | 128");
console.log("b.h(int) prefix OK");
