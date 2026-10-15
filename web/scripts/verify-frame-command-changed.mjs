import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import vm from "node:vm";

const source = fs.readFileSync(new URL("../src/j2me/LegacyFrameCommandChanged.ts", import.meta.url), "utf8");
const output = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(output, { module, exports: module.exports, Int8Array, Int16Array });
const { stepLegacyFrameCommandChanged, stepLegacyZAdChange, stepLegacyMenuIconState, stepLegacyA, stepLegacyAd7Or8, stepLegacyAd12, stepLegacyX } = module.exports;

function baseState() {
  return {
    saveOffsets: new Int16Array(570),
    l: 0,
    aShortStats: [new Int16Array(26), new Int16Array(26)],
    packedBytes: new Int8Array(2000),
    packedOffsets: new Int16Array(400),
    dShort: new Int16Array(107),
    kBytes: new Int8Array(107),
    flags: Array.from({ length: 20 }, () => false),
    r: new Int8Array(50),
    as: 0,
    kFlag: false,
    entityFocusFlag: false,
    zAfCursorVFlag: false,
    dense: new Int8Array(10000),
    vInt: 0,
    wByte: 0,
    zlYInt: 0,
    qCounter: 0,
    FByte: -1,
    adByte: 0,
    frameGenCounterY: 0,
    frameGenCounterZ: 0,
    ayByte: 0,
    aByteRows: Array.from({ length: 5 }, () => new Int8Array(50)),
    uBytes: new Int8Array(10),
    am: 0,
    qByte: 0,
    Q: 14,
    al: 0,
    ai: 0,
    mByte: 0,
    akByte: 0,
    Z: 0,
    W: 0,
    X: 0,
    mapWidth: 40,
    mapHeight: 32,
    zAd14T: false,
    zAd14U: false,
    zAd14Q: false,
    zAd14R: false,
    af: 0,
    ag: 0,
  };
}

// aD===4: y() (ported 2026-09-28) -- the selected-unit panel's 23-field
// change detector over e[saveOffsets[t147[i]] + l].
{
  const state = baseState();
  state.packedOffsets[195] = 10;
  state.packedBytes[10 + 60 + 4] = 40;   // cache/flag base
  state.packedOffsets[147] = 200;
  state.packedBytes[200 + 0] = 19;       // field 0 -> saveOffsets[19] (HP row)
  state.saveOffsets[19] = 1919;
  state.l = 3;
  state.dense[1919 + 3] = 50;
  state.dense[3636 + 3] = 0;
  state.dense[6868 + 3] = 2;
  state.dShort[29] = 7;
  assert.equal(stepLegacyFrameCommandChanged(4, 1, state), true);
  assert.equal(state.dShort[40], 50);
  assert.equal(state.kBytes[40], 1);
  assert.equal(state.dShort[29], 0);
  assert.equal(state.dShort[14], 110);
  // Same values again: no change reported.
  state.kBytes[40] = 0;
  assert.equal(stepLegacyFrameCommandChanged(4, 1, state), false);
  assert.equal(state.kBytes[40], 0);
}

// aD===0: 5-slot stat change detector.
{
  const state = baseState();
  state.packedOffsets[146] = 100;
  state.packedOffsets[195] = 10;
  state.packedBytes[10 + 60] = 20; // command 0's aE: d[20..24] (offsets 42..62)
  state.packedBytes[100] = 0;
  state.packedBytes[101] = 1;
  state.packedBytes[102] = 2;
  state.packedBytes[103] = 3;
  state.packedBytes[104] = 4;
  state.aShortStats[0][0] = 5;
  state.aShortStats[0][1] = 7;
  const changed = stepLegacyFrameCommandChanged(0, 1, state);
  assert.equal(changed, true, "first read should report changed (cache starts at 0)");
  assert.equal(state.dShort[20], 5);
  assert.equal(state.dShort[21], 7);
  assert.equal(state.kBytes[20], 1);
  assert.equal(state.kBytes[21], 1);
  assert.equal(state.kBytes[22], 0, "untouched slot stays 0");

  const changedAgain = stepLegacyFrameCommandChanged(0, 1, state);
  assert.equal(changedAgain, false, "no change once cache matches");
}

