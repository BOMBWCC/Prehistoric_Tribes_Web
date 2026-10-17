import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";
import path from "node:path";
import { denseRequire } from "./dense-layout-require.mjs";

const srcDir = new URL("../src/", import.meta.url).pathname;

function loadModule(file) {
  const module = { exports: {} };
  const output = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(output, { require: denseRequire, module, exports: module.exports, Int8Array, Int16Array, Math });
  return module.exports;
}

const { stepLegacyEntityAction } = loadModule(path.join(srcDir, "render/LegacyEntityAction.ts"));

// Test 0 (the real behavior): f.b:[S] (#245) is confirmed always null in
// the original game (zero putfield/putstatic sites anywhere in the whole
// class -- see LegacyEntityAction.ts's own docblock). This means the
// method's very first line always throws, caught by its own try/catch,
// so calling it with bShort=null (the live wiring's actual value) must
// be a complete, silent no-op: no state field changes, neither callback
// fires, nothing thrown out.
{
  const state = {
    aq: 5, ar: 10, as: 20, at: 3, Y: 1,
    av: -1, au: -1, aw: -1, // sentinels: must stay untouched
    xFlag: true, // must also stay untouched
    dense: new Int8Array(20000),
    bShort: null, // the confirmed real value
    packedBytes: new Int8Array(2000),
    packedOffsets: new Int16Array(200),
    shortTables: Array.from({ length: 5 }, () => new Int16Array(200)),
    byteTables: Array.from({ length: 9 }, () => new Int8Array(200)),
    aQ: 0,
    vByte: 1, // even with vByte!==0, onQ must never fire -- p() is never reached either
  };
  const calls = [];
  let err = null;
  try {
    stepLegacyEntityAction(state, { onP: () => calls.push("p"), onQ: () => calls.push("q") });
  } catch (e) {
    err = e;
  }
  assert.equal(err, null);
  assert.deepEqual(calls, []);
  assert.equal(state.av, -1);
  assert.equal(state.au, -1);
  assert.equal(state.aw, -1);
  assert.equal(state.ar, 10);
  assert.equal(state.as, 20);
  assert.equal(state.at, 3);
  assert.equal(state.xFlag, true);
}

// The remaining tests exercise the logic that WOULD run if b:[S] were
// ever populated -- preserved as a faithful translation of the bytecode
// (see the file's own docblock for why), not because this path is
// reachable in the real game. `baseState()` therefore supplies a real
// bShort array so these can still verify that logic independently.
function baseState(overrides = {}) {
  return {
    aq: 0, ar: 0, as: 0, at: 0, Y: 0,
    av: 0, au: 0, aw: 0,
    xFlag: false,
    dense: new Int8Array(20000),
    bShort: new Int16Array(50),
    packedBytes: new Int8Array(2000),
    packedOffsets: new Int16Array(200),
    shortTables: Array.from({ length: 5 }, () => new Int16Array(200)),
    byteTables: Array.from({ length: 9 }, () => new Int8Array(200)),
    aQ: 0,
    vByte: 0,
    ...overrides,
  };
}

// Test 1: basic at>=0 path -- confirms av derivation, the table-driven at
// update, local6, and the au/ar/as refinement.
{
  const state = baseState();
  state.bShort[0] = 5; // Y=0
  state.bShort[1] = 7; // Y+1
  state.dense[5] = 9; // av = dense[bShort[Y]+aq] & 0xff = 9
  state.packedBytes[0] = 3; // at update result (shift=0, packedOffsets[99]=0, at_old=0)
  state.shortTables[4][0] = 11; // au = shortTables[4][local6=0]
  state.byteTables[7][0] = 2; // ar += byteTables[7][0]
  state.byteTables[8][0] = 4; // as += byteTables[8][0] + aQ(0)
  const calls = [];
  stepLegacyEntityAction(state, { onP: () => calls.push("p") });
  assert.equal(state.av, 9);
  assert.equal(state.at, 3);
  assert.equal(state.au, 11);
  assert.equal(state.ar, 2);
  assert.equal(state.as, 4);
  assert.equal(state.aw, 0);
  assert.deepEqual(calls, ["p"]); // onP always fires; vByte=0 -> onQ doesn't
}

