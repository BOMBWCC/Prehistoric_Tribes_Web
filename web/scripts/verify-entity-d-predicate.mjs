// Regression test for LegacyEntityDPredicate.ts (private boolean d(), #369).
// Expected values derived by hand from bytecode/b-javap.txt 11707..11946.
import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";
import { denseRequire } from "./dense-layout-require.mjs";

const source = new URL("../src/sim/units/LegacyEntityDPredicate.ts", import.meta.url).pathname;
const output = ts.transpileModule(fs.readFileSync(source, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(output, { require: denseRequire, module, exports: module.exports, Int8Array, Math });
const { stepLegacyEntityDPredicate } = module.exports;

const ID = 6;
function make({ z = 0, b = 100, damage = 4 } = {}) {
  const state = new Int8Array(10000);
  const cBytes = new Int8Array(200);
  const log = [];
  const input = {
    state,
    entityId: ID,
    z,
    b,
    cBytes,
    // t106 is read as packedOffsets[106] + (mode - 106); the harness only
    // needs the row/index pair the port passes.
    readPacked: (row, index) => { log.push(["packed", row, index]); return damage; },
    onI: (argument) => log.push(["i", argument]),
    onG: (argument) => log.push(["g", argument]),
    onPStep: () => log.push(["p"]),
    onP: () => log.push(["P"]),
    onVacate: (kind, x, y, id) => log.push(["vacate", kind, x, y, id]),
  };
  return { state, cBytes, log, input };
}

// Offsets 0..45: the two "resume the interrupted action" modes call i(z).
for (const mode of [-107, -106]) {
  const { state, log, input } = make({ z: 37 });
  state[2929 + ID] = mode;
  state[7777 + ID] = 3;
  assert.equal(stepLegacyEntityDPredicate(input), true);
  assert.deepEqual(log, [["i", 37]]);
  assert.equal(state[7777 + ID], 3, "the early return skips the marker reset");
}

// Offsets 46..116: mode -95 retargets onto record 1's own cell, then g(3), p().
{
  const { state, log, input } = make();
  state[2929 + ID] = -95;
  state[8384] = 13;
  state[8445] = 9;
  assert.equal(stepLegacyEntityDPredicate(input), true);
  assert.equal(state[3131 + ID], 13);
  assert.equal(state[3232 + ID], 9);
  assert.deepEqual(log, [["g", 3], ["p"]]);
}

// Offsets 117..211: the order marker reset, the reason villagers resume work.
{
  const { state, input } = make({ z: 40, b: 5 });
  state[2929 + ID] = 9;
  state[2828 + ID] = 69;
  state[6161 + ID] = 1;
  state[7777 + ID] = 3;
  assert.equal(stepLegacyEntityDPredicate(input), false);
  assert.equal(state[6161 + ID], 0);
  assert.equal(state[7777 + ID], 0);
}

// z/10 > B keeps the marker.
{
  const { state, input } = make({ z: 90, b: 5 });
  state[2929 + ID] = 9;
  state[2828 + ID] = 69;
  state[7777 + ID] = 3;
  assert.equal(stepLegacyEntityDPredicate(input), false);
  assert.equal(state[7777 + ID], 3);
}

// Types 85 and 80 are excluded from the reset.
for (const type of [85, 80]) {
  const { state, input } = make({ z: 0, b: 100 });
  state[2929 + ID] = 9;
  state[2828 + ID] = type;
  state[6161 + ID] = 1;
  state[7777 + ID] = 3;
  assert.equal(stepLegacyEntityDPredicate(input), false);
  assert.equal(state[7777 + ID], 3);
  assert.equal(state[6161 + ID], 1);
}

// Offsets 212..425: a landed hit takes damage off both HP mirrors.
{
  const { state, cBytes, log, input } = make({ damage: 4 });
  state[2929 + ID] = 107;
  state[2828 + ID] = 69;
  state[1919 + ID] = 20;
  cBytes[ID] = 11;
  state[1313 + ID] = -2;
  state[4545 + ID] = 5;
  assert.equal(stepLegacyEntityDPredicate(input), true);
  assert.equal(state[1919 + ID], 16);
  assert.equal(cBytes[ID], 7);
  assert.equal(state[1313 + ID], 0);
  assert.equal(state[4545 + ID], 0);
  assert.deepEqual(log, [["packed", 106, 1], ["P"]]);
}

// A hit that reaches 0 HP vacates the unit through #283 with kind 19.
{
  const { state, log, input } = make({ damage: 9 });
  state[2929 + ID] = 106;
  state[1919 + ID] = 6;
  state[ID] = 12;
  state[101 + ID] = 7;
  assert.equal(stepLegacyEntityDPredicate(input), true);
  assert.deepEqual(log.at(-1), ["vacate", 19, 12, 7, ID]);
}

// Any other mode falls through to false.
{
  const { input, state } = make();
  state[2929 + ID] = 50;
  assert.equal(stepLegacyEntityDPredicate(input), false);
}

console.log("private boolean d() #369 (action finish / order-marker reset / hit resolution) OK");
