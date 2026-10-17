// Regression test for LegacySubsystemNPrivateO.ts (private boolean o(),
// bytecode/b-javap.txt offsets 0..1187), b.n()'s onOther target.
//
// CORRECTED 2026-08-20: a prior version of this file tested a completely
// fabricated type>=109 branch (onFootprint/onFootprintCheck/onFallback)
// that never matched the real bytecode -- confirmed by direct offset
// reads, not guessed. The real method is a CONFIRMED GUARANTEED THROW on
// every call except the index<0 early exit: b.c:[[B] (#143) is
// permanently null (zero putfield sites anywhere in class b), and BOTH
// type branches dereference it immediately. The only real side effect is
// changeEntityType, and only when type<109, fired BEFORE the throw.
import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";
import { denseRequire } from "./dense-layout-require.mjs";

const file = new URL("../src/sim/tribe/LegacySubsystemNPrivateO.ts", import.meta.url).pathname;
const module = { exports: {} };
const output = ts.transpileModule(fs.readFileSync(file, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
vm.runInNewContext(output, { require: denseRequire, module, exports: module.exports, Int8Array });
const { stepLegacySubsystemNPrivateO } = module.exports;

function makeState(id, overrides = {}) {
  const state = new Int8Array(10000);
  for (const [key, value] of Object.entries(overrides)) state[Number(key) + id] = value;
  return state;
}

// index<0 (state[8282+id]&127)>>1)-1 < 0 -- the ONLY safe no-op path, no
// throw, no onAction, returns false.
{
  const id = 4;
  const state = makeState(id, { 8282: 1 }); // (1&127)>>1-1 = -1 < 0
  let threw = false;
  let result;
  try {
    result = stepLegacySubsystemNPrivateO({ ...makeInput(state, id), onAction: () => { throw new Error("should not fire"); } });
  } catch { threw = true; }
  assert.equal(threw, false);
  assert.equal(result, false);
}

// RETRACTED 2026-09-07: the two cases below used to assert a throw, on the
// premise that class b's c:[[B] (#143) is permanently null. f.g() allocates it
// as byte[6][10] (bytecode/f-javap.txt offset 590..594). They now assert the
// real behaviour.

// b.c:[[B] (#143) is f.g()-allocated byte[6][10]; b.j:[B] is byte[50]. See the
// 2026-09-04 retraction in LegacySubsystemNPrivateO.ts.
function makeInput(state, id) {
  return {
    state, id,
    cRows: Array.from({ length: 6 }, () => new Int8Array(10)),
    gridC: Array.from({ length: 96 }, () => new Int8Array(96)),
    jRows: Array.from({ length: 2 }, () => new Int8Array(50)),
    scratch: { bField10: 0, x: 0 },
  };
}

// index>=0, type<109 -> onAction fires with (id, 110-state[1515+id]), the slot
// is marked 2, and the gridC occupancy check picks onN vs onGroupMode.
{
  const id = 4;
  const state = makeState(id, { 8282: 10, 2828: 50, 1515: 3 }); // index=4, type=50<109
  const calls = []; const input = makeInput(state, id);
  input.onAction = (...args) => calls.push(args);
  let nFired = 0, groupCalls = [];
  input.onN = () => { nFired += 1; };
  input.onGroupMode = (...args) => groupCalls.push(args);
  input.gridC[state[101 + id]][state[id]] = id;   // occupied by this entity -> onN
  assert.equal(stepLegacySubsystemNPrivateO(input), true);
  assert.deepEqual(calls, [[id, 107]]);           // 110 - 3
  assert.equal(input.cRows[4][4], 2, "the slot is marked 2");
  assert.equal(input.scratch.x, 4, "x:I (#230) is a real field write, not a local");
  assert.equal(nFired, 1);
  assert.deepEqual(groupCalls, []);
}

// Same, but the cell is NOT held by this entity -> onGroupMode(id, 3) instead.
{
  const id = 4;
  const state = makeState(id, { 8282: 10, 2828: 50, 1515: 3 });
  const input = makeInput(state, id);
  let nFired = 0; const groupCalls = [];
  input.onN = () => { nFired += 1; };
  input.onGroupMode = (...args) => groupCalls.push(args);
  input.gridC[state[101 + id]][state[id]] = 99;
  assert.equal(stepLegacySubsystemNPrivateO(input), true);
  assert.equal(nFired, 0);
  assert.deepEqual(groupCalls, [[id, 3]]);
}

// index>=0, type>=109 with cRows[4][index] !== 2 and type !== 111 -> onAction
// never fires and the method returns true at offset 1136 without side effects.
{
  const id = 4;
  const state = makeState(id, { 8282: 10, 2828: 109 }); // index=4, type=109
  const calls = []; const input = makeInput(state, id);
  input.onAction = (...args) => calls.push(args);
  assert.equal(stepLegacySubsystemNPrivateO(input), true);
  assert.deepEqual(calls, []);
}

// type===111 on that same branch takes the linked-slot write plus onD(id, 0).
{
  const id = 4;
  const state = makeState(id, { 8282: 10, 2828: 111 });
  const input = makeInput(state, id);
  input.cRows[5][4] = 7;
  const dCalls = [];
  input.onD = (...args) => dCalls.push(args);
  assert.equal(stepLegacySubsystemNPrivateO(input), true);
  assert.equal(state[9237 + 7], 3);
  assert.deepEqual(dCalls, [[id, 0]]);
}

console.log("b.o() (private boolean o(), b.n()'s onOther target) OK");
