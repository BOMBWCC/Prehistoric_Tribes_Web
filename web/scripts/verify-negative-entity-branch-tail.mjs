import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";

const path = new URL("../src/j2me/LegacyGameplayNegativeEntityBranchTail.ts", import.meta.url).pathname;
const output = ts.transpileModule(fs.readFileSync(path, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(output, { module, exports: module.exports, Int8Array });
const { stepLegacyNegativeEntityBranchTail } = module.exports;

function grid(rows, cols) {
  return Array.from({ length: rows }, () => new Int8Array(cols));
}

function freshState(overrides = {}) {
  return {
    dense: new Int8Array(20000),
    gridB: grid(32, 40),
    hCounter: 0,
    columnPixelX: 0,
    row: 0,
    column: 0,
    ai: 0,
    ah: 0,
    rowPixelBase: -16, // matches the pre-fix hardcoded constant so existing fixtures below don't need updating
    ...overrides,
  };
}

// occupancyClass<1, id in [101,122] -> onEntityAction fires with the exact formula.
{
  const state = freshState({ columnPixelX: 44 });
  const id = 110;
  const idx6 = id - 101; // 9
  state.dense[9403 + idx6] = 3;
  state.dense[9425 + idx6] = 5;
  state.dense[9491 + idx6] = 7;
  const calls = [];
  stepLegacyNegativeEntityBranchTail(id, 0, state, {
    onEntityAction: (...a) => calls.push(a),
    onMapMarkerArg1: () => calls.push("marker"),
  });
  assert.deepEqual(calls, [[idx6, 44 + 3, -16 + 5, 7, 108]]);
}

// Same entity-action formula, non-default rowPixelBase -- confirms bytecode
// local2 = ai*16 (not the constant -16 a first pass wrongly concluded, see
// LegacyGameplayCellLoop.ts's header) is genuinely read from state.
{
  const state = freshState({ columnPixelX: 44, rowPixelBase: 48 }); // ai=3 -> 48
  const id = 110;
  const idx6 = id - 101;
  state.dense[9403 + idx6] = 3;
  state.dense[9425 + idx6] = 5;
  state.dense[9491 + idx6] = 7;
  const calls = [];
  stepLegacyNegativeEntityBranchTail(id, 0, state, {
    onEntityAction: (...a) => calls.push(a),
  });
  assert.deepEqual(calls, [[idx6, 44 + 3, 48 + 5, 7, 108]]);
}

// occupancyClass<1, id outside [101,122] -> falls through to the marker check
// (not a no-op); with an id that also fails the marker check, nothing fires.
{
  const state = freshState();
  const calls = [];
  stepLegacyNegativeEntityBranchTail(200, 0, state, {
    onEntityAction: () => calls.push("action"),
    onMapMarkerArg1: () => calls.push("marker"),
  });
  assert.deepEqual(calls, []);
}

// occupancyClass>=1 (e.g. 1) -> entity-action block is skipped entirely,
// even for an id in [101,122] (the id-range gate is only reached when
// occupancyClass<1).
{
  const state = freshState();
  const calls = [];
  stepLegacyNegativeEntityBranchTail(110, 1, state, { onEntityAction: () => calls.push("action") });
  assert.deepEqual(calls, []);
}

// occupancyClass===1 (< 2), id in the marker range -> marker fires (this is
// the fallthrough path INTO the marker block from occupancyClass>=1).
{
  const state = freshState();
  const id = -70; // in [-110,-61]
  const calls = [];
  stepLegacyNegativeEntityBranchTail(id, 1, state, { onMapMarkerArg1: (v) => calls.push(v) });
  assert.deepEqual(calls, [id]);
}

// occupancyClass===0, id outside [101,122] but in the marker range -> marker
// fires via the entity-action fallthrough (offset 1652 reached from 1594).
{
  const state = freshState();
  const id = -70;
  const calls = [];
  stepLegacyNegativeEntityBranchTail(id, 0, state, {
    onEntityAction: () => calls.push("action"),
    onMapMarkerArg1: (v) => calls.push(v),
  });
  assert.deepEqual(calls, [id]);
}

// classifyLegacyMarkerId(id)===3 (id===-123) also satisfies the marker gate
// even outside the -110..-61 range.
{
  const state = freshState();
  const calls = [];
  stepLegacyNegativeEntityBranchTail(-123, 0, state, { onMapMarkerArg1: (v) => calls.push(v) });
  assert.deepEqual(calls, [-123]);
}

// occupancyClass>=2 -> both the entity-action and marker gates are skipped,
// and offset 1684's occupancyClass!==0 check then routes straight to the
// epilogue -- this occupancyClass value does nothing in this tail branch at
// all, confirmed directly from the bytecode (not assumed).
{
  const state = freshState();
  const calls = [];
  stepLegacyNegativeEntityBranchTail(-70, 2, state, {
    onEntityAction: () => calls.push("action"),
    onMapMarkerArg1: () => calls.push("marker"),
    onSpriteDraw: () => calls.push("draw"),
    onPackedPrimitive: () => calls.push("primitive"),
  });
  assert.deepEqual(calls, []);
}

// occupancyClass===0, id > -114 (and outside entity/marker ranges) -> no-op.
{
  const state = freshState();
  const calls = [];
  stepLegacyNegativeEntityBranchTail(-100, 0, state, {
    onSpriteDraw: () => calls.push("draw"),
    onPackedPrimitive: () => calls.push("primitive"),
  });
  assert.deepEqual(calls, []);
}

// occupancyClass===0, id <= -117 (outside entity/marker ranges) -> no-op.
// (-120 also fails classifyLegacyMarkerId===3 and the -110..-61 range.)
{
  const state = freshState();
  const calls = [];
  stepLegacyNegativeEntityBranchTail(-120, 0, state, {
    onSpriteDraw: () => calls.push("draw"),
    onPackedPrimitive: () => calls.push("primitive"),
  });
  assert.deepEqual(calls, []);
}

// occupancyClass===0, id in {-116,-115,-114}, hCounter in the sprite-draw window.
{
  const state = freshState({ hCounter: 97, ah: 2, columnPixelX: 66 });
  // window: [94+ah, 100+ah] = [96,102]; hCounter=97 is inside.
  const calls = [];
  stepLegacyNegativeEntityBranchTail(-115, 0, state, {
    onSpriteDraw: (...a) => calls.push(["draw", ...a]),
    onPackedPrimitive: () => calls.push("primitive"),
  });
  const expectedPhase = 97 - (100 + 2) + 6; // = 97-102+6 = 1
  assert.deepEqual(calls, [["draw", 75, 66, -16, expectedPhase]]);
}

// occupancyClass===0, id in range, outside sprite-draw window, (h+ah+ai)%10<5 -> packed primitive.
{
  const state = freshState({ hCounter: 10, ah: 0, ai: 0, row: 3, column: 4, columnPixelX: 88 });
  state.gridB[3][4] = 0x2a;
  const calls = [];
  stepLegacyNegativeEntityBranchTail(-115, 0, state, {
    onSpriteDraw: () => calls.push("draw"),
    onPackedPrimitive: (...a) => calls.push(["primitive", ...a]),
  });
  // (10+0+0)%10 = 0 < 5 -> fires.
  assert.deepEqual(calls, [["primitive", 0x2a & 0xff, 88, -16]]);
}

// occupancyClass===0, id in range, outside window, (h+ah+ai)%10>=5 -> nothing fires.
{
  const state = freshState({ hCounter: 15, ah: 0, ai: 0 });
  const calls = [];
  stepLegacyNegativeEntityBranchTail(-115, 0, state, {
    onSpriteDraw: () => calls.push("draw"),
    onPackedPrimitive: () => calls.push("primitive"),
  });
  // (15+0+0)%10 = 5, not < 5 -> no-op.
  assert.deepEqual(calls, []);
}

console.log("f.u() tail branch (offsets 1584..1791) OK");
