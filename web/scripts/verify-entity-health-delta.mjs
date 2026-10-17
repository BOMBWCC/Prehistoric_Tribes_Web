// Regression test for LegacyEntityHealthDelta.ts (private boolean a(int,int), #294).
// Expected values derived by hand from bytecode/b-javap.txt 25749..25846.
import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";
import { denseRequire } from "./dense-layout-require.mjs";

const source = new URL("../src/sim/units/LegacyEntityHealthDelta.ts", import.meta.url).pathname;
const output = ts.transpileModule(fs.readFileSync(source, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(output, { require: denseRequire, module, exports: module.exports, Int8Array, Math });
const { stepLegacyEntityHealthDelta } = module.exports;

const ID = 6;
function make(team = 0) {
  const state = new Int8Array(10000);
  const cBytes = new Int8Array(122);
  return { state, cBytes, input: { state, team, cBytes } };
}

// Damage: HP drops, c.f[id] follows it for team 0 too (delta < 0).
{
  const { state, cBytes, input } = make();
  state[1919 + ID] = 20;
  state[6767 + ID] = 40;
  assert.equal(stepLegacyEntityHealthDelta(input, ID, -3), false);
  assert.equal(state[1919 + ID], 17);
  assert.equal(cBytes[ID], -3);
}

// Healing a team-0 unit records the full delta in c.f[id] (offset 67 `ifeq 74`, oracle run 5
// frame 14268) and clamps HP at max.
{
  const { state, cBytes, input } = make();
  state[1919 + ID] = 39;
  state[6767 + ID] = 40;
  assert.equal(stepLegacyEntityHealthDelta(input, ID, 5), true, "reaches full health");
  assert.equal(state[1919 + ID], 40);
  assert.equal(cBytes[ID], 5);
}

// Already at full health with a positive delta: returns true, nothing changes.
{
  const { state, cBytes, input } = make();
  state[1919 + ID] = 40;
  state[6767 + ID] = 40;
  assert.equal(stepLegacyEntityHealthDelta(input, ID, 1), true);
  assert.equal(state[1919 + ID], 40);
  assert.equal(cBytes[ID], 0);
}

// delta > 1 also stamps the hit marker and clears bit 2 of 7979.
{
  const { state, input } = make();
  state[1919 + ID] = 10;
  state[6767 + ID] = 40;
  state[7979 + ID] = 7;
  stepLegacyEntityHealthDelta(input, ID, 2);
  assert.equal(state[8080 + ID], -100);
  assert.equal(state[7979 + ID], 3, "bit 2 cleared");
  assert.equal(state[1919 + ID], 12);
}

// Damage never goes below 0.
{
  const { state, input } = make();
  state[1919 + ID] = 1;
  state[6767 + ID] = 40;
  assert.equal(stepLegacyEntityHealthDelta(input, ID, -5), false);
  assert.equal(state[1919 + ID], 0);
}

// Team 1 healing leaves c.f[id] alone; only its losses are shown.
{
  const { state, cBytes, input } = make(1);
  state[1919 + ID] = 10;
  state[6767 + ID] = 40;
  stepLegacyEntityHealthDelta(input, ID, 1);
  assert.equal(cBytes[ID], 0);
  stepLegacyEntityHealthDelta(input, ID, -2);
  assert.equal(cBytes[ID], -2);
}

console.log("private boolean a(int,int) #294 (health delta) OK");
