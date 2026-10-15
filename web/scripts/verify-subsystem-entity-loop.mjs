import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";

const path = `${new URL("../src/j2me/LegacySubsystemEntityLoop.ts", import.meta.url).pathname}`;
const output = ts.transpileModule(fs.readFileSync(path, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(output, { module, exports: module.exports, Int8Array, Int16Array });
const { runLegacySubsystemEntityLoop } = module.exports;

const state = new Int8Array(9983);
const mainShort = [new Int16Array(26), new Int16Array(26)];
const packedBytes = new Int8Array(17638);
const packedOffsets = new Int16Array(312);
// Team 1's courtship threshold is t[273 + f.b][f.q] * 50 = 2 * 50.
packedOffsets[273] = 400;
packedBytes[400 + 1] = 2;
const scheduler = { kByte: 49 };
const events = [];
state[1919 + 1] = 1;
state[4545 + 1] = -100;
state[7575 + 1] = 4;
state[1414 + 1] = 12;
state[9054 + 1] = 1;
mainShort[0][18] = 749;
mainShort[0][1] = 1000;

runLegacySubsystemEntityLoop({
  state, mainShort, packedBytes, packedOffsets, frame: 16, q: 1, bByte: 0, scheduler,
  onPrepass: () => events.push("pre"),
  onTeamStart: (team) => events.push(["team", team]),
  onEntityTargetStep: (id) => events.push(["target", id]),
  onEntityTimingCheck: () => false,
  onPeriodicEntityAction: (id) => events.push(["periodic", id]),
  onEntityDecisionCheck: () => false,
  onEntityCoreUpdate: (id, team) => events.push(["core", id, team]),
  onFinalScriptedPass: () => events.push("final"),
});
assert.deepEqual(events, ["pre", ["team", 0], ["target", 1], ["periodic", 1], ["core", 1, 0], ["team", 1], ["team", 2], "final"]);
assert.equal(mainShort[0][18], -1);
assert.equal(mainShort[0][1], 999);
assert.equal(scheduler.kByte, 50);
assert.equal(mainShort[1][18], 1);

// A timer at -1 (waiting for a couple) stays at -1.
runLegacySubsystemEntityLoop({
  state: new Int8Array(9983), mainShort, packedBytes, packedOffsets, frame: 17, q: 1, bByte: 0, scheduler: { kByte: 0 },
  onEntityTimingCheck: () => false, onEntityDecisionCheck: () => false,
});
assert.equal(mainShort[0][18], -1);

// b.v:I is the loop variable (offsets 150/728): callees see the unit being processed, and the
// field ends at 101 after team 1, then 5 after the 1..4 cap loop (oracle run 4, frame 4758).
{
  const seen = [];
  let v = 0;
  const live = new Int8Array(9983);
  live[1919 + 7] = 1;
  live[4545 + 7] = 0;
  runLegacySubsystemEntityLoop({
    state: live, mainShort, packedBytes, packedOffsets, frame: 18, q: 1, bByte: 0, scheduler: { kByte: 0 },
    onV: (value) => { v = value; },
    onEntityTargetStep: (id) => seen.push([id, v]),
    onTeamEnd: (team) => seen.push(["end", team, v]),
    onEntityTimingCheck: () => false, onEntityDecisionCheck: () => false,
  });
  assert.deepEqual(seen, [[7, 7], ["end", 0, 51], ["end", 1, 101]]);
  assert.equal(v, 5);
}
// Offsets 18..26: aq() (onTeamOneAuxiliary) runs after u:I = 1 (oracle run 5, frame 12188).
{
  let u = -1; let seen = null;
  runLegacySubsystemEntityLoop({
    state: new Int8Array(9983), mainShort, packedBytes, packedOffsets, frame: 19, q: 1, bByte: 0, scheduler: { kByte: 0 },
    onTeamStart: (team) => { u = team; },
    onTeamOneAuxiliary: () => { seen = u; },
    onEntityTimingCheck: () => false, onEntityDecisionCheck: () => false,
  });
  assert.equal(seen, 1);
}
// Offsets 199..231: a 4545 link in -122..-111 goes straight to v(), skipping t(), h(), B() and b()
// (oracle run 15, play11 frame 48459).
{
  const seen = [];
  const live = new Int8Array(9983);
  live[1919 + 3] = 1;
  live[4545 + 3] = -119;
  live[7575 + 3] = 4;
  live[1414 + 3] = 12;
  runLegacySubsystemEntityLoop({
    state: live, mainShort, packedBytes, packedOffsets, frame: 3, q: 1, bByte: 0, scheduler: { kByte: 0 },
    onEntityTargetStep: (id) => seen.push(["target", id]),
    onEntityTimingCheck: (id) => { seen.push(["timing", id]); return false; },
    onPeriodicEntityAction: (id) => seen.push(["periodic", id]),
    onEntityDecisionCheck: (id) => { seen.push(["decision", id]); return true; },
    onEntityCoreUpdate: (id) => seen.push(["core", id]),
  });
  assert.deepEqual(seen, [["core", 3]]);
}

// Offsets 721..731: the loop steps the b.v:I field, so a callee that writes v = 0 (f.b(II)'s
// regroup inside unit 2's turn) makes the same tick run units 1.. again.
{
  const live = new Int8Array(9983);
  for (const id of [1, 2, 3]) { live[1919 + id] = 1; live[4545 + id] = -119; }
  const field = { v: 0 };
  const seen = [];
  let regrouped = false;
  runLegacySubsystemEntityLoop({
    state: live, mainShort: [new Int16Array(26), new Int16Array(26)], packedBytes, packedOffsets, frame: 3, q: 1, bByte: 0, scheduler: { kByte: 0 },
    onV: (v) => { field.v = v; },
    readV: () => field.v,
    onEntityCoreUpdate: (id) => { seen.push(id); if (id === 2 && !regrouped) { regrouped = true; field.v = 0; } },
  });
  assert.deepEqual(seen, [1, 2, 1, 2, 3]);
}
console.log("b.e() raw subsystem entity-loop control flow OK");
