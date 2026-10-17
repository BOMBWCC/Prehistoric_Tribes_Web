// Regression test for LegacyEntityDeathCleanup.ts (private void m(int) #400
// and final void b(int) #350).
// Expected values derived by hand from bytecode/b-javap.txt 34136..34230 and 35859..35902.
import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";
import { denseRequire } from "./dense-layout-require.mjs";

const source = new URL("../src/sim/units/LegacyEntityDeathCleanup.ts", import.meta.url).pathname;
const output = ts.transpileModule(fs.readFileSync(source, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(output, { require: denseRequire, module, exports: module.exports, Int8Array, Int16Array, Math });
const { stepLegacyEntityDeathCleanup, releaseLegacyEntityHome } = module.exports;

function make() {
  const state = new Int8Array(10000);
  const gridC = Array.from({ length: 20 }, () => new Int8Array(20));
  const saveOffsets = new Int16Array(600);
  const shortRows = [new Int16Array(26), new Int16Array(26)];
  const log = [];
  return { state, gridC, saveOffsets, shortRows, log, input: { state, gridC, saveOffsets, shortRows, onD: (id, arg) => log.push(["d", id, arg]) } };
}

// A team-0 corpse: cell cleared, HP/5959 zeroed, population and the male
// counter each drop by one.
{
  const { state, gridC, shortRows, log, input } = make();
  const id = 7;
  state[id] = 4; state[101 + id] = 5;
  state[1919 + id] = -3; state[5959 + id] = 2;
  state[1515 + id] = 0;
  gridC[5][4] = id;
  shortRows[0][11] = 9; shortRows[0][12] = 5; shortRows[0][13] = 4;
  stepLegacyEntityDeathCleanup(input, id);
  assert.deepEqual(log, [["d", id, 0]]);
  assert.equal(state[1919 + id], 0);
  assert.equal(state[5959 + id], 0);
  assert.equal(gridC[5][4], 0);
  assert.equal(shortRows[0][11], 8);
  assert.equal(shortRows[0][12], 4);
  assert.equal(shortRows[0][13], 4, "the female counter is untouched");
}

// 4545 <= -111 is a saved cell marker and goes back into the grid.
{
  const { state, gridC, input } = make();
  const id = 3;
  state[id] = 2; state[101 + id] = 2;
  state[4545 + id] = -120;
  gridC[2][2] = id;
  stepLegacyEntityDeathCleanup(input, id);
  assert.equal(gridC[2][2], -120);
}

// A female team-1 unit decrements row 1 and slot 13.
{
  const { state, shortRows, input } = make();
  const id = 60;
  state[1515 + id] = 1;
  shortRows[1][11] = 4; shortRows[1][13] = 2;
  stepLegacyEntityDeathCleanup(input, id);
  assert.equal(shortRows[1][11], 3);
  assert.equal(shortRows[1][13], 1);
}

// b(int): an unbuilt hut uses row 90, a finished one row 97; both clear 3434.
{
  const { state, saveOffsets } = make();
  const id = 5;
  const home = 6;
  saveOffsets[90] = 400;
  saveOffsets[97] = 500;
  state[3434 + id] = home;
  state[8627 + home] = 0;
  state[400 + home] = 3;
  releaseLegacyEntityHome(state, saveOffsets, id);
  assert.equal(state[400 + home], 2);
  assert.equal(state[3434 + id], 0);

  state[3434 + id] = home;
  state[8627 + home] = 1;
  state[500 + home] = 7;
  releaseLegacyEntityHome(state, saveOffsets, id);
  assert.equal(state[500 + home], 6);
  assert.equal(state[3434 + id], 0);
}

// No home: nothing happens.
{
  const { state, saveOffsets } = make();
  state[3434 + 9] = 0;
  releaseLegacyEntityHome(state, saveOffsets, 9);
  assert.equal(state[3434 + 9], 0);
}

console.log("private void m(int) #400 / final void b(int) #350 (death cleanup) OK");
