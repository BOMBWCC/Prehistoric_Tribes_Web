import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function loadModule(file) {
  const module = { exports: {} };
  const output = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(output, { module, exports: module.exports, Int8Array, Int16Array });
  return module.exports;
}

const { stepLegacySubsystemI } = loadModule(
  new URL("../src/j2me/LegacySubsystemTail.ts", import.meta.url).pathname,
);
const state = new Int8Array(10000);
const bBytes = new Int8Array(600);
const bShorts = new Int16Array(312);
bShorts[85] = 0;
bShorts[110] = 10;
bShorts[299] = 20;
bShorts[301] = 30;
bShorts[302] = 40;
// t110[kind 6] = 50 (a node of this kind holds 50), t85 = [0, 3, 6, 10]:
// the stage loop takes the first w whose `t110[kind] * t85[w] / 10` is at
// least the current amount (bytecode offsets 233..292).
bBytes[10 + 6] = 50;
bBytes[0 + 0] = 0; bBytes[0 + 1] = 3; bBytes[0 + 2] = 6; bBytes[0 + 3] = 10;
bBytes[40] = 1;
bBytes[41] = 100;
bBytes[1] = 1;
bBytes[20 + 52] = 1;
bBytes[30 + 51] = 9;
state[9833] = 6;
state[9883] = 2;
state[9733] = 11;
state[9783] = 12;
state[9933] = 9;
const tail = { lByte: 50, kByte: 50 };
const events = [];
stepLegacySubsystemI({
  state, bBytes, bShorts, frame: 8, q: 0, tail,
  onAj: (index) => events.push(["aj", index]),
  onRepairCell: (...args) => events.push(["repair", ...args]),
  onAk: () => events.push("ak"),
  onAl: () => events.push("al"),
  onJ: () => events.push("j"),
  onSubsystemB: (...args) => events.push(["b", ...args]),
  onFByte: (value) => events.push(["f", value]),
});
assert.equal(state[9883], 2);
assert.deepEqual(events.slice(0, 3), [["aj", 0], ["repair", 11, 12, 1, 1], "ak"]);
assert.equal(state[9933], 1, "amount 2 of max 50 lands in stage 1 (50*3/10 = 15)");
assert.equal(tail.lByte, 51);
assert.deepEqual(events.slice(-3), ["j", ["b", 0, 0, 3], ["f", 9]]);

// BUG-FIX REGRESSION (2026-09-03): bytecode/b-javap.txt offset 517
// (`if_icmpge 635`, table302[q] === table302[q+1], i.e. an empty configured
// range for this q) must skip the L-byte advance AND onJ/onSubsystemB/
// onFByte entirely -- not just the L-byte advance. This is the exact shape
// of the real packed resource data for q===0 (confirmed live: table302[0]
// === table302[1] === 0), which is what kept the intro cutscene's Q looping
// between 17 and 14 forever before this fix (see docs/unknowns.md).
{
  const emptyRangeState = new Int8Array(10000);
  const emptyRangeBBytes = new Int8Array(600);
  const emptyRangeBShorts = new Int16Array(312);
  // Same base offsets as above; table302[0] === table302[1] === 0 (both
  // default-zero, nothing written) makes v(=0) >= table302[1](=0) true.
  emptyRangeBShorts[299] = 20;
  emptyRangeBShorts[301] = 30;
  emptyRangeBShorts[302] = 40;
  const emptyRangeTail = { lByte: 0, kByte: 50 };
  const emptyRangeEvents = [];
  stepLegacySubsystemI({
    state: emptyRangeState, bBytes: emptyRangeBBytes, bShorts: emptyRangeBShorts,
    frame: 999999, q: 0, tail: emptyRangeTail,
    onAk: () => emptyRangeEvents.push("ak"),
    onAl: () => emptyRangeEvents.push("al"),
    onJ: () => emptyRangeEvents.push("j"),
    onSubsystemB: (...args) => emptyRangeEvents.push(["b", ...args]),
    onFByte: (value) => emptyRangeEvents.push(["f", value]),
  });
  assert.deepEqual(emptyRangeEvents, ["ak", "al"]);
  assert.equal(emptyRangeTail.lByte, 0);
}

// BUG-FIX REGRESSION: the +1/+2 L-byte advance compares `input.frame`
// against table299[v+1]*100 (bytecode offsets 556..586), not the L-byte
// value being written. Construct a case where the two reads disagree.
{
  const cmpState = new Int8Array(10000);
  const cmpBBytes = new Int8Array(600);
  const cmpBShorts = new Int16Array(312);
  cmpBShorts[299] = 20;
  cmpBShorts[301] = 30;
  cmpBShorts[302] = 40;
  cmpBBytes[40] = 0; // table302[0] = 0
  cmpBBytes[41] = 5; // table302[1] = 5 (non-empty range: v in [0,5))
  cmpBBytes[20 + 1] = 3; // table299[v+1=1] = 3 -> threshold 300
  // v = table302[0] + lByte = 0 + 0 = 0, inside [0,5); table299[v=0] = 0 so
  // the entry gate (frame >= table299[0]*100 = 0) trivially passes.
  const cmpTail = { lByte: 0, kByte: 50 };
  const cmpEvents = [];
  // frame(400) >= threshold(300) -> old buggy code compared lByte(0) >= 300
  // (false, +1); correct code compares frame(400) >= 300 (true, +2).
  stepLegacySubsystemI({
    state: cmpState, bBytes: cmpBBytes, bShorts: cmpBShorts,
    frame: 400, q: 0, tail: cmpTail,
    onJ: () => cmpEvents.push("j"),
    onSubsystemB: () => cmpEvents.push("b"),
    onFByte: (value) => cmpEvents.push(["f", value]),
  });
  assert.equal(cmpTail.lByte, 2, "L-byte advance must compare frame, not lByte, against the threshold");
}
// Offset 478 stores v = t302[q] + L:B in the field b.v:I, and only when q <= 4.
{
  const bBytes = new Int8Array(600);
  const bShorts = new Int16Array(312);
  bShorts[302] = 40; bBytes[40 + 2] = 7;
  const seen = [];
  for (const q of [2, 5]) {
    stepLegacySubsystemI({
      state: new Int8Array(10000), bBytes, bShorts, frame: 1, q, tail: { lByte: 3, kByte: 0 },
      setV: (v) => seen.push([q, v]),
    });
  }
  assert.deepEqual(seen, [[2, 10]]);
}
console.log("b.i() raw subsystem-tail control flow OK");
