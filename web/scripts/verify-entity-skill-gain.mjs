// Regression test for LegacyEntitySkillGain.ts (private boolean a(byte,byte,byte,byte), #293).
// Expected values derived by hand from bytecode/b-javap.txt 26453..26616.
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { denseRequire } from "./dense-layout-require.mjs";

const module = { exports: {} };
const output = ts.transpileModule(fs.readFileSync(new URL("../src/sim/units/LegacyEntitySkillGain.ts", import.meta.url).pathname, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
vm.runInNewContext(output, { require: denseRequire, module, exports: module.exports, Int8Array, Int16Array });
const { stepLegacyEntitySkillGain, stepLegacyEntitySlotSkillGain } = module.exports;

function fixture(roll) {
  const packedBytes = new Int8Array(400);
  const packedOffsets = new Int16Array(120);
  packedOffsets[44] = 10;
  packedOffsets[98] = 100;
  packedBytes[10 + 7] = 69;  // attr 7 -> 6969
  packedBytes[10 + 5] = 37;  // attr 5 -> 3737
  packedBytes[10 + 4] = 67;  // attr 4 -> 6767
  packedBytes[10 + 0] = 10;  // attr 0 -> 1010
  packedBytes[100 + 60] = 90; // t98[age 60]
  const saveOffsets = new Int16Array(100);
  for (let i = 0; i < 100; i += 1) saveOffsets[i] = i * 101;
  const state = new Int8Array(10000);
  const rolls = [];
  const input = {
    state, packedBytes, packedOffsets, saveOffsets, id: 6,
    randomRemainder: (mask, divisor) => { rolls.push([mask, divisor]); return roll; },
  };
  return { state, input, rolls };
}

// Harvesting (6969): roll 14 < 15 and 2 < 10 -> +1, but false (offset 100 jumps to 221: 2 < 10).
{
  const { state, input, rolls } = fixture(14);
  state[6969 + 6] = 2;
  assert.equal(stepLegacyEntitySkillGain(input, 7, 15, 10, 1), false);
  assert.equal(state[6969 + 6], 3);
  assert.deepEqual(rolls, [[0xffffff, 100]]);
}

// Roll 15 is not < 15: no change, false (chance < 100).
{
  const { state, input } = fixture(15);
  state[6969 + 6] = 2;
  assert.equal(stepLegacyEntitySkillGain(input, 7, 15, 10, 1), false);
  assert.equal(state[6969 + 6], 2);
}

// At the cap: no growth; true only when chance >= 100.
{
  const { state, input } = fixture(0);
  state[3737 + 6] = 9;
  assert.equal(stepLegacyEntitySkillGain(input, 5, 50, 9, 1), false);
  assert.equal(state[3737 + 6], 9);
  assert.equal(stepLegacyEntitySkillGain(input, 5, 100, 9, 1), true);
}

// Negative step (speed 1010, t64 = -1): 8 * -1 < 3 * -1 is false at cap 8... 5 * -1 < 3 * -1 -> 4.
{
  const { state, input } = fixture(0);
  state[1010 + 6] = 5;
  assert.equal(stepLegacyEntitySkillGain(input, 0, 10, 3, -1), false);
  assert.equal(state[1010 + 6], 4);
  state[1010 + 6] = 3;
  assert.equal(stepLegacyEntitySkillGain(input, 0, 10, 3, -1), false);
}

// Max hit points (attr 4, step 10): clamped to t98[age], current HP raised by the gain.
{
  const { state, input } = fixture(0);
  state[1414 + 6] = 60;
  state[6767 + 6] = 85;
  state[1919 + 6] = 50;
  assert.equal(stepLegacyEntitySkillGain(input, 4, 100, 120, 10), true);
  assert.equal(state[6767 + 6], 90, "95 clamped to t98[60] = 90");
  assert.equal(state[1919 + 6], 55, "1919 += 90 - 85");
}

// A gain that is not max HP returns false; a 100% entry already at its cap returns true.
{
  const { state, input } = fixture(0);
  state[3737 + 6] = 8;
  // Offsets 222..267 re-read the skill after the gain (oracle run 10, frame 31276).
  assert.equal(stepLegacyEntitySkillGain(input, 5, 100, 9, 1), true, "8 -> 9 reaches the cap in this call");
  assert.equal(state[3737 + 6], 9);
  assert.equal(stepLegacyEntitySkillGain(input, 5, 100, 9, 1), true, "now at the cap");
}

// b(int,int) #347: kind 2, level 1 -> T from t69[9] = 1 to t69[10] = 3, base t68[2] = 4:
// entries 5 and 6 = (attr 12 -> 7474, 20%, cap 10, +1) and (attr 7 -> 6969, 100%, cap 2, +1).
{
  const { state, input } = fixture(10);
  const { packedBytes, packedOffsets } = input;
  packedOffsets[69] = 200; packedOffsets[68] = 220; packedOffsets[65] = 230; packedOffsets[66] = 250; packedOffsets[67] = 270; packedOffsets[63] = 290;
  packedBytes[10 + 12] = 74;
  packedBytes[200 + 9] = 1; packedBytes[200 + 10] = 3;
  packedBytes[220 + 2] = 4;
  packedBytes[230 + 5] = 12; packedBytes[250 + 5] = 20; packedBytes[270 + 5] = 10; packedBytes[290 + 5] = 1;
  packedBytes[230 + 6] = 7; packedBytes[250 + 6] = 100; packedBytes[270 + 6] = 2; packedBytes[290 + 6] = 1;
  state[7474 + 6] = 3;
  state[6969 + 6] = 2;
  assert.equal(stepLegacyEntitySlotSkillGain(input, 2, 1), false, "7474 grew (10 < 20) but is not done; 6969 is");
  assert.equal(state[7474 + 6], 4);
  assert.equal(state[6969 + 6], 2);
  state[7474 + 6] = 10;
  assert.equal(stepLegacyEntitySlotSkillGain(input, 2, 1), false, "7474 at its cap but only 20%");
  packedBytes[250 + 5] = 100;
  assert.equal(stepLegacyEntitySlotSkillGain(input, 2, 1), true, "both 100% entries at their caps: training done");
}

console.log("private boolean a(byte,byte,byte,byte) #293 / b(int,int) #347 (skill gain) OK");
