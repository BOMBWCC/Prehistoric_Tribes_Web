import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";
import { denseRequire } from "./dense-layout-require.mjs";

const path = `${new URL("../src/sim/tribe/LegacySubsystemBDecision.ts", import.meta.url).pathname}`;
const output = ts.transpileModule(fs.readFileSync(path, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(output, { require: denseRequire, module, exports: module.exports });
const { stepLegacySubsystemBDecision } = module.exports;

const make = () => ({
  state: new Int8Array(10000), packedBytes: new Int8Array(1000), packedOffsets: new Int16Array(100),
  gridC: Array.from({ length: 32 }, () => new Int8Array(40)),
  v: 4, u: 0, fN: false, fL: false, fQ: 0, m: () => 5,
});

const moved = make();
moved.state[1414 + 4] = 12;
moved.state[2828 + 4] = 69;
moved.state[6262 + 4] = 20;
moved.state[6363 + 4] = 21;
moved.state[3131 + 4] = 1;
moved.state[3232 + 4] = 2;
const events = [];
stepLegacySubsystemBDecision({
  ...moved,
  onEntityTransform: (...args) => events.push(["transform", ...args]),
  onQueue: () => events.push(["queue"]),
});
assert.deepEqual(events, [["transform", 20, 21, true], ["queue"]]);

// Offsets 945..1020 (restored 2026-09-29): same job class as the refreshed
// m -> target back to the work spot; g(1) only once 505 >= 30.
const idleWorker = (counter) => {
  const w = make();
  w.state[1414 + 4] = 12;
  w.state[2828 + 4] = 69;
  w.state[6464 + 4] = 10;
  w.state[6262 + 4] = 13;
  w.state[6363 + 4] = 13;
  w.state[3131 + 4] = 5;
  w.state[3232 + 4] = 6;
  w.state[505 + 4] = counter;
  return w;
};
const early = idleWorker(29);
const earlyEvents = [];
stepLegacySubsystemBDecision({
  ...early,
  onEntityTransform: (...args) => earlyEvents.push(["transform", ...args]),
  onQueue: () => earlyEvents.push(["queue"]),
  onGroupMode: (mode) => earlyEvents.push(["g", mode]),
});
assert.deepEqual(earlyEvents, [["transform", 13, 13, true], ["queue"]]);
assert.equal(early.state[3131 + 4], 13, "target follows the work spot");
assert.equal(early.state[3232 + 4], 13);

const resumed = idleWorker(30);
const resumeEvents = [];
stepLegacySubsystemBDecision({
  ...resumed,
  onEntityTransform: (...args) => resumeEvents.push(["transform", ...args]),
  onQueue: () => resumeEvents.push(["queue"]),
  onGroupMode: (mode) => resumeEvents.push(["g", mode]),
});
assert.deepEqual(resumeEvents, [["transform", 13, 13, true], ["queue"], ["g", 1]]);

// m is read at offset 884, after a(int,int,boolean) (865) refreshed it.
const refreshed = idleWorker(30);
refreshed.packedOffsets[41] = 100;
refreshed.packedBytes[100 + 5] = 1;   // stale m (5): class 1
refreshed.packedBytes[100 + 10] = 2;  // job 10 and fresh m 10: class 2
let liveM = 5;
const refreshedEvents = [];
stepLegacySubsystemBDecision({
  ...refreshed,
  m: () => liveM,
  onEntityTransform: () => { liveM = 10; },
  onGroupMode: (mode) => refreshedEvents.push(["g", mode]),
  onRawAction: (...args) => refreshedEvents.push(["raw", ...args]),
});
assert.deepEqual(refreshedEvents, [["g", 1]]);
assert.equal(refreshed.state[4747 + 4], 0);

// Already standing on its work spot: the idle block does not run.
const settled = make();
settled.state[1414 + 4] = 12;
settled.state[2828 + 4] = 69;
settled.state[6464 + 4] = 10;
settled.state[6262 + 4] = 7;
settled.state[6363 + 4] = 7;
settled.state[3131 + 4] = 7;
settled.state[3232 + 4] = 7;
const settledEvents = [];
stepLegacySubsystemBDecision({
  ...settled,
  onEntityTransform: (...args) => settledEvents.push(["transform", ...args]),
  onQueue: () => settledEvents.push(["queue"]),
  onGroupMode: (mode) => settledEvents.push(["g", mode]),
});
assert.deepEqual(settledEvents, []);

// Offsets 872..1170 run only inside the idle-69 block (guards 672..834 all
// jump to 1171).
const switched = make();
switched.state[1414 + 4] = 12;
switched.state[2828 + 4] = 69;
switched.state[6464 + 4] = 12;
switched.state[6262 + 4] = 8;
switched.state[6363 + 4] = 9;
switched.packedOffsets[41] = 100;
switched.packedBytes[105] = 1;
switched.packedBytes[112] = 2;
const actions = [];
assert.equal(stepLegacySubsystemBDecision({
  ...switched,
  onRawAction: (id, action) => actions.push([id, action]),
  onBBoolean: () => false,
}), false);
assert.deepEqual(actions, [[4, 12], [4, 60]]);
assert.equal(switched.state[6464 + 4], 12);
assert.equal(switched.state[3131 + 4], 8);
assert.equal(switched.state[3232 + 4], 9);

// A hunter carrying meat to the store (type 22) is outside that block: the
// job-class check must not turn it back to 12.
const carrier = make();
carrier.state[1414 + 4] = 12;
carrier.state[2828 + 4] = 22;
carrier.state[6464 + 4] = 12;
carrier.packedOffsets[41] = 100;
carrier.packedBytes[105] = 1;
carrier.packedBytes[112] = 2;
const carrierActions = [];
stepLegacySubsystemBDecision({
  ...carrier,
  onRawAction: (id, action) => carrierActions.push([id, action]),
  onBBoolean: () => false,
});
assert.deepEqual(carrierActions, []);
assert.equal(carrier.state[2828 + 4], 22);

const blocked = make();
blocked.state[1414 + 4] = 11;
let called = false;
stepLegacySubsystemBDecision({ ...blocked, onN: () => { called = true; } });
assert.equal(called, false);

// Offsets 615..690 (oracle run 6, frame 18862): a failed guard (here f.N, CALL TO ARMS) still
// clears 5050 at 1171.
{
  const called = make();
  called.state[5050 + called.v] = 12;
  stepLegacySubsystemBDecision({ ...called, fN: true });
  assert.equal(called.state[5050 + called.v], 0);
}

console.log("b() post-n decision continuation OK");