// aD===0: some slots change, some don't.
{
  const state = baseState();
  state.packedOffsets[146] = 100;
  state.packedOffsets[195] = 10;
  state.packedBytes[10 + 60] = 20; // command 0's aE: d[20..24] (offsets 42..62)
  for (let i = 0; i < 5; i += 1) state.packedBytes[100 + i] = i;
  state.dShort[20] = 9; // pre-seed slot 0 cache to match
  state.aShortStats[0][0] = 9;
  state.aShortStats[0][1] = 1;
  const changed = stepLegacyFrameCommandChanged(0, 1, state);
  assert.equal(changed, true);
  assert.equal(state.kBytes[20], 0, "slot 0 unchanged, not marked");
  assert.equal(state.kBytes[21], 1, "slot 1 changed, marked");
}

// aD∈{2,5} -> z(): cached zlDShorts[4] > 0 takes priority.
{
  const state = baseState();
  state.dShort[4] = 42;
  const changed = stepLegacyZAdChange(2, state);
  assert.equal(changed, true);
  assert.equal(state.vInt, 42);
  assert.equal(state.kBytes[5], -1);
  assert.equal(state.kBytes[3], -1);
}

// z(): selected in [0,10) -> record = 12 + selected.
{
  const state = baseState();
  state.as = 3;
  state.r[3] = 4;
  const changed = stepLegacyZAdChange(5, state);
  assert.equal(changed, true);
  assert.equal(state.dShort[3], 16);
  assert.equal(state.dShort[5], 4);
  assert.equal(state.kBytes[5], 1);
  assert.equal(state.kBytes[3], 1);
  assert.equal(state.kBytes[4], -1);
}

// z(): selected >= 10 -> record = 11 + selected.
{
  const state = baseState();
  state.as = 0;
  state.r[0] = 15;
  stepLegacyZAdChange(2, state);
  assert.equal(state.dShort[3], 26);
}

// z(): selected < 0, kFlag set -> record 41.
{
  const state = baseState();
  state.as = 0;
  state.r[0] = -1;
  state.kFlag = true;
  stepLegacyZAdChange(2, state);
  assert.equal(state.dShort[3], 41);
}

// z(): selected < 0 while browsing VILLAGERS (F) -> the villager's name,
// even with V set (offsets 177..191: `F` jumps straight to the name).
// Fixed 2026-10-08; this case used to pin the port's `F || V -> 29`.
for (const v of [false, true]) {
  const state = baseState();
  state.as = 0;
  state.r[0] = -2;
  state.dense[6868 - -2] = 5;
  state.entityFocusFlag = true;
  state.zAfCursorVFlag = v;
  stepLegacyZAdChange(2, state);
  assert.equal(state.dShort[3], 108 + 5);
}

// z(): selected < 0, zAfCursorVFlag set (kFlag+entityFocusFlag false) -> record 29.
{
  const state = baseState();
  state.as = 0;
  state.r[0] = -1;
  state.zAfCursorVFlag = true;
  stepLegacyZAdChange(2, state);
  assert.equal(state.dShort[3], 29);
}

// z(): selected < 0, none of the flags set -> dense-table fallback.
{
  const state = baseState();
  state.as = 0;
  state.r[0] = -2; // selected = -2
  state.dense[6868 - -2] = 5; // dense[6870] = 5
  stepLegacyZAdChange(2, state);
  assert.equal(state.dShort[3], 108 + 5);
}

// z(): no change and flags[command] false -> early return, no writes.
{
  const state = baseState();
  state.as = 0;
  state.r[0] = 7;
  state.dShort[5] = 7; // already cached
  state.flags[2] = false;
  const before = state.dShort[3];
  const changed = stepLegacyZAdChange(2, state);
  assert.equal(changed, false);
  assert.equal(state.dShort[3], before, "no write when unchanged and flag not forcing");
}

