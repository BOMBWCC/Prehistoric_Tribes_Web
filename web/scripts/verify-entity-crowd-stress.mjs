// Behaviour test for LegacyEntityCrowdStress.ts: X() (bytecode/b-javap.txt
// line 37042, offsets 0..243) and Y() (line 37181, offsets 0..263), the two
// halves of the 8080 crowding counter. Expected values read off the bytecode.
import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";
import { denseRequire } from "./dense-layout-require.mjs";

const path = new URL("../src/sim/units/LegacyEntityCrowdStress.ts", import.meta.url).pathname;
const output = ts.transpileModule(fs.readFileSync(path, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(output, { require: denseRequire, module, exports: module.exports, Int8Array });
const { stepLegacyEntityCrowdDecay, stepLegacyEntityCrowdSpread } = module.exports;

const make = () => ({
  state: new Int8Array(10000),
  entityId: 4,
  gridC: Array.from({ length: 32 }, () => new Int8Array(40)),
  mapWidth: 40,
  mapHeight: 32,
});

// X(), on its own cell: the counter decays by one, and never below 0.
{
  const input = make();
  input.state[4] = 6; input.state[101 + 4] = 7;
  input.gridC[7][6] = 4;
  input.state[8080 + 4] = 2;
  stepLegacyEntityCrowdDecay(input);
  assert.equal(input.state[8080 + 4], 1);
  stepLegacyEntityCrowdDecay(input);
  assert.equal(input.state[8080 + 4], 0);
  stepLegacyEntityCrowdDecay(input);
  assert.equal(input.state[8080 + 4], 0, "offset 49: nothing happens at 0");
  assert.equal(input.state[7979 + 4], 0);
}

// X(), displaced off its own cell: the counter climbs, clamped at 30, and the
// record's 8871 bit 1 decides the direction.
{
  const input = make();
  input.state[4] = 6; input.state[101 + 4] = 7;
  input.gridC[7][6] = 9; // someone else holds the cell
  input.state[4444 + 4] = 3;
  input.state[8871 + 3] = 2; // bit 1 set -> +1
  input.state[8080 + 4] = 5;
  stepLegacyEntityCrowdDecay(input);
  assert.equal(input.state[8080 + 4], 6);

  input.state[8871 + 3] = 0; // bit 1 clear -> -1
  stepLegacyEntityCrowdDecay(input);
  assert.equal(input.state[8080 + 4], 5);

  input.state[8871 + 3] = 2;
  input.state[8080 + 4] = 29;
  stepLegacyEntityCrowdDecay(input);
  assert.equal(input.state[7979 + 4], 4, "offsets 212..228: crossing 30 raises bit 2");
  assert.equal(input.state[8080 + 4], 0, "offsets 230..242: and resets the counter");
}

// X(): types 92/93/106 are exempt from the climb (offsets 74..124).
for (const type of [92, 93, 106]) {
  const input = make();
  input.state[4] = 6; input.state[101 + 4] = 7;
  input.gridC[7][6] = 9;
  input.state[2828 + 4] = type;
  input.state[8080 + 4] = 5;
  input.state[4444 + 4] = 3;
  input.state[8871 + 3] = 2;
  stepLegacyEntityCrowdDecay(input);
  assert.equal(input.state[8080 + 4], 5, `type ${type} keeps its counter`);
}

// Y(): +8 onto every adult neighbour that is not flagged already.
{
  const input = make();
  input.state[4] = 6; input.state[101 + 4] = 7;
  input.gridC[7][6] = 4;
  // The real caller only runs Y() for a flagged adult, so give it both.
  input.state[1414 + 4] = 20;
  input.state[7979 + 4] = 4;
  // A neighbour that qualifies.
  input.gridC[7][5] = 11;
  input.state[1414 + 11] = 20;
  // An adult that is already flagged.
  input.gridC[6][6] = 12;
  input.state[1414 + 12] = 20;
  input.state[7979 + 12] = 4;
  // A child.
  input.gridC[8][7] = 13;
  input.state[1414 + 13] = 3;
  stepLegacyEntityCrowdSpread(input);
  assert.equal(input.state[8080 + 11], 8);
  assert.equal(input.state[8080 + 12], 0, "already flagged, offsets 181..195");
  assert.equal(input.state[8080 + 13], 0, "under 12 years, offsets 199..213");
  assert.equal(input.state[8080 + 4], 0, "its own cell is swept too, but its own flag excludes it");
}

// Y(): a cell value above 100 is a record, not a unit, and is skipped.
{
  const input = make();
  input.state[4] = 6; input.state[101 + 4] = 7;
  input.gridC[7][5] = 101;
  input.state[1414 + 101] = 20;
  stepLegacyEntityCrowdSpread(input);
  assert.equal(input.state[8080 + 101], 0);
}

console.log("X() / Y() crowding counter OK");
