import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import vm from "node:vm";
import { denseRequire } from "./dense-layout-require.mjs";

const file = new URL("../src/render/LegacySpriteLayerPredicates.ts", import.meta.url).pathname;
const module = { exports: {} };
const output = ts.transpileModule(fs.readFileSync(file, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
vm.runInNewContext(output, { require: denseRequire, module, exports: module.exports, Int8Array, Int16Array });
const { stepLegacySpriteLayerPredicateA, stepLegacySpriteLayerPredicateB } = module.exports;

// ===================== private boolean a() (#444) =====================

function makeAState(overrides) {
  return {
    ay: 10,
    sFlag: false,
    vByte: 1,
    at: 0,
    dense: new Int8Array(10000),
    aq: 0,
    FByte: -1,
    kByte: 0,
    ar: 0,
    as: 0,
    byteTables: Array.from({ length: 16 }, () => new Int8Array(200)),
    az: 0,
    cWByte: 0,
    ax: -99, // sentinel: must stay -99 wherever the bytecode leaves ax untouched
    cACInt: -1,
    CCounter: 0,
    ECounter: 0,
    BCounter: 0,
    DCounter: 0,
    // f.c:[[B (#262) -- gridC. NOT null: e.i() allocates it 96x96 alongside
    // f.e:[B (denseState). The earlier "permanently null" claim was retracted
    // 2026-09-04; see LegacySpriteLayerPredicates.ts's docblock.
    gridC: Array.from({ length: 96 }, () => new Int8Array(96)),
    ...overrides,
  };
}

// --- offsets 0..29: each of the four gate conditions independently forces
// the early `return true` with zero side effects (ax/cACInt untouched).
for (const overrides of [
  { ay: 5 },
  { sFlag: true },
  { vByte: 0 },
  { at: -1 },
]) {
  const state = makeAState(overrides);
  let composited = false;
  const result = stepLegacySpriteLayerPredicateA(state, { onComposite: () => { composited = true; } });
  assert.equal(result, true);
  assert.equal(composited, false, `gate ${JSON.stringify(overrides)} must skip all side effects`);
  assert.equal(state.ax, -99, "ax untouched when the top gate fails");
  assert.equal(state.cACInt, -1, "cACInt untouched when the top gate fails");
}

// --- drawCond via dense[909+aq]!==0 && dense[909+aq]===FByte: draws, ax
// untouched, cACInt reset to 0, loop bounds (E<1) skip the gridC throw.
{
  const state = makeAState({ aq: 3, ar: 100, as: 200, az: 7, FByte: 12 });
  state.dense[909 + 3] = 12;
  state.byteTables[12][7] = 4;
  state.byteTables[13][7] = 5;
  let call;
  const result = stepLegacySpriteLayerPredicateA(state, { onComposite: (r, x, y) => { call = { r, x, y }; } });
  assert.equal(result, true);
  assert.deepEqual(call, { r: 599, x: 104, y: 205 });
  assert.equal(state.ax, -99, "draw branch never touches ax");
  assert.equal(state.cACInt, 0);
}

// --- drawCond via FByte===-1 && kByte===aq (dense[909+aq]===0 path).
{
  const state = makeAState({ aq: 9, kByte: 9, FByte: -1, ar: 1, as: 2, az: 0 });
  let composited = false;
  stepLegacySpriteLayerPredicateA(state, { onComposite: () => { composited = true; } });
  assert.equal(composited, true, "FByte===-1 && kByte===aq must draw even though dense[909+aq]===0");
}

// --- drawCond false, cWByte===aq, cWByte<51: ax=1.
{
  const state = makeAState({ aq: 20, cWByte: 20, FByte: 5 });
  state.dense[909 + 20] = 0; // drawCond false: dense===0 and F!==-1
  const result = stepLegacySpriteLayerPredicateA(state);
  assert.equal(result, true);
  assert.equal(state.ax, 1);
}

// --- drawCond false, cWByte===aq, cWByte>=51: ax=3.
{
  const state = makeAState({ aq: 60, cWByte: 60, FByte: 5 });
  const result = stepLegacySpriteLayerPredicateA(state);
  assert.equal(result, true);
  assert.equal(state.ax, 3);
}

// --- drawCond false, cWByte!==aq: ax stays fully untouched (offset 139 skips
// straight past the whole ax=1/ax=3 block).
{
  const state = makeAState({ aq: 20, cWByte: 21, FByte: 5 });
  const result = stepLegacySpriteLayerPredicateA(state);
  assert.equal(result, true);
  assert.equal(state.ax, -99, "cWByte!==aq must leave ax completely untouched");
  assert.equal(state.cACInt, 0, "cACInt still resets regardless of the ax branch");
}

// --- offsets 166..271: the gridC rectangle scan. Counts live ids in [1,50]
// into aC and sets ax=1 when this call's own entity (aq) is one of them.
// (Rewritten 2026-09-04: this used to assert a NullPointerException on the
// premise that f.c:[[B] #262 is permanently null. e.i() allocates it.)
{
  const gridC = Array.from({ length: 96 }, () => new Int8Array(96));
  const dense = new Int8Array(10000);
  // Rectangle is local1 in [C+1, C+E] = [1,2], local2 in [B+1, B+D] = [1,3].
  gridC[1][1] = 7;   dense[1919 + 7] = 5;    // live, counted
  gridC[1][2] = 9;   dense[1919 + 9] = 0;    // hp 0 -> skipped
  gridC[1][3] = 51;  dense[1919 + 51] = 5;   // id > 50 -> skipped
  gridC[2][1] = 0;                            // id < 1 -> skipped
  gridC[2][2] = 4;   dense[1919 + 4] = 3;    // live, counted, and === aq
  gridC[2][3] = -12; dense[1919 + 4] = 3;    // negative marker -> skipped
  const state = makeAState({
    aq: 4, cWByte: 99, FByte: 5, dense, gridC,
    CCounter: 0, ECounter: 2, BCounter: 0, DCounter: 3,
  });
  const result = stepLegacySpriteLayerPredicateA(state);
  assert.equal(result, true);
  assert.equal(state.cACInt, 2, "only ids in [1,50] with dense[1919+id] > 0 count");
  assert.equal(state.ax, 1, "ax=1 because gridC[2][2] === aq");
}

// --- E<1: outer loop never enters, so aC stays at its offset-161 reset of 0.
{
  const state = makeAState({ aq: 1, cWByte: 99, FByte: 5, CCounter: 0, ECounter: 0, BCounter: 0, DCounter: 5 });
  const result = stepLegacySpriteLayerPredicateA(state);
  assert.equal(result, true);
  assert.equal(state.cACInt, 0);
  assert.equal(state.ax, -99, "no matching id, and the cWByte branch did not run");
}

// --- D<1: inner loop never enters even though E>=1.
{
  const state = makeAState({ aq: 1, cWByte: 99, FByte: 5, CCounter: 0, ECounter: 5, BCounter: 0, DCounter: 0 });
  const result = stepLegacySpriteLayerPredicateA(state);
  assert.equal(result, true);
  assert.equal(state.cACInt, 0);
}

console.log("f.a() (#444) sprite-layer predicate OK");

// ===================== private boolean b() (#534) =====================

function makeBState(overrides) {
  return {
    ay: 0,
    az: 0,
    ap: -1,
    ax: 0,
    aq: 0,
    an: -1,
    ao: -1,
    dense: new Int8Array(10000),
    statScratch: [new Int16Array(30), new Int16Array(30)],
    packedBytes: new Int8Array(2000),
    packedOffsets: new Int16Array(400),
    aw: 0,
    at: 0,
    av: 0,
    ...overrides,
  };
}

// --- ay===0, aq<51, ax<=1 branch of the >>2&3 shift (no -2/an=0 detour).
{
  const state = makeBState({ ay: 0, az: 42, aq: 10 });
  state.dense[5151 + 10] = 0b0100; // >>2&3 = 1 (<=1, no decrement branch)
  state.dense[1515 + 10] = 3;
  const result = stepLegacySpriteLayerPredicateB(state);
  assert.equal(result, true);
  assert.equal(state.ap, 42);
  // ax = 1*72 + 0 (aq<51) + 3*18 = 126
  assert.equal(state.ax, 126);
  assert.equal(state.an, -1, "an untouched when the >>2&3 shift is <=1");
}

// --- ay===0, ax>1 branch: an=0, ax-=2 before the *72; aq>=51 adds 36.
{
  const state = makeBState({ ay: 0, az: 5, aq: 60 });
  state.dense[5151 + 60] = 0b1100; // >>2&3 = 3 (>1)
  state.dense[1515 + 60] = 0;
  const result = stepLegacySpriteLayerPredicateB(state);
  assert.equal(result, true);
  assert.equal(state.an, 0);
  // ax: 3-2=1, *72=72, +36 (aq>=51) = 108, +0 = 108
  assert.equal(state.ax, 108);
}

// --- ay===9, aq>=51: an=3 unconditionally; value cascade dense[1515]===1 -> 1.
{
  const state = makeBState({ ay: 9, az: 8, aq: 70 });
  state.dense[1515 + 70] = 1;
  const result = stepLegacySpriteLayerPredicateB(state);
  assert.equal(result, true);
  assert.equal(state.ao, 8);
  assert.equal(state.an, 3);
  assert.equal(state.ax, 1 * 12);
}

// --- ay===9, aq<51, ax>0 (from dense[5151+aq]&3): an=ax; value cascade
// dense[1414+aq]<30 -> 3.
{
  const state = makeBState({ ay: 9, az: 8, aq: 10 });
  state.dense[5151 + 10] = 0b0101; // &3 = 1 (>0)
  state.dense[1515 + 10] = 0;
  state.dense[1414 + 10] = 10; // <30
  const result = stepLegacySpriteLayerPredicateB(state);
  assert.equal(state.an, 1);
  assert.equal(state.ax, 3 * 12);
}

// --- ay===9, aq<51, ax<=0: an untouched; value cascade dense[1414+aq]<50 -> 2.
{
  const state = makeBState({ ay: 9, az: 8, aq: 10, an: -1 });
  state.dense[5151 + 10] = 0b0100; // &3 = 0
  state.dense[1515 + 10] = 0;
  state.dense[1414 + 10] = 40; // in [30,50)
  const result = stepLegacySpriteLayerPredicateB(state);
  assert.equal(state.an, -1, "ax<=0 leaves an untouched");
  assert.equal(state.ax, 2 * 12);
}

// --- ay===9, else branch of the value cascade: both dense reads fail -> 0.
{
  const state = makeBState({ ay: 9, az: 8, aq: 10 });
  state.dense[1515 + 10] = 0;
  state.dense[1414 + 10] = 90; // >=50
  const result = stepLegacySpriteLayerPredicateB(state);
  assert.equal(state.ax, 0 * 12);
}

// --- ay===7, matched (aq === statScratch[0][17]): ax+=2, true.
{
  const state = makeBState({ ay: 7, aq: 17, ax: 10 });
  state.statScratch[0][17] = 17;
  const result = stepLegacySpriteLayerPredicateB(state);
  assert.equal(result, true);
  assert.equal(state.ax, 12);
}

// --- ay===7, unmatched, packedBytes[...outer] === 0 -> false.
{
  const state = makeBState({ ay: 7, aq: 3, ax: 10 });
  state.statScratch[0][17] = 99; // !== aq
  state.packedOffsets[41] = 5;
  state.dense[6464 + 3] = 2;
  state.packedBytes[5 + 2] = 7; // "inner"
  state.packedOffsets[42] = 50;
  state.packedBytes[50 + 7] = 0; // "outer" === 0
  const result = stepLegacySpriteLayerPredicateB(state);
  assert.equal(result, false);
  assert.equal(state.ax, 10, "ax unchanged on the false path");
}

// --- ay===7, unmatched, packedBytes[...outer] !== 0 -> ax += outer-1, true.
{
  const state = makeBState({ ay: 7, aq: 3, ax: 10 });
  state.statScratch[0][17] = 99;
  state.packedOffsets[41] = 5;
  state.dense[6464 + 3] = 2;
  state.packedBytes[5 + 2] = 7;
  state.packedOffsets[42] = 50;
  state.packedBytes[50 + 7] = 4; // outer=4
  const result = stepLegacySpriteLayerPredicateB(state);
  assert.equal(result, true);
  assert.equal(state.ax, 10 + (4 - 1));
}

// --- aw===0, 5<=ay<=8, at<0 && dense[6565+aq]===1 -> false.
{
  const state = makeBState({ ay: 6, aw: 0, at: -1, aq: 4 });
  state.dense[6565 + 4] = 1;
  const result = stepLegacySpriteLayerPredicateB(state);
  assert.equal(result, false);
}

// --- aw===0, ay===5, dense[6565+aq]===4: ax=1, true (at>=0 so the false
// path above is skipped even if dense were 1).
{
  const state = makeBState({ ay: 5, aw: 0, at: 0, aq: 4, ax: 77 });
  state.dense[6565 + 4] = 4;
  const result = stepLegacySpriteLayerPredicateB(state);
  assert.equal(result, true);
  assert.equal(state.ax, 1);
}

// --- aw===0, ay===6, dense[6565+aq]===5: ax=1, true.
{
  const state = makeBState({ ay: 6, aw: 0, at: 0, aq: 4, ax: 77 });
  state.dense[6565 + 4] = 5;
  const result = stepLegacySpriteLayerPredicateB(state);
  assert.equal(result, true);
  assert.equal(state.ax, 1);
}

// --- aw===0, 5<=ay<=8 default: classified===ay -> true.
{
  const state = makeBState({ ay: 8, aw: 0, at: 0, aq: 4 });
  state.dense[6565 + 4] = 2;
  state.packedOffsets[145] = 30;
  state.packedBytes[30 + 2] = 8; // classified === ay(8)
  const result = stepLegacySpriteLayerPredicateB(state);
  assert.equal(result, true);
}

// --- aw===0, 5<=ay<=8 default: classified!==ay -> false.
{
  const state = makeBState({ ay: 8, aw: 0, at: 0, aq: 4 });
  state.dense[6565 + 4] = 2;
  state.packedOffsets[145] = 30;
  state.packedBytes[30 + 2] = 3; // !== ay(8)
  const result = stepLegacySpriteLayerPredicateB(state);
  assert.equal(result, false);
}

// --- aw===2, dense[3535+aq]!==0, ay===4, dense[3636+aq]>0: ax+=d3535, true.
{
  const state = makeBState({ ay: 4, aw: 2, aq: 5, ax: 1 });
  state.dense[3535 + 5] = 9;
  state.dense[3636 + 5] = 1;
  const result = stepLegacySpriteLayerPredicateB(state);
  assert.equal(result, true);
  assert.equal(state.ax, 1 + 9);
}

// --- aw===2, dense[3535+aq]!==0, ay===4, av===115 (one of the 113..116 set),
// dense[3636+aq]<=0: ax+=d3535, true.
{
  const state = makeBState({ ay: 4, aw: 2, aq: 5, ax: 1, av: 115 });
  state.dense[3535 + 5] = 9;
  state.dense[3636 + 5] = 0;
  const result = stepLegacySpriteLayerPredicateB(state);
  assert.equal(result, true);
  assert.equal(state.ax, 1 + 9);
}

// --- aw===2, dense[3535+aq]!==0, ay===4, none of the extra conditions hold:
// falls through to the final `return true` with ax untouched.
{
  const state = makeBState({ ay: 4, aw: 2, aq: 5, ax: 1, av: 0 });
  state.dense[3535 + 5] = 9;
  state.dense[3636 + 5] = 0;
  const result = stepLegacySpriteLayerPredicateB(state);
  assert.equal(result, true);
  assert.equal(state.ax, 1, "ax untouched when ay===4's extra condition fails");
}

// --- aw===2, dense[3535+aq]!==0, ay===5, dense[6565+aq]===9 -> false.
{
  const state = makeBState({ ay: 5, aw: 2, aq: 5 });
  state.dense[3535 + 5] = 9;
  state.dense[6565 + 5] = 9;
  const result = stepLegacySpriteLayerPredicateB(state);
  assert.equal(result, false);
}

// --- aw===2, dense[3535+aq]!==0, ay===5, else: ax+=dense[6565+aq], true.
{
  const state = makeBState({ ay: 5, aw: 2, aq: 5, ax: 2 });
  state.dense[3535 + 5] = 9;
  state.dense[6565 + 5] = 7;
  const result = stepLegacySpriteLayerPredicateB(state);
  assert.equal(result, true);
  assert.equal(state.ax, 2 + 7);
}

// --- aw===2, dense[3535+aq]!==0, ay===8 -> false.
{
  const state = makeBState({ ay: 8, aw: 2, aq: 5 });
  state.dense[3535 + 5] = 9;
  const result = stepLegacySpriteLayerPredicateB(state);
  assert.equal(result, false);
}

// --- aw===2, dense[3535+aq]!==0, ay not in {4,5,8}: true, no mutation.
{
  const state = makeBState({ ay: 2, aw: 2, aq: 5, ax: 3 });
  state.dense[3535 + 5] = 9;
  const result = stepLegacySpriteLayerPredicateB(state);
  assert.equal(result, true);
  assert.equal(state.ax, 3);
}

// --- aw===2, dense[3535+aq]===0, ay===4 -> false.
{
  const state = makeBState({ ay: 4, aw: 2, aq: 5 });
  state.dense[3535 + 5] = 0;
  const result = stepLegacySpriteLayerPredicateB(state);
  assert.equal(result, false);
}

// --- aw===2, dense[3535+aq]===0, ay===5, dense[6565+aq]===1 -> false.
{
  const state = makeBState({ ay: 5, aw: 2, aq: 5 });
  state.dense[3535 + 5] = 0;
  state.dense[6565 + 5] = 1;
  const result = stepLegacySpriteLayerPredicateB(state);
  assert.equal(result, false);
}

// --- aw===2, dense[3535+aq]===0, ay===5, dense[6565+aq]===9 -> false.
{
  const state = makeBState({ ay: 5, aw: 2, aq: 5 });
  state.dense[3535 + 5] = 0;
  state.dense[6565 + 5] = 9;
  const result = stepLegacySpriteLayerPredicateB(state);
  assert.equal(result, false);
}

// --- aw===2, dense[3535+aq]===0, ay===5, else: ax+=dense[6565+aq], true.
{
  const state = makeBState({ ay: 5, aw: 2, aq: 5, ax: 1 });
  state.dense[3535 + 5] = 0;
  state.dense[6565 + 5] = 4;
  const result = stepLegacySpriteLayerPredicateB(state);
  assert.equal(result, true);
  assert.equal(state.ax, 1 + 4);
}

// --- aw===2, dense[3535+aq]===0, ay===8, dense[6565+aq]===1 -> true.
{
  const state = makeBState({ ay: 8, aw: 2, aq: 5 });
  state.dense[3535 + 5] = 0;
  state.dense[6565 + 5] = 1;
  const result = stepLegacySpriteLayerPredicateB(state);
  assert.equal(result, true);
}

// --- aw===2, dense[3535+aq]===0, ay===8, dense[6565+aq]!==1 -> false.
{
  const state = makeBState({ ay: 8, aw: 2, aq: 5 });
  state.dense[3535 + 5] = 0;
  state.dense[6565 + 5] = 2;
  const result = stepLegacySpriteLayerPredicateB(state);
  assert.equal(result, false);
}

// --- aw===2, dense[3535+aq]===0, ay not in {4,5,8}: true.
{
  const state = makeBState({ ay: 1, aw: 2, aq: 5 });
  state.dense[3535 + 5] = 0;
  const result = stepLegacySpriteLayerPredicateB(state);
  assert.equal(result, true);
}

// --- aw===1, ay===5, dense[6565+aq]===9 -> false.
{
  const state = makeBState({ ay: 5, aw: 1, aq: 5 });
  state.dense[6565 + 5] = 9;
  const result = stepLegacySpriteLayerPredicateB(state);
  assert.equal(result, false);
}

// --- aw===1, ay===5, else -> ax+=dense[6565+aq], true.
{
  const state = makeBState({ ay: 5, aw: 1, aq: 5, ax: 1 });
  state.dense[6565 + 5] = 6;
  const result = stepLegacySpriteLayerPredicateB(state);
  assert.equal(result, true);
  assert.equal(state.ax, 1 + 6);
}

// --- Catch-all: aw===3 (neither 0, 1, nor 2), ay outside every special case
// -> true, no mutation.
{
  const state = makeBState({ ay: 2, aw: 3, aq: 5, ax: 9 });
  const result = stepLegacySpriteLayerPredicateB(state);
  assert.equal(result, true);
  assert.equal(state.ax, 9);
}

// --- Catch-all: aw===0 but ay outside [5,8] (and not 0/9/7) -> true, no mutation.
{
  const state = makeBState({ ay: 2, aw: 0, aq: 5, ax: 9 });
  const result = stepLegacySpriteLayerPredicateB(state);
  assert.equal(result, true);
  assert.equal(state.ax, 9);
}

console.log("f.b() (#534) sprite-layer predicate OK");