// z(): no change but flags[command] true -> still recomputes (forced refresh).
{
  const state = baseState();
  state.as = 0;
  state.r[0] = 7;
  state.dShort[5] = 7;
  state.flags[2] = true;
  const changed = stepLegacyZAdChange(2, state);
  assert.equal(changed, true);
  assert.equal(state.dShort[3], 19);
}

// aD 10/13/14/15/16/18/19 (c() offsets 476..566, 745..1142), ported 2026-09-29.
{
  // 10: k[53] only on Q 16 and a new frame; never G.
  const s10 = baseState(); s10.Q = 16; s10.frameGenCounterZ = 1;
  assert.equal(stepLegacyFrameCommandChanged(10, 1, s10), false);
  assert.equal(s10.kBytes[53], 1);
  const s10b = baseState(); s10b.frameGenCounterZ = 1;
  stepLegacyFrameCommandChanged(10, 1, s10b);
  assert.equal(s10b.kBytes[53], 0, "Q != 16");

  // 13: d[62] = 82 + (q == 7 ? 21 : t248[q]), d[63] = ak.
  const s13 = baseState(); s13.packedOffsets[248] = 300; s13.packedBytes[302] = 5; s13.qByte = 2; s13.akByte = 9; s13.frameGenCounterZ = 1;
  assert.equal(stepLegacyFrameCommandChanged(13, 1, s13), true);
  assert.deepEqual([s13.dShort[62], s13.dShort[63], s13.kBytes[61]], [87, 9, 1]);
  const s13b = baseState(); s13b.qByte = 7;
  assert.equal(stepLegacyFrameCommandChanged(13, 1, s13b), false, "same frame: no G");
  assert.equal(s13b.dShort[62], 103);

  // 15: d[73] = 98 + m (it was missing from the switch).
  const s15 = baseState(); s15.mByte = 3; s15.frameGenCounterZ = 1;
  assert.equal(stepLegacyFrameCommandChanged(15, 1, s15), true);
  assert.deepEqual([s15.dShort[73], s15.kBytes[72]], [101, 1]);

  // 16: k[76] on a new frame.
  const s16 = baseState(); s16.frameGenCounterZ = 1;
  assert.equal(stepLegacyFrameCommandChanged(16, 1, s16), true);
  assert.equal(s16.kBytes[76], 1);

  // 18/19: highlight row Z of the t307[m]-row list.
  const s18 = baseState(); s18.packedOffsets[195] = 10; s18.packedBytes[10 + 60 + 18] = 40;
  s18.packedOffsets[307] = 500; s18.mByte = 2; s18.packedBytes[502] = 4; s18.Z = 2;
  assert.equal(stepLegacyFrameCommandChanged(18, 1, s18), false);
  assert.deepEqual([...s18.kBytes.slice(40, 45)], [0, 0, 1, 0, 0]);

  // 14: the map overview's edge flags; D() only when W/X moved; k[66], af = ag = 0.
  const s14 = baseState(); s14.W = 3; s14.X = 0; s14.mapWidth = 64; s14.mapHeight = 48; s14.af = 1; s14.ag = -1;
  let dCalls = 0;
  assert.equal(stepLegacyFrameCommandChanged(14, 1, s14, { onD: () => { dCalls += 1; } }), false);
  assert.deepEqual([s14.zAd14T, s14.zAd14U, s14.zAd14Q, s14.zAd14R], [true, true, true, true]);
  assert.deepEqual([s14.dShort[66], s14.dShort[71], s14.kBytes[66], s14.af, s14.ag, dCalls], [3, 0, 1, 0, 0, 1]);
  stepLegacyFrameCommandChanged(14, 1, s14, { onD: () => { dCalls += 1; } });
  assert.equal(dCalls, 1, "unchanged window: no D()");
}

