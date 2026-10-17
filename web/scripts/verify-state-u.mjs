import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import vm from "node:vm";
import { denseRequire } from "./dense-layout-require.mjs";

const file = new URL("../src/ui/LegacyStateU.ts", import.meta.url).pathname;
const module = { exports: {} };
const output = ts.transpileModule(fs.readFileSync(file, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
vm.runInNewContext(output, { require: denseRequire, module, exports: module.exports, Int8Array, Int16Array });
const { stepLegacyStateU } = module.exports;

function makeState(overrides = {}) {
  return {
    ai: 26, ao: 0, s: true, u: 0, pByte: 0, bI: 3, bF: 50, bG: 0, bJ: 9,
    am: 4, I: 10, J: 0, JFlag: false, K: 20, L: 0, v: 0, Q: 0, R: 11,
    A: false, oByte: 0, dFlags: [false, false, false, false], p: Int8Array.from([1, 0, 0]),
    ...overrides,
  };
}

const dense = new Int8Array(10000);
const packedBytes = new Int8Array(400);
const packedOffsets = new Int16Array(312);
packedOffsets[294] = 120;
packedBytes[120] = 17;

// Test 1: the ai===26/onSubsystemReset/onMapSession/p[]-scan/bF-fold prefix,
// with a non-advance ai (10, not in the real advance set) so the shared
// tail (A/onSelectionFlags/Q=R) runs.
{
  const dense1 = new Int8Array(10000);
  dense1[2828 + 1] = 105;
  dense1[4646 + 1] = -1;
  const state = makeState({ ai: 10, p: Int8Array.from([1, 0, 0]) });
  const events = [];
  stepLegacyStateU({
    state, dense: dense1, packedBytes, packedOffsets,
    onSubsystemReset: () => events.push("reset"),
    onMapSession: () => events.push("map"),
    onViewportNormalize: () => events.push("viewport"),
    onB: (value) => events.push(["b", value]),
    onSelectionFlags: (flags) => events.push(["flags", ...flags]),
  });
  // ai !== 26, so onMapSession must NOT fire even though onSubsystemReset does.
  assert.deepEqual(events, ["reset", "viewport", ["flags", false, false, false, false]]);
  assert.equal(state.s, false);
  assert.equal(state.ai, 10, "non-advance ai must be left unchanged");
  assert.equal(state.Q, 11, "non-advance path reaches the Q=R tail");
  assert.equal(state.v, 1, "ai!==59 sets v=1 on the non-advance path");
  assert.equal(state.A, true);
  assert.equal(dense1[2828 + 1], 69);
  assert.equal(state.p[0], 0);
  assert.equal(state.bF, 1);
  assert.equal(state.bG, 17);
}

// Offsets 364..387: retiring a step (bF >= 50) sets b.F:I -- the 1000000
// sentinel after scene 15, otherwise the current frame.
for (const [ai, expected] of [[15, 1000000], [10, 4321]]) {
  const state = makeState({ ai, bF: 50 });
  const timers = [];
  stepLegacyStateU({ state, dense, packedBytes, packedOffsets, frame: 4321, onScriptTimer: (v) => timers.push(v) });
  assert.deepEqual(timers, [expected]);
  assert.equal(state.bF, 1);
}

// Test 2: ai===26 does trigger onMapSession, and dFlags[3]===false with
// JFlag===true must NOT advance K (the fixed, un-negated condition).
{
  const state = makeState({ ai: 26, ao: 5, JFlag: true, dFlags: [false, false, false, false], K: 20 });
  const events = [];
  stepLegacyStateU({
    state, dense, packedBytes, packedOffsets,
    onMapSession: () => events.push("map"),
  });
  assert.deepEqual(events, ["map"]);
  assert.equal(state.K, 20, "JFlag=true, dFlags[3]=false must leave K unchanged");
}

// Test 3: JFlag===true with dFlags[3]===true DOES advance K (this is the bug
// fix -- the old code had this backwards).
{
  const state = makeState({ ai: 26, ao: 5, JFlag: true, dFlags: [false, false, false, true], K: 20 });
  stepLegacyStateU({ state, dense, packedBytes, packedOffsets });
  assert.equal(state.K, 21, "JFlag=true, dFlags[3]=true must advance K");
}

// Test 4: a real advance value (37) must increment ai, fire onB with the
// POST-increment value, set Q=28, and return immediately WITHOUT reaching
// the A/onSelectionFlags/Q=R tail -- this is the branch-merge bug fix.
{
  const state = makeState({ ai: 37, ao: 0, Q: 0, R: 11, A: false });
  const events = [];
  stepLegacyStateU({
    state, dense, packedBytes, packedOffsets,
    onB: (value) => events.push(["b", value]),
    onSelectionFlags: () => events.push("flags-should-not-fire"),
  });
  assert.equal(state.ai, 38);
  assert.deepEqual(events, [["b", 38]]);
  assert.equal(state.Q, 28, "advance branch must return before Q gets overwritten by Q=R");
  assert.equal(state.A, false, "advance branch must not reach the shared tail's A=true");
}

// Test 5: (ai===2 && pByte!==0) is an advance case; (ai===2 && pByte===0) is
// NOT (this direction was also inverted).
{
  const advancing = makeState({ ai: 2, pByte: 5, ao: 0 });
  stepLegacyStateU({ state: advancing, dense, packedBytes, packedOffsets });
  assert.equal(advancing.ai, 3, "ai===2 with pByte!==0 must advance");

  const notAdvancing = makeState({ ai: 2, pByte: 0, ao: 0 });
  stepLegacyStateU({ state: notAdvancing, dense, packedBytes, packedOffsets });
  assert.equal(notAdvancing.ai, 2, "ai===2 with pByte===0 must not advance");
}

// Test 6: the advance branch's ai===47 sub-case (post-increment, i.e.
// starting ai===46) sets Q=18 (not 28) and writes the previously-missing
// o:B(#349) read from packedBytes[packedOffsets[154]+8].
{
  packedOffsets[154] = 40;
  packedBytes[40 + 8] = 99;
  const state = makeState({ ai: 46, ao: 0, oByte: 0 });
  stepLegacyStateU({ state, dense, packedBytes, packedOffsets });
  assert.equal(state.ai, 47);
  assert.equal(state.Q, 18);
  assert.equal(state.oByte, 99);
}

console.log("f.U() state transition OK");

// Offsets 173..198 (ai === 44): animal slots 0..9 all target unit `am`, whatever p[] holds.
{
  const dense44 = new Int8Array(10000);
  const state = makeState({ ai: 44, am: 1, p: Int8Array.from([5, 0, 0]) });
  stepLegacyStateU({ state, dense: dense44, packedBytes, packedOffsets });
  assert.deepEqual(Array.from(dense44.subarray(9601, 9612)), [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0]);
  assert.equal(dense44[9601 + 5], 1);
  console.log("U() ai 44: animals 0..9 target am OK");
}
