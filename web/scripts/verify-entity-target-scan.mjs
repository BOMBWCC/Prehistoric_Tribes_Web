import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";
import { denseRequire } from "./dense-layout-require.mjs";

const path = `${new URL("../src/sim/units/LegacyEntityTargetScan.ts", import.meta.url).pathname}`;
const output = ts.transpileModule(fs.readFileSync(path, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(output, { require: denseRequire, module, exports: module.exports, Int8Array, Int16Array });
const { scanLegacyEntityTargets } = module.exports;

const state = new Int8Array(10000);
const packedBytes = new Int8Array(2000);
const packedOffsets = new Int16Array(200);
packedOffsets[138] = 200;
packedBytes[packedOffsets[138] + 104 + 5] = 2; packedBytes[packedOffsets[138] + 130 + 5] = 2;
packedBytes[packedOffsets[138] + 156 + 5] = -1;
state[2] = 10; state[101 + 2] = 10; state[2828 + 2] = 5;
state[8505 + 1] = 1; state[8749 + 1] = 5; state[8383 + 1] = 8; state[8444 + 1] = 9;
const result = scanLegacyEntityTargets({ state, packedBytes, packedOffsets, partition: 0, entityId: 2, targetType: 5 });
assert.equal(result.found, true); assert.equal(result.targetId, 1); assert.equal(result.score, 5);
assert.equal(state[3131 + 2], 10); assert.equal(state[3232 + 2], 10);

// Offsets 236..282: a record with 8932 workers is skipped once 8932 >= t138[(level - 1) * 26 + type].
for (const [workers, found] of [[2, true], [3, false]]) {
  const st = new Int8Array(10000);
  const pb = new Int8Array(2000);
  pb[200 + 104 + 5] = 2; pb[200 + 130 + 5] = 2; pb[200 + 156 + 5] = -1;
  pb[200 + 1 * 26 + 5] = 3; // level 2's capacity for type 5
  st[2] = 10; st[101 + 2] = 10; st[2828 + 2] = 5;
  st[8505 + 1] = 1; st[8749 + 1] = 5; st[8383 + 1] = 8; st[8444 + 1] = 9; st[9115 + 1] = 2; st[8932 + 1] = workers;
  const r = scanLegacyEntityTargets({ state: st, packedBytes: pb, packedOffsets, partition: 0, entityId: 2, targetType: 5 });
  assert.equal(r.found, found, `${workers} workers`);
}
console.log("a(int) target scan prefix OK");