// Dispatcher: aD===0, aD∈{1,2,5,9}, aD===6, aD∈{7,8}, and aD===12 are handled inline, not
// routed to any callback. aD===4 is the confirmed guaranteed-throw dead branch -- no callback
// exists for it at all.
{
  const state = baseState();
  let called = false;
  const noCallback = { onD: () => { called = true; } };
  stepLegacyFrameCommandChanged(0, 1, state, noCallback);
  stepLegacyFrameCommandChanged(1, 1, baseState(), noCallback);
  stepLegacyFrameCommandChanged(2, 1, baseState(), noCallback);
  stepLegacyFrameCommandChanged(12, 1, baseState(), noCallback);
  stepLegacyFrameCommandChanged(6, 1, baseState(), noCallback);
  stepLegacyFrameCommandChanged(7, 1, baseState(), noCallback);
  stepLegacyFrameCommandChanged(9, 1, baseState(), noCallback);
  assert.equal(called, false);
  assert.equal(stepLegacyFrameCommandChanged(4, 1, baseState()), false, "aD===4 is a documented no-op");
}

// aD===6 -> A(): selected item changed -> activates 5 consecutive kBytes slots.
{
  const state = baseState();
  state.as = 2;
  state.r[2] = 7;
  const changed = stepLegacyFrameCommandChanged(6, 1, state);
  assert.equal(changed, true);
  assert.equal(state.vInt, 7);
  assert.equal(state.dShort[36], 7);
  assert.equal(state.dShort[34], 7);
  for (const slot of [34, 35, 36, 37, 38]) assert.equal(state.kBytes[slot], 1, `slot ${slot}`);
}

// A(): no change and flags[command] false -> update block skipped, but dShort[34]/z-y check still run.
{
  const state = baseState();
  state.as = 0;
  state.r[0] = 5;
  state.dShort[36] = 5; // already cached, matches selected
  state.flags[6] = false;
  const changed = stepLegacyA(6, state);
  assert.equal(changed, false);
  assert.equal(state.kBytes[34], 0, "update block skipped");
  assert.equal(state.dShort[34], 5, "tail write still runs unconditionally");
}

// A(): no change but flags[command] true -> forced refresh, same as a real change.
{
  const state = baseState();
  state.as = 0;
  state.r[0] = 5;
  state.dShort[36] = 5;
  state.flags[6] = true;
  const changed = stepLegacyA(6, state);
  assert.equal(changed, true);
  assert.equal(state.kBytes[36], 1);
}

// A(): frameGenCounterZ !== frameGenCounterY -> also marks kBytes[38] and reports changed,
// independent of the selection-changed block.
{
  const state = baseState();
  state.as = 0;
  state.r[0] = 3;
  state.dShort[36] = 3; // no selection change
  state.flags[6] = false;
  state.frameGenCounterY = 1;
  state.frameGenCounterZ = 0;
  const changed = stepLegacyA(6, state);
  assert.equal(changed, true);
  assert.equal(state.kBytes[38], 1);
  assert.equal(state.kBytes[34], 0, "selection-changed block still skipped");
}

// aD===17 -> B()'s vByte===1 branch: table-indexed writes, both value formulas.
// BUG FIX (2026-09-03): B() has a shared tail (offsets 371..472, both branches fall
// through into it) that compares the just-written kBytes[tableIndex]/[tableIndex+1]
// against a zlDShorts cache and sets G (changed) on any mismatch -- this was missing
// entirely, so aD===17 could never report changed=true. Fresh state's cache starts at
// 0, so the very first call (value1=2 here) must report a real mismatch.
{
  const state = baseState();
  state.packedOffsets[195] = 10;
  state.packedBytes[10 + 60 + 17] = 50; // tableIndex = 50
  // Force the value1 "escape" branch (wByte===3) -> 2.
  state.wByte = 3;
  const changed = stepLegacyFrameCommandChanged(17, 1, state);
  assert.equal(changed, true, "fresh dShort cache (0) mismatches value1=2 -> G set true");
  assert.equal(state.kBytes[50], 1, "cache-mismatch branch re-marks kBytes[tableIndex] dirty (1), not the raw value1");
  assert.equal(state.dShort[50], 2, "cache updated to the just-written value1");
  assert.equal(state.kBytes[51], 0, "value2=0 matches the fresh dShort[51] cache (0) -> no mismatch");

  // Calling again with the SAME inputs: value1/value2 recompute to the same values,
  // now matching the cache -- no further change reported (dirty-rect style).
  const changedAgain = stepLegacyFrameCommandChanged(17, 1, state);
  assert.equal(changedAgain, false, "unchanged value1/value2 against an up-to-date cache reports no change");
  assert.equal(state.kBytes[50], 0);
}

