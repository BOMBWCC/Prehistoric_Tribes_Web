import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";
import { denseRequire } from "./dense-layout-require.mjs";

const path = `${new URL("../src/sim/units/LegacyEntityTargetStep.ts", import.meta.url).pathname}`;
const output = ts.transpileModule(fs.readFileSync(path, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(output, { require: denseRequire, module, exports: module.exports, Int8Array, Int16Array, Math });
const { stepLegacyEntityTarget } = module.exports;

const state = new Int8Array(9983);
const packedBytes = new Int8Array(17638);
const saveOffsets = new Int16Array(570);
const packedOffsets = new Int16Array(312);
const id = 1;
state[6161 + id] = 2;
state[id] = 20;
state[101 + id] = 30;
packedBytes[4] = 1;
const events = [];
const reset = stepLegacyEntityTarget({
  state, packedBytes, saveOffsets, packedOffsets, id,
  u: 0, m: () => 4, kByte: 0, fN: false,
  onAction: () => false,
  onQ: () => events.push("Q"),
  onTargetDispatch: (...args) => events.push(["target", ...args]),
});
assert.equal(reset.entered, true);
assert.equal(reset.returnedByAction, false);
assert.equal(reset.usedTypeFourBranch, false);
assert.equal(state[6161 + id], 0);
assert.deepEqual(events, ["Q", ["target", 12, id, 0]], "offsets 723..735: Q() then a(12, v, 0)");

// CORRECTED 2026-09-21: offsets 305..495 put the record in 4444 and the row
// selector in 4747, and read the coordinates out of dense (a:[B), not
// packedBytes. A plain (<= 100) 4747 selects rows 0/1.
state[6161 + id] = 4;
state[4747 + id] = 50;
state[4444 + id] = 2;
state[4949 + id] = 10;
saveOffsets[0] = 200;
saveOffsets[1] = 300;
state[250] = 7;
state[350] = 8;
state[808 + id] = 9;
const modes = [];
const typeFour = stepLegacyEntityTarget({
  state, packedBytes, saveOffsets, packedOffsets, id,
  u: 1, m: () => 0, kByte: 0, fN: true,
  onAction: () => false,
  onDistanceProbe: () => 100,
  onModeDispatch: (mode) => modes.push(mode),
});
assert.equal(typeFour.usedTypeFourBranch, true);
assert.equal(state[4444 + id], 50, "the record moves out of 4747 into 4444");
assert.equal(state[4747 + id], 0, "... and 4747 becomes the row selector");
assert.deepEqual([state[3131 + id], state[3232 + id]], [7, 8]);
assert.equal(state[6161 + id], 0);
assert.equal(state[808 + id], 0);
assert.deepEqual(modes, [1]);

// ... and a 4747 above 100 means "the record's door": record = 4747 - 101,
// rows 99/100.
{
  const s2 = new Int8Array(state.length);
  s2[6161 + id] = 4;
  s2[4747 + id] = 110;
  s2[4949 + id] = 10;
  saveOffsets[99] = 400;
  saveOffsets[100] = 500;
  s2[409] = 21;
  s2[509] = 22;
  const out = stepLegacyEntityTarget({
    state: s2, packedBytes, saveOffsets, packedOffsets, id,
    u: 1, m: () => 0, kByte: 0, fN: true,
    onAction: () => false,
    onDistanceProbe: () => 100,
    onModeDispatch: () => {},
  });
  assert.equal(out.usedTypeFourBranch, true);
  assert.equal(s2[4444 + id], 9);
  assert.equal(s2[4747 + id], 99);
  assert.deepEqual([s2[3131 + id], s2[3232 + id]], [21, 22]);
}

state[6161 + id] = 2;
state[808 + id] = 11;
const handled = stepLegacyEntityTarget({
  state, packedBytes, saveOffsets, packedOffsets, id,
  u: 1, m: () => 0, kByte: 0, fN: true,
  onAction: () => true,
});
assert.equal(handled.returnedByAction, true);
assert.equal(state[808 + id], 11);

// Offsets 124..210: c stays true only when t41[6464] != t41[m] and
// (t41[m] != 0 || (!f.N && K >= 50)) -- offset 196 sends f.N to the clear (oracle run 15).
{
  const cFor = ({ current, target, fN = false, kByte = 0 }) => {
    const s = new Int8Array(9983);
    const bytes = new Int8Array(17638);
    s[6161 + id] = 2;
    s[6464 + id] = 56;
    bytes[56] = current;
    bytes[69] = target;
    let seen;
    stepLegacyEntityTarget({
      state: s, packedBytes: bytes, saveOffsets, packedOffsets, id,
      u: 1, m: () => 69, kByte, fN,
      onAction: (_code, c) => { seen = c; return true; },
    });
    return seen;
  };
  assert.equal(cFor({ current: 12, target: 3 }), true, "different job class -> put-away animation");
  assert.equal(cFor({ current: 12, target: 12 }), false, "same job class");
  assert.equal(cFor({ current: 12, target: 0 }), false, "to idle with K < 50 and !f.N");
  assert.equal(cFor({ current: 12, target: 0, kByte: 50 }), true, "to idle with K >= 50");
  assert.equal(cFor({ current: 12, target: 0, fN: true }), false, "to idle with f.N");
  assert.equal(cFor({ current: 12, target: 0, fN: true, kByte: 50 }), false, "to idle with f.N and K >= 50");
  assert.equal(cFor({ current: 12, target: 3, fN: true }), true, "different job class with f.N");
}
console.log("b.t() raw entity target-step gates and writes OK");
