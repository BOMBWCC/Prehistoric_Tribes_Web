// Behaviour test for LegacyEntityProduceItem.ts: private void f(boolean)
// (#382), bytecode/b-javap.txt line 45960, offsets 0..572.
import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";
import { denseRequire } from "./dense-layout-require.mjs";

const path = new URL("../src/sim/units/LegacyEntityProduceItem.ts", import.meta.url).pathname;
const output = ts.transpileModule(fs.readFileSync(path, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(output, { require: denseRequire, module, exports: module.exports, Int8Array, Int16Array });
const { stepLegacyEntityProduceItem } = module.exports;

const V = 4;
const BUILDING = 12;
const ITEM = 3;

function fixture(team = 0) {
  const packedBytes = new Int8Array(1000);
  const packedOffsets = new Int16Array(200);
  packedOffsets[88] = 100;
  packedBytes[100 + ITEM] = 6;   // t88[item] -> pool 6
  const state = new Int8Array(10000);
  const gridC = Array.from({ length: 64 }, () => new Int8Array(64));
  const orders = [
    Array.from({ length: 10 }, () => new Int8Array(16)),
    Array.from({ length: 10 }, () => new Int8Array(16)),
  ];
  const freeSlotTable = Array.from({ length: 4 }, () => new Int8Array(30));
  const pools = [new Int16Array(30), new Int16Array(30)];
  const calls = [];
  const scratch = { R: 0 };

  // Order row 2 is this unit's building, making ITEM, 5 still to go.
  orders[team][2][11] = BUILDING;
  orders[team][2][10] = ITEM;
  orders[team][2][ITEM] = 5;
  state[8810 + BUILDING] = V;
  state[3131 + V] = 20; state[3232 + V] = 21;
  state[4444 + V] = 9;

  const input = {
    state, packedBytes, packedOffsets, gridC, orders, freeSlotTable, pools,
    v: V, team, scratch,
    onRecordCompletion: (r) => calls.push(["done", r]),
    onMarkVisible: (...a) => calls.push(["paint", ...a]),
  };
  return { input, state, gridC, orders, freeSlotTable, pools, calls, scratch };
}

// flag === false: pick up the raw material and stop.
{
  const { input, state, calls, orders } = fixture();
  stepLegacyEntityProduceItem(input, false);
  assert.equal(state[3535 + V], 6 - 5 + 8, "t88[item] - 5 + 8");
  assert.equal(state[3636 + V], 1);
  assert.deepEqual(calls, [], "nothing is finished on this half");
  assert.equal(orders[0][2][ITEM], 5, "and nothing is decremented");
}

// flag === true, type 26: the item is banked into the tribe's pool.
{
  const { input, state, pools, calls, orders } = fixture();
  state[2828 + V] = 26;
  pools[0][6] = 2;
  stepLegacyEntityProduceItem(input, true);
  assert.equal(pools[0][6], 3, "banked one into pool t88[item]");
  assert.deepEqual(calls, [["done", 9], ["done", BUILDING]]);
  assert.equal(orders[0][2][ITEM], 4, "one fewer left to make");
}

// flag === true, type 27: it is put on the ground instead -- the trap.
{
  const { input, state, gridC, freeSlotTable, calls, orders } = fixture();
  state[2828 + V] = 27;
  freeSlotTable[0][5] = BUILDING; freeSlotTable[2][5] = 20; freeSlotTable[3][5] = 21;
  stepLegacyEntityProduceItem(input, true);
  assert.equal(gridC[21][20], -111 - 0 - ITEM + 6, "negative marker on the target cell");
  assert.equal(freeSlotTable[0][5], 0, "the matching reservation is released");
  assert.deepEqual(calls[0], ["paint", 20, 21, 1, 1]);
  assert.deepEqual(calls[1], ["done", BUILDING]);
  assert.equal(orders[0][2][ITEM], 4);
}

// Team 1 placing one also bumps R:B (offsets 460..476).
{
  const { input, state, gridC, scratch } = fixture(1);
  state[2828 + V] = 27;
  stepLegacyEntityProduceItem(input, true);
  assert.equal(scratch.R, 1);
  assert.equal(gridC[21][20], -111 - 6 - ITEM + 6, "team 1 shifts the marker by 6");
}

// An order row whose building this unit does not own is skipped.
{
  const { input, state, calls } = fixture();
  state[8810 + BUILDING] = 99;
  state[2828 + V] = 26;
  stepLegacyEntityProduceItem(input, true);
  assert.deepEqual(calls, []);
}

// A row with no building at all is skipped, and a later valid row still runs.
{
  const { input, state, orders, calls } = fixture();
  orders[0][2][11] = 0;
  orders[0][6][11] = BUILDING; orders[0][6][10] = ITEM; orders[0][6][ITEM] = 1;
  state[2828 + V] = 26;
  stepLegacyEntityProduceItem(input, true);
  assert.deepEqual(calls, [["done", 9], ["done", BUILDING]]);
  assert.equal(orders[0][6][ITEM], 0);
}

// A count already at 0 is not driven negative.
{
  const { input, state, orders } = fixture();
  orders[0][2][ITEM] = 0;
  state[2828 + V] = 26;
  stepLegacyEntityProduceItem(input, true);
  assert.equal(orders[0][2][ITEM], 0);
}

console.log("f(boolean) #382 production order OK");