// aD===17 tail: a real per-tick value1 flip (selection state changing some tick after
// the first) must be detected again, proving the tail isn't a one-shot -- this is the
// actual mechanism keeping ground truth Sec.8's selected-unit panel refreshing every
// tick a unit stays selected, instead of drawing for a single frame and going dark.
{
  const state = baseState();
  state.packedOffsets[195] = 10;
  state.packedBytes[10 + 60 + 17] = 50;
  state.wByte = 3; // value1=2
  stepLegacyFrameCommandChanged(17, 1, state); // seeds the cache, changed=true
  // Flip to inputs that make value1 the plain "1" case (w 1, no pending
  // build choice: q = 0).
  state.wByte = 1;
  state.qCounter = 0;
  const changed = stepLegacyFrameCommandChanged(17, 1, state);
  assert.equal(changed, true, "value1 flipping from 2 to 1 must re-trigger G");
  assert.equal(state.dShort[50], 1);
}

// B(): value1/value2 formula checks. Read back via `dShort[tableIndex(+1)]` rather than
// `kBytes[...]` -- now that the shared tail (see above) always runs after these writes,
// `kBytes[tableIndex]` ends up holding a 0/1 dirty flag (cache-mismatch marker), while
// `dShort[tableIndex]` is the tail's cache slot, which the mismatch branch sets to the
// raw just-written value1/value2, and the match branch leaves untouched at the value it
// already equals -- either way it reflects the real computed value1/value2.

// B(): value1 (offsets 34..125, corrected 2026-09-28) -- 2 for a pending
// valid build choice (q > 0, e[8749+q] == 0, 0 <= r[as] <= 5), else 0 for
// w 4/2 and 1 otherwise.
{
  const run = (w, q, e8749, pick) => {
    const state = baseState();
    state.packedOffsets[195] = 10;
    state.packedBytes[10 + 60 + 17] = 20;
    state.wByte = w; state.zlYInt = 0; state.qCounter = q;
    state.dense[8749 + 1] = e8749; state.r[0] = pick; state.as = 0;
    stepLegacyMenuIconState(17, 1, state);
    return state.dShort[20];
  };
  assert.equal(run(1, 1, 0, 3), 2);
  assert.equal(run(4, 1, 0, 3), 2);
  assert.equal(run(4, 0, 0, 3), 0);
  assert.equal(run(1, 0, 0, 3), 1);
  assert.equal(run(1, 1, 5, 3), 1);
  assert.equal(run(1, 1, 0, 6), 1);
}

// B(): value2 -- kFlag takes priority -> 2.
{
  const state = baseState();
  state.packedOffsets[195] = 10;
  state.packedBytes[10 + 60 + 17] = 20;
  state.kFlag = true;
  stepLegacyMenuIconState(17, 1, state);
  assert.equal(state.dShort[21], 2);
}

// B(): value2 -- wByte===1 -> 0.
{
  const state = baseState();
  state.packedOffsets[195] = 10;
  state.packedBytes[10 + 60 + 17] = 20;
  state.wByte = 1;
  stepLegacyMenuIconState(17, 1, state);
  assert.equal(state.dShort[21], 0);
}

