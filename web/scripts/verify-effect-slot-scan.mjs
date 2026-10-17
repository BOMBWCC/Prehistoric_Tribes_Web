import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";
import { denseRequire } from "./dense-layout-require.mjs";

const path = new URL("../src/render/LegacyEffectSlotScan.ts", import.meta.url).pathname;
const output = ts.transpileModule(fs.readFileSync(path, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(output, { require: denseRequire, module, exports: module.exports, Int8Array, Int16Array });
const { stepLegacyEffectSlotScan, isLegacyWithinViewport } = module.exports;

// isLegacyWithinViewport: exact half-open [origin, origin+size) bounds check.
{
  const bounds = { originColumn: 2, originRow: 3, columns: 5, rows: 4 };
  assert.equal(isLegacyWithinViewport(bounds, 2, 3), true); // inclusive lower
  assert.equal(isLegacyWithinViewport(bounds, 6, 6), true); // inside
  assert.equal(isLegacyWithinViewport(bounds, 7, 6), false); // originColumn+columns, exclusive
  assert.equal(isLegacyWithinViewport(bounds, 1, 3), false); // below originColumn
  assert.equal(isLegacyWithinViewport(bounds, 2, 7), false); // originRow+rows, exclusive
}

function freshState(overrides = {}) {
  return {
    originColumn: 0, originRow: 0, columns: 12, rows: 19,
    slotGrid: [new Int8Array(30), new Int8Array(30), new Int8Array(30)],
    dense: new Int8Array(20000),
    packedBytes: new Int8Array(2000),
    packedOffsets: new Int16Array(400),
    ...overrides,
  };
}

// Empty slot (id===0) is skipped entirely -- no callbacks, no timer write.
{
  const state = freshState();
  const calls = [];
  stepLegacyEffectSlotScan(state, {
    onSpriteDraw: () => calls.push("draw"),
    onRect: () => calls.push("rect"),
  });
  assert.deepEqual(calls, []);
}

// timer < 20 (still animating): draws the footprint, does NOT clear the slot,
// still increments the timer.
{
  const state = freshState();
  state.slotGrid[0][5] = 7; // entity id 7 in slot 5
  state.slotGrid[1][5] = 3; // timer
  state.dense[8383 + 7] = 5; // x
  state.dense[8444 + 7] = 6; // y (stored value; local y = 6-1 = 5)
  state.dense[8749 + 7] = 2; // width/height table index
  state.packedOffsets[138] = 1000;
  state.packedBytes[1000 + 104 + 2] = 3; // width
  state.packedBytes[1000 + 130 + 2] = 1; // height
  const draws = [];
  const otherCalls = [];
  stepLegacyEffectSlotScan(state, {
    onSpriteDraw: (...a) => draws.push(a),
    onRect: () => otherCalls.push("rect"),
    onSlotAction: () => otherCalls.push("action"),
    onModeThreeExpire: () => otherCalls.push("expire"),
  });
  assert.deepEqual(otherCalls, []); // expire-only callbacks must not fire
  assert.equal(state.slotGrid[0][5], 7); // slot NOT freed
  assert.equal(state.slotGrid[1][5], 4); // timer incremented 3 -> 4
  // width=3,height=1: col in {0,2}, row in {0}. x=5,y=5.
  assert.deepEqual(draws, [
    [74, (5 + 0 - 0) * 22, (5 + 0 - 0) * 16, 4 * 0 + 2 * 0 + 3 - 1],
    [74, (5 + 2 - 0) * 22, (5 + 0 - 0) * 16, 4 * 2 + 2 * 0 + 3 - 1],
  ]);
}

// timer < 20 but outside the viewport: no draw calls at all.
{
  const state = freshState({ originColumn: 100, originRow: 100 });
  state.slotGrid[0][0] = 3;
  state.slotGrid[1][0] = 0;
  state.dense[8383 + 3] = 10;
  state.dense[8444 + 3] = 21;
  const draws = [];
  stepLegacyEffectSlotScan(state, { onSpriteDraw: (...a) => draws.push(a) });
  assert.deepEqual(draws, []);
}

// timer >= 20 (expired): frees the slot, draws no sprite, fires onRect/onSlotAction,
// and onModeThreeExpire only when the mode byte is exactly 3.
{
  const state = freshState();
  state.slotGrid[0][2] = 9;
  state.slotGrid[1][2] = 20;
  state.slotGrid[2][2] = 3; // mode byte
  state.dense[8383 + 9] = 5;
  state.dense[8444 + 9] = 8; // local y = 7
  state.dense[8749 + 9] = 0;
  state.packedOffsets[138] = 500;
  state.packedBytes[500 + 104 + 0] = 4; // width
  state.packedBytes[500 + 130 + 0] = 6; // height
  const calls = [];
  stepLegacyEffectSlotScan(state, {
    onRect: (...a) => calls.push(["rect", ...a]),
    onSlotAction: (...a) => calls.push(["action", ...a]),
    onModeThreeExpire: (...a) => calls.push(["expire", ...a]),
    onSpriteDraw: () => calls.push("draw"),
  });
  assert.equal(state.slotGrid[0][2], 0, "slot must be freed");
  assert.equal(state.dense[8627 + 9], 3);
  assert.deepEqual(calls, [
    ["expire", 9, false],
    ["rect", 5, 8, 4, 6], // (x, y-1+1, width, height) = (x, y, w, h)
    ["action", 9],
  ]);
}

// timer >= 20 but mode byte !== 3: onModeThreeExpire must not fire.
{
  const state = freshState();
  state.slotGrid[0][2] = 9;
  state.slotGrid[1][2] = 25;
  state.slotGrid[2][2] = 1; // not 3
  const calls = [];
  stepLegacyEffectSlotScan(state, {
    onModeThreeExpire: () => calls.push("expire"),
    onRect: () => calls.push("rect"),
    onSlotAction: () => calls.push("action"),
  });
  assert.deepEqual(calls, ["rect", "action"]);
  assert.equal(state.dense[8627 + 9], 0); // untouched
}

console.log("f.s() effect-slot scan + f.a(int,int) viewport bounds OK");
