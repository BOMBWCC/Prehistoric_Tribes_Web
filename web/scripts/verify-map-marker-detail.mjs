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
  vm.runInNewContext(output, { module, exports: module.exports, Int8Array, Int16Array, Math });
  return module.exports;
}

const { stepLegacyMapMarkerDetail } = loadModule(path.join(srcDir, "LegacyMapMarkerDetail.ts"));

function packFlags3(P, pipIndex, local8) {
  return ((P & 3) << 6) | ((pipIndex & 7) << 3) | (local8 & 7);
}

function baseState(overrides = {}) {
  const byteTables = Array.from({ length: 4 }, () => new Int8Array(200));
  const shortTables = Array.from({ length: 3 }, () => new Int16Array(200));
  return {
    phase: 0,
    N: 0,
    O: 1,
    qByte: 0,
    vByte: 1, // !==0 by default so the local8===5 branch's local13 write is opt-in per test
    ai: 0,
    originRow: 0,
    dense: new Int8Array(20000),
    packedBytes: new Int8Array(2000),
    packedOffsets: new Int16Array(400),
    shortTables,
    byteTables,
    entityMarkerG: new Int8Array(11),
    entityMarkerH: new Int8Array(11),
    entityMarkerI: new Int8Array(11),
    statScratch: [new Int16Array(26), new Int16Array(26)],
    ...overrides,
  };
}

// Test 1: local8===0, arg2===2, P===local7 -> direct composite draw.
// (P only decodes 2 bits from flags3, so valid P values are 0..3.)
{
  const state = baseState();
  state.byteTables[3][0] = packFlags3(1, 0, 0);
  state.shortTables[1][0] = 42; // record base (&4095)
  state.byteTables[1][0] = 3; // x offset
  state.byteTables[2][0] = 4; // y offset
  const calls = [];
  stepLegacyMapMarkerDetail(0, 1, 0, 100, 200, 2, state, {
    onComposite: (...a) => calls.push(a),
  });
  assert.deepEqual(calls, [[42, 103, 204]]);
}

// Test 2: local8===0 but arg2!==2 -> no composite, and local8===0 doesn't
// match the default section's {3,5,7} gate either, so nothing fires at all.
{
  const state = baseState();
  state.byteTables[3][0] = packFlags3(1, 0, 0);
  const calls = [];
  stepLegacyMapMarkerDetail(0, 5, 0, 100, 200, 1, state, {
    onComposite: (...a) => calls.push(a),
    onEntityAction: (...a) => calls.push(a),
  });
  assert.deepEqual(calls, []);
}

// Test 3: local8===1, P<=local7, local4===6, U<5, statValue>0 -> composite
// with a computed V; also confirms the a[0][5]-counted-twice formula.
// NOTE: with U===0 (the first call), `packedBytes[packedOffsets[142]]`
// (statBase) and `packedBytes[packedOffsets[142]+U]` (the index used to
// look up the STAT VALUE afterward) read the SAME cell -- a real bytecode
// aliasing, not a test artifact -- so this fixture picks a single value
// (5) that plays both roles, and the stat value ends up being a[0][5]'s
// ORIGINAL input (untouched by the a[0][0] write that just happened).
{
  const state = baseState();
  state.byteTables[3][0] = packFlags3(0, 0, 1);
  state.shortTables[1][0] = 10;
  state.packedOffsets[142] = 50;
  state.packedBytes[50] = 5; // statBase, AND (since U===0) the idx lookup too
  state.statScratch[0][5] = 3;
  state.statScratch[0][8] = 1;
  state.statScratch[0][9] = 2;
  state.statScratch[0][10] = 4;
  // Offsets 224..291 (corrected 2026-10-09): t142[0] is the INDEX, so
  // a[0][5] = 2*3 + 1 + 2 + 4 = 13 and a[0][0] is untouched.
  const calls = [];
  stepLegacyMapMarkerDetail(10, 99, 6, 0, 0, 1, state, {
    onComposite: (...a) => calls.push(a),
  });
  assert.equal(state.statScratch[0][5], 13);
  assert.equal(state.statScratch[0][0], 0);
  // idx = t142[0 + U] = 5 -> statValue = the 13 just written -> V = trunc(13 / 7) = 1.
  assert.deepEqual(calls, [[10 + 1, 0, 0]]);
}

