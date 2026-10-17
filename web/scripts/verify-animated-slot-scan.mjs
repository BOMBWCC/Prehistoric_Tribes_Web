import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";
import { denseRequire } from "./dense-layout-require.mjs";

const path = new URL("../src/render/LegacyAnimatedSlotScan.ts", import.meta.url).pathname;
const output = ts.transpileModule(fs.readFileSync(path, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(output, { require: denseRequire, module, exports: module.exports, Int8Array, Int16Array });
const { stepLegacyAnimatedSlotScan } = module.exports;

function freshState(overrides = {}) {
  return {
    slotTable: Array.from({ length: 7 }, () => new Int8Array(40)),
    dense: new Int8Array(20000),
    shortTable2D: Array.from({ length: 9 }, () => new Int16Array(2000)),
    shortTable1D: new Int16Array(200),
    packedBytes: new Int8Array(2000),
    packedOffsets: new Int16Array(400),
    byteRows: Array.from({ length: 16 }, () => new Int8Array(2000)),
    originColumn: 0,
    originRow: 0,
    ...overrides,
  };
}

// Inactive slot (slotTable[0][slot]<=0): skipped entirely, no callbacks.
{
  const state = freshState();
  const calls = [];
  stepLegacyAnimatedSlotScan(state, {
    isWithinViewport: () => { calls.push("viewport"); return true; },
  });
  assert.deepEqual(calls, []);
}

// Failing the gate (bad position) frees the slot AND returns from the WHOLE
// method immediately -- a LATER active slot must never be reached.
{
  const state = freshState();
  state.slotTable[0][2] = 5; // will fail (isWithinViewport false)
  state.slotTable[0][10] = 9; // would be active, but must never be visited
  const calls = [];
  stepLegacyAnimatedSlotScan(state, {
    isWithinViewport: () => false,
    classifyOccupancy: () => 0,
    onSpriteDraw: () => calls.push("draw"),
  });
  assert.equal(state.slotTable[0][2], 0, "failing slot must be freed");
  assert.equal(state.slotTable[0][10], 9, "later slot must be untouched -- never reached");
  assert.deepEqual(calls, []);
}

// classifyOccupancy!=0 also fails the gate, same early-return behavior.
{
  const state = freshState();
  state.slotTable[0][0] = 5;
  const calls = [];
  stepLegacyAnimatedSlotScan(state, {
    isWithinViewport: () => true,
    classifyOccupancy: () => 1, // not 0 -> bad position
    onSpriteDraw: () => calls.push("draw"),
  });
  assert.equal(state.slotTable[0][0], 0);
  assert.deepEqual(calls, []);
}

// Good position, slotKind default (0): shouldDraw is true unconditionally
// once position is good (the e[1919]/slotKind===1 sub-check only applies
// when slotKind===1). Verifies the nibble-packed x/y offset unpacking.
{
  const state = freshState();
  state.slotTable[0][4] = 30; // record
  state.slotTable[5][4] = 2; // aq
  state.slotTable[6][4] = 0; // default kind
  state.slotTable[2][4] = 0b00100011; // packed nibble: low=3, high=2
  state.dense[8383 + 2] = 5; // base x
  state.dense[8444 + 2] = 6; // base y
  const draws = [];
  stepLegacyAnimatedSlotScan(state, {
    isWithinViewport: () => true,
    classifyOccupancy: () => 0,
    onSpriteDraw: (...a) => draws.push(a),
  });
  // x = 5 + (0b00100011 & 15) = 5+3 = 8; y = 6 + ((0b00100011>>4)&15) = 6+2 = 8
  assert.equal(draws.length, 1);
  assert.deepEqual(draws[0], [30, 8 * 22, 8 * 16, 0]);
}

// slotKind===1, e[1919+aq]<=0 -> shouldDraw false (the slotKind===1-specific gate) -> frees+returns.
{
  const state = freshState();
  state.slotTable[0][1] = 5;
  state.slotTable[5][1] = 7; // aq
  state.slotTable[6][1] = 1; // slotKind
  state.dense[1919 + 7] = 0; // <=0
  const calls = [];
  stepLegacyAnimatedSlotScan(state, {
    isWithinViewport: () => true,
    classifyOccupancy: () => 0,
    onSpriteDraw: () => calls.push("draw"),
  });
  assert.equal(state.slotTable[0][1], 0);
  assert.deepEqual(calls, []);
}

// slotKind===2: e[1919+aq]<=0 does NOT block the draw (only slotKind===1 has that extra gate).
{
  const state = freshState();
  state.slotTable[0][1] = 5;
  state.slotTable[5][1] = 7;
  state.slotTable[6][1] = 2;
  state.dense[1919 + 7] = 0;
  state.dense[9359 + 7] = 4; // x
  state.dense[9381 + 7] = 4; // y
  // Set up the table chain minimally so it doesn't throw; values are
  // irrelevant here since we're only checking that the draw fires.
  const calls = [];
  stepLegacyAnimatedSlotScan(state, {
    isWithinViewport: () => true,
    classifyOccupancy: () => 0,
    onSpriteDraw: (...a) => calls.push(a),
  });
  assert.equal(calls.length, 1);
  assert.equal(state.slotTable[2][1], 0, "slotKind===2 clears the nibble byte before the frame search");
}

// Full slotKind===1 table-walk, hand-derived expected values (see commit
// message / reverse-engineering doc for the worked-example derivation).
{
  const state = freshState();
  const slot = 3, aq = 7;
  state.slotTable[0][slot] = 50; // record
  state.slotTable[5][slot] = aq;
  state.slotTable[6][slot] = 1; // slotKind
  state.slotTable[1][slot] = 2; // phase (before this call)
  state.slotTable[2][slot] = 5; // packed nibble/state byte used by the frame search

  state.dense[0 + aq] = 20; // x
  state.dense[101 + aq] = 15; // y
  state.dense[1919 + aq] = 1; // >0, satisfies the slotKind===1 gate

  state.shortTable1D[29] = 100; // kind=29 (default) base offset
  state.dense[100 + aq] = 3; // stateIndex = dense[shortTable1D[29]+aq] & 0xff = 3

  state.shortTable2D[3][3] = 1 << 14; // bank = (this >> 14) & 3 = 1
  state.dense[606 + aq] = 4; // frameSelector
  state.packedOffsets[99] = 200;
  state.packedBytes[200 + 1 * 8 + 4] = 6; // frameRecordBase, at po[99]+bank*8+frameSelector

  state.shortTable2D[2][3] = 100; // recordBase (&4095 no-op here)
  state.byteRows[4][3] = 2; // stride
  state.shortTable1D[30] = 150; // kind+1 base offset
  state.dense[150 + aq] = 9; // extra
  // combinedRecord = 100 + 6*2 + 9 = 121
  state.shortTable2D[4][121] = 55; // frameGroupStart
  state.shortTable2D[8][55] = 300; // frameBase
  state.byteRows[15][55] = 3; // frameCount (search steps 0,1,2)
  state.byteRows[14][300] = 2; // step0: &15=2, no match (target is 5)
  state.byteRows[14][301] = 5; // step1: &15=5, MATCH -> frameIndex=301

  state.dense[202 + aq] = 3; // slotKind===1 x-offset dense read
  state.byteRows[12][301] = 7;
  state.dense[303 + aq] = 2; // slotKind===1 y-offset dense read
  state.byteRows[13][301] = 4;

  state.byteRows[9][50] = 10; // phase limit for record 50 -- stays active after +1

  const draws = [];
  stepLegacyAnimatedSlotScan(state, {
    isWithinViewport: () => true,
    classifyOccupancy: () => 0,
    onSpriteDraw: (...a) => draws.push(a),
  });

  // pixelX = (20-0)*22 + (3+7) = 440+10 = 450; pixelY = (15-0)*16 + (2+4) = 240+6 = 246
  assert.deepEqual(draws, [[50, 450, 246, 2]]);
  assert.equal(state.slotTable[1][slot], 3, "phase incremented 2 -> 3");
  assert.equal(state.slotTable[0][slot], 50, "record stays active: 3 < byteRows[9][50]=10");
}

// Phase reaching the limit frees the slot.
{
  const state = freshState();
  const slot = 6, aq = 2;
  state.slotTable[0][slot] = 40;
  state.slotTable[5][slot] = aq;
  state.slotTable[6][slot] = 0; // default kind, skips the table walk entirely
  state.slotTable[1][slot] = 4; // phase, will become 5
  state.dense[8383 + aq] = 1;
  state.dense[8444 + aq] = 1;
  state.byteRows[9][40] = 5; // limit: nextPhase(5) >= 5 -> frees
  stepLegacyAnimatedSlotScan(state, { isWithinViewport: () => true, classifyOccupancy: () => 0 });
  assert.equal(state.slotTable[1][slot], 5);
  assert.equal(state.slotTable[0][slot], 0, "slot freed once phase reaches the limit");
}

console.log("f.r() animated-slot scan (frame-table lookup) OK");
