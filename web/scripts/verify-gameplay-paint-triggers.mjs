import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";
import { denseRequire } from "./dense-layout-require.mjs";

const path = new URL("../src/render/LegacyGameplayPaintTriggers.ts", import.meta.url).pathname;
const output = ts.transpileModule(fs.readFileSync(path, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(output, { require: denseRequire, module, exports: module.exports, Int8Array, Int16Array });
const { stepLegacyR, stepLegacyP, stepLegacyQ } = module.exports;

// f.K() is LegacySimpleFrameHandlers.ts's "K" case (the duplicate stepLegacyK
// was deleted 2026-09-23).

function freshR() {
  return {
    needsFullReset: false, followFlag: false, entityScanFlags: new Array(20).fill(false),
    an: 1, ao: 0, aR: 0, JFlag: false, jFlag: false, aP: 0, aQ: 0, aS: 0, targetSlot: 0,
    bc: 0, bd: 0, be: 0, bf: 0,
    packedBytes: new Int8Array(2000), packedOffsets: new Int16Array(400),
  };
}

function mockGraphics() {
  const calls = [];
  return {
    calls,
    setColor: (v) => calls.push(["setColor", v]),
    fillRect: (...a) => calls.push(["fillRect", ...a]),
    setClip: (...a) => calls.push(["setClip", ...a]),
  };
}

// Guard: an===0, table value < -1, aR<=0 -> early return, nothing fires.
{
  const state = freshR();
  state.an = 0;
  state.aR = 0;
  state.packedOffsets[155] = 1000;
  state.ao = 3;
  state.packedBytes[1000 + 84 + 3] = -5; // < -1
  const calls = [];
  stepLegacyR(state, [mockGraphics(), mockGraphics()], {
    onScroll: () => calls.push("scroll"),
    onGameplayDraw: () => calls.push("draw"),
  });
  assert.deepEqual(calls, []);
}

// Guard: an===0 but table value >= -1 -> proceeds past the guard normally.
{
  const state = freshR();
  state.an = 0;
  state.aR = 0;
  state.packedOffsets[155] = 1000;
  state.ao = 3;
  state.packedBytes[1000 + 84 + 3] = -1; // not < -1
  const calls = [];
  stepLegacyR(state, [mockGraphics(), mockGraphics()], {
    onGameplayDraw: () => calls.push("draw"),
    onPartialBlit: (...a) => calls.push(["blit", ...a]),
  });
  assert.ok(calls.length > 0);
}

// needsFullReset=true, JFlag=false, aP=0, aS!=24: first-block scroll trigger,
// then falls through to the clip/draw/clip tail with aQ=0.
{
  const state = freshR();
  state.needsFullReset = true;
  const g0 = mockGraphics();
  const g1 = mockGraphics();
  const calls = [];
  stepLegacyR(state, [g0, g1], {
    onScroll: () => calls.push("scroll"),
    onGameplayDraw: () => calls.push("draw"),
    onPartialBlit: (heightArg, destYArg) => calls.push(["blit", heightArg, destYArg]),
  });
  assert.equal(state.followFlag, true);
  assert.equal(state.targetSlot, 0); // overwritten to 0 later in the same call
  assert.equal(state.needsFullReset, true); // NOT reset by the first block alone
  assert.deepEqual(calls, ["scroll", ["blit", 128, 120], "draw"]);
  assert.deepEqual(state.bc, 0);
  assert.deepEqual(state.bd, 0);
  assert.deepEqual(state.be, 528);
  assert.deepEqual(state.bf, 704);
  // First setClip uses targetSlot=0 with (0,120,264,128); second uses the final (0,0,528,704).
  assert.deepEqual(g0.calls, [
    ["setClip", 0, 120, 264, 128],
    ["setClip", 0, 0, 528, 704],
  ]);
  assert.deepEqual(g1.calls, []);
}

// JFlag=true but needsFullReset=false -> returns immediately from inside the block.
{
  const state = freshR();
  state.JFlag = true;
  const calls = [];
  stepLegacyR(state, [mockGraphics(), mockGraphics()], {
    onScroll: () => calls.push("scroll"),
    onGameplayDraw: () => calls.push("draw"),
  });
  assert.deepEqual(calls, []);
}

// JFlag=true and needsFullReset=true -> first block fires once, then the
// JFlag branch fires a second full reset and returns (n() called twice
// total, exactly matching bytecode offsets 56 and 84 both executing).
{
  const state = freshR();
  state.JFlag = true;
  state.needsFullReset = true;
  const calls = [];
  stepLegacyR(state, [mockGraphics(), mockGraphics()], {
    onScroll: () => calls.push("scroll"),
    onGameplayDraw: () => calls.push("draw"),
    onPopulateItems: () => calls.push("populate"),
  });
  assert.equal(state.needsFullReset, false);
  assert.equal(state.entityScanFlags[12], true);
  assert.deepEqual(calls, ["scroll", "scroll", "draw", "populate"]);
}

// aP!=0 and needsFullReset=false (after the JFlag=false path) -> return.
{
  const state = freshR();
  state.aP = 5;
  state.needsFullReset = false;
  const calls = [];
  stepLegacyR(state, [mockGraphics(), mockGraphics()], {
    onGameplayDraw: () => calls.push("draw"),
    onPartialBlit: () => calls.push("blit"),
  });
  assert.deepEqual(calls, []);
}

// aS===24: draws the two HUD-bar fillRects and calls randomRemainder(255,8).
{
  const state = freshR();
  state.aS = 24;
  const g0 = mockGraphics();
  let randomArgs;
  stepLegacyR(state, [g0, mockGraphics()], {
    randomRemainder: (mask, divisor) => { randomArgs = [mask, divisor]; return 3; },
    onPartialBlit: () => {},
  });
  assert.deepEqual(randomArgs, [255, 8]);
  assert.equal(state.aQ, 3);
  // REGRESSION (2026-08-31): both fillRects go through shared helper #437,
  // which always adds 11/8 to x/y -- was (0,96)/(0,240), confirmed via
  // bytecode/f-javap.txt offsets 32846..32860 (the helper's own body) and
  // 17272..17289 (R()'s call sites, literal x=0, not a:S-11) to be
  // (11,104)/(11,248). See LegacyGameplayPaintTriggers.ts's own comment.
  assert.deepEqual(g0.calls, [
    ["setColor", 0],
    ["fillRect", 11, 104, 240, 16],
    ["fillRect", 11, 248, 240, 16],
    ["setClip", 0, 120, 264, 128],
    ["setClip", 0, 0, 528, 704],
  ]);
}

function freshP() {
  return { ...freshR(), aP: 0, c: false, am: 0, al: 0, phase: 0, dense: new Int8Array(20000), p: new Int8Array(40) };
}

// Section 1: aP>0 && !JFlag, aP-4<=160 -> draws both fillRects, sets c=true,
// then returns the WHOLE method immediately (nothing past section 1 runs).
{
  const state = freshP();
  state.aP = 100; // aP-4=96 <= 160
  const g0 = mockGraphics();
  const calls = [];
  stepLegacyP(state, [g0, mockGraphics()], {
    onI: () => calls.push("i"),
    onJ: () => calls.push("j"),
  });
  assert.equal(state.aP, 104);
  assert.equal(state.c, true);
  // REGRESSION (2026-08-31): same helper-#437 +11/+8 shift as stepLegacyR's
  // fillRect fix above -- was (0,0)/(0,336-104).
  assert.deepEqual(g0.calls, [
    ["setColor", 0],
    ["fillRect", 11, 8, 240, 16 + 104],
    ["fillRect", 11, 344 - 104, 240, 104],
  ]);
  assert.deepEqual(calls, []); // onI/onJ (via Q()) must NOT fire -- confirms the early return
  assert.equal(state.needsFullReset, false); // epilogue never ran either
}

// Section 1: aP>0 && !JFlag, aP-4>160 -> negates aP, clears c, calls onI,
// THEN falls through into section 2+ and into the epilogue (nothing else
// in this fixture returns early), which ALSO sees aP<0 and adjusts it
// further (aP+=4 again, c=true again) since -200 doesn't cross the
// epilogue's own -48 snap-to-zero threshold.
{
  const state = freshP();
  state.aP = 200; // aP-4=196 > 160
  state.packedOffsets[155] = 1000; // tableA0 reads default to 0 -> no R() call
  const calls = [];
  stepLegacyP(state, [mockGraphics(), mockGraphics()], {
    onI: () => calls.push("i"),
  });
  assert.equal(state.aP, -200); // (200+4) negated to -204, then epilogue's own +4 -> -200
  assert.equal(state.c, true); // epilogue's aP<0 branch sets c=true unconditionally
  assert.deepEqual(calls, ["i"]); // only section 1's onI fires; epilogue's own onI needs aP>=-48
  assert.equal(state.needsFullReset, false); // epilogue's H=false did run
}

// Section 1 skipped entirely when aP<=0 or JFlag -- proceeds straight to
// section 2's H/J-gated overlay flag + fillRects.
{
  const state = freshP();
  state.aP = 0;
  state.needsFullReset = true;
  state.JFlag = false;
  const g0 = mockGraphics();
  stepLegacyP(state, [g0, mockGraphics()], {});
  assert.equal(state.entityScanFlags[12], true);
  // REGRESSION (2026-08-31): same helper-#437 +11/+8 shift -- was
  // (0,0)/(0,240).
  assert.deepEqual(g0.calls.slice(0, 3), [
    ["setColor", 0],
    ["fillRect", 11, 8, 240, 112],
    ["fillRect", 11, 248, 240, 96],
  ]);
}

// Section 2 skipped when JFlag is true even if needsFullReset is set.
{
  const state = freshP();
  state.needsFullReset = true;
  state.JFlag = true;
  const g0 = mockGraphics();
  stepLegacyP(state, [g0, mockGraphics()], {});
  assert.equal(state.entityScanFlags[12], false);
  assert.deepEqual(g0.calls, []);
}

// Section 3: tableA0===1, aR<0 -> straight to epilogue, no draws/R() call.
{
  const state = freshP();
  state.packedOffsets[155] = 1000;
  state.aS = 5;
  state.packedBytes[1000 + 5] = 1; // tableA0
  state.aR = -1;
  const calls = [];
  const g0 = mockGraphics();
  stepLegacyP(state, [g0, mockGraphics()], {
    onSpriteDraw: () => calls.push("draw"),
    onJ: () => calls.push("j"),
  });
  assert.deepEqual(calls, []);
  assert.deepEqual(g0.calls, []);
  assert.equal(state.needsFullReset, false); // epilogue ran (H reset always happens there)
}

// Section 3: tableA0===1, aR<tableA84 -> the "draw block": fillRect, two
// sprite draws (first uses aR since am===0), aR increments, then epilogue.
{
  const state = freshP();
  state.packedOffsets[155] = 1000;
  state.aS = 5;
  state.packedBytes[1000 + 0 + 5] = 1; // tableA0
  state.packedBytes[1000 + 84 + 5] = 10; // tableA84
  state.packedBytes[1000 + 28 + 5] = 7; // tableA28
  state.aR = 2; // < tableA84(10)
  state.am = 0;
  state.phase = 99;
  const g0 = mockGraphics();
  const draws = [];
  stepLegacyP(state, [g0, mockGraphics()], {
    onSpriteDraw: (...a) => draws.push(a),
  });
  assert.equal(state.targetSlot, 0);
  // REGRESSION (2026-08-31): same helper-#437 +11/+8 shift -- was (0,112).
  assert.deepEqual(g0.calls.slice(0, 2), [["setColor", 0], ["fillRect", 11, 120, 240, 128]]);
  assert.deepEqual(draws, [
    [98 + 7, 120, 176, 2], // am===0 -> uses aR(2), not phase
    [104, 120, 176, 99],
  ]);
  assert.equal(state.aR, 3); // incremented since am===0
}

// Section 3: aR>=tableA84 but am!==0 -> STILL the draw block (OR condition),
// using phase instead of aR for the first sprite draw, and aR unchanged.
{
  const state = freshP();
  state.packedOffsets[155] = 1000;
  state.aS = 5;
  state.packedBytes[1000 + 0 + 5] = 1;
  state.packedBytes[1000 + 84 + 5] = 10;
  state.packedBytes[1000 + 28 + 5] = 7;
  state.aR = 10; // not < tableA84(10)
  state.am = 1; // nonzero
  state.phase = 55;
  const draws = [];
  stepLegacyP(state, [mockGraphics(), mockGraphics()], {
    onSpriteDraw: (...a) => draws.push(a),
  });
  assert.deepEqual(draws, [[98 + 7, 120, 176, 55], [104, 120, 176, 55]]);
  assert.equal(state.aR, 10); // unchanged since am!==0
}

// Section 3: aR>=tableA84, am===0, aS===0 -> epilogue only, no draws/R().
{
  const state = freshP();
  state.packedOffsets[155] = 1000;
  state.aS = 0;
  state.packedBytes[1000 + 0 + 0] = 1;
  state.packedBytes[1000 + 84 + 0] = 3;
  state.aR = 5; // >= tableA84(3)
  state.am = 0;
  const calls = [];
  stepLegacyP(state, [mockGraphics(), mockGraphics()], {
    onSpriteDraw: () => calls.push("draw"),
  });
  assert.deepEqual(calls, []);
  assert.equal(state.needsFullReset, false); // epilogue ran
}

// Section 3: aR>=tableA84, am===0, aS!==0 -> aR=-1, jFlag=true, DIRECT
// return (offset 409) -- the epilogue does NOT run, unlike every other exit.
{
  const state = freshP();
  state.packedOffsets[155] = 1000;
  state.aS = 7;
  state.packedBytes[1000 + 0 + 7] = 1;
  state.packedBytes[1000 + 84 + 7] = 3;
  state.aR = 5; // >= tableA84(3)
  state.am = 0;
  state.needsFullReset = true; // to prove the epilogue's H=false does NOT run
  stepLegacyP(state, [mockGraphics(), mockGraphics()], {});
  assert.equal(state.aR, -1);
  assert.equal(state.jFlag, true);
  assert.equal(state.needsFullReset, true); // still true -- epilogue skipped
}

// Section 3: tableA0!==1 and tableA0>=2 -> calls stepLegacyQ (confirmed via
// its own aR side effect) then delegates into stepLegacyR (confirmed via
// R()'s own observable setClip/onGameplayDraw tail), then the epilogue.
// al=1 so Q() takes its "advance aR, maybe call onJ" path rather than its
// al===0 path. Q() writes j:Z (#327, `jFlag`) while R() reads J:Z (#66,
// `JFlag`) -- two fields; they were one port field until 2026-10-01.
{
  const state = freshP();
  state.packedOffsets[155] = 1000;
  state.aS = 2;
  state.al = 1;
  state.packedBytes[1000 + 0 + 2] = 2; // tableA0 >= 2
  state.an = 1; // skip R()'s own initial an===0 gate
  const g0 = mockGraphics();
  const calls = [];
  stepLegacyP(state, [g0, mockGraphics()], {
    onJ: () => calls.push("j"),
    onGameplayDraw: () => calls.push("draw"),
    onPartialBlit: () => calls.push("blit"),
  });
  // stepLegacyQ ran: aR(0)>=tableA84(0) -> aR=-2; al!==0 -> aR+=1 -> -1; -1>0 is false -> no onJ.
  assert.equal(state.aR, -1);
  assert.equal(state.jFlag, false);
  assert.deepEqual(calls, ["blit", "draw"]);
  assert.ok(g0.calls.some((c) => c[0] === "setClip"));
}

// Section 3: tableA0<2 but tableA0ByAo>=2 -> still calls stepLegacyQ/R() via
// the second OR branch.
{
  const state = freshP();
  state.packedOffsets[155] = 1000;
  state.aS = 2;
  state.al = 1;
  state.ao = 9;
  state.packedBytes[1000 + 0 + 2] = 0; // tableA0 < 2
  state.packedBytes[1000 + 0 + 9] = 2; // tableA0ByAo >= 2
  state.an = 1;
  const calls = [];
  stepLegacyP(state, [mockGraphics(), mockGraphics()], {
    onGameplayDraw: () => calls.push("draw"),
    onPartialBlit: () => calls.push("blit"),
  });
  assert.equal(state.aR, -1);
  assert.equal(state.jFlag, false);
  assert.deepEqual(calls, ["blit", "draw"]);
}

// Section 3: both table reads < 2 -> Q()/R() never called, straight to epilogue.
{
  const state = freshP();
  state.packedOffsets[155] = 1000;
  state.aS = 2;
  state.ao = 9;
  state.packedBytes[1000 + 0 + 2] = 0;
  state.packedBytes[1000 + 0 + 9] = 0;
  const calls = [];
  stepLegacyP(state, [mockGraphics(), mockGraphics()], {
    onJ: () => calls.push("j"),
    onGameplayDraw: () => calls.push("draw"),
  });
  assert.equal(state.aR, 0); // unchanged -- Q() never ran
  assert.deepEqual(calls, []);
  assert.equal(state.needsFullReset, false); // epilogue ran
}

// Epilogue: aP<0 and aP+4>=-48 -> snaps to 0, clears c, calls onI.
{
  const state = freshP();
  state.aP = -50; // -50+4=-46 >= -48
  state.packedOffsets[155] = 1000; // tableA0 defaults to 0 -> not 1, not >=2 -> no R()
  const calls = [];
  stepLegacyP(state, [mockGraphics(), mockGraphics()], {
    onI: () => calls.push("i"),
  });
  assert.equal(state.aP, 0);
  assert.equal(state.c, false);
  assert.deepEqual(calls, ["i"]);
}

// Epilogue: aP<0 and aP+4<-48 -> stays negative (incremented by 4), c=true, no onI.
{
  const state = freshP();
  state.aP = -100; // -100+4=-96 < -48
  state.packedOffsets[155] = 1000;
  const calls = [];
  stepLegacyP(state, [mockGraphics(), mockGraphics()], {
    onI: () => calls.push("i"),
  });
  assert.equal(state.aP, -96);
  assert.equal(state.c, true);
  assert.deepEqual(calls, []);
}

// Epilogue: aP===0 (already, untouched by the aP<0 branch) and al!==0 ->
// fires the two element-scan calls.
{
  const state = freshP();
  state.aP = 0;
  state.al = 1;
  state.packedOffsets[155] = 1000;
  const calls = [];
  stepLegacyP(state, [mockGraphics(), mockGraphics()], {
    onElementScan: (...a) => calls.push(a),
  });
  assert.deepEqual(calls, [[12, 0, 0], [17, 0, 320]]);
}

// Epilogue: al===0 -> no element-scan calls even when aP===0.
{
  const state = freshP();
  state.aP = 0;
  state.al = 0;
  state.packedOffsets[155] = 1000;
  const calls = [];
  stepLegacyP(state, [mockGraphics(), mockGraphics()], {
    onElementScan: () => calls.push("scan"),
  });
  assert.deepEqual(calls, []);
}

function freshQ(overrides = {}) {
  return {
    aS: 1, aR: 0, aP: 0, needsFullReset: false, al: 1, jFlag: false,
    dense: new Int8Array(20000), p: new Int8Array(40),
    packedBytes: new Int8Array(4000), packedOffsets: new Int16Array(400),
    ...overrides,
  };
}

// Guards: aS<=0, aR<0, and (aP!==0 && !needsFullReset) all no-op immediately.
{
  const state = freshQ({ aS: 0 });
  const before = { ...state };
  stepLegacyQ(state, {});
  assert.equal(state.aR, before.aR);
}
{
  const state = freshQ({ aR: -1 });
  stepLegacyQ(state, {});
  assert.equal(state.aR, -1);
}
{
  const state = freshQ({ aP: 5, needsFullReset: false });
  stepLegacyQ(state, {});
  assert.equal(state.aR, 0); // untouched -- guard fired before the aR-advance logic
}
// aP!==0 but needsFullReset===true -> guard does NOT fire, proceeds normally.
{
  const state = freshQ({ aP: 5, needsFullReset: true, aR: 0 });
  state.packedOffsets[155] = 1000;
  state.al = 1;
  stepLegacyQ(state, {});
  assert.equal(state.aR, -1); // guard didn't fire (needsFullReset=true): aR(0)>=tableA84(0) -> -2, al!==0 -> -2+1=-1
}

// aR===0, tableA28<=0 -> the refresh loop is skipped entirely (no dense writes),
// but the aR-advance logic below still runs.
{
  const state = freshQ();
  state.packedOffsets[155] = 1000;
  state.p[3] = 7; // would be a candidate slot if the loop ran
  const before = state.dense[2929 + 7];
  stepLegacyQ(state, {});
  assert.equal(state.dense[2929 + 7], before); // untouched
}

// aR===0, tableA28>0, a nonzero p[] slot with tableVal2!==0 -> writes
// e[2929+slot]/e[1313+slot]/e[2828+slot]=105; local1=min(local2,6).
{
  const state = freshQ();
  state.packedOffsets[155] = 1000;
  state.packedOffsets[196] = 2000;
  state.aS = 3;
  state.packedBytes[1000 + 28 + 3] = 4; // tableA28
  state.p[2] = 9; // local2=2 -> local1=min(2,6)=2
  const base = 2000 + 2 * 33 + 4 * 3; // packedOffsets[196]+local1*33+tableA28*3
  state.packedBytes[base + 0] = 55; // tableVal2 (nonzero)
  state.packedBytes[base + 2] = 66;
  stepLegacyQ(state, {});
  assert.equal(state.dense[2929 + 9], 55);
  assert.equal(state.dense[1313 + 9], 66);
  assert.equal(state.dense[2828 + 9], 105);
}

// Same setup but tableVal2===0 -> the e[2929]/e[1313]/e[2828] writes are skipped.
{
  const state = freshQ();
  state.packedOffsets[155] = 1000;
  state.packedOffsets[196] = 2000;
  state.aS = 3;
  state.packedBytes[1000 + 28 + 3] = 4;
  state.p[2] = 9;
  const base = 2000 + 2 * 33 + 4 * 3;
  state.packedBytes[base + 0] = 0; // tableVal2 === 0
  stepLegacyQ(state, {});
  assert.equal(state.dense[2929 + 9], 0);
  assert.equal(state.dense[1313 + 9], 0);
  assert.equal(state.dense[2828 + 9], 0);
}

// local1 clamps to 6 for local2>6 (e.g. slot at index 10 still uses local1=6).
{
  const state = freshQ();
  state.packedOffsets[155] = 1000;
  state.packedOffsets[196] = 2000;
  state.aS = 3;
  state.packedBytes[1000 + 28 + 3] = 4;
  state.p[10] = 5; // local2=10 -> local1=min(10,6)=6
  const base = 2000 + 6 * 33 + 4 * 3;
  state.packedBytes[base + 1] = 20; // tableVal4 (nonzero)
  stepLegacyQ(state, {});
  assert.equal(state.dense[606 + 5], 20 - 10); // (byte)(tableVal4-10)
  assert.equal(state.dense[808 + 5], 0);
}

// tableVal4===0 -> the e[606]/e[808] writes are skipped, but e[3030+slot]=0
// always runs regardless of either table value.
{
  const state = freshQ();
  state.packedOffsets[155] = 1000;
  state.packedOffsets[196] = 2000;
  state.aS = 3;
  state.packedBytes[1000 + 28 + 3] = 4;
  state.p[2] = 9;
  state.dense[606 + 9] = 42; // pre-set, should stay untouched
  const base = 2000 + 2 * 33 + 4 * 3;
  state.packedBytes[base + 1] = 0; // tableVal4 === 0
  stepLegacyQ(state, {});
  assert.equal(state.dense[606 + 9], 42);
  assert.equal(state.dense[3030 + 9], 0);
}

// aR!==0 -> the whole refresh block is skipped (even with tableA28>0 and
// nonzero p[] slots), straight to the aR-advance logic.
{
  const state = freshQ();
  state.aR = 3;
  state.packedOffsets[155] = 1000;
  state.packedOffsets[196] = 2000;
  state.packedBytes[1000 + 28 + 1] = 4; // tableA28, would trigger the loop if aR were 0
  state.p[2] = 9;
  state.packedBytes[1000 + 84 + 1] = 10; // tableA84 -- aR(3)<tableA84(10)
  stepLegacyQ(state, {});
  assert.equal(state.dense[2929 + 9], 0); // refresh loop never ran
  assert.equal(state.aR, 4); // just the plain +1 advance
}

// aR<tableA84 -> skip the aR=-2 reset; just aR+=1 and maybe onJ.
{
  const state = freshQ();
  state.aR = 2;
  state.packedOffsets[155] = 1000;
  state.packedBytes[1000 + 84 + 1] = 10; // tableA84
  const calls = [];
  stepLegacyQ(state, { onJ: () => calls.push("j") });
  assert.equal(state.aR, 3);
  assert.deepEqual(calls, ["j"]); // aR(3) > 0 -> onJ fires
}

// aR>=tableA84, al===0 -> aR=-2, jFlag=true, direct return (onJ does NOT fire).
{
  const state = freshQ();
  state.aR = 10;
  state.al = 0;
  state.packedOffsets[155] = 1000;
  state.packedBytes[1000 + 84 + 1] = 10; // tableA84 -- aR(10)>=tableA84(10)
  const calls = [];
  stepLegacyQ(state, { onJ: () => calls.push("j") });
  assert.equal(state.aR, -2);
  assert.equal(state.jFlag, true);
  assert.deepEqual(calls, []);
}

// aR>=tableA84, al!==0 -> aR=-2 then +1, onJ only if the result is >0.
{
  const state = freshQ();
  state.aR = 10;
  state.al = 1;
  state.packedOffsets[155] = 1000;
  state.packedBytes[1000 + 84 + 1] = 10;
  const calls = [];
  stepLegacyQ(state, { onJ: () => calls.push("j") });
  assert.equal(state.aR, -1); // -2+1 = -1, not >0
  assert.equal(state.jFlag, false);
  assert.deepEqual(calls, []);
}

// private void i() (#610) is now ported/tested as resetLegacyZI in
// LegacyZI.ts (see verify-z-i.mjs) -- merged there 2026-08-22, see that
// file's docblock.

console.log("f.K()/f.R() gameplay paint triggers OK");