// Test 4: same local4===6 path, but the looked-up stat value is <=0 and
// local3<31 -> no composite draw at all (still consumes a U slot).
{
  const state = baseState();
  state.byteTables[3][0] = packFlags3(0, 0, 1);
  state.packedOffsets[142] = 50;
  state.packedBytes[50] = 0;
  state.statScratch[0][5] = 0;
  state.statScratch[0][8] = 0;
  state.statScratch[0][9] = 0;
  state.statScratch[0][10] = 0;
  state.packedBytes[50 + 0] = 0;
  const calls = [];
  stepLegacyMapMarkerDetail(5, 99, 6, 0, 0, 1, state, {
    onComposite: (...a) => calls.push(a),
  });
  assert.deepEqual(calls, []);
}

// Test 5: local8===1, local4===4, local3>=31 -> composite record+2 directly.
{
  const state = baseState();
  state.byteTables[3][0] = packFlags3(0, 0, 1);
  state.shortTables[1][0] = 7;
  const calls = [];
  stepLegacyMapMarkerDetail(31, 99, 4, 0, 0, 1, state, {
    onComposite: (...a) => calls.push(a),
  });
  assert.deepEqual(calls, [[7 + 2, 0, 0]]);
}

// Test 6: local4===4, local3<31, stat0>=5 -> composite with the (>35 ? 2 :
// (stat0-5)/15) formula, both sub-cases.
{
  const state = baseState();
  state.byteTables[3][0] = packFlags3(0, 0, 1);
  state.shortTables[1][0] = 7;
  state.statScratch[0][0] = 50; // >35 -> V=2
  const calls = [];
  stepLegacyMapMarkerDetail(10, 99, 4, 0, 0, 1, state, {
    onComposite: (...a) => calls.push(a),
  });
  assert.deepEqual(calls, [[7 + 2, 0, 0]]);
}
{
  const state = baseState();
  state.byteTables[3][0] = packFlags3(0, 0, 1);
  state.shortTables[1][0] = 7;
  state.statScratch[0][0] = 20; // <=35 -> V=trunc((20-5)/15)=1
  const calls = [];
  stepLegacyMapMarkerDetail(10, 99, 4, 0, 0, 1, state, {
    onComposite: (...a) => calls.push(a),
  });
  assert.deepEqual(calls, [[7 + 1, 0, 0]]);
}

// Test 7: local4===4, local3<31, stat0<5 -> no draw at all.
{
  const state = baseState();
  state.byteTables[3][0] = packFlags3(0, 0, 1);
  state.statScratch[0][0] = 3;
  const calls = [];
  stepLegacyMapMarkerDetail(10, 99, 4, 0, 0, 1, state, {
    onComposite: (...a) => calls.push(a),
  });
  assert.deepEqual(calls, []);
}

// Test 8: local8===1, local4 not 4 or 6 -> plain composite, no U change.
{
  const state = baseState();
  state.byteTables[3][0] = packFlags3(0, 0, 1);
  state.shortTables[1][0] = 9;
  const calls = [];
  stepLegacyMapMarkerDetail(0, 99, 2, 0, 0, 1, state, {
    onComposite: (...a) => calls.push(a),
  });
  assert.deepEqual(calls, [[9, 0, 0]]);
}

// Test 9: local8===1, P>local7 -> no draw.
{
  const state = baseState();
  state.byteTables[3][0] = packFlags3(3, 0, 1);
  const calls = [];
  stepLegacyMapMarkerDetail(0, 1, 2, 0, 0, 1, state, {
    onComposite: (...a) => calls.push(a),
  });
  assert.deepEqual(calls, []);
}

// Test 10: local8===6, pipIndex===1, local3<31 -> sprite draw, no +1.
{
  const state = baseState();
  state.byteTables[3][0] = packFlags3(0, 1, 6);
  state.shortTables[1][0] = 5;
  const calls = [];
  stepLegacyMapMarkerDetail(10, 99, 0, 0, 0, 1, state, {
    onSpriteDraw: (...a) => calls.push(a),
  });
  assert.equal(calls.length, 1);
  assert.equal(calls[0][0], 5); // no +1 since local3<31
}

// Test 11: local8===6, pipIndex===1, local3>=31 -> sprite draw with record+1.
{
  const state = baseState();
  state.byteTables[3][0] = packFlags3(0, 1, 6);
  state.shortTables[1][0] = 5;
  const calls = [];
  stepLegacyMapMarkerDetail(31, 99, 0, 0, 0, 1, state, {
    onSpriteDraw: (...a) => calls.push(a),
  });
  assert.equal(calls[0][0], 6);
}

