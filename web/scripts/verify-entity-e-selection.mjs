import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";
import { denseRequire } from "./dense-layout-require.mjs";

const path = `${new URL("../src/sim/units/LegacyEntityESelection.ts", import.meta.url).pathname}`;
const output = ts.transpileModule(fs.readFileSync(path, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(output, { require: denseRequire, module, exports: module.exports, Int8Array, Int16Array });
const { stepLegacyEntityESelection } = module.exports;

const make = () => ({
  state: new Int8Array(10000), packedBytes: new Int8Array(1000), packedOffsets: new Int16Array(100),
  entityId: 2,
});

const selected = make();
selected.state[2828 + 2] = 10; selected.state[2929 + 2] = 8;
selected.state[4040 + 2] = 4; selected.state[3131 + 2] = 2; selected.state[3232 + 2] = 3;
selected.state[2] = 2; selected.state[103] = 3; selected.state[4444 + 2] = 7;
selected.packedOffsets[39] = 100; selected.packedBytes[110] = 1;
selected.packedOffsets[41] = 200; selected.packedBytes[210] = 0;
selected.state[8749 + 7] = 2; selected.state[8627 + 7] = 0; selected.state[8810 + 7] = 2;
let g = 0;
assert.equal(stepLegacyEntityESelection({ ...selected, readStatus: () => 5, readRecordCheck: () => true, readSecondaryCheck: () => false, onG: () => { g += 1; } }), true);
// Offsets 165..270: the unit's own idle kind-2 record counts up.
assert.equal(selected.state[8932 + 7], 1); assert.equal(g, 0); assert.equal(selected.state[4040 + 2], -100);

// Someone else's record counts up too (owner != v); the unit's own busy
// kind-2 record does not. (Corrected 2026-09-27.)
const other = make();
for (const [k, v] of [[2828 + 2, 10], [2929 + 2, 8], [4040 + 2, 4], [3131 + 2, 2], [3232 + 2, 3], [2, 2], [103, 3], [4444 + 2, 7]]) other.state[k] = v;
other.packedOffsets[39] = 100; other.packedBytes[110] = 1;
other.state[8810 + 7] = 9; other.state[8749 + 7] = 5; other.state[8627 + 7] = 3;
stepLegacyEntityESelection({ ...other, readStatus: () => 5, readRecordCheck: () => true });
assert.equal(other.state[8932 + 7], 1);
other.state[8810 + 7] = 2; other.state[8749 + 7] = 2; other.state[4040 + 2] = 4; other.state[2929 + 2] = 8;
let reached = false;
stepLegacyEntityESelection({ ...other, readStatus: () => 5, readRecordCheck: () => { reached = true; return true; } });
assert.ok(reached);
assert.equal(other.state[8932 + 7], 1);

// Record not usable, t41 == 0: a(kind) (#288) then g(1) (#384).
const reroute = make();
for (const [k, v] of [[2828 + 2, 10], [2929 + 2, 8], [4040 + 2, 4], [3131 + 2, 2], [3232 + 2, 3], [2, 2], [103, 3], [4444 + 2, 7], [8749 + 7, 4]]) reroute.state[k] = v;
reroute.packedOffsets[39] = 100; reroute.packedBytes[110] = 1;
let asked = -1; const gArgs = [];
assert.equal(stepLegacyEntityESelection({ ...reroute, readStatus: () => 5, readRecordCheck: () => false, readSecondaryCheck: (kind) => { asked = kind; return true; }, onG: (v) => gArgs.push(v) }), true);
assert.equal(asked, 4); assert.deepEqual(gArgs, [1]);

const qBranch = make();
qBranch.state[2828 + 2] = 10; qBranch.state[2929 + 2] = 8; qBranch.state[4040 + 2] = 1;
qBranch.state[3131 + 2] = 2; qBranch.state[3232 + 2] = 3; qBranch.state[2] = 2; qBranch.state[103] = 3;
qBranch.state[4444 + 2] = 4; qBranch.packedOffsets[39] = 10; qBranch.packedBytes[20] = 1;
qBranch.packedOffsets[41] = 30; qBranch.packedBytes[40] = 14;
// Offsets 475..566: Q() runs for t41 != 0 outside 13..15 (a builder, t41 12), not inside it.
const qCount = (t41) => {
  qBranch.packedBytes[40] = t41;
  let n = 0;
  assert.equal(stepLegacyEntityESelection({ ...qBranch, readStatus: () => 1, readRecordCheck: () => false, readSecondaryCheck: () => false, onQ: () => { n += 1; } }), true);
  return n;
};
assert.equal(qCount(14), 0);
assert.equal(qCount(13), 0);
assert.equal(qCount(15), 0);
assert.equal(qCount(12), 1);
assert.equal(qCount(16), 1);

console.log("b.e() entity selector prefix OK");