// B(): value2 -- FByte !== -1 -> 0.
{
  const state = baseState();
  state.packedOffsets[195] = 10;
  state.packedBytes[10 + 60 + 17] = 20;
  state.wByte = 0;
  state.FByte = 5;
  stepLegacyMenuIconState(17, 1, state);
  assert.equal(state.dShort[21], 0);
}

// B(): value2 -- adByte 1 or 9 -> 1.
{
  const state = baseState();
  state.packedOffsets[195] = 10;
  state.packedBytes[10 + 60 + 17] = 20;
  state.wByte = 0;
  state.FByte = -1;
  state.adByte = 9;
  stepLegacyMenuIconState(17, 1, state);
  assert.equal(state.dShort[21], 1);
}

// B(): value2 -- none of the above -> 0.
{
  const state = baseState();
  state.packedOffsets[195] = 10;
  state.packedBytes[10 + 60 + 17] = 20;
  state.wByte = 0;
  state.FByte = -1;
  state.adByte = 3;
  stepLegacyMenuIconState(17, 1, state);
  assert.equal(state.dShort[21], 0);
}

// B(): vByte!==1 (offsets 206..370, ported 2026-09-28) -- menu soft-key
// icons: 2/3 on Q 32, otherwise t153[116+Q] / t153[145+Q]. Checked through
// the change cache (dShort), since the tail rewrites kBytes to 0/1.
{
  const state = baseState();
  state.packedOffsets[195] = 10;
  state.packedBytes[10 + 60 + 17] = 20;
  state.Q = 32;
  stepLegacyMenuIconState(17, 0, state);
  assert.deepEqual([state.dShort[20], state.dShort[21]], [2, 3]);
  const menu = baseState();
  menu.packedOffsets[195] = 10;
  menu.packedBytes[10 + 60 + 17] = 20;
  menu.packedOffsets[153] = 300;
  menu.Q = 2;
  menu.packedBytes[300 + 116 + 2] = 1;
  menu.packedBytes[300 + 145 + 2] = 4;
  stepLegacyMenuIconState(17, 0, menu);
  assert.deepEqual([menu.dShort[20], menu.dShort[21]], [1, 4]);
}

// aD∈{7,8} -> c()'s inline logic: selected < 10 -> single dShort[46] write, G=true, but
// the table-driven writes only run past the ">=10" guard, so the base write is the only effect.
{
  const state = baseState();
  state.as = 0;
  state.r[0] = 3; // selected < 10
  state.packedOffsets[195] = 10;
  state.packedOffsets[138] = 200;
  state.packedBytes[10 + 60 + 8] = 50; // baseIndex for the table-driven writes
  state.packedBytes[200 + 338 + 3 + 12] = 15; // footprint table value 1
  state.packedBytes[200 + 364 + 3 + 12] = 5;  // footprint table value 2
  const changed = stepLegacyFrameCommandChanged(8, 1, state);
  assert.equal(changed, true);
  assert.equal(state.dShort[46], 3);
  assert.equal(state.dShort[50], 3, "d[a[t195+60+aD]] write (offsets 319..354)");
  assert.equal(state.dShort[51], 15, "baseIndex+1");
  assert.equal(state.dShort[52], 5, "baseIndex+2");
}

// aD∈{7,8}: selected >= 10 -> early return true right after the dShort[46] write,
// no table-driven writes.
{
  const state = baseState();
  state.as = 0;
  state.r[0] = 12;
  const changed = stepLegacyAd7Or8(7, state);
  assert.equal(changed, true);
  assert.equal(state.dShort[46], 12);
  assert.equal(state.dShort[10 + 60 + 7], 0, "table-driven write never ran");
}

// aD∈{7,8}: no change and flags[command] false -> early return false, no writes at all.
{
  const state = baseState();
  state.as = 0;
  state.r[0] = 4;
  state.dShort[46] = 4; // already cached
  state.flags[8] = false;
  const changed = stepLegacyAd7Or8(8, state);
  assert.equal(changed, false);
  assert.equal(state.dShort[46], 4);
}

