import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";
import { denseRequire } from "./dense-layout-require.mjs";

const path = `${new URL("../src/sim/units/LegacyEntityGPrefix.ts", import.meta.url).pathname}`;
const output = ts.transpileModule(fs.readFileSync(path, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(output, { require: denseRequire, module, exports: module.exports, Int8Array });
const { stepLegacyEntityGPrefix } = module.exports;

const state = new Int8Array(10000);
state[6161 + 3] = 2; state[101 + 3] = 4; state[3] = 5;
state[3131 + 3] = 5; state[3232 + 3] = 4;
const events = [];
assert.equal(stepLegacyEntityGPrefix({ state, entityId: 3, argument: 1, partition: 1, currentI: 1, fQ: 0, fFlag: 0, readEntityCell: () => 3, onCalculateM: () => 4, readL: () => 10, onQ: () => events.push("Q"), onAByteIntInt: (...args) => events.push(args) }), "returned");
assert.equal(state[6161 + 3], 1); assert.equal(state[7777 + 3], 3); assert.deepEqual(events, ["Q", [10, 3, 3]]);
assert.equal(state[3131 + 3], 5); assert.equal(state[3232 + 3], 4);

// Offsets 205..222 (b-javap.txt 5038): l < 0, or l == 10 with arg >= 2, goes to
// 312 = h(arg); every other l resets the target and calls Q(). CORRECTED
// 2026-09-14: this case used to expect h() for l == 0, the port's inversion.
const run = (l, argument) => {
  const st = new Int8Array(10000); st[3] = 8; st[101 + 3] = 9; st[3131 + 3] = 1; st[3232 + 3] = 2;
  const log = [];
  const result = stepLegacyEntityGPrefix({ state: st, entityId: 3, argument, partition: 0, currentI: 0, fQ: 0, fFlag: 0,
    readEntityCell: () => 3, readL: () => l, onH: (arg) => log.push(["h", arg]), onQ: () => log.push("Q") });
  return [result, log, st[3131 + 3], st[3232 + 3]];
};
assert.deepEqual(run(-1, 3), ["h", [["h", 3]], 1, 2]);
assert.deepEqual(run(10, 2), ["h", [["h", 2]], 1, 2]);
assert.deepEqual(run(0, 3), ["returned", ["Q"], 8, 9]);
assert.deepEqual(run(10, 1), ["returned", ["Q"], 8, 9]);
console.log("b.g(int) prefix OK");
