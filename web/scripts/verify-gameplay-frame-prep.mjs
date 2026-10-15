import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";
import path from "node:path";

const srcDir = new URL("../src/j2me/", import.meta.url).pathname;

function loadModule(file) {
  const module = { exports: {} };
  const output = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(output, { module, exports: module.exports, Int8Array, Int16Array });
  return module.exports;
}

const { stepLegacyGameplayFramePrep } = loadModule(path.join(srcDir, "LegacyGameplayFramePrep.ts"));

function baseState(overrides = {}) {
  return {
    vByte: 1,
    imageSlotC1: 2,
    scrollY: 0,
    ad: 0,
    scrollA: 0,
    ae: 0,
    slotFlags: new Array(20).fill(false),
    cInts: new Array(200).fill(0),
    packedBytes: new Int8Array(2000),
    packedOffsets: new Int16Array(400),
    ax: 0,
    bb: 0,
    ba: 0,
    ...overrides,
  };
}

// Test 1: vByte 0 -> onF fires, nothing else (offsets 269..280, `ifne 280`).
{
  const calls = [];
  stepLegacyGameplayFramePrep(baseState({ vByte: 0 }), {
    onF: () => calls.push("F"),
    onN: () => calls.push("N"),
  });
  assert.deepEqual(calls, ["F"]);
}

// Test 2: vByte neither 0 nor 1 -> nothing fires at all.
{
  const calls = [];
  stepLegacyGameplayFramePrep(baseState({ vByte: 2 }), {
    onF: () => calls.push("F"),
    onN: () => calls.push("N"),
  });
  assert.deepEqual(calls, []);
}

// Test 3: vByte===1 -> full prefix sequence in exact order (no HUD slots active).
{
  const state = baseState({ vByte: 1, imageSlotC1: 5, scrollY: 3, ad: 10, scrollA: 4, ae: 20 });
  const calls = [];
  stepLegacyGameplayFramePrep(state, {
    onTargetSlot: (slot) => calls.push(["slot", slot]),
    onN: () => calls.push(["N"]),
    onW: () => calls.push(["W"]),
    onU: () => calls.push(["U"]),
    onOffscreenDraw: (slot) => calls.push(["offscreen", slot]),
    onC: (x, y) => calls.push(["C", x, y]),
    onSReset: () => calls.push(["Sreset"]),
  });
  assert.deepEqual(calls, [
    ["slot", 5],
    ["N"], ["W"], ["U"],
    ["offscreen", 5],
    ["slot", 3],
    ["C", 3 * 22 - 10, 4 * 16 - 20], // first c(x,y): scrollY*22-ad, scrollA*16-ae
    ["slot", 5],
    ["C", 3 * 22, 4 * 16], // second c(x,y): scrollY*22, scrollA*16
    ["Sreset"],
  ]);
}

// Test 4: a slot with slotFlags[i]===false is skipped entirely (no
// onElementScan/onTargetSlot/onFixedSprite for that slot).
{
  const state = baseState();
  state.slotFlags[5] = false;
  const calls = [];
  stepLegacyGameplayFramePrep(state, {
    onElementScan: (...a) => calls.push(["scan", ...a]),
    onFixedSprite: (...a) => calls.push(["sprite", ...a]),
  });
  assert.deepEqual(calls, []);
}

// Test 5: active slot, slot20Table value not 1 or 2 -> element scan fires,
// no fixed-sprite draw. Confirms the record-computation formula.
{
  const state = baseState();
  state.slotFlags[7] = true;
  state.packedOffsets[195] = 100;
  state.packedBytes[100 + 7] = 3; // index into cInts
  state.cInts[3] = 50;
  state.packedBytes[100 + 20 + 7] = 0; // not 1 or 2
  const calls = [];
  stepLegacyGameplayFramePrep(state, {
    onElementScan: (aD, x, y) => calls.push(["scan", aD, x, y]),
    onFixedSprite: (...a) => calls.push(["sprite", ...a]),
  });
  assert.deepEqual(calls, [["scan", 7, 0, 50 - 8]]);
}

// Test 6: slot20Table===1 -> fixed sprite 524 at (0, ax).
{
  const state = baseState({ ax: 9 });
  state.slotFlags[2] = true;
  state.packedOffsets[195] = 100;
  state.packedBytes[100 + 20 + 2] = 1;
  const calls = [];
  stepLegacyGameplayFramePrep(state, {
    onFixedSprite: (...a) => calls.push(a),
  });
  assert.deepEqual(calls, [[524, 0, 9]]);
}

// Test 7: slot20Table===2 -> fixed sprite 528 at (0, 320-bb-ba+ax).
{
  const state = baseState({ ax: 9, bb: 3, ba: 4 });
  state.slotFlags[2] = true;
  state.packedOffsets[195] = 100;
  state.packedBytes[100 + 20 + 2] = 2;
  const calls = [];
  stepLegacyGameplayFramePrep(state, {
    onFixedSprite: (...a) => calls.push(a),
  });
  assert.deepEqual(calls, [[528, 0, 320 - 3 - 4 + 9]]);
}

// Test 8: multiple active slots processed in ascending order, each with
// its own onTargetSlot before the fixed-sprite check.
{
  const state = baseState();
  state.slotFlags[0] = true;
  state.slotFlags[3] = true;
  state.packedOffsets[195] = 0;
  const calls = [];
  stepLegacyGameplayFramePrep(state, {
    onElementScan: (aD) => calls.push(["scan", aD]),
  });
  assert.deepEqual(calls, [["scan", 0], ["scan", 3]]);
}

console.log("f.m() (no-arg) gameplay frame prep OK");