// aD∈{7,8}: no change but flags[command] true -> forced refresh.
{
  const state = baseState();
  state.as = 0;
  state.r[0] = 4;
  state.dShort[46] = 4;
  state.flags[8] = true;
  const changed = stepLegacyAd7Or8(8, state);
  assert.equal(changed, true);
}

// aD===12 -> c()'s second, unrelated inline block (offsets 567..744): the Q=17
// "ARMOURY" text-record bug's actual root cause -- d[57] is the index Q=17's dialog
// speaker-name row reads via aE, and this block was previously completely unported
// (a bare callback stub), so d[57] stayed 0 forever.
//
// Base case: a[0][17] !== am -> d[57] = 108 + e[6868+am]; d[58] = e[2727+am] always;
// z===y (both default 0) -> no change reported, kBytes[56] untouched.
{
  const state = baseState();
  state.am = 5;
  state.aShortStats[0][17] = 999; // !== am
  state.dense[6868 + 5] = 7;
  state.dense[2727 + 5] = 42;
  const changed = stepLegacyAd12(state);
  assert.equal(changed, false, "z===y -> no change reported");
  assert.equal(state.am, 5, "am<51 -> no clamp");
  assert.equal(state.dShort[57], 115, "108 + e[6868+am]");
  assert.equal(state.dShort[58], 42, "e[2727+am], written unconditionally");
  assert.equal(state.kBytes[56], 0);
}

// aD===12: a[0][17] === am -> d[57] = 104 instead of the e[6868+am] lookup.
{
  const state = baseState();
  state.am = 8;
  state.aShortStats[0][17] = 8; // === am
  const changed = stepLegacyAd12(state);
  assert.equal(changed, false);
  assert.equal(state.dShort[57], 104);
}

// aD===12: am clamp -- `if (am>=51 && q<=2) am=51` re-pins an already->=51 am down to
// exactly 51; the clamped am then feeds the d[57]/d[58] lookups below it.
{
  const state = baseState();
  state.am = 60;
  state.qByte = 1; // <= 2
  state.aShortStats[0][17] = 51; // matches the CLAMPED am, not the original 60
  const changed = stepLegacyAd12(state);
  assert.equal(changed, false);
  assert.equal(state.am, 51, "clamped to 51");
  assert.equal(state.dShort[57], 104, "lookup uses the clamped am");
}

// aD===12: am clamp guard fails when qByte > 2 -> am left untouched even though >= 51.
{
  const state = baseState();
  state.am = 60;
  state.qByte = 3; // > 2, guard fails
  const changed = stepLegacyAd12(state);
  assert.equal(changed, false);
  assert.equal(state.am, 60, "not clamped");
}

// aD===12: Q===17 && al===3 && ai∈{35,50,54} -> d[57] forced to 105, overriding
// whatever the a[0][17]/am lookup computed. This is the al===3 "page-turn-in-progress"
// state, distinct from the al===2 "settled dialog" state this project's live browser
// checks normally run in, so it does not fire in the recipe's standard capture.
{
  const state = baseState();
  state.am = 5;
  state.aShortStats[0][17] = 999; // would otherwise take the 108+e[...] branch
  state.Q = 17;
  state.al = 3;
  state.ai = 50;
  const changed = stepLegacyAd12(state);
  assert.equal(changed, false);
  assert.equal(state.dShort[57], 105, "override wins over the base lookup");
}

// aD===12: override does NOT fire when ai is outside {35,50,54}, even with Q===17 && al===3.
{
  const state = baseState();
  state.am = 5;
  state.aShortStats[0][17] = 5; // === am -> base lookup would give 104
  state.Q = 17;
  state.al = 3;
  state.ai = 40; // not in {35,50,54}
  const changed = stepLegacyAd12(state);
  assert.equal(changed, false);
  assert.equal(state.dShort[57], 104, "base lookup wins, override guard not satisfied");
}

