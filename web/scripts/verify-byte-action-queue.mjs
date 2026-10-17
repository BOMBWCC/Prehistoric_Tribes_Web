import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const module = { exports: {} };
const output = ts.transpileModule(
  fs.readFileSync(new URL("../src/ui/LegacyByteActionQueue.ts", import.meta.url), "utf8"),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
).outputText;
vm.runInNewContext(output, { module, exports: module.exports, Int8Array, Int32Array });
const { stepLegacyByteActionQueue } = module.exports;

const make = () => ({
  c: 1, u: 0, ay: 0,
  uBytes: new Int8Array(10),
  kMatrix: Array.from({ length: 3 }, () => new Int8Array(10)),
  gCounters: new Int32Array(10),
  selectionFlags: Array.from({ length: 10 }, () => false),
});

const state = make();
stepLegacyByteActionQueue(state, 8, 11, 12, 13);
assert.deepEqual([...state.uBytes.slice(0, 2)], [8, 0]);
assert.deepEqual([...state.kMatrix.map((row) => row[0])], [11, 12, 13]);
// Offsets 342..412: ay is written only behind `a[1] || a[9]` (oracle run 5, frame 12630).
assert.equal(state.ay, 0);
{
  const flagged = make();
  flagged.selectionFlags[9] = true;
  stepLegacyByteActionQueue(flagged, 8, 11, 12, 13);
  assert.equal(flagged.ay, 1);
}

state.selectionFlags[1] = true;
let callback;
state.onSelectionRefresh = (...args) => { callback = args; };
stepLegacyByteActionQueue(state, 100, 0, 0, 0);
assert.equal(state.gCounters[0], 1);
// f.a(BBBB) offsets 366..381: a(a[0], true, false, a[4]).
assert.deepEqual(callback, [false, true, false, false]);
for (let i = 0; i < 4; i += 1) stepLegacyByteActionQueue(state, 100, 0, 0, 0);
assert.deepEqual([...state.uBytes.slice(0, 2)], [0, 0]);
assert.deepEqual(callback, [false, true, false, false]);
assert.equal(state.ay, 0);

const blocked = make();
blocked.c = 0;
stepLegacyByteActionQueue(blocked, 8, 1, 2, 3);
assert.equal(blocked.uBytes[0], 0);
// Offsets 315..341 (oracle run 6, frame 4584): after a shift, g[0] restarts only when exactly one
// entry is left; an emptied queue keeps its counter.
{
  const two = make();
  stepLegacyByteActionQueue(two, 8, 1, 1, 0);
  stepLegacyByteActionQueue(two, 9, 2, 2, 0);
  two.gCounters[0] = 2;
  stepLegacyByteActionQueue(two, 100, 0, 0, 0); // u[1] != 0 and g[0] 3 > 1: shift, one entry left
  assert.deepEqual([two.uBytes[0], two.uBytes[1], two.gCounters[0]], [9, 0, 0]);
  const one = make();
  stepLegacyByteActionQueue(one, 8, 1, 1, 0);
  one.gCounters[0] = 4;
  stepLegacyByteActionQueue(one, 100, 0, 0, 0); // g[0] 5 > 4: shift, queue empty
  assert.deepEqual([one.uBytes[0], one.gCounters[0]], [0, 1]);
}
console.log("byte action queue parity checks passed");
