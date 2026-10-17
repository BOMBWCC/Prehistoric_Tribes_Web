// Regression test for LegacyEntityResourceCost.ts: b(int,boolean,int) (#344)
// and a(int,boolean,int) (#292). Expected values derived by hand from
// bytecode/b-javap.txt 27114..27482 and 26616..27114.
import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";
import path from "node:path";

const srcDir = new URL("../src/", import.meta.url).pathname;
const context = vm.createContext({ Int8Array, Int16Array, Array, Math, console });
function loadModule(specifier, fromDir) {
  const absPath = path.resolve(fromDir, specifier) + ".ts";
  const module = { exports: {} };
  const output = ts.transpileModule(fs.readFileSync(absPath, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const fn = vm.compileFunction(output, ["module", "exports", "require"], { parsingContext: context });
  fn(module, module.exports, (spec) => loadModule(spec, path.dirname(absPath)));
  return module.exports;
}
const { checkLegacyEntityAffordable, stepLegacyEntityPayCost } = loadModule("./sim/units/LegacyEntityResourceCost", srcDir);

// Tables: action S = 11 (type 39) costs 2 of pool slot 2 (t73[11]=0, t73[12]=1,
// t71[0]=2, t72[0]=2); t76[2]=7; t74[11]=3; t75[11]=4.
function fixture() {
  const packedBytes = new Int8Array(2000);
  const packedOffsets = new Int16Array(200);
  const base = { 71: 100, 72: 200, 73: 300, 74: 400, 75: 500, 76: 600, 88: 700, 105: 800, 138: 1000 };
  for (const [row, off] of Object.entries(base)) packedOffsets[row] = off;
  packedBytes[300 + 11] = 0; packedBytes[300 + 12] = 1;
  packedBytes[100 + 0] = 2; packedBytes[200 + 0] = 2;
  packedBytes[600 + 2] = 7;
  packedBytes[400 + 11] = 3; packedBytes[500 + 11] = 4;
  const state = new Int8Array(10000);
  const pool = [new Int16Array(26), new Int16Array(26)];
  const dShort = new Int16Array(6).fill(-1);
  const gridC = Array.from({ length: 20 }, () => new Int8Array(20));
  const log = [];
  const input = {
    state, packedBytes, packedOffsets, gridC, team: 0, v: 2, pool, dShort,
    scratch: { V: 0, W: 0 }, onNotify: () => log.push("notify"),
  };
  const cb = {
    gRows: [new Int8Array(20), new Int8Array(20), new Int8Array(20)],
    f: { value: null },
    onM: () => log.push("M"), onN: () => log.push("N"), onRecordFinish: (r) => log.push(["d", r]),
  };
  return { packedBytes, state, pool, dShort, gridC, log, input, cb };
}

// Short of slot 2: 3535 = t76[2], one notification for team 0, then false.
{
  const { state, pool, dShort, log, input } = fixture();
  pool[0][2] = 1;
  assert.equal(checkLegacyEntityAffordable(input, 11, false, 5), false);
  assert.equal(state[3535 + 5], 7);
  assert.equal(dShort[1], 0);
  assert.deepEqual(log, ["notify"]);
  assert.equal(checkLegacyEntityAffordable(input, 11, false, 5), false);
  assert.deepEqual(log, ["notify"], "d[1] >= 0 now, no second notification");
}

// 6565 == S - 16 waives a missing entry; S >= 16 returns false without 3535.
{
  const { packedBytes, state, input } = fixture();
  packedBytes[300 + 20] = 0; packedBytes[300 + 21] = 1;
  state[6565 + 5] = 4;
  assert.equal(checkLegacyEntityAffordable(input, 20, false, 5), true);
  state[6565 + 5] = 0;
  assert.equal(checkLegacyEntityAffordable(input, 20, false, 5), false);
  assert.equal(state[3535 + 5], 0);
}

// a(39, false, w) (a builder at a site): pays 2 from slot 2, no unit load.
{
  const { state, pool, log, input, cb } = fixture();
  pool[0][2] = 5;
  assert.equal(stepLegacyEntityPayCost(input, cb, 39, false, 5), true);
  assert.equal(pool[0][2], 3);
  assert.equal(state[3636 + 5], 0);
  assert.deepEqual(log, []);
}

// a(39, true, w) with a type-39 unit: loads 3636 = t75[S], 3535 = t74[S].
{
  const { state, pool, input, cb } = fixture();
  pool[0][2] = 5;
  state[2828 + 5] = 39;
  assert.equal(stepLegacyEntityPayCost(input, cb, 39, true, 5), true);
  assert.deepEqual([state[3636 + 5], state[3535 + 5]], [4, 3]);
  assert.equal(cb.f.value, true, "offset 19: f = affordable");
}

// Unaffordable with flag: M(), N(), false; without flag: nothing.
{
  const { state, log, input, cb } = fixture();
  state[2828 + 5] = 39;
  // Simulate M() storing the current type, the way the real M() does.
  cb.onM = () => { log.push("M"); state[3939 + 5] = state[2828 + 5]; };
  assert.equal(stepLegacyEntityPayCost(input, cb, 39, true, 5), false);
  assert.equal(cb.f.value, false);
  assert.deepEqual(log, ["notify", "M", "N"]);
  // M() keeps the current type (the 2026-09-18 "record 69" deviation was
  // reverted 2026-10-13 after oracle run 13 showed the original keeps it).
  assert.equal(state[3939 + 5], 39);
}

// Type 37 (S = 9): the load is clamp(9, 1, pool[1]) and replaces every cost.
{
  const { packedBytes, state, pool, input, cb } = fixture();
  packedBytes[300 + 9] = 0; packedBytes[300 + 10] = 1;
  pool[0][2] = 10;
  pool[0][1] = 4;
  state[2828 + 5] = 37;
  assert.equal(stepLegacyEntityPayCost(input, cb, 37, true, 5), true);
  assert.equal(pool[0][2], 6);
  assert.equal(state[3636 + 5], 4);
}

// Unit type >= 44: refund the held item (t88/t105), 6565 = type - 44, f.d(4444).
{
  const { packedBytes, state, pool, log, input, cb } = fixture();
  pool[0][2] = 5;
  state[2828 + 5] = 46;
  state[6565 + 5] = 1;
  state[4444 + 5] = 12;
  packedBytes[700 + 1] = 3; packedBytes[800 + 1] = 6;
  assert.equal(stepLegacyEntityPayCost(input, cb, 39, true, 5), true);
  assert.equal(pool[0][3], 6);
  assert.equal(state[6565 + 5], 2);
  assert.deepEqual(log, [["d", 12]]);
}

// Action 71 (type 99), record W under the target cell, not upgrading:
// costs t138[(13 + R)*26 + kind] from slots 2..4, g[2][aK] = t138[(7+lvl-1)*26+k] - t138[(7+lvl)*26+k]
// (rows of 26 kinds; oracle run 15, play24 frame 74187).
{
  const { packedBytes, state, pool, gridC, input, cb } = fixture();
  state[6262 + 5] = 3; state[6363 + 5] = 4; gridC[4][3] = -9;
  state[8749 + 9] = 6; state[9115 + 9] = 2; state[2828 + 5] = 99;
  packedBytes[1000 + 13 * 26 + 6] = 1; packedBytes[1000 + 14 * 26 + 6] = 2; packedBytes[1000 + 15 * 26 + 6] = 0;
  packedBytes[1000 + 8 * 26 + 6] = 10; packedBytes[1000 + 9 * 26 + 6] = 4;
  pool[0][2] = 1; pool[0][3] = 5;
  cb.gRows[0][3] = 9;
  assert.equal(stepLegacyEntityPayCost(input, cb, 99, true, 5), true);
  assert.equal(input.scratch.W, 9);
  assert.deepEqual([pool[0][2], pool[0][3], pool[0][4]], [0, 3, 0]);
  assert.equal(cb.gRows[2][3], 6);
  assert.deepEqual([state[3636 + 5], state[3535 + 5]], [9, 2]);
}

// Action 71, upgrading (8627 == 2): V = 8566 - 8505, cost t138[(10+R)*26+k]*V/(8566*2), g[2] = -V (negated without flag).
{
  const { packedBytes, state, pool, input, cb } = fixture();
  input.v = 9;
  state[8749 + 9] = 6; state[8627 + 9] = 2; state[8566 + 9] = 20; state[8505 + 9] = 10;
  packedBytes[1000 + 10 * 26 + 6] = 8;
  pool[0][2] = 5;
  cb.gRows[0][0] = 9;
  assert.equal(stepLegacyEntityPayCost(input, cb, 99, false, 5), true);
  assert.equal(input.scratch.V, 10);
  assert.equal(pool[0][2], 3);
  assert.equal(cb.gRows[2][0], 10);
}

console.log("b(int,boolean,int) #344 / a(int,boolean,int) #292 OK");