// Test 12: local8===6, pipIndex===2, dense[8627+local3]===1 -> draws.
{
  const state = baseState();
  state.byteTables[3][0] = packFlags3(0, 2, 6);
  state.dense[8627 + 4] = 1;
  const calls = [];
  stepLegacyMapMarkerDetail(4, 99, 0, 0, 0, 1, state, {
    onSpriteDraw: (...a) => calls.push(a),
  });
  assert.equal(calls.length, 1);
}

// Test 13: local8===6, pipIndex===2, dense[8627+local3] not in {1,2} -> no draw.
{
  const state = baseState();
  state.byteTables[3][0] = packFlags3(0, 2, 6);
  state.dense[8627 + 4] = 9;
  const calls = [];
  stepLegacyMapMarkerDetail(4, 99, 0, 0, 0, 1, state, {
    onSpriteDraw: (...a) => calls.push(a),
  });
  assert.deepEqual(calls, []);
}

// Test 14: local8===6, pipIndex===0 (neither 1 nor 2) -> draws via the
// "else if pipIndex!==2" fallback.
{
  const state = baseState();
  state.byteTables[3][0] = packFlags3(0, 0, 6);
  const calls = [];
  stepLegacyMapMarkerDetail(4, 99, 0, 0, 0, 1, state, {
    onSpriteDraw: (...a) => calls.push(a),
  });
  assert.equal(calls.length, 1);
}

// Test 14b: local10 is carried across records -- f:I=50, K=3, ai=2: record 0 (N=0) gets
// (50+3+2+0)%120 = 55, record 1 (N=1) gets (55+3+2+2)%120 = 62, and a following local8===2 record
// draws with that 62, not 0.
{
  const state = baseState({ phase: 50, originRow: 3, ai: 2, O: 3 });
  state.byteTables[3][0] = packFlags3(0, 1, 6);
  state.byteTables[3][1] = packFlags3(0, 1, 6);
  state.byteTables[3][2] = packFlags3(0, 0, 2);
  const calls = [];
  stepLegacyMapMarkerDetail(4, 99, 0, 0, 0, 1, state, {
    onSpriteDraw: (...a) => calls.push(a[3]),
  });
  assert.deepEqual(calls, [55, 62, 62]);
}

// Test 14c: X:B -- offset 94 stores g[pipIndex] per record, offset 1596 clears it on the way out.
{
  const state = baseState({ O: 2 });
  state.byteTables[3][0] = packFlags3(0, 1, 0);
  state.byteTables[3][1] = packFlags3(0, 2, 0);
  state.entityMarkerG[1] = 7;
  state.entityMarkerG[2] = 9;
  const xs = [];
  stepLegacyMapMarkerDetail(4, 99, 0, 0, 0, 1, state, { onX: (x) => xs.push(x) });
  assert.deepEqual(xs, [7, 9, 0]);
}

// Test 15: qByte/local3/pipIndex shortcut (local8===4) with recordShort===116
// -> draws with local10=0.
{
  const state = baseState({ qByte: 3 });
  state.byteTables[3][0] = packFlags3(0, 0, 4);
  state.shortTables[1][0] = 116;
  const calls = [];
  stepLegacyMapMarkerDetail(31, 99, 0, 0, 0, 1, state, {
    onSpriteDraw: (...a) => calls.push(a),
  });
  assert.deepEqual(calls, [[116, 0, 0, 0]]);
}

// Test 16: same shortcut gate, but recordShort!==116 -> no draw at all, even
// though local8===4 (the bytecode's own "goto 1162 with local12 still 0" path).
{
  const state = baseState({ qByte: 3 });
  state.byteTables[3][0] = packFlags3(0, 0, 4);
  state.shortTables[1][0] = 5; // != 116
  const calls = [];
  stepLegacyMapMarkerDetail(31, 99, 0, 0, 0, 1, state, {
    onSpriteDraw: (...a) => calls.push(a),
  });
  assert.deepEqual(calls, []);
}

// Test 17: local8===2, marker in (0,50) -> no draw.
{
  const state = baseState();
  state.byteTables[3][0] = packFlags3(0, 0, 2);
  state.entityMarkerG[0] = 7; // X
  state.dense[1313 + 7] = 25;
  const calls = [];
  stepLegacyMapMarkerDetail(0, 99, 0, 0, 0, 1, state, {
    onSpriteDraw: (...a) => calls.push(a),
  });
  assert.deepEqual(calls, []);
}

