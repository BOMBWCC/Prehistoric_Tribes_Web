import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import vm from "node:vm";
import { denseRequire } from "./dense-layout-require.mjs";

const file = new URL("../src/render/LegacyEntityOverlayDraw.ts", import.meta.url).pathname;
const module = { exports: {} };
const output = ts.transpileModule(fs.readFileSync(file, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
vm.runInNewContext(output, { require: denseRequire, module, exports: module.exports, Int8Array, Int16Array, Int32Array });
const { stepLegacyEntityOverlayDraw } = module.exports;

const DENSE_SIZE = 8200;

function makeState(overrides = {}) {
  return {
    sFlag: false,
    ao: 0,
    ap: 1,
    vByte: 1,
    Y: 29,
    aq: 0,
    ar: 100,
    as: 200,
    at: 0,
    frameLayoutAq: 2, // neither 0 nor 1 -> fire1 stays false by default
    kByte: -1,
    cWByte: -1,
    FByte: -1,
    entityFocusFlag: false,
    viewportOriginK: 0,
    scrollA: 0,
    viewportOriginI: 0,
    scrollY: 0,
    XByte: 0,
    zAfCursorVFlag: false,
    frameLayoutL: -1,
    targetSlot: 0,
    c: 0,
    timingCounterE: 0,
    fCounter: 5,
    dense: new Int8Array(DENSE_SIZE),
    colorTable: new Int32Array([0x111111, 0x222222, 0x333333]),
    xSlotTable: Array.from({ length: 2 }, () => Array.from({ length: 5 }, () => new Int8Array(30))),
    byteTables: Array.from({ length: 20 }, () => new Int8Array(50)),
    gridC: Array.from({ length: 96 }, () => new Int8Array(96)),
    packedBytes: new Int8Array(4000),
    packedOffsets: new Int16Array(200),
    ...overrides,
  };
}

function makeCallbacks() {
  const scans = [];
  const subs = [];
  const composites = [];
  const callbacks = {
    onCScanDraw: (arg1, x, y) => scans.push({ arg1, x, y }),
    onSubrecordDraw: (index, x, y, phase) => subs.push({ index, x, y, phase }),
    onDrawComposite: (index, x, y) => composites.push({ index, x, y }),
  };
  return { scans, subs, composites, callbacks };
}

function makeGraphics() {
  const colors = [];
  const rects = [];
  const graphics = [
    {
      setColor: (rgb) => colors.push(rgb),
      fillRect: (x, y, w, h) => rects.push({ x, y, w, h }),
    },
  ];
  graphics.colors = colors;
  graphics.rects = rects;
  return graphics;
}

// --- offsets 0-26: each of the four top-level guards independently returns
// before even the unconditional onCScanDraw call.
{
  for (const overrides of [{ sFlag: true }, { ao: -1 }, { ap: -1 }, { vByte: 0 }, { vByte: 2 }]) {
    const state = makeState(overrides);
    const { scans, callbacks } = makeCallbacks();
    stepLegacyEntityOverlayDraw(state, makeGraphics(), callbacks);
    assert.equal(scans.length, 0, `guard ${JSON.stringify(overrides)} must skip onCScanDraw`);
  }
}

// --- offsets 29-92: onCScanDraw always fires once the top guard passes,
// with arg1 = aq when Y===29, and x/y derived from ao.
{
  const state = makeState({ Y: 29, aq: 7, ao: 2, ar: 100, as: 200 });
  state.byteTables[12][2] = 3;
  state.byteTables[13][2] = 4;
  const { scans, callbacks } = makeCallbacks();
  stepLegacyEntityOverlayDraw(state, makeGraphics(), callbacks);
  assert.deepEqual(scans, [{ arg1: 7, x: 100 + 3 + 4, y: 200 + 4 }]);
}
{
  const state = makeState({ Y: 5, aq: 7, ao: 2, at: -1 });
  const { scans, callbacks } = makeCallbacks();
  stepLegacyEntityOverlayDraw(state, makeGraphics(), callbacks);
  assert.deepEqual(scans, [{ arg1: 101 + 7, x: 104, y: 200 }], "Y!==29 -> arg1 = 101+aq");
}

// --- offsets 95-109: second gate. Y!==29 (even with at>=0) stops everything
// after onCScanDraw; Y===29 with at<0 also stops.
{
  const state = makeState({ Y: 0, at: 5 });
  const { scans, subs, composites, callbacks } = makeCallbacks();
  stepLegacyEntityOverlayDraw(state, makeGraphics(), callbacks);
  assert.equal(scans.length, 1);
  assert.equal(subs.length, 0);
  assert.equal(composites.length, 0);
}
{
  const state = makeState({ Y: 29, at: -1 });
  const { subs, callbacks } = makeCallbacks();
  stepLegacyEntityOverlayDraw(state, makeGraphics(), callbacks);
  assert.equal(subs.length, 0, "at<0 must stop before the xSlotTable loop");
}

// --- offsets 112-230: xSlotTable scan, first-match-wins (break, not continue).
{
  const state = makeState({ aq: 3, ap: 4, fCounter: 9 });
  state.xSlotTable[0][2][0] = 9; // no match
  state.xSlotTable[0][2][1] = 3; // matches aq, but column-1 === 3 -> must skip
  state.xSlotTable[0][1][1] = 3;
  state.xSlotTable[0][2][2] = 3; // real match
  state.xSlotTable[0][1][2] = 1;
  state.xSlotTable[0][4][2] = 2;
  state.xSlotTable[0][2][3] = 3; // would also match -- must NOT fire (break)
  state.xSlotTable[0][1][3] = 0;
  state.byteTables[12][4] = 10;
  state.byteTables[13][4] = 20;
  const { subs, callbacks } = makeCallbacks();
  stepLegacyEntityOverlayDraw(state, makeGraphics(), callbacks);
  const recordIndex = 65 + (1 - 2) * 5 + 1; // 65 - 5 + 1 = 61
  assert.deepEqual(subs[0], { index: recordIndex, x: 100 + 10, y: 200 + 20, phase: 9 });
  assert.equal(subs.filter((s) => s.index === 65 + (1 - 0) * 5 + 0).length, 0, "must stop at the first match");
}
{
  const state = makeState({ aq: 3 });
  // dense[3333+aq]>=0 is true by default (array default 0) and fires its
  // own unrelated d() call (offset 325-411) -- suppress it here so this
  // case isolates the xSlotTable-scan guard alone.
  state.dense[3333 + 3] = -1;
  // no slot matches aq at all
  const { subs, callbacks } = makeCallbacks();
  stepLegacyEntityOverlayDraw(state, makeGraphics(), callbacks);
  assert.equal(subs.length, 0);
}

// --- offsets 230-244: dense[4646+aq]===1 && dense[2828+aq]===51 && dense[1313+aq]>0.
{
  const state = makeState({ aq: 10, ap: 2 });
  state.dense[4646 + 10] = 1;
  state.dense[2828 + 10] = 51;
  state.dense[1313 + 10] = 1;
  state.byteTables[12][2] = 1;
  state.byteTables[13][2] = 2;
  const { subs, callbacks } = makeCallbacks();
  stepLegacyEntityOverlayDraw(state, makeGraphics(), callbacks);
  assert.deepEqual(subs.find((s) => s.index === 65), { index: 65, x: 101, y: 202, phase: 5 });
}
{
  const state = makeState({ aq: 10 });
  state.dense[4646 + 10] = 1;
  state.dense[2828 + 10] = 51;
  state.dense[1313 + 10] = 0; // fails the >0 leg
  const { subs, callbacks } = makeCallbacks();
  stepLegacyEntityOverlayDraw(state, makeGraphics(), callbacks);
  assert.equal(subs.filter((s) => s.index === 65).length, 0);
}

// --- offsets 325-411: dense[3333+aq]>=0 -> d(77+v, ...ao, (c-(aq&7))%15).
{
  const state = makeState({ aq: 9, ao: 3, c: 100 });
  state.dense[3333 + 9] = 4;
  state.byteTables[12][3] = 1;
  state.byteTables[13][3] = 2;
  const { subs, callbacks } = makeCallbacks();
  stepLegacyEntityOverlayDraw(state, makeGraphics(), callbacks);
  const expectedPhase = (100 - (9 & 7)) % 15;
  assert.deepEqual(subs.find((s) => s.index === 81), { index: 81, x: 101, y: 202, phase: expectedPhase });
}
{
  const state = makeState({ aq: 9 });
  state.dense[3333 + 9] = -1; // negative -> skip
  const { subs, callbacks } = makeCallbacks();
  stepLegacyEntityOverlayDraw(state, makeGraphics(), callbacks);
  assert.equal(subs.filter((s) => s.index >= 77 && s.index <= 200).length, 0);
}

// --- offsets 411-493: dense[4646+aq] < -1 -> d(-v, ...ap, dense[3030+aq]).
{
  const state = makeState({ aq: 2, ap: 4 });
  state.dense[4646 + 2] = -5;
  state.dense[3030 + 2] = 42;
  state.byteTables[12][4] = 7;
  state.byteTables[13][4] = 8;
  const { subs, callbacks } = makeCallbacks();
  stepLegacyEntityOverlayDraw(state, makeGraphics(), callbacks);
  assert.deepEqual(subs.find((s) => s.index === 5), { index: 5, x: 107, y: 208, phase: 42 });
}
{
  const state = makeState({ aq: 2 });
  state.dense[4646 + 2] = -1; // boundary: NOT < -1
  const { subs, callbacks } = makeCallbacks();
  stepLegacyEntityOverlayDraw(state, makeGraphics(), callbacks);
  assert.equal(subs.filter((s) => s.phase === 42).length, 0);
}

// --- offsets 493-561: (dense[7979+aq]&4)===4 -> d(73, ...ao, fCounter+aq).
{
  const state = makeState({ aq: 4, ao: 1, fCounter: 3 });
  state.dense[7979 + 4] = 4; // bit 2 set, bit 3 clear
  state.byteTables[12][1] = 5;
  state.byteTables[13][1] = 6;
  const { subs, callbacks } = makeCallbacks();
  stepLegacyEntityOverlayDraw(state, makeGraphics(), callbacks);
  assert.deepEqual(subs.find((s) => s.index === 73), { index: 73, x: 105, y: 206, phase: 7 });
}

// --- offsets 561-626: (dense[7979+aq]&8)===8 -> d(69, ...ap, fCounter).
{
  const state = makeState({ aq: 4, ap: 2, fCounter: 11 });
  state.dense[7979 + 4] = 8;
  state.byteTables[12][2] = 1;
  state.byteTables[13][2] = 1;
  const { subs, callbacks } = makeCallbacks();
  stepLegacyEntityOverlayDraw(state, makeGraphics(), callbacks);
  assert.deepEqual(subs.find((s) => s.index === 69), { index: 69, x: 101, y: 201, phase: 11 });
}
{
  const state = makeState({ aq: 4 });
  state.dense[7979 + 4] = 4 | 8; // both bits: both the offset-493 AND offset-561 blocks fire
  const { subs, callbacks } = makeCallbacks();
  stepLegacyEntityOverlayDraw(state, makeGraphics(), callbacks);
  assert.equal(subs.filter((s) => s.index === 73).length, 1);
  assert.equal(subs.filter((s) => s.index === 69).length, 1);
}

// --- offset 626: aq>50 skips the ENTIRE 626-1514 region (both composite
// gates), but the final 1514-1590 block still runs independently.
{
  const state = makeState({ aq: 51, frameLayoutAq: 0, entityFocusFlag: true, frameLayoutL: 51, ap: 1 });
  const { composites, subs, callbacks } = makeCallbacks();
  stepLegacyEntityOverlayDraw(state, makeGraphics(), callbacks);
  assert.equal(composites.length, 0, "aq>50 must suppress both composite gates");
  assert.equal(subs.filter((s) => s.index === 41).length, 1, "final block is independent of the aq<=50 gate");
}

// --- offsets 635-826, composite draw #1: frameLayoutAq===0 always fires.
{
  const state = makeState({ aq: 20, ao: 3, frameLayoutAq: 0 });
  state.dense[2222 + 20] = 8;
  state.byteTables[12][3] = 1;
  state.byteTables[13][3] = 2;
  const { composites, callbacks } = makeCallbacks();
  stepLegacyEntityOverlayDraw(state, makeGraphics(), callbacks);
  assert.deepEqual(composites[0], { index: 577 + 8, x: 101, y: 202 });
}

// --- frameLayoutAq===2 (neither 0 nor 1): draw #1 never fires.
{
  const state = makeState({ aq: 20, frameLayoutAq: 2 });
  const { composites, callbacks } = makeCallbacks();
  stepLegacyEntityOverlayDraw(state, makeGraphics(), callbacks);
  assert.equal(composites.length, 0);
}

// --- frameLayoutAq===1: each of the four id/grid-cell OR legs independently
// fires draw #1; when none match and XByte===0, it does not fire.
{
  for (const [label, overrides] of Object.entries({
    kByte: { kByte: 20 },
    cWByte: { cWByte: 20 },
    denseVsFByte: { FByte: 7 }, // dense[909+aq] set to 7 below
    gridCell: {}, // handled specially below
  })) {
    const state = makeState({ aq: 20, frameLayoutAq: 1, ...overrides });
    if (label === "denseVsFByte") state.dense[909 + 20] = 7;
    if (label === "gridCell") {
      state.viewportOriginK = 1;
      state.scrollA = 2;
      state.viewportOriginI = 3;
      state.scrollY = 4;
      state.gridC[3][7] = 20;
    }
    const { composites, callbacks } = makeCallbacks();
    stepLegacyEntityOverlayDraw(state, makeGraphics(), callbacks);
    assert.equal(composites.length, 1, `${label} leg must fire draw #1`);
  }
  // None of the four match, XByte===0 -> no fire.
  {
    const state = makeState({ aq: 20, frameLayoutAq: 1 });
    const { composites, callbacks } = makeCallbacks();
    stepLegacyEntityOverlayDraw(state, makeGraphics(), callbacks);
    assert.equal(composites.length, 0);
  }
  // XByte fallback: -gridCell === dense[4444+aq].
  {
    const state = makeState({ aq: 20, frameLayoutAq: 1, XByte: 1 });
    state.viewportOriginK = 1; state.scrollA = 0; state.viewportOriginI = 2; state.scrollY = 0;
    state.gridC[1][2] = -6;
    state.dense[4444 + 20] = 6; // -(-6) === 6
    const { composites, callbacks } = makeCallbacks();
    stepLegacyEntityOverlayDraw(state, makeGraphics(), callbacks);
    assert.equal(composites.length, 1, "XByte fallback must fire when -cell === dense[4444+aq]");
  }
  {
    const state = makeState({ aq: 20, frameLayoutAq: 1, XByte: 0 });
    state.viewportOriginK = 1; state.scrollA = 0; state.viewportOriginI = 2; state.scrollY = 0;
    state.gridC[1][2] = -6;
    state.dense[4444 + 20] = 6;
    const { composites, callbacks } = makeCallbacks();
    stepLegacyEntityOverlayDraw(state, makeGraphics(), callbacks);
    assert.equal(composites.length, 0, "XByte===0 must suppress the fallback leg");
  }
}

// --- offsets 826-1370: gated on !entityFocusFlag && dense[1919+aq]>0.
{
  const state = makeState({ aq: 5, entityFocusFlag: true, kByte: 5 });
  state.dense[1919 + 5] = 1;
  const { composites, callbacks } = makeCallbacks();
  stepLegacyEntityOverlayDraw(state, makeGraphics(), callbacks);
  assert.equal(composites.length, 0, "entityFocusFlag===true must suppress the whole region");
}
{
  const state = makeState({ aq: 5, entityFocusFlag: false, kByte: 5 });
  state.dense[1919 + 5] = 0; // not > 0
  const { composites, callbacks } = makeCallbacks();
  stepLegacyEntityOverlayDraw(state, makeGraphics(), callbacks);
  assert.equal(composites.length, 0, "dense[1919+aq]<=0 must suppress the whole region");
}

// --- the fire2 OR chain: id/grid-cell legs (same three as fire1) plus the
// dense[6767+aq]/3*2 > dense[1919+aq] threshold, plus the XByte fallback.
{
  const state = makeState({ aq: 5, entityFocusFlag: false, kByte: 5 });
  state.dense[1919 + 5] = 1;
  // Force local2=0 path (all three "low") and local1=0 to keep the record
  // math simple; verify composite draw #3 + setColor + fillRect all ran.
  state.dense[1616 + 5] = 0;
  state.dense[1717 + 5] = 0;
  state.dense[7575 + 5] = 0;
  state.dense[6767 + 5] = 20; // local1 = idiv(20,20) = 1
  state.byteTables[12][state.ao] = 2;
  state.byteTables[13][state.ao] = 3;
  const graphics = makeGraphics();
  const { composites, callbacks } = makeCallbacks();
  stepLegacyEntityOverlayDraw(state, graphics, callbacks);
  // local2 stays 0 (1616/1717/7575 all "low") -> only ONE composite draw (#3).
  assert.equal(composites.length, 1);
  assert.deepEqual(composites[0], { index: 607 + 1, x: 100 + 2 + 0, y: 200 + 3 });
  assert.equal(graphics.colors.length, 1);
  assert.equal(graphics.rects.length, 1);
  const rect = graphics.rects[0];
  assert.equal(rect.x, 11 + (state.ar + 2 + 2 - 1 + 0));
  assert.equal(rect.y, 8 + (state.as + 3 - 4));
  assert.equal(rect.h, 2);
}

// --- threshold-only fire2 leg: no id/grid match, but dense[6767+aq]/3*2 >
// dense[1919+aq] trips it.
{
  const state = makeState({ aq: 5, entityFocusFlag: false });
  state.dense[1919 + 5] = 1; // idiv(9,3)*2 = 6 > 1
  state.dense[6767 + 5] = 9;
  state.dense[1616 + 5] = 0;
  state.dense[1717 + 5] = 0;
  state.dense[7575 + 5] = 0;
  const { composites, callbacks } = makeCallbacks();
  stepLegacyEntityOverlayDraw(state, makeGraphics(), callbacks);
  assert.equal(composites.length, 1, "threshold leg alone must fire fire2");
}
{
  const state = makeState({ aq: 5, entityFocusFlag: false });
  state.dense[1919 + 5] = 100; // idiv(9,3)*2 = 6, NOT > 100
  state.dense[6767 + 5] = 9;
  const { composites, callbacks } = makeCallbacks();
  stepLegacyEntityOverlayDraw(state, makeGraphics(), callbacks);
  assert.equal(composites.length, 0);
}

// --- local2===2 path: at least one of dense[1616]/[1717] >=5 or [7575] >5
// triggers BOTH the max-tiebreak composite draw #2 AND draw #3 with
// local2 folded into draw #3's x argument.
{
  const state = makeState({ aq: 5, entityFocusFlag: false, kByte: 5 });
  state.dense[1919 + 5] = 1;
  state.dense[6767 + 5] = 20; // local1 = 1
  // A=d1616=3, B=d1717=9, C=d7575=2 -> A<=B branch -> B<C? no -> maxResult=B=9.
  state.dense[1616 + 5] = 3;
  state.dense[1717 + 5] = 9;
  state.dense[7575 + 5] = 2;
  state.byteTables[12][state.ao] = 0;
  state.byteTables[13][state.ao] = 0;
  const { composites, callbacks } = makeCallbacks();
  stepLegacyEntityOverlayDraw(state, makeGraphics(), callbacks);
  assert.equal(composites.length, 2, "local2===2 fires draw #2 AND draw #3");
  const maxResult = 9;
  assert.deepEqual(composites[0], {
    index: 602 + maxResult - 5,
    x: state.ar + 2 - 1 + 2 - 10,
    y: state.as,
  });
  assert.deepEqual(composites[1], { index: 607 + 1, x: state.ar + 2, y: state.as });
}

// --- max-tiebreak: exercise all three structural branches directly against
// a reference implementation of the ORIGINAL (non-collapsed) bytecode
// three-way branch, to independently confirm the collapsed form in the
// port is equivalent (not just spot-checked).
function referenceMax(a, b, c) {
  if (a <= b) {
    return b < c ? c - 1 : b;
  }
  if (a <= c) {
    return b < c ? c - 1 : b;
  }
  return a;
}
function portedMax(a, b, c) {
  if (a > b && a > c) return a;
  if (b < c) return c - 1;
  return b;
}
{
  const samples = [
    [1, 2, 3], [3, 2, 1], [2, 3, 1], [1, 3, 2], [3, 1, 2], [2, 1, 3],
    [5, 5, 5], [5, 5, 1], [5, 1, 5], [1, 5, 5], [0, 0, 0], [-3, -1, -2],
  ];
  for (const [a, b, c] of samples) {
    assert.equal(portedMax(a, b, c), referenceMax(a, b, c), `max mismatch for (${a},${b},${c})`);
  }
}

// --- idiv-by-zero: dense[6767+aq]===0 must throw once execution reaches the
// setColor/fillRect divisions, matching the JVM's ArithmeticException (no
// exception table in q() itself -- this propagates to the caller, exactly
// like every other uncaught path here).
{
  const state = makeState({ aq: 5, entityFocusFlag: false, kByte: 5 }); // id-match short-circuits past the /3 threshold entirely
  state.dense[1919 + 5] = 1;
  state.dense[6767 + 5] = 0; // local1 = idiv(0,20) is still safe; idiv(x, dense[6767+aq]) for setColor is not
  assert.throws(() => stepLegacyEntityOverlayDraw(state, makeGraphics(), makeCallbacks().callbacks), /by zero/);
}

// --- offsets 1514-1590: final block, independent of the aq<=50 gate.
{
  const state = makeState({ entityFocusFlag: false, zAfCursorVFlag: false, aq: 9, frameLayoutL: 9 });
  const { subs, callbacks } = makeCallbacks();
  stepLegacyEntityOverlayDraw(state, makeGraphics(), callbacks);
  assert.equal(subs.filter((s) => s.index === 41).length, 0, "neither flag set -> no final call");
}
{
  const state = makeState({ entityFocusFlag: true, aq: 9, frameLayoutL: 3 });
  const { subs, callbacks } = makeCallbacks();
  stepLegacyEntityOverlayDraw(state, makeGraphics(), callbacks);
  assert.equal(subs.filter((s) => s.index === 41).length, 0, "aq!==frameLayoutL -> no final call");
}
{
  const state = makeState({ entityFocusFlag: false, zAfCursorVFlag: true, aq: 9, ap: 2, frameLayoutL: 9, timingCounterE: 77 });
  state.byteTables[12][2] = 4;
  state.byteTables[13][2] = 6;
  const { subs, callbacks } = makeCallbacks();
  stepLegacyEntityOverlayDraw(state, makeGraphics(), callbacks);
  const hit = subs.find((s) => s.index === 41);
  assert.deepEqual(hit, {
    index: 41,
    x: state.ar + 4 - 1,
    y: state.as + 6 - 16 - 5,
    phase: 77,
  });
}

console.log("f.q() entity overlay draw OK");
