// Regression test for LegacySubsystemU.ts / LegacySubsystemV.ts
// (b's private boolean u() #419 and v() #421, b.i()'s mission script).
import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";

function load(name) {
  const file = new URL(`../src/j2me/${name}.ts`, import.meta.url).pathname;
  const output = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(output, { module, exports: module.exports, Int8Array, Int16Array, Int32Array });
  return module.exports;
}
const { stepLegacySubsystemU } = load("LegacySubsystemU");
const { stepLegacySubsystemV } = load("LegacySubsystemV");

// ---- u() -------------------------------------------------------------
function uInput(overrides = {}) {
  const events = [];
  const state = new Int8Array(10000);
  const aShort = [new Int16Array(30), new Int16Array(30)];
  aShort[0][17] = 2; state[1919 + 2] = 10; state[1414 + 2] = 20;
  const eRows = Array.from({ length: 4 }, () => new Int8Array(8));
  const input = {
    state, aShort,
    aInt: [[new Int32Array(96)], [new Int32Array(96)]],
    eRows, fP: new Int8Array(40), frame: 0, bField28: 50,
    fields: { R: 0, f: 0, N: 0 },
    onAuxiliary: (...a) => events.push(["aux", ...a]),
    onScene: (v) => events.push(["scene", v]),
    onPickAdults: (flag) => { events.push(["pick", flag]); eRows[0][0] = 2; eRows[1][0] = 7; eRows[2][0] = 5; },
    ...overrides,
  };
  return { input, events };
}
{
  // The vision bit fires scene 51 once.
  const { input, events } = uInput();
  input.aInt[1][0][67] = 256;
  assert.equal(stepLegacySubsystemU(input), true);
  assert.deepEqual(events, [["aux", 2, 0, 1], ["scene", 51]]);
  assert.equal(input.fields.R, 64);
  assert.equal(stepLegacySubsystemU(input), false);
}
{
  // Timed steps: f == 1 at frame 10000 -> picks, f.p[1..4], scene 53, f 51.
  const { input, events } = uInput({ frame: 10000 });
  input.fields.f = 1;
  assert.equal(stepLegacySubsystemU(input), true);
  assert.deepEqual(events, [["pick", false], ["scene", 53]]);
  assert.deepEqual(Array.from(input.fP.slice(1, 5)), [2, 7, 5, 2]);
  assert.equal(input.fields.f, 51);
  assert.equal(input.fields.N, 4);
  // Too early for f == 2 (needs 17000).
  input.fields.f = 2; input.frame = 16999;
  assert.equal(stepLegacySubsystemU(input), false);
}
{
  // A dead chief stops everything.
  const { input } = uInput({ frame: 10000 });
  input.state[1919 + 2] = 0; input.fields.f = 1; input.aInt[1][0][67] = 256;
  assert.equal(stepLegacySubsystemU(input), false);
}

