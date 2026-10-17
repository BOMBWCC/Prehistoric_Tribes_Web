// Behaviour test for LegacyEntityMoodPick.ts: private void B(),
// bytecode/b-javap.txt line 17070, offsets 0..522.
import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";
import { denseRequire } from "./dense-layout-require.mjs";

const path = new URL("../src/sim/units/LegacyEntityMoodPick.ts", import.meta.url).pathname;
const output = ts.transpileModule(fs.readFileSync(path, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(output, { require: denseRequire, module, exports: module.exports, Int8Array, Int16Array });
const { stepLegacyEntityMoodPick } = module.exports;

const V = 4;
const THOUGHT = 5;

// t56 is four bands of 11: row selector, min, max, percent.
function fixture(rolls = []) {
  const packedBytes = new Int8Array(1000);
  const packedOffsets = new Int16Array(200);
  const saveOffsets = new Int16Array(200);
  packedOffsets[56] = 100;
  packedBytes[100 + THOUGHT] = 40;        // t56[I] -> saveOffsets row 40
  packedBytes[100 + 11 + THOUGHT] = 10;   // min
  packedBytes[100 + 22 + THOUGHT] = 50;   // max
  packedBytes[100 + 33 + THOUGHT] = 60;   // 60% chance
  saveOffsets[40] = 2020;                 // the stat this thought watches

  const state = new Int8Array(10000);
  state[2828 + V] = 69;     // an adult worker type, > 9
  state[3333 + V] = -1;     // off cooldown
  state[2020 + V] = 30;     // inside [10, 50]
  state[2121 + V] = 40;
  state[3434 + V] = 1;      // has a home
  state[505 + V] = 50;      // happy

  const queue = [...rolls];
  const input = {
    state, packedBytes, packedOffsets, saveOffsets, v: V,
    random: () => (queue.length ? queue.shift() : 0),
  };
  return { input, state };
}

// A unit mid-action is left completely alone.
{
  for (const action of [39, 104, 105]) {
    const { input, state } = fixture();
    state[2929 + V] = action;
    state[3333 + V] = 7;
    stepLegacyEntityMoodPick(input);
    assert.equal(state[3333 + V], 7, `action ${action} is untouched`);
  }
}

// A bubble already showing is taken down and replaced by a -2..-5 cooldown.
{
  const { input, state } = fixture([3]);
  state[3333 + V] = 7;
  stepLegacyEntityMoodPick(input);
  assert.equal(state[3333 + V], -5, "-2 - rand(4)");
}

// A cooldown below -1 ticks back up by one and stops there for this turn.
{
  const { input, state } = fixture();
  state[3333 + V] = -4;
  stepLegacyEntityMoodPick(input);
  assert.equal(state[3333 + V], -3, "counted up, and the method returned");
}

// Type <= 9 never gets a bubble.
{
  const { input, state } = fixture([THOUGHT, 0]);
  state[2828 + V] = 5;
  stepLegacyEntityMoodPick(input);
  assert.equal(state[3333 + V], -1);
}

// A courting type always shows bubble 1, skipping the roll entirely.
{
  for (const type of [109, 110, 111]) {
    const { input, state } = fixture();
    state[2828 + V] = type;
    stepLegacyEntityMoodPick(input);
    assert.equal(state[3333 + V], 1, `type ${type}`);
  }
}

// The roll: thought THOUGHT, stat inside its window, chance roll under the
// percent -> that bubble is shown.
{
  const { input, state } = fixture([THOUGHT, 59]);
  stepLegacyEntityMoodPick(input);
  assert.equal(state[3333 + V], THOUGHT);
}

// ... the chance roll at or above the percent shows nothing.
{
  const { input, state } = fixture([THOUGHT, 60]);
  stepLegacyEntityMoodPick(input);
  assert.equal(state[3333 + V], -1);
}

// ... a stat outside the window shows nothing either, on both sides.
{
  for (const stat of [9, 51]) {
    const { input, state } = fixture([THOUGHT, 0]);
    state[2020 + V] = stat;
    stepLegacyEntityMoodPick(input);
    assert.notEqual(state[3333 + V], THOUGHT, `stat ${stat} is outside [10, 50]`);
  }
}

// Rolling 11..21 means "no thought this time" -- the band table is not read.
{
  const { input, state } = fixture([15, 0]);
  stepLegacyEntityMoodPick(input);
  assert.equal(state[3333 + V], -1);
}

// The three overrides, in bytecode order: homeless and unhappy, starving,
// exhausted -- and the last one written wins.
{
  const homeless = fixture([15, 0]);
  homeless.state[3434 + V] = 0; homeless.state[505 + V] = 9;
  stepLegacyEntityMoodPick(homeless.input);
  assert.equal(homeless.state[3333 + V], 9);

  const starving = fixture([15, 0]);
  starving.state[2020 + V] = 0;
  stepLegacyEntityMoodPick(starving.input);
  assert.equal(starving.state[3333 + V], 0);

  const tired = fixture([15, 0]);
  tired.state[2121 + V] = 0;
  stepLegacyEntityMoodPick(tired.input);
  assert.equal(tired.state[3333 + V], 2);

  // Starving AND exhausted: 2 is written last.
  const both = fixture([15, 0]);
  both.state[2020 + V] = 0; both.state[2121 + V] = 0;
  stepLegacyEntityMoodPick(both.input);
  assert.equal(both.state[3333 + V], 2, "exhausted is written after starving");
}

console.log("B() mood pick OK");