// Test 18: local8===2, marker<=0 -> draws, no entityMarkerI write.
{
  const state = baseState();
  state.byteTables[3][0] = packFlags3(0, 0, 2);
  state.entityMarkerG[0] = 7;
  state.dense[1313 + 7] = 0;
  const calls = [];
  stepLegacyMapMarkerDetail(0, 99, 0, 0, 0, 1, state, {
    onSpriteDraw: (...a) => calls.push(a),
  });
  assert.equal(calls.length, 1);
  assert.equal(state.entityMarkerI[0], 0);
}

// Test 19: local8===2, marker===51 -> draws AND writes entityMarkerI.
{
  const state = baseState();
  state.byteTables[3][0] = packFlags3(0, 0, 2);
  state.entityMarkerG[0] = 7;
  state.dense[1313 + 7] = 51;
  const calls = [];
  stepLegacyMapMarkerDetail(0, 99, 0, 0, 0, 1, state, {
    onSpriteDraw: (...a) => calls.push(a),
  });
  assert.equal(calls.length, 1);
  assert.equal(state.entityMarkerI[0], 1);
}

// Test 20: local8===4 normal path, entityMarkerI already set -> no draw.
{
  const state = baseState();
  state.byteTables[3][0] = packFlags3(0, 0, 4);
  state.entityMarkerI[0] = 1;
  const calls = [];
  stepLegacyMapMarkerDetail(0, 99, 0, 0, 0, 1, state, {
    onSpriteDraw: (...a) => calls.push(a),
  });
  assert.deepEqual(calls, []);
}

// Test 21: local8===4 normal path, valid marker -> draws with the
// N+marker-1-offset record and dense[3030+X] as phase; sets entityMarkerI;
// the dense[8749]===2 && marker===2 extra record-90 draw.
{
  const state = baseState({ N: 3 });
  state.byteTables[3][3] = packFlags3(0, 0, 4);
  state.entityMarkerG[0] = 7; // X
  state.dense[1313 + 7] = 2; // marker
  state.shortTables[1][3 + 2 - 1] = 55; // b[1][N+marker-1]
  state.dense[3030 + 7] = 42; // phase-ish local10
  state.dense[8749 + 0] = 2; // local3=0
  state.byteTables[1][3] = 1;
  state.byteTables[2][3] = 2;
  const calls = [];
  stepLegacyMapMarkerDetail(0, 99, 0, 0, 0, 1, state, {
    onSpriteDraw: (...a) => calls.push(a),
  });
  assert.equal(state.entityMarkerI[0], 1);
  assert.deepEqual(calls, [
    [90, 0 + 1, 0 + 2, 0], // extra record-90 draw first (fires before the shared draw)
    [55, 0 + 1, 0 + 2, 42], // shared draw with the offset record + local10
  ]);
}

// Test 22: default section, local8===7, dense[1313+X]===50 -> onEntityAction.
{
  const state = baseState();
  state.byteTables[3][0] = packFlags3(0, 0, 7);
  state.entityMarkerG[0] = 7;
  state.dense[1313 + 7] = 50;
  const calls = [];
  stepLegacyMapMarkerDetail(0, 99, 0, 0, 0, 1, state, {
    onEntityAction: (...a) => calls.push(a),
  });
  assert.deepEqual(calls, [[7, 0, 0, 0, 29]]);
  assert.equal(state.entityMarkerH[0], 1);
}

// Test 23: default section, local8===3, valid marker -> onEntityAction with
// the computeMarkerDetailRecord lookup as local13.
{
  const state = baseState();
  state.byteTables[3][0] = packFlags3(0, 0, 3);
  state.entityMarkerG[0] = 7;
  state.dense[1313 + 7] = 5; // marker
  state.packedOffsets[139] = 20;
  state.packedOffsets[140] = 30;
  state.packedBytes[30 + 0] = 4; // rowOffset for variant=0
  state.packedBytes[20 + 4 + 0] = 8; // packedBytes[base+rowOffset+pipIndex]
  const calls = [];
  stepLegacyMapMarkerDetail(0, 99, 0, 0, 0, 1, state, {
    onEntityAction: (...a) => calls.push(a),
  });
  assert.deepEqual(calls, [[7, 0, 0, 8, 29]]);
}

