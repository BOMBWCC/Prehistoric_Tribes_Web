// Behaviour test for LegacyAnimalHitReaction.ts: private void
// a(int,int,byte,int) (#289), bytecode/b-javap.txt line 21913, offsets 0..98.
// Expected values read off the bytecode; t181 is the real game table.
import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";
import { denseRequire } from "./dense-layout-require.mjs";

const path = new URL("../src/sim/units/LegacyAnimalHitReaction.ts", import.meta.url).pathname;
const output = ts.transpileModule(fs.readFileSync(path, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(output, { require: denseRequire, module, exports: module.exports, Int8Array, Int16Array });
const { stepLegacyAnimalHitReaction } = module.exports;

const SLOT = 3;
const ATTACKER = 7;

// The real t181 read out of the packed data at runtime: three animal kinds
// with aggression 5 / 100 / 0. t182 (damage) is [2, 4, 0] alongside it.
const T181 = [5, 100, 0];

function fixture(kind) {
  const packedBytes = new Int8Array(200);
  const packedOffsets = new Int16Array(200);
  packedOffsets[181] = 50;
  T181.forEach((value, index) => { packedBytes[50 + index] = value; });
  const state = new Int8Array(10000);
  state[9535 + SLOT] = kind;
  const calls = [];
  return {
    input: { state, packedBytes, packedOffsets, slot: SLOT, onFlee: (flag) => calls.push(flag) },
    state, calls,
  };
}

// Kinds 0 and 1 have nonzero aggression, so af()'s `p4 = 0` call always makes
// them turn on whoever hit them.
for (const kind of [0, 1]) {
  const { input, state, calls } = fixture(kind);
  stepLegacyAnimalHitReaction(input, 11, 12, ATTACKER, 0);
  assert.deepEqual([state[9645 + SLOT], state[9667 + SLOT]], [11, 12], `kind ${kind} remembers the cell`);
  assert.equal(state[9601 + SLOT], ATTACKER, `kind ${kind} targets its attacker`);
  assert.deepEqual(calls, [], `kind ${kind} does not flee`);
}

// Kind 2's aggression is 0, so `0 > 0` fails and, with no target yet, it runs.
{
  const { input, state, calls } = fixture(2);
  stepLegacyAnimalHitReaction(input, 11, 12, ATTACKER, 0);
  assert.equal(state[9601 + SLOT], 0, "no target was taken");
  assert.deepEqual([state[9645 + SLOT], state[9667 + SLOT]], [0, 0], "and no cell remembered");
  assert.deepEqual(calls, [true], "e(true) instead");
}

// ... but a kind-2 animal that ALREADY has a target keeps fighting: offset
// 45's `9601 != 0` is an independent way into the same branch.
{
  const { input, state, calls } = fixture(2);
  state[9601 + SLOT] = 4;
  stepLegacyAnimalHitReaction(input, 11, 12, ATTACKER, 0);
  assert.equal(state[9601 + SLOT], ATTACKER, "it re-targets rather than fleeing");
  assert.deepEqual(calls, []);
}

// p4 is compared against the aggression, not assumed 0: a kind-0 animal
// (aggression 5) called with p4 >= 5 falls through to the flee branch.
{
  const { input, calls } = fixture(0);
  stepLegacyAnimalHitReaction(input, 11, 12, ATTACKER, 5);
  assert.deepEqual(calls, [true], "5 > 5 is false");

  const under = fixture(0);
  stepLegacyAnimalHitReaction(under.input, 11, 12, ATTACKER, 4);
  assert.deepEqual(under.calls, []);
  assert.equal(under.state[9601 + SLOT], ATTACKER);
}

console.log("a(int,int,byte,int) #289 animal hit reaction OK");
