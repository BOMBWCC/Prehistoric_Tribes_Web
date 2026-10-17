// Behaviour test for LegacyAnimalRoam.ts: private void e(boolean) (#376),
// bytecode/b-javap.txt line 42154, offsets 0..565. Expected values read off
// the bytecode.
import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";
import { denseRequire } from "./dense-layout-require.mjs";

const path = new URL("../src/sim/units/LegacyAnimalRoam.ts", import.meta.url).pathname;
const output = ts.transpileModule(fs.readFileSync(path, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(output, { require: denseRequire, module, exports: module.exports, Int8Array, Int16Array, Math });
const { stepLegacyAnimalRoam } = module.exports;

const SLOT = 3;

function fixture(overrides = {}) {
  const packedBytes = new Int8Array(2000);
  const packedOffsets = new Int16Array(320);
  packedOffsets[1] = 100;    // the 8-direction step table: dx at +0..7, dy at +8..15
  packedOffsets[199] = 200;  // home x per w
  packedOffsets[200] = 210;  // home y per w
  packedOffsets[201] = 220;  // w base per mission
  packedOffsets[203] = 230;  // home-range radius per mission
  // direction 2 steps (+1, -1)
  packedBytes[100 + 2] = 1;
  packedBytes[100 + 8 + 2] = -1;
  packedBytes[220 + 0] = 4;  // t201[q 0] = 4
  packedBytes[230 + 0] = 3;  // t203[q 0] = 3 -- the radius
  packedBytes[200 + 4] = 30; // home x
  packedBytes[210 + 4] = 40; // home y

  const state = new Int8Array(10000);
  const gridC = Array.from({ length: 64 }, () => new Int8Array(64));
  const calls = [];
  const scratch = { x: 0, w: 0, B: 0 };
  state[9359 + SLOT] = 30;
  state[9381 + SLOT] = 40;
  state[9469 + SLOT] = 0;
  state[9689 + SLOT] = 7;

  const input = {
    state, packedBytes, packedOffsets, gridC, slot: SLOT,
    sceneQ: 0, mapWidth: 64, mapHeight: 48, E: 2, scratch,
    random: () => 0,
    onFreeCellScan: (...args) => calls.push(args),
    ...overrides,
  };
  return { input, state, calls, scratch, packedBytes, gridC };
}

// Offsets 87..178: the three scratch writes always happen.
{
  const { input, state, scratch } = fixture({ random: () => 41 });
  stepLegacyAnimalRoam(input, false);
  assert.equal(state[9689 + SLOT], 0);
  assert.equal(scratch.x, 41);
  assert.equal(scratch.w, 4, "t201[q] + 9469[slot]");
  assert.equal(scratch.B, 3, "t203[q], the home-range radius");
}

// flag === false: a random -4..+3 step on each axis, clamped into the box of
// radius B around the home cell. roll 41 = 0b101001 -> dx (41 & 7) - 4 = -3,
// dy ((41 >> 3) & 7) - 4 = 1, from (30, 40).
{
  const { input, state } = fixture({ random: () => 41 });
  stepLegacyAnimalRoam(input, false);
  assert.deepEqual([state[9645 + SLOT], state[9667 + SLOT]], [27, 41]);
}

// ... and that box really clamps: from the far edge of its range a big step
// cannot leave it. roll 7 -> dx 3, dy -4.
{
  const { input, state } = fixture({ random: () => 7 });
  state[9359 + SLOT] = 33;   // already at home x + B
  state[9381 + SLOT] = 40;
  stepLegacyAnimalRoam(input, false);
  assert.equal(state[9645 + SLOT], 33, "clamped to t199[w] + B");
  assert.equal(state[9667 + SLOT], 37, "40 - 4 is still inside 40 +- 3");
}

// flag === true: the step comes from t1[E] / t1[8 + E] and is clamped only by
// the map, so a fleeing animal is not held to its home range.
{
  const { input, state } = fixture();
  stepLegacyAnimalRoam(input, true);
  assert.deepEqual([state[9645 + SLOT], state[9667 + SLOT]], [31, 39], "E 2 steps (+1, -1)");
}

// ... clamped at the map edges, not the home box.
{
  const { input, state, packedBytes } = fixture();
  packedBytes[100 + 2] = 40;      // a step that would run off the map
  packedBytes[100 + 8 + 2] = -60;
  stepLegacyAnimalRoam(input, true);
  assert.deepEqual([state[9645 + SLOT], state[9667 + SLOT]], [63, 0], "mapWidth - 1 and 0");
}

// Offsets 0..86: the mission-3 corner case pins both destinations on the
// animal's current cell and skips the free-cell scan. The row test is
// y <= 6 (offset 76 `if_icmple`; corrected 2026-09-27, it was y > 6).
{
  const { input, state, calls, gridC } = fixture({ sceneQ: 3 });
  state[9359 + SLOT] = 24; state[9381 + SLOT] = 6;
  gridC[6][24] = 9;   // occupied, but wander is false so no scan
  stepLegacyAnimalRoam(input, true);
  assert.deepEqual([state[9645 + SLOT], state[9667 + SLOT]], [24, 6]);
  assert.deepEqual(calls, []);
}

// Each of that corner case's five conditions individually restores wandering.
{
  for (const mutate of [
    (f) => { f.input.sceneQ = 0; },
    (f) => { f.state[9469 + SLOT] = 1; },
    (f) => { f.state[9359 + SLOT] = 28; },
    (f) => { f.state[9359 + SLOT] = 19; },
    (f) => { f.state[9381 + SLOT] = 7; },
  ]) {
    const f = fixture({ sceneQ: 3 });
    f.state[9359 + SLOT] = 24; f.state[9381 + SLOT] = 6;
    mutate(f);
    const beforeX = f.state[9359 + SLOT];
    stepLegacyAnimalRoam(f.input, true);
    assert.notEqual(f.state[9645 + SLOT], beforeX, "wandering is back on");
  }
}

// Offsets 492..564: an occupied destination triggers a(2, 127, x, y).
{
  const { input, calls, gridC } = fixture();
  gridC[39][31] = 9;
  stepLegacyAnimalRoam(input, true);
  assert.deepEqual(calls, [[2, 127, 31, 39]]);
}

// ... and a free one does not.
{
  const { input, calls } = fixture();
  stepLegacyAnimalRoam(input, true);
  assert.deepEqual(calls, []);
}

console.log("e(boolean) #376 animal roam OK");
