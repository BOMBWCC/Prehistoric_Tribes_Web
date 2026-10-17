// Regression test for LegacyEntityHappiness.ts (private void W()).
// Expected values derived by hand from bytecode/b-javap.txt 36836..37042.
import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";
import { denseRequire } from "./dense-layout-require.mjs";

const source = new URL("../src/sim/units/LegacyEntityHappiness.ts", import.meta.url).pathname;
const output = ts.transpileModule(fs.readFileSync(source, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(output, { require: denseRequire, module, exports: module.exports, Int8Array, Int16Array, Math });
const { stepLegacyEntityHappiness } = module.exports;

const ID = 5;
function make({ t51 = 0 } = {}) {
  const state = new Int8Array(10000);
  const packedBytes = new Int8Array(3000);
  const packedOffsets = new Int16Array(300);
  packedOffsets[51] = 100;
  packedOffsets[138] = 1000;
  packedBytes[100 + 69] = t51;
  const bShort = new Int16Array(600);
  const shortTableBOffsets = new Int16Array(10);
  shortTableBOffsets[4] = 50;
  bShort[50 + 0] = 10;   // grace ends at frame 10 for fQ 0
  const scratch = { w: 0 };
  state[2828 + ID] = 69;
  state[4646 + ID] = -1;
  state[2020 + ID] = 80;
  state[2121 + ID] = 80;
  state[505 + ID] = 50;
  return { state, input: { state, packedBytes, packedOffsets, id: ID, team: 0, frame: 20, fQ: 0, bShort, shortTableBOffsets, scratch } };
}

// Still in the opening grace: nothing moves.
{
  const { state, input } = make();
  stepLegacyEntityHappiness({ ...input, frame: 5 });
  assert.equal(state[505 + ID], 50);
}

// Baseline: t51 0, housed or not, fed and rested -> +1 for f.q < 2 on team 0.
{
  const { state, input } = make();
  stepLegacyEntityHappiness(input);
  assert.equal(state[505 + ID], 51);
}

// Negative t51 and homeless -> -3 on top of t51.
{
  const { state, input } = make({ t51: -1 });
  state[3434 + ID] = -1;
  stepLegacyEntityHappiness(input);
  assert.equal(state[505 + ID], 50 - 1 - 3 + 1);
}

// Same, but housed: no -3.
{
  const { state, input } = make({ t51: -1 });
  state[3434 + ID] = 4;
  stepLegacyEntityHappiness(input);
  assert.equal(state[505 + ID], 50 - 1 + 1);
}

// Tired and hungry each cost 1.
{
  const { state, input } = make();
  state[2121 + ID] = 10;
  state[2020 + ID] = 10;
  stepLegacyEntityHappiness(input);
  assert.equal(state[505 + ID], 50 - 2 + 1);
}

// Working in a building (4646 >= 0) adds t138[(20 + 9115[rec]) * 26 + 8749[rec]].
{
  const { state, input } = make();
  state[4646 + ID] = 0;
  state[4444 + ID] = 3;
  state[9115 + 3] = 1;
  state[8749 + 3] = 4;
  input.packedBytes[1000 + 21 * 26 + 4] = 2;
  stepLegacyEntityHappiness(input);
  assert.equal(state[505 + ID], 50 + 2 + 1);
}

// Clamped to [0, 99].
{
  const { state, input } = make();
  state[505 + ID] = 99;
  stepLegacyEntityHappiness(input);
  assert.equal(state[505 + ID], 99);
  state[505 + ID] = 0;
  state[2121 + ID] = 1; state[2020 + ID] = 1;
  stepLegacyEntityHappiness({ ...input, fQ: 3 });
  assert.equal(state[505 + ID], 0);
}

console.log("private void W() (happiness drift) OK");