// ---- v() -------------------------------------------------------------
function vInput(opcode, overrides = {}) {
  const events = [];
  const state = new Int8Array(10000);
  const packedBytes = new Int8Array(2000);
  const packedOffsets = new Int16Array(400);
  packedOffsets[291] = 100; packedOffsets[288] = 200; packedOffsets[287] = 300; packedOffsets[286] = 400;
  packedBytes[100 + 1] = 5;           // t291[q=1]: five steps
  packedBytes[200 + 1] = 10;          // t288[q=1]
  packedBytes[300 + 10 + 0] = opcode; // t287[10 + f]
  packedBytes[400 + 10 + 0] = 33;     // t286[10 + f]: the scene
  const aShort = [new Int16Array(30), new Int16Array(30)];
  aShort[0][17] = 2; state[1919 + 2] = 10; state[1414 + 2] = 20;
  aShort[1][11] = 3; aShort[1][14] = 9;
  const eRows = Array.from({ length: 4 }, () => new Int8Array(8));
  const input = {
    state, packedBytes, packedOffsets, aShort, eRows, fP: new Int8Array(40),
    q: 1, frame: 1000, bField28: 50,
    fields: { f: 0, F: 0, N: 0, I: 9, aw: 0 },
    onPlaceStep: (...a) => events.push(["place", ...a]),
    onCoordinateSync: (...a) => events.push(["sync", ...a]),
    onFPair: (...a) => events.push(["fpair", ...a]),
    onSpawn: (...a) => events.push(["spawn", ...a, input.fields.aw]),
    onRecord: (...a) => events.push(["record", ...a]),
    onAuxiliary: (...a) => events.push(["aux", ...a]),
    onPickAdults: (flag) => { events.push(["pick", flag]); eRows[0][0] = 2; eRows[1][0] = 7; },
    onScene: (v) => events.push(["scene", v]),
    ...overrides,
  };
  return { input, events };
}
{
  // N == 4 fires on three skilled units (F > 2).
  const { input, events } = vInput(4);
  input.fields.F = 2;
  assert.equal(stepLegacySubsystemV(input), false);
  input.fields.F = 3;
  assert.equal(stepLegacySubsystemV(input), true);
  assert.deepEqual(events, [["pick", false], ["scene", 33]]);
  assert.equal(input.fields.I, 3, "q < 2 sets I:B = 3 on N == 4");
  assert.deepEqual(Array.from(input.fP.slice(1, 5)), [2, 7, 2, 2]); // f.p[1] = e[0][0], the chief
  assert.equal(input.fields.f, 50);
  // Retired: f (50) >= t291 (5) -> nothing more.
  assert.equal(stepLegacySubsystemV(input), false);
}
{
  // N == 3: the enemy count reaching 0 arms F from the 1000000 sentinel,
  // then the step fires 41 frames later.
  const { input, events } = vInput(3);
  input.aShort[1][11] = 0; input.fields.F = 1000000;
  assert.equal(stepLegacySubsystemV(input), false);
  assert.equal(input.fields.F, 1000);
  input.frame = 1040;
  assert.equal(stepLegacySubsystemV(input), false);
  input.frame = 1041;
  assert.equal(stepLegacySubsystemV(input), true);
  assert.deepEqual(events.at(-1), ["scene", 33]);
}
{
  // N == 5: a timer from F (30 frames below mission 2).
  const { input } = vInput(5);
  input.fields.F = 970;
  assert.equal(stepLegacySubsystemV(input), false);
  input.frame = 1001;
  assert.equal(stepLegacySubsystemV(input), true);
}
{
  // N == 6: the enemy attack. Two waves, then every enemy marches on the camp.
  const { input, events } = vInput(6);
  input.aShort[1][14] = 4;
  input.state[1919 + 60] = 5; input.state[1919 + 61] = 0;
  input.state[8384] = 12; input.state[8445] = 13;
  assert.equal(stepLegacySubsystemV(input), true);
  assert.deepEqual(events, [["spawn", 8, 21, 72, 1, 3, 0], ["spawn", 8, 21, 75, 1, 3, 0], ["scene", 33]]);
  assert.deepEqual([input.state[6161 + 60], input.state[4747 + 60], input.state[3131 + 60], input.state[3232 + 60]], [2, -1, 12, 13]);
  assert.equal(input.state[6161 + 61], 0);
}
{
  // N == 8: reinforcements, the f.p roster, two records, 5 resources spent.
  const { input, events } = vInput(8);
  input.state[1919 + 1] = 5; input.state[1515 + 1] = 0;
  input.state[1515 + 2] = 1;
  input.state[1919 + 3] = 5; input.state[1515 + 3] = 1;
  input.aShort[0][19] = 20;
  assert.equal(stepLegacySubsystemV(input), true);
  assert.deepEqual(events.slice(0, 2), [["fpair", 58, 30], ["spawn", 3, 57, 30, 0, 9, 1]]);
  assert.equal(input.fields.aw, 2);
  assert.deepEqual(Array.from(input.fP.slice(2, 5)), [2, 3, 1]);
  assert.deepEqual([input.state[606 + 1], input.state[606 + 2]], [3, 7]);
  assert.deepEqual(events.slice(2), [["record", 0, 56, 30, 2, 0], ["record", 0, 55, 31, 2, 0], ["scene", 33]]);
  assert.equal(input.aShort[0][19], 15);
}
{
  // N == 7: the first idle adult runs the step; it only counts once f retires.
  const { input, events } = vInput(7);
  input.state[1919 + 4] = 5; input.state[1414 + 4] = 20; input.state[202 + 4] = 1; // moving
  input.state[1919 + 6] = 5; input.state[1414 + 6] = 20; input.state[6] = 11; input.state[107] = 12;
  assert.equal(stepLegacySubsystemV(input), false);
  assert.deepEqual(events, [["place", 2, 0, 0, 0], ["place", 6, 0, 11, 12]]);
  events.length = 0;
  input.onPlaceStep = (...a) => { events.push(["place", ...a]); input.fields.f = 50; };
  assert.equal(stepLegacySubsystemV(input), true);
  assert.deepEqual(events, [["place", 2, 0, 0, 0]]);
}
{
  // No script while the chief is dead (except mission 3).
  const { input } = vInput(4);
  input.fields.F = 5; input.state[1919 + 2] = 0;
  assert.equal(stepLegacySubsystemV(input), false);
}

console.log("b.u()/b.v() mission script OK");
