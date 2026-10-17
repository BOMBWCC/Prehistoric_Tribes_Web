// Regression test for LegacyEntityCourtship.ts (private boolean a(boolean), #295).
// Expected values derived by hand from bytecode/b-javap.txt 30162..30598.
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { denseRequire } from "./dense-layout-require.mjs";

const module = { exports: {} };
const output = ts.transpileModule(fs.readFileSync(new URL("../src/sim/units/LegacyEntityCourtship.ts", import.meta.url).pathname, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
vm.runInNewContext(output, { require: denseRequire, module, exports: module.exports, Math });
const { stepLegacyEntityCourtship } = module.exports;

function make(rolls) {
  const state = new Int8Array(10000);
  const pool = [new Int16Array(26), new Int16Array(26)];
  const cRows = Array.from({ length: 6 }, () => new Int8Array(10));
  const log = [];
  const queue = [...rolls];
  const input = {
    state, pool, cRows, v: 4, team: 0, R: 0,
    scratch: { ae: 0, x: 0 },
    randomRemainder: (mask, divisor) => { log.push(["rand", mask, divisor]); return queue.shift() ?? 0; },
    onChangeType: (id, type) => log.push(["type", id, type]),
    onN: () => log.push(["N"]),
  };
  pool[0][18] = -1;
  pool[0][11] = 4;
  pool[0][14] = 2;
  // v = 4: male, happy. Candidates 6 and 9: female adults.
  state[1515 + 4] = 1; state[505 + 4] = 80;
  for (const id of [6, 9]) { state[505 + id] = 80; state[1919 + id] = 30; state[1414 + id] = 20; state[2828 + id] = 69; }
  // Huts 3 and 5 (team 0 records): live, unbuilt, unreserved, <= 1 worker.
  for (const r of [3, 5]) { state[8749 + r] = 2; state[8505 + r] = 10; }
  state[8383 + 5] = 20; state[8444 + 5] = 21;
  return { state, pool, cRows, log, input };
}

// !flag gates: a[u][18] >= 0, rand(10) < 4, 505 < 75.
{
  const { pool, input } = make([9]);
  pool[0][18] = 0;
  assert.equal(stepLegacyEntityCourtship(input, false), false);
  const low = make([3]);
  assert.equal(stepLegacyEntityCourtship(low.input, false), false);
  const sad = make([9]);
  sad.state[505 + 4] = 74;
  assert.equal(stepLegacyEntityCourtship(sad.input, false), false);
}

// Rolls: 4 (chance), wanted partner 1 -> the 2nd match (9); wanted hut 1 -> the 2nd hut (5).
{
  const { state, pool, cRows, log, input } = make([4, 1, 1]);
  assert.equal(stepLegacyEntityCourtship(input, false), true);
  assert.deepEqual(log.filter((e) => e[0] === "rand"), [["rand", 65535, 10], ["rand", 65535, 3], ["rand", 65535, 2]]);
  assert.equal(pool[0][18], 0);
  assert.deepEqual([cRows[4][0], cRows[0][0], cRows[1][0], cRows[5][0], cRows[2][0], cRows[3][0]], [1, 4, 9, 5, 21, 23]);
  assert.equal(state[8282 + 4], 2);
  assert.equal(state[8282 + 9], 3);
  assert.equal(state[9237 + 5], 1);
  assert.deepEqual(input.scratch, { ae: 5, x: 0 });
  assert.deepEqual(log.filter((e) => e[0] !== "rand"), [["type", 4, 109], ["N"]]);
}

// Wanted 5 with only two matches wraps around the team list: 6,9,6,9,6,9 -> stops at 9 (6th).
// Slot 0 already taken -> slot x = 1; no free hut anywhere -> false.
{
  const { state, cRows, input } = make([5, 5, 0]);
  cRows[4][0] = 2;
  for (const r of [3, 5]) state[8749 + r] = 0;
  assert.equal(stepLegacyEntityCourtship(input, true), false);
  assert.equal(input.scratch.x, 1);
}

// flag skips the happiness/chance gates but excludes R:I.
{
  const { state, cRows, log, input } = make([0, 0]);
  input.R = 6;
  state[505 + 9] = 10;
  assert.equal(stepLegacyEntityCourtship(input, true), true);
  assert.equal(cRows[1][0], 9);
}

console.log("private boolean a(boolean) #295 (courtship) OK");