// Test 2: at<0, dense[1414+aq]>=12 -> av=-at (not forced to 14), as unchanged.
{
  const state = baseState({ at: -6 });
  state.dense[1414] = 12; // >=12
  state.shortTables[2][6] = 0; // (shortTables[2][av]&4095)+2 = 2
  state.shortTables[4][2] = 77; // au = shortTables[4][2]
  const calls = [];
  stepLegacyEntityAction(state, { onP: () => calls.push("p") });
  assert.equal(state.av, 6); // -at = 6, not forced to 14
  assert.equal(state.as, 0); // unchanged
  assert.equal(state.au, 77);
}

// Test 3: at<0, dense[1414+aq]<12 -> av forced to 14, as -= 6.
{
  const state = baseState({ at: -6, as: 20 });
  state.dense[1414] = 3; // <12
  state.shortTables[2][14] = 0; // (shortTables[2][14]&4095)+2 = 2
  state.shortTables[4][2] = 88;
  stepLegacyEntityAction(state, {});
  assert.equal(state.av, 14);
  assert.equal(state.as, 14); // 20 - 6
  assert.equal(state.au, 88);
}

// Test 4: xFlag=true, av!==124 -> au+=48, av=1, xFlag cleared.
// bShort[1] is set to a distinct offset (99) so local6's dense read
// doesn't alias dense[0], which is also used to derive av.
{
  const state = baseState({ xFlag: true });
  state.dense[0] = 9; // av starts at 9 (bShort[0]=0,aq=0 -> dense[0])
  state.bShort[1] = 99;
  state.shortTables[4][0] = 20; // au before the xFlag adjustment (local6=0)
  stepLegacyEntityAction(state, {});
  assert.equal(state.au, 20 + 48);
  assert.equal(state.av, 1);
  assert.equal(state.xFlag, false);
}

// Test 5: xFlag=true, av===124 -> au/av untouched by the xFlag branch (still cleared).
{
  const state = baseState({ xFlag: true });
  state.dense[0] = 124; // av = 124
  state.bShort[1] = 99;
  state.shortTables[4][0] = 20;
  stepLegacyEntityAction(state, {});
  assert.equal(state.au, 20); // unchanged
  assert.equal(state.av, 124); // unchanged
  assert.equal(state.xFlag, false); // still cleared unconditionally
}

// Test 6: av in {141,142,143,144} -> extra ar += 22*packedBytes[...] fires.
{
  const state = baseState({ ar: 100 });
  state.dense[0] = 141; // av = 141
  state.dense[606] = 5; // dense[606+aq]
  state.packedOffsets[1] = 10;
  state.packedBytes[10 + 5] = 3; // packedBytes[packedOffsets[1]+dense[606+aq]]
  stepLegacyEntityAction(state, {});
  assert.equal(state.av, 141);
  // ar was also incremented earlier by byteTables[7][local6] (0 here, all
  // zero fixture), so the only change is the +22*3 step.
  assert.equal(state.ar, 100 + 22 * 3);
}

// Test 7: av NOT in {141..144} -> that extra ar step does not fire.
{
  const state = baseState({ ar: 100 });
  state.dense[0] = 9; // av = 9
  state.dense[606] = 5;
  state.packedOffsets[1] = 10;
  state.packedBytes[10 + 5] = 3;
  stepLegacyEntityAction(state, {});
  assert.equal(state.ar, 100); // untouched by the 141..144 step
}

// Test 8: vByte===0 -> onQ never fires (onP always does).
{
  const state = baseState({ vByte: 0 });
  const calls = [];
  stepLegacyEntityAction(state, { onP: () => calls.push("p"), onQ: () => calls.push("q") });
  assert.deepEqual(calls, ["p"]);
}

// Test 9: vByte!==0 -> onQ fires after onP.
{
  const state = baseState({ vByte: 1 });
  const calls = [];
  stepLegacyEntityAction(state, { onP: () => calls.push("p"), onQ: () => calls.push("q") });
  assert.deepEqual(calls, ["p", "q"]);
}

// Test 10: an exception from onP doesn't propagate -- matches the
// bytecode's own try/catch-all (and means onQ never fires afterward).
{
  const state = baseState({ vByte: 1 });
  const calls = [];
  let err = null;
  try {
    stepLegacyEntityAction(state, {
      onP: () => { calls.push("p"); throw new Error("boom"); },
      onQ: () => calls.push("q"),
    });
  } catch (e) {
    err = e;
  }
  assert.equal(err, null);
  assert.deepEqual(calls, ["p"]);
}

console.log("f.a(IIIIB) entity action (onP/onQ delegate) OK");
