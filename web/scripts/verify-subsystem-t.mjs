// Regression test for LegacySubsystemT.ts (b's private boolean t(), #417).
import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";

const file = new URL("../src/j2me/LegacySubsystemT.ts", import.meta.url).pathname;
const output = ts.transpileModule(fs.readFileSync(file, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(output, { module, exports: module.exports, Int8Array, Int16Array });
const { stepLegacySubsystemT } = module.exports;

function makeInput(overrides = {}) {
  const prompts = [];
  const kFlag = { value: false };
  const aShort = [new Int16Array(30), new Int16Array(30)];
  const input = {
    state: new Int8Array(10000),
    gridC: Array.from({ length: 20 }, () => new Int8Array(20)),
    teamMarkerTable: Array.from({ length: 2 }, () => Array.from({ length: 5 }, () => Int8Array.of(0, 0, -1, 0, 0))),
    aShort,
    frame: 8,
    mapWidth: 20,
    mapHeight: 20,
    q: 1,
    fByte: 0,
    uByte: 0,
    bField28: 50,
    kFlag,
    scratch: { u: 0, v: 0, w: 0, A: 0, C: 0, D: 0 },
    onPrompt: (...args) => prompts.push(args),
    ...overrides,
  };
  return { input, prompts, kFlag };
}

// Marker timer: ticks on frame&7==0 and flags adults in the 3x3 around it.
{
  const { input } = makeInput({ q: 3 });
  const marker = input.teamMarkerTable[0][0];
  marker.set([5, 6, 10]);
  input.gridC[6][5] = 3; input.state[1414 + 3] = 12;
  input.gridC[7][6] = 4; input.state[1414 + 4] = 11; // a child
  input.gridC[8][5] = 7; input.state[1414 + 7] = 20; // outside the 3x3
  assert.equal(stepLegacySubsystemT(input), false);
  assert.equal(marker[2], 11);
  assert.equal(input.state[7979 + 3], 4);
  assert.equal(input.state[7979 + 4], 0);
  assert.equal(input.state[7979 + 7], 0);
  assert.equal(input.scratch.w, 0); // team 1 restarts w and stops at its unused slot 0

  input.frame = 9;
  input.state[7979 + 3] = 0;
  stepLegacySubsystemT(input);
  assert.equal(marker[2], 11);
  assert.equal(input.state[7979 + 3], 4);
}

// Reaching 100 switches the marker off without flagging anyone.
{
  const { input } = makeInput({ q: 3 });
  input.teamMarkerTable[0][0].set([5, 6, 99]);
  input.gridC[6][5] = 3; input.state[1414 + 3] = 12;
  stepLegacySubsystemT(input);
  assert.equal(input.teamMarkerTable[0][0][2], -1);
  assert.equal(input.state[7979 + 3], 0);
}

// An unused slot 0 hides an active slot 1 (offset 48: goto 369).
{
  const { input } = makeInput({ q: 3 });
  input.teamMarkerTable[1][1].set([5, 6, 10]);
  stepLegacySubsystemT(input);
  assert.equal(input.teamMarkerTable[1][1][2], 10);
}

// Chief succession: dead chief -> first living adult among 1..50.
{
  const { input, prompts, kFlag } = makeInput();
  input.aShort[0][17] = 2; input.aShort[0][11] = 1;
  input.state[1919 + 2] = 0; input.state[1414 + 2] = 30;
  input.state[1919 + 5] = 10; input.state[1414 + 5] = 8;  // child
  input.state[1919 + 9] = 10; input.state[1414 + 9] = 12;
  input.state[1919 + 12] = 10; input.state[1414 + 12] = 40;
  assert.equal(stepLegacySubsystemT(input), true);
  assert.deepEqual(prompts, [[18, 9, 9]]);
  assert.equal(kFlag.value, true);
  assert.equal(input.scratch.v, 9);

  // K:Z now set: no second prompt.
  assert.equal(stepLegacySubsystemT(input), false);
  assert.equal(prompts.length, 1);
}

// Living adult chief, or any failed gate: nothing happens.
for (const [label, patch] of [
  ["chief alive", (i) => { i.state[1919 + 2] = 10; }],
  ["q == 3", (i) => { i.q = 3; }],
  ["q == 2 and f:B > 2", (i) => { i.q = 2; i.fByte = 3; }],
  ["no population", (i) => { i.aShort[0][11] = 0; }],
  ["f.u:B busy", (i) => { i.uByte = 1; }],
  ["K:B below 50", (i) => { i.bField28 = 49; }],
]) {
  const { input, prompts } = makeInput();
  input.aShort[0][17] = 2; input.aShort[0][11] = 1;
  input.state[1414 + 2] = 30;
  input.state[1919 + 9] = 10; input.state[1414 + 9] = 12;
  patch(input);
  assert.equal(stepLegacySubsystemT(input), false, label);
  assert.equal(prompts.length, 0, label);
}

// A child chief is replaced too (1414 < 12).
{
  const { input, prompts } = makeInput();
  input.aShort[0][17] = 2; input.aShort[0][11] = 1;
  input.state[1919 + 2] = 10; input.state[1414 + 2] = 5;
  input.state[1919 + 9] = 10; input.state[1414 + 9] = 12;
  assert.equal(stepLegacySubsystemT(input), true);
  assert.deepEqual(prompts, [[18, 9, 9]]);
}

console.log("b.t() marker timers + chief succession OK");
