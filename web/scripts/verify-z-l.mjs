import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import vm from "node:vm";

const file = new URL("../src/j2me/LegacyZL.ts", import.meta.url).pathname;
const module = { exports: {} };
const output = ts.transpileModule(fs.readFileSync(file, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
vm.runInNewContext(output, { module, exports: module.exports, Int8Array, Int16Array });
const { stepLegacyZL } = module.exports;

const state = { d: new Int16Array(8), k: new Int8Array(8), flags: [true, false, true, false, false, true, false, true, false, true], bFlags: new Array(8).fill(false), cSnapshot: new Array(9).fill(false), q: 7, w: 1, x: 0, Y: 0, s: 44, P: false, M: true, O: true };
let four;
stepLegacyZL(state, 4, { onFourFlagReset: (...args) => { four = args; } });
assert.equal(state.d[4], 37); assert.equal(state.k[4], 1); assert.equal(state.w, 4); assert.equal(state.bFlags[2], true); assert.equal(state.s, 0);
assert.deepEqual(four, [true, false, true, false]);
// value>-1 unconditionally snapshots selectionFlags[0,1,2,4..9] (skip index 3) into cSnapshot,
// regardless of which sub-branch (Y<=5 vs Y>5) fires next.
assert.deepEqual(state.cSnapshot, [true, false, true, false, true, false, true, false, true]);

const cancel = { d: new Int16Array(8), k: new Int8Array(8), flags: [true, true, false, false, false, false, true, false, true, false], bFlags: new Array(8).fill(false), cSnapshot: [true, false, true, false, true, false, true, false, true], q: 3, w: 4, x: 2, Y: 0, s: 100, P: false, M: true, O: true };
let ah = 0;
let nine;
stepLegacyZL(cancel, -3, { onAh: () => { ah += 1; }, onNineFlagReset: (...args) => { nine = args; } });
assert.equal(cancel.w, 2); assert.equal(cancel.d[4], 0); assert.equal(cancel.P, false); assert.equal(cancel.M, false); assert.equal(cancel.O, false); assert.equal(ah, 1);
// value===-1 reads the PERSISTED cSnapshot (consecutive indices 0..8, no skip) -- not live
// `flags` -- and must NOT touch cSnapshot itself (it's a producer, not consumed here).
assert.deepEqual(nine, [true, false, true, false, true, false, true, false, true]);
assert.deepEqual(cancel.cSnapshot, [true, false, true, false, true, false, true, false, true]);

console.log("f.l(int) raw state transition OK (incl. 2026-08-18 cSnapshot fix)");