// Test 24: default section, local8===5, marker<=0, both x:Z-trigger sub-paths.
{
  const state = baseState({ vByte: 0 });
  state.byteTables[3][0] = packFlags3(0, 0, 5);
  state.entityMarkerG[0] = 7;
  state.dense[1313 + 7] = 0; // marker<=0
  state.dense[3535 + 7] = 1; // d3535!==0 -> reaches the x:Z check directly
  state.dense[606 + 7] = 33;
  const xFlagCalls = [];
  const calls = [];
  stepLegacyMapMarkerDetail(0, 99, 5, 0, 0, 1, state, {
    onEntityAction: (...a) => calls.push(a),
    onXFlag: () => xFlagCalls.push(1),
  });
  assert.equal(xFlagCalls.length, 1); // local4=5, not 10/11 -> onXFlag fires
  assert.deepEqual(calls, [[7, 0, 0, 33, 29]]); // vByte===0 -> local13=dense[606+X]
}

// Test 25: default section gate -- entityMarkerH already set -> no-op.
{
  const state = baseState();
  state.byteTables[3][0] = packFlags3(0, 0, 7);
  state.entityMarkerG[0] = 7;
  state.entityMarkerH[0] = 1;
  state.dense[1313 + 7] = 50;
  const calls = [];
  stepLegacyMapMarkerDetail(0, 99, 0, 0, 0, 1, state, {
    onEntityAction: (...a) => calls.push(a),
  });
  assert.deepEqual(calls, []);
}

// Test 26: default section gate -- local3>=31 AND (dense[9176+local3]&3)<2
// -> no-op (the exact condition this port's own re-verification caught
// inverted in an earlier draft).
{
  const state = baseState();
  state.byteTables[3][0] = packFlags3(0, 0, 7);
  state.entityMarkerG[0] = 7;
  state.dense[1313 + 7] = 50;
  state.dense[9176 + 40] = 0; // &3 = 0, <2
  const calls = [];
  stepLegacyMapMarkerDetail(40, 99, 0, 0, 0, 1, state, {
    onEntityAction: (...a) => calls.push(a),
  });
  assert.deepEqual(calls, []);
}
// Same gate, but local3>=31 AND (dense&3)>=2 -> DOES continue.
{
  const state = baseState();
  state.byteTables[3][0] = packFlags3(0, 0, 7);
  state.entityMarkerG[0] = 7;
  state.dense[1313 + 7] = 50;
  state.dense[9176 + 40] = 3; // &3 = 3, >=2
  const calls = [];
  stepLegacyMapMarkerDetail(40, 99, 0, 0, 0, 1, state, {
    onEntityAction: (...a) => calls.push(a),
  });
  assert.equal(calls.length, 1);
}

// Test 27: N increments once per record across multiple iterations.
{
  const state = baseState({ O: 3, N: 0 });
  state.byteTables[3][0] = packFlags3(0, 0, 0); // no match -> falls through, no draw
  state.byteTables[3][1] = packFlags3(0, 0, 0);
  state.byteTables[3][2] = packFlags3(1, 0, 0);
  state.shortTables[1][2] = 77;
  const calls = [];
  stepLegacyMapMarkerDetail(0, 1, 0, 0, 0, 2, state, {
    onComposite: (...a) => calls.push(a),
  });
  // Only the 3rd record (N=2) matches arg2===2 && P===local7===1.
  assert.deepEqual(calls, [[77, 0, 0]]);
}

// Test 28: an exception from a callback doesn't propagate out of the
// function -- matches the bytecode's own try/catch-all wrapping the WHOLE
// per-record loop (offsets 17..1590), which also means a thrown exception
// aborts the rest of the loop too, not just that one record.
{
  const state = baseState({ O: 2, N: 0 });
  state.byteTables[3][0] = packFlags3(1, 0, 0);
  state.byteTables[3][1] = packFlags3(1, 0, 0);
  state.shortTables[1][1] = 9;
  let err = null;
  const calls = [];
  try {
    stepLegacyMapMarkerDetail(0, 1, 0, 0, 0, 2, state, {
      onComposite: (record) => {
        if (calls.length === 0) throw new Error("boom");
        calls.push(record);
      },
    });
  } catch (e) {
    err = e;
  }
  assert.equal(err, null);
}

console.log("f.a(IBBIIB) map-marker detail draw OK");
