import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";

const path = new URL("../src/j2me/LegacyGameplayNegativeEntityBranch.ts", import.meta.url).pathname;
const output = ts.transpileModule(fs.readFileSync(path, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(output, { module, exports: module.exports, Int8Array, Int16Array, Int32Array });
const { stepLegacyNegativeEntityBranch } = module.exports;

function grid(rows, cols) {
  return Array.from({ length: rows }, () => new Int8Array(cols));
}

function mockGraphics() {
  const calls = [];
  return { calls, setColor: (v) => calls.push(["setColor", v]), fillRect: (...a) => calls.push(["fillRect", ...a]) };
}

function freshState(overrides = {}) {
  return {
    dense: new Int8Array(20000),
    colorTable: new Int32Array([1, 2, 3]),
    gridC: grid(32, 40),
    packedBytes: new Int8Array(4000),
    packedOffsets: new Int16Array(600),
    originColumn: 0,
    originRow: 0,
    sFlag: false,
    scrollA: 0,
    scrollY: 0,
    phase: 42,
    rowPixelBase: -16, // matches the pre-fix hardcoded constant so existing fixtures below don't need updating
    ...overrides,
  };
}

// Section 1: occupancyClass>=2 && e[9176-id]<=0 -> nothing fires, and
// (confirmed against the raw bytecode: this specific gate's jump target is
// offset 1584, the tail branch, NOT the epilogue) fallThroughToTail is true.
{
  const state = freshState();
  const id = -5;
  state.dense[9176 - id] = 0;
  const calls = [];
  const result = stepLegacyNegativeEntityBranch(id, 2, state, undefined, {
    onMapMarkerArg1: () => calls.push("marker"),
  });
  assert.deepEqual(calls, []);
  assert.equal(result.fallThroughToTail, true);
}

// Section 1: occupancyClass>=2 && e[9176-id]>0 -> proceeds past the guard;
// the (e[9176-id]&4) table update uses the ORIGINAL occupancyClass; this
// path does NOT fall through to the tail branch (a different exit).
{
  const state = freshState();
  const id = -5;
  state.dense[9176 - id] = 0b100 | 1; // >0 and bit 4 set
  state.dense[8871 - id] = 1; // already marked -> section 2 returns immediately after
  const result = stepLegacyNegativeEntityBranch(id, 2, state, undefined, {});
  // occupancyClass===2 matches neither the 0 nor 1 case in the switch, so
  // e[9176-id] is untouched by the reassignment (only the |1 marker-bit
  // write in section 2 would apply, but that's gated separately -- here
  // the entity is already marked so section 2 returns before touching it).
  assert.equal(state.dense[9176 - id], 0b100 | 1);
  assert.equal(result.fallThroughToTail, false);
}

// Section 1: (e[9176-id]&4)!=0 with occupancyClass===0 -> e[9176-id] set to 6.
{
  const state = freshState();
  const id = -5;
  state.dense[9176 - id] = 0b100; // bit 4 set, no marker bit
  state.dense[8871 - id] = 1; // skip section 2 for isolation
  stepLegacyNegativeEntityBranch(id, 0, state, undefined, {});
  assert.equal(state.dense[9176 - id], 6);
}

// Section 1: occupancyClass===1 -> e[9176-id] set to 5.
{
  const state = freshState();
  const id = -5;
  state.dense[9176 - id] = 0b100;
  state.dense[8871 - id] = 1;
  stepLegacyNegativeEntityBranch(id, 1, state, undefined, {});
  assert.equal(state.dense[9176 - id], 5);
}

// Section 2: already-marked bit set -> returns immediately, no footprint call.
{
  const state = freshState();
  const id = -5;
  state.dense[8871 - id] = 1;
  const calls = [];
  stepLegacyNegativeEntityBranch(id, 0, state, undefined, {
    onMapMarkerArg1: () => calls.push("marker"),
    onFootprintMark: () => calls.push("footprint"),
  });
  assert.deepEqual(calls, []);
}

// Section 2: not yet marked -> marker draw + marker-bit set + footprint call
// with layer 0 (since bit 4 of e[9176-id] is clear), then bit 4 gets set.
{
  const state = freshState();
  const id = -5;
  state.dense[8871 - id] = 0;
  state.dense[8749 - id] = 3; // local9 (width/height table index)
  state.packedOffsets[138] = 1000;
  state.packedBytes[1000 + 104 + 3] = 4; // width
  state.packedBytes[1000 + 130 + 3] = 5; // height
  state.dense[8383 - id] = 20; // entity x
  state.dense[8444 - id] = 21; // entity y
  state.sFlag = true; // short-circuit after section 2 to isolate it
  const calls = [];
  stepLegacyNegativeEntityBranch(id, 0, state, undefined, {
    onMapMarkerArg1: (v) => calls.push(["marker", v]),
    onFootprintMark: (...a) => calls.push(["footprint", ...a]),
  });
  assert.deepEqual(calls, [["marker", id], ["footprint", 0, 20, 21, 4, 5]]);
  assert.equal(state.dense[8871 - id] & 1, 1);
  assert.equal(state.dense[9176 - id] & 4, 4);
}

// Offsets 782..861: bit 4 already set on entry -> no footprint mark at all, and 9176 is only
// re-derived by section 1 (oracle run 15, play11 frame 52120: the port marked layer 1).
{
  const state = freshState();
  const id = -5;
  state.dense[8871 - id] = 0;
  state.dense[9176 - id] = 0b101;
  state.sFlag = true;
  const calls = [];
  const result = stepLegacyNegativeEntityBranch(id, 2, state, undefined, {
    onFootprintMark: (...a) => calls.push(a),
  });
  assert.deepEqual(calls, []);
  assert.equal(state.dense[9176 - id], 0b101);
  // Offsets 634..682: 9176 & 3 == 1 -> local3 = 1 for the epilogue.
  assert.equal(result.occupancyClass, 1);
}

// The first mark assigns 9176 = 4 (not |= 4), and 9176 & 3 == 2 re-derives local3 = 0.
{
  const state = freshState();
  const id = -5;
  state.dense[9176 - id] = 2;
  state.sFlag = true;
  const result = stepLegacyNegativeEntityBranch(id, 1, state, undefined, { onFootprintMark: () => {} });
  assert.equal(state.dense[9176 - id], 4);
  assert.equal(result.occupancyClass, 0);
}

// Section 3: sFlag suppresses everything past section 2 (section 2 itself
// still runs -- its own callbacks are simply not asserted on here).
{
  const state = freshState({ sFlag: true });
  const id = -5;
  const calls = [];
  stepLegacyNegativeEntityBranch(id, 0, state, undefined, { onSpriteDraw: () => calls.push("draw") });
  assert.deepEqual(calls, []);
}

// Section 3: local9>=22 suppresses everything past section 2.
{
  const state = freshState();
  const id = -5;
  state.dense[8749 - id] = 22;
  const calls = [];
  stepLegacyNegativeEntityBranch(id, 0, state, undefined, { onSpriteDraw: () => calls.push("draw") });
  assert.deepEqual(calls, []);
}

// Section 3: record-40 draw fires with the exact formula when all three
// gate conditions hold (a -1 type under construction, e[8810-id]===0, id
// classifies to 0).
{
  const state = freshState({ originColumn: 2, originRow: 1 });
  const id = -10; // classifyLegacyCameraCellLocal(-10) === 0 (in [-30,-1])
  state.dense[8749 - id] = 3; // local9, read by section 2 (must run to reach section 3)
  state.packedOffsets[138] = 1000;
  state.packedBytes[1000 + 104 + 3] = 4; // local10 (width)
  state.packedBytes[1000 + 130 + 3] = 5; // local11 (height)
  state.packedBytes[1000 + 156 + 3] = -1; // tableVal === -1
  state.dense[8627 - id] = 1; // under construction
  state.dense[8810 - id] = 0;
  state.dense[8383 - id] = 20;
  state.dense[8444 - id] = 21;
  const calls = [];
  stepLegacyNegativeEntityBranch(id, 0, state, undefined, { onSpriteDraw: (...a) => calls.push(a) });
  // x = (20-2)*22 + 4*11-11 = 396+33 = 429; y = (21-1)*16 + 5*8-8 = 320+32 = 352
  assert.deepEqual(calls, [[40, (20 - 2) * 22 + 4 * 11 - 11, (21 - 1) * 16 + 5 * 8 - 8, 42]]);

  // Finished (stage 0) -1 type, e.g. the camp: no "!" (offsets 895..929).
  state.dense[8627 - id] = 0;
  state.dense[8871 - id] = 0;
  calls.length = 0;
  stepLegacyNegativeEntityBranch(id, 0, state, undefined, { onSpriteDraw: (...a) => calls.push(a) });
  assert.deepEqual(calls.filter((c) => c[0] === 40), []);

  // A type that needs a worker (t156 != -1) without one: "!" even when finished.
  state.packedBytes[1000 + 156 + 3] = 0;
  state.dense[8871 - id] = 0;
  calls.length = 0;
  stepLegacyNegativeEntityBranch(id, 0, state, undefined, { onSpriteDraw: (...a) => calls.push(a) });
  assert.equal(calls.filter((c) => c[0] === 40).length, 1);
}

// Section 3: id classifies to non-0 (e.g. -40, in [-31,-60] -> class 1) -> no record-40 draw.
{
  const state = freshState();
  const id = -40;
  state.packedBytes[state.packedOffsets[138] + 156 + 0] = -1;
  state.dense[8810 - id] = 0;
  const calls = [];
  stepLegacyNegativeEntityBranch(id, 0, state, undefined, { onSpriteDraw: () => calls.push("draw") });
  assert.deepEqual(calls, []);
}

// Section 4: local9<12 with none of the other reach conditions -> returns before health bar.
{
  const state = freshState();
  const id = -10;
  state.dense[8749 - id] = 5; // local9 < 12
  state.dense[8505 - id] = 0; // currentValue <= 0, not selected, e8627 not 1/2
  const calls = [];
  stepLegacyNegativeEntityBranch(id, 0, state, undefined, { onPackedPrimitive: () => calls.push("bar") });
  assert.deepEqual(calls, []);
}

// Section 4: full health-bar render, hand-derived expected values.
{
  const state = freshState({ originColumn: 0, originRow: 0 });
  const id = -10; // classifies to 0
  state.dense[8749 - id] = 20; // local9 >= 12
  state.packedOffsets[138] = 1000;
  state.packedBytes[1000 + 104 + 20] = 2; // local10
  state.packedBytes[1000 + 130 + 20] = 3; // local11
  state.dense[8505 - id] = 40; // currentValue
  state.dense[8566 - id] = 100; // maxValue
  state.dense[8383 - id] = 10; // entity x
  state.dense[8444 - id] = 12; // entity y
  state.packedBytes[1000 + 520 + 20] = 4; // for local14Base
  state.packedOffsets[128] = 3000;
  state.packedBytes[3000 + 7] = 6; // fill width: a[a_s[128] + local12] (offsets 1299..1313), local12 = 7
  // Not the selected cell -> currentValue>0 path needs the "low health" branch:
  // trunc(maxValue/2) > currentValue => trunc(100/2)=50 > 40 -> true.
  const g = mockGraphics();
  const calls = [];
  stepLegacyNegativeEntityBranch(id, 0, state, g, {
    onPackedPrimitive: (...a) => calls.push(["primitive", ...a]),
  });
  const local12 = Math.trunc(100 / 80) + 6; // = 7
  const local13 = (10 - 0) * 22 + 2 * 11 - 11; // = 220+11 = 231
  const local14 = -16 - 4 * 8 - 5; // = -53
  assert.deepEqual(calls, [["primitive", 607 + local12, local13, local14]]);
  const colorIndex = Math.trunc(((40 - 1) * 3) / 100); // trunc(117/100) = 1
  const width = Math.trunc((6 * 40) / 100); // trunc(240/100) = 2
  assert.deepEqual(g.calls, [
    ["setColor", state.colorTable[colorIndex]],
    ["fillRect", local13 + 1 + 11, local14 + 1 + 8, width, 2], // helper #437 adds 11/8
  ]);
}

// Section 4: same health-bar formula, but with a NON-default rowPixelBase
// (confirmed bytecode local2 = ai*16, not the constant -16 a first pass
// wrongly concluded -- see LegacyGameplayCellLoop.ts's header) to prove
// local14Base is genuinely read from state, not hardcoded internally.
{
  const state = freshState({ originColumn: 0, originRow: 0, rowPixelBase: 48 }); // ai=3 -> 3*16=48
  const id = -10;
  state.dense[8749 - id] = 20;
  state.packedOffsets[138] = 1000;
  state.packedBytes[1000 + 104 + 20] = 2;
  state.packedBytes[1000 + 130 + 20] = 3;
  state.dense[8505 - id] = 40;
  state.dense[8566 - id] = 100;
  state.dense[8383 - id] = 10;
  state.dense[8444 - id] = 12;
  state.packedBytes[1000 + 520 + 20] = 4;
  const g = mockGraphics();
  const calls = [];
  stepLegacyNegativeEntityBranch(id, 0, state, g, {
    onPackedPrimitive: (...a) => calls.push(["primitive", ...a]),
  });
  const local12 = Math.trunc(100 / 80) + 6;
  const local13 = (10 - 0) * 22 + 2 * 11 - 11;
  const local14 = 48 - 4 * 8 - 5; // = 11
  assert.deepEqual(calls, [["primitive", 607 + local12, local13, local14]]);
}

// Section 4: selection-indicator pips only draw for the camera-center entity.
{
  const state = freshState({ originColumn: 5, originRow: 5, scrollA: 0, scrollY: 0 });
  const id = -10;
  state.dense[8749 - id] = 20;
  state.packedOffsets[138] = 1000;
  state.packedOffsets[128] = 2000;
  state.packedBytes[1000 + 104 + 20] = 2;
  state.packedBytes[1000 + 130 + 20] = 3;
  state.dense[8505 - id] = 10;
  state.dense[8566 - id] = 20; // trunc(20/2)=10 == currentValue(10), not > -> low-health branch false
  state.dense[8627 - id] = 1; // reach via the e8627 branch instead
  state.dense[8383 - id] = 10;
  state.dense[8444 - id] = 12;
  // Make this cell the camera-center cell: cameraRow=originRow+scrollA=5, cameraColumn=originColumn+scrollY=5.
  state.gridC[5][5] = id;
  const g = mockGraphics();
  stepLegacyNegativeEntityBranch(id, 0, state, g, {
    nibbleSource: () => 0x32, // high=3, low=2 -> pipCount=5
  });
  // 1 health-bar fill + 2 black frame rects + 5 colored pip rects (2 gold "low", 3 blue "high").
  const fillRectCalls = g.calls.filter((c) => c[0] === "fillRect");
  assert.equal(fillRectCalls.length, 8);
  const setColorCalls = g.calls.filter((c) => c[0] === "setColor").map((c) => c[1]);
  assert.deepEqual(
    setColorCalls.slice(0, 3),
    [state.colorTable[Math.trunc(((10 - 1) * 3) / 20)], 0, 0xf6a800],
  );
}

// Section 4: pipCount<=0 (nibbleSource returns 0) -> no pip drawing at all.
{
  const state = freshState({ originColumn: 0, originRow: 0 });
  const id = -10;
  state.dense[8749 - id] = 20;
  state.dense[8505 - id] = 10;
  state.dense[8566 - id] = 20;
  state.dense[8627 - id] = 1;
  state.gridC[0][0] = id;
  const g = mockGraphics();
  stepLegacyNegativeEntityBranch(id, 0, state, g, { nibbleSource: () => 0 });
  // Only the health-bar's own setColor+fillRect should appear, no pip rects.
  assert.equal(g.calls.filter((c) => c[0] === "fillRect").length, 1);
}

console.log("f.u() negative-entity-id branch (offsets 525..1581) OK");
