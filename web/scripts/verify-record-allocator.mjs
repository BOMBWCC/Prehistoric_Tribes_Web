import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";

const path = `${new URL("../src/j2me/LegacyRecordAllocator.ts", import.meta.url).pathname}`;
const output = ts.transpileModule(fs.readFileSync(path, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(output, { module, exports: module.exports, Int8Array });
const { allocateLegacyRecord } = module.exports;

const state = new Int8Array(9983);
const map = Array.from({ length: 8 }, () => new Int8Array(8));
const counters = [new Int16Array(26), new Int16Array(26)];
counters[0][12] = 1;
counters[0][13] = 0;
const randomCalls = [];
const callbacks = [];
const id = allocateLegacyRecord({
  state,
  map,
  packedBytes: new Int8Array(17638),
  packedOffsets: new Int16Array(312),
  counters,
  randomRemainder: (mask, divisor) => {
    randomCalls.push([mask, divisor]);
    return 0;
  },
  frameFlag: true,
  framePending: () => callbacks.push("frame"),
  onRecordInitialized: (recordId) => callbacks.push(["init", recordId]),
  onRecordIndexed: (recordId) => callbacks.push(["index", recordId]),
  onTeamZeroPlacement: (x, y, recordId) => callbacks.push(["team0", x, y, recordId]),
  onSubsystemPlacement: (x, y, value) => callbacks.push(["subsystem", x, y, value]),
  q: 0,
  aw: 0,
  suppressCounters: false,
}, 0, 2, 3, 1, 0x48);

assert.equal(id, 1);
assert.equal(state[1919 + id], 5);
assert.equal(state[3131 + id], 2);
assert.equal(state[3232 + id], 3);
assert.equal(state[1414 + id], 1);
assert.equal(state[1515 + id], 0, "aw 0 -> gender 0 even with a12 > a13");
assert.equal(counters[0][12], 2);

// Offsets 877..966: aw 1 forces gender 1; aw 2 gives 1 only while a12 > a13.
for (const [aw, a12, a13, gender] of [[1, 0, 0, 1], [2, 1, 0, 1], [2, 0, 0, 0], [2, 1, 1, 0]]) {
  const s = new Int8Array(9983);
  const c = [new Int16Array(26), new Int16Array(26)];
  c[0][12] = a12;
  c[0][13] = a13;
  const unit = allocateLegacyRecord({
    state: s, map: Array.from({ length: 8 }, () => new Int8Array(8)),
    packedBytes: new Int8Array(17638), packedOffsets: new Int16Array(312),
    counters: c, randomRemainder: () => 0, frameFlag: false, q: 0, aw, suppressCounters: false,
  }, 0, 1, 1, 30, 0);
  assert.equal(s[1515 + unit], gender, `aw ${aw}, a12 ${a12}, a13 ${a13}`);
}
// Offsets 1443..1489: while f.s:Z holds (suppressCounters) neither [11] nor [19] moves, and the
// team-0 notice is skipped (oracle run 15, play20 frame 61981).
{
  const s = new Int8Array(9983);
  const c = [new Int16Array(26), new Int16Array(26)];
  const notices = [];
  allocateLegacyRecord({
    state: s, map: Array.from({ length: 8 }, () => new Int8Array(8)),
    packedBytes: new Int8Array(17638), packedOffsets: new Int16Array(312),
    counters: c, randomRemainder: () => 0, frameFlag: false, q: 0, aw: 0, suppressCounters: true,
    onTeamZeroPlacement: () => notices.push(1),
  }, 0, 1, 1, 30, 0);
  assert.deepEqual([c[0][11], c[0][19], notices.length], [0, 0, 0]);
}
// Offsets 421..667: flag 32 puts the 3 in the roll's divisor, 2 + a(255, 5), so a roll of 4 gives 6
// (oracle run 15, play23 frame 73825).
{
  const s = new Int8Array(9983);
  const unit = allocateLegacyRecord({
    state: s, map: Array.from({ length: 8 }, () => new Int8Array(8)),
    packedBytes: new Int8Array(17638), packedOffsets: new Int16Array(312),
    counters: [new Int16Array(26), new Int16Array(26)], randomRemainder: (mask, divisor) => (divisor === 5 ? 4 : 0),
    frameFlag: false, q: 0, aw: 0, suppressCounters: false,
  }, 0, 1, 1, 30, 32);
  assert.deepEqual([s[6969 + unit], s[7070 + unit], s[7171 + unit], s[7474 + unit]], [6, 1, 6, 1]);
}
// Offsets 1206..1237: flag 64 rolls the weapon as a(255, 4 + team * 2) (oracle run 15, play25 frame 88578).
{
  const s = new Int8Array(9983);
  const rolls = [];
  const unit = allocateLegacyRecord({
    state: s, map: Array.from({ length: 8 }, () => new Int8Array(8)),
    packedBytes: new Int8Array(17638), packedOffsets: new Int16Array(312),
    counters: [new Int16Array(26), new Int16Array(26)],
    randomRemainder: (mask, divisor) => { rolls.push(divisor); return divisor === 6 ? 3 : 0; },
    frameFlag: false, q: 5, aw: 0, suppressCounters: false,
  }, 1, 1, 1, 30, 64);
  assert.equal(s[6565 + unit], 3);
  assert.ok(rolls.includes(6));
}
assert.equal(state[7979 + id], 0);
assert.equal(map[3][2], 1);
assert.equal(counters[0][11], 1);
assert.equal(counters[0][19], 1);
assert.deepEqual(callbacks.slice(0, 2), ["frame", ["init", 1]]);
assert.deepEqual(callbacks.at(-2), ["team0", 2, 3, 1]);
assert.deepEqual(callbacks.at(-1), ["subsystem", 2, 3, 4]);
const orientationIndex = randomCalls.findLastIndex(([mask, divisor], index) =>
  mask === 255 && divisor === 3 && randomCalls[index + 1]?.[0] === 15 && randomCalls[index + 1]?.[1] === 4,
);
assert.ok(orientationIndex >= 0);

for (let recordId = 1; recordId <= 50; recordId += 1) state[1919 + recordId] = 1;
assert.equal(allocateLegacyRecord({
  state,
  map,
  packedBytes: new Int8Array(17638),
  packedOffsets: new Int16Array(312),
  counters,
  randomRemainder: () => 0,
  frameFlag: false,
  q: 0,
  aw: 0,
  suppressCounters: false,
}, 0, 0, 0, 1, 0), -1);
console.log("f.a(byte,byte,byte,byte,byte) raw record allocator OK");
