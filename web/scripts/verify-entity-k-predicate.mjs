// Regression test for LegacyEntityKPredicate.ts (private boolean k(), #396).
// Expected values derived by hand from bytecode/b-javap.txt 24336..24620.
import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";
import { denseRequire } from "./dense-layout-require.mjs";

const source = new URL("../src/sim/units/LegacyEntityKPredicate.ts", import.meta.url).pathname;
const output = ts.transpileModule(fs.readFileSync(source, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(output, { require: denseRequire, module, exports: module.exports, Int8Array, Int16Array });
const { stepLegacyEntityKPredicate } = module.exports;

function make(type, over = {}) {
  const state = new Int8Array(10000);
  const packedBytes = new Int8Array(1000);
  const packedOffsets = new Int16Array(200);
  const saveOffsets = new Int16Array(600);
  const gridC = Array.from({ length: 20 }, () => new Int8Array(20));
  packedOffsets[27] = 100;
  packedOffsets[31] = 300;
  const id = 4;
  state[2828 + id] = type;
  state[1414 + id] = 20;
  const log = [];
  const flags = { a: false, b: false };
  const input = {
    state, packedBytes, packedOffsets, saveOffsets, gridC, id, flags,
    onP: () => { log.push("p"); return false; },
    onF: (flag) => log.push(["f", flag]),
    onAo: () => log.push("ao"),
    onL: () => log.push("L"),
    onO: () => { log.push("o"); return true; },
    onD: (v, arg) => log.push(["d", v, arg]),
    onCByte: (rec) => log.push(["c", rec]),
    onVacate: (...args) => log.push(["vacate", ...args]),
    onNeeds: () => { log.push("n"); return false; },
    onChangeType: (v, t) => { log.push(["a", v, t]); state[2828 + v] = t; },
    onBBoolean: (flag) => { log.push(["b", flag]); return false; },
    onNearestBuilding: (kind) => { log.push(["near", kind]); return false; },
    onGroupMode: (arg) => log.push(["g", arg]),
    ...over,
  };
  return { state, packedBytes, gridC, saveOffsets, log, flags, input, id };
}

// A carrier with t27 & 8 asks n() -- the partner of a courting villager joins here.
{
  const { packedBytes, log, input } = make(24, { onNeeds: () => true });
  packedBytes[100 + 24] = 40;
  assert.equal(stepLegacyEntityKPredicate(input), true);
  assert.deepEqual(log, []);
  const plain = make(24);
  plain.packedBytes[100 + 24] = 40;
  assert.equal(stepLegacyEntityKPredicate(plain.input), false);
  assert.deepEqual(plain.log, ["n"]);
}

// A gatherer (no bit 8) does nothing.
{
  const { log, input } = make(14);
  assert.equal(stepLegacyEntityKPredicate(input), false);
  assert.deepEqual(log, []);
}

// Type <= 9: 6565 == 9 flips type 3 to 2, sets a:Z/b:Z, then p(); a true p() ends it.
{
  const { state, flags, log, input, id } = make(3, { onP: () => true });
  state[6565 + id] = 9;
  assert.equal(stepLegacyEntityKPredicate(input), true);
  assert.equal(state[2828 + id], 2);
  assert.deepEqual([flags.a, flags.b], [true, true]);
  assert.deepEqual(log, []);
}

// Type <= 4 on a cell holding 4747 with an empty work slot: a(t31, 3131, 3232, 4444).
{
  const { state, packedBytes, gridC, saveOffsets, log, input, id } = make(2);
  packedBytes[300 + 2] = 7;
  saveOffsets[7] = 500;
  state[3131 + id] = 5; state[3232 + id] = 6; state[4747 + id] = 9; state[4444 + id] = 3;
  gridC[6][5] = 9;
  stepLegacyEntityKPredicate(input);
  assert.deepEqual(log, ["p", ["vacate", 7, 5, 6, 3]]);
  state[500 + 3] = 1;
  log.length = 0;
  stepLegacyEntityKPredicate(input);
  assert.deepEqual(log, ["p"]);
}

// Courtship types: 111 clears cargo and runs o(); 109 releases the pair slot; 110 carries flowers.
{
  const a = make(111);
  a.state[3636 + a.id] = 5;
  assert.equal(stepLegacyEntityKPredicate(a.input), false);
  assert.equal(a.state[3636 + a.id], 0);
  assert.deepEqual(a.log, ["o"]);
  const b = make(109);
  stepLegacyEntityKPredicate(b.input);
  assert.deepEqual(b.log, [["d", b.id, 0]]);
  const c = make(110);
  stepLegacyEntityKPredicate(c.input);
  assert.equal(c.state[3535 + c.id], 15);
}

// Type 60: tries type 12 with b(true), reverts to 60 when it fails.
{
  const { log, input, state, id } = make(60);
  assert.equal(stepLegacyEntityKPredicate(input), false);
  assert.deepEqual(log, [["a", id, 12], ["b", true], ["a", id, 60]]);
  assert.equal(state[2828 + id], 60);
}

// A child (age < 11) of type 17 near a building of kind 10 becomes 73 and moves.
{
  const { log, input, state, id } = make(17, { onNearestBuilding: () => true });
  state[1414 + id] = 5;
  assert.equal(stepLegacyEntityKPredicate(input), true);
  assert.deepEqual(log, [["a", id, 73], ["g", 1]]);
}

console.log("private boolean k() #396 OK");