// aD===12: frameGenCounterZ !== frameGenCounterY -> kBytes[56]=1 and reports changed.
{
  const state = baseState();
  state.frameGenCounterY = 1;
  state.frameGenCounterZ = 0;
  const changed = stepLegacyAd12(state);
  assert.equal(changed, true);
  assert.equal(state.kBytes[56], 1);
}

// Dispatcher: aD===12 routes to stepLegacyAd12, not a callback (confirms the wiring the
// Q=17 "ARMOURY" fix depends on -- see the dispatcher tests above for the no-callback check).
{
  const state = baseState();
  state.am = 5;
  state.aShortStats[0][17] = 999;
  state.dense[6868 + 5] = 7;
  const changed = stepLegacyFrameCommandChanged(12, 1, state);
  assert.equal(changed, false);
  assert.equal(state.dShort[57], 115);
}

// aD∈{1,9} -> x(): kBytes[47]=ayByte; kBytes[48]/[49] from FByte-match or aByteRows[2+i][0]>0.
{
  const state = baseState();
  state.ayByte = 7;
  state.FByte = 2; // matches i=0 -> kBytes[48]=2
  state.aByteRows[3][0] = 5; // i=1: FByte(2) !== 3, aByteRows[3][0]>0 -> kBytes[49]=1
  const changed = stepLegacyX(state);
  assert.equal(state.kBytes[47], 7);
  assert.equal(state.kBytes[48], 2);
  assert.equal(state.kBytes[49], 1);
  assert.equal(typeof changed, "boolean");
}

// x(): neither FByte match nor aByteRows[2+i][0]>0 -> kBytes[48+i]=0.
{
  const state = baseState();
  state.FByte = -1;
  state.aByteRows[2][0] = 0;
  state.aByteRows[3][0] = 0;
  stepLegacyX(state);
  assert.equal(state.kBytes[48], 0);
  assert.equal(state.kBytes[49], 0);
}

// x(): kBytes[50]/[51] derived from uBytes[0] (mainArrays.uBytes, the SAME array
// stepLegacyByteActionQueue already uses -- not a new field).
{
  const state = baseState();
  state.uBytes[0] = 3;
  state.packedOffsets[304] = 100;
  state.packedBytes[103] = 42; // packedBytes[packedOffsets[304] + uBytes[0]]
  stepLegacyX(state);
  assert.equal(state.kBytes[50], 44); // 41 + 3
  assert.equal(state.kBytes[51], 42);
}

// x(): final compare/sync loop uses the literal index 9 (not the command parameter),
// skips kBytes[i]===-1 slots, zeroes matched slots, syncs+marks changed on mismatch.
{
  const state = baseState();
  state.packedOffsets[195] = 10;
  state.packedBytes[10 + 60 + 9] = 70; // base = 70, loop covers 70..74
  state.kBytes[70] = -1; // skip
  state.dShort[71] = 5;
  state.kBytes[71] = 5; // matches -> zeroed
  state.dShort[72] = 1;
  state.kBytes[72] = 9; // mismatch -> synced, changed
  const changed = stepLegacyX(state);
  assert.equal(state.kBytes[70], -1, "skipped slot untouched");
  assert.equal(state.kBytes[71], 0, "matched slot zeroed");
  assert.equal(state.dShort[72], 9, "mismatched slot synced");
  assert.equal(state.kBytes[72], 1, "mismatched slot marked changed");
  assert.equal(changed, true);
}

// Dispatcher: aD===1 and aD===9 both route to the exact same stepLegacyX logic.
{
  const s1 = baseState();
  s1.ayByte = 3;
  const s9 = baseState();
  s9.ayByte = 3;
  stepLegacyFrameCommandChanged(1, 1, s1);
  stepLegacyFrameCommandChanged(9, 1, s9);
  assert.equal(s1.kBytes[47], s9.kBytes[47]);
}

console.log("verify-frame-command-changed: all assertions passed");
