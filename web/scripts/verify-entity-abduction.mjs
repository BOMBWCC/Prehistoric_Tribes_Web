// Behaviour test for LegacyEntityAbduction.ts: private void c(byte) (#363),
// bytecode/b-javap.txt line 25846, offsets 0..429.
import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";
import { denseRequire } from "./dense-layout-require.mjs";

const path = new URL("../src/sim/units/LegacyEntityAbduction.ts", import.meta.url).pathname;
const output = ts.transpileModule(fs.readFileSync(path, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(output, { require: denseRequire, module, exports: module.exports, Int8Array, Int16Array });
const { stepLegacyEntityAbduction } = module.exports;

const VICTIM = 7;   // a team-0 villager
const CHIEF = 9;

function fixture(team) {
  const state = new Int8Array(10000);
  const saveOffsets = new Int16Array(200);
  // Rows 0..82: give the first three real offsets so the copy is observable.
  saveOffsets[0] = 0;      // x
  saveOffsets[1] = 101;    // y
  saveOffsets[2] = 1919;   // hit points
  saveOffsets[3] = 1515;   // gender
  saveOffsets[4] = 2828;   // type
  const routes = [
    Array.from({ length: 101 }, () => new Int8Array(80)),
    Array.from({ length: 101 }, () => new Int8Array(80)),
  ];
  const pools = [new Int16Array(30), new Int16Array(30)];
  const gridC = Array.from({ length: 64 }, () => new Int8Array(64));
  const calls = [];

  state[VICTIM] = 12; state[101 + VICTIM] = 13;
  state[1919 + VICTIM] = 40;
  state[1515 + VICTIM] = 1;   // gender 1
  state[2828 + VICTIM] = 17;  // a child
  state[4444 + VICTIM] = 5;
  routes[0][VICTIM][3] = 77;
  routes[1][VICTIM][4] = 88;
  pools[0][11] = 9; pools[0][13] = 4;
  pools[1][11] = 2; pools[1][13] = 1;

  const input = {
    state, saveOffsets, routes, pools, gridC, team, fields: { R: 0, S: 0 }, chief: CHIEF,
    onVictimE: (id) => calls.push(["e", id]),
    onVictimF: (id) => calls.push(["f", id]),
    onMoveTrigger: (...a) => calls.push(["move", ...a]),
    onRegister: (id) => calls.push(["register", id]),
    onRefresh: (id) => calls.push(["refresh", id]),
  };
  return { input, state, routes, pools, gridC, calls };
}

// Team 1 taking a team-0 child: the copy lands in slot 51, both tribes'
// counters move, the original is cleared, and the player is alerted.
{
  const { input, state, routes, pools, gridC, calls } = fixture(1);
  stepLegacyEntityAbduction(input, VICTIM);

  assert.equal(state[1919 + 51], 40, "the copy is alive in the first free team-1 slot");
  // R:I/S:I are b's shared fields: left on the new slot and the last route index (oracle run 9, frame 19664).
  assert.equal(input.fields.R, 51); assert.equal(input.fields.S, 80);
  assert.deepEqual([state[51], state[101 + 51]], [12, 13], "position copied");
  assert.equal(state[2828 + 51], 17, "type copied");
  assert.equal(routes[0][51][3], 77, "route row 0 copied");
  assert.equal(routes[1][51][4], 88, "route row 1 copied");

  assert.equal(state[1919 + VICTIM], 0, "the original is gone");
  assert.equal(state[4444 + VICTIM], 0);

  assert.equal(pools[1][11], 3, "the taking tribe gains a head");
  assert.equal(pools[0][11], 8, "the other loses one");
  assert.equal(pools[1][13], 2, "and the gender counter moves with it");
  assert.equal(pools[0][13], 3);

  assert.equal(gridC[13][12], 51, "the copy is placed on the grid");
  assert.deepEqual(calls, [
    ["e", VICTIM], ["f", VICTIM], ["move", 17, CHIEF, VICTIM],
    ["register", 51], ["refresh", 51],
  ]);
}

// Team 0 doing the taking raises no alarm -- offsets 48..55 gate that on u == 1.
{
  const { input, state, calls } = fixture(0);
  state[1919 + 1] = 0;   // slot 1 is free
  stepLegacyEntityAbduction(input, VICTIM);
  assert.equal(state[1919 + 1], 40, "the copy went to slot 1");
  assert.deepEqual(calls, [["register", 1], ["refresh", 1]], "no e/f/alert");
}

// Occupied slots are skipped until a free one is found.
{
  const { input, state } = fixture(1);
  for (let r = 51; r <= 55; r += 1) state[1919 + r] = 5;
  stepLegacyEntityAbduction(input, VICTIM);
  assert.equal(state[1919 + 56], 40);
  assert.equal(state[1919 + 51], 5, "the occupied slots are untouched");
}

// A full team takes nobody and changes nothing.
{
  const { input, state, pools, calls } = fixture(1);
  for (let r = 51; r <= 100; r += 1) state[1919 + r] = 5;
  stepLegacyEntityAbduction(input, VICTIM);
  assert.equal(state[1919 + VICTIM], 40, "the victim survives");
  assert.equal(pools[1][11], 2, "no counter moved");
  assert.deepEqual(calls, []);
}

console.log("c(byte) #363 abduction OK");
