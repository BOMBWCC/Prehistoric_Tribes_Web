import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

const module = { exports: {} };
const output = ts.transpileModule(
  fs.readFileSync(new URL("../src/ui/LegacySelectionFlags.ts", import.meta.url), "utf8"),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
).outputText;
vm.runInNewContext(output, { module, exports: module.exports, Int8Array, Int32Array });
const { stepLegacySelectionFlags } = module.exports;

const state = {
  aFlags: Array.from({ length: 20 }, () => false),
  bFlags: Array.from({ length: 20 }, () => false),
  uBytes: new Int8Array(10),
  // e.c()'s f.d:[B], f.c:[I] and f.b:[I]; slot -> record from a_s[195].
  dBytes: new Int8Array([0, 0, 6, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]),
  recordOf: (ad) => ({ 0: 2, 1: 4, 2: 5, 4: 3, 5: 5, 6: 7, 9: 10 }[ad] ?? 0),
  cInts: Int32Array.from([0, 0, 304, 304, 326, 326, 0, 326, 0, 0, 326, 0, 0]),
  bInts: Int32Array.from([352, 304, 22, 48, 22, 48, 55, 86, 49, 55, 38, 0, 0]),
  bb: 0, ax: 0, ag: 0, ad: 0, ba: 0, P: 0, AInt: 0, CFlag: false, K: 0, A: 0, AFlag: false, dSize: 96,
};
stepLegacySelectionFlags(state, false, true, false, false);
assert.equal(state.aFlags[1], true);
assert.equal(state.aFlags[9], false);
assert.equal(state.bFlags[17], true);
assert.equal(state.ad, 1);
assert.equal(state.ba, 22);
assert.equal(state.bb, 22);
// (319 - 22 - 22 + 6) / 16 + 1 = 18 -> A = 304: exactly e.c()'s initial c[I].
assert.equal(state.P, 18);
assert.equal(state.AInt, 304);
assert.deepEqual([...state.cInts.slice(2, 6)], [304, 304, 326, 326]);
assert.equal(state.cInts[7], 326);
assert.equal(state.cInts[10], 326);
assert.equal(state.cInts[11], 348);

state.uBytes[0] = 7;
stepLegacySelectionFlags(state, false, true, false, true);
assert.equal(state.aFlags[9], true);
assert.equal(state.aFlags[1], false);
assert.equal(state.bb, 48);
assert.equal(state.ax, 0);
assert.equal(state.ad, 9);
assert.equal(state.ba, 38);
// Unit panel open: A = 256, panel rows 256..304, message bar 304..342 --
// no overlap inside Image 0 (264x352).
assert.equal(state.AInt, 256);
assert.equal(state.cInts[3], 256);
assert.equal(state.cInts[10], 304);
assert.equal(state.cInts[11], 342);

// fifth (index 5): f.a(ZxZxZxZxZx9) real 9-arg call site (f.W()'s staticL
// branch: a(true,false,false,false,true,...)). aFlags[1]/[2] both false ->
// ad falls through to aFlags[5]=true -> ad=5.
state.ad = 0;
stepLegacySelectionFlags(state, true, false, false, false, true);
assert.equal(state.aFlags[5], true);
assert.equal(state.ad, 5);

// Offsets 291..476: the HUD grows (bb 22 -> 48, flag 4) -> camera K +2,
// A:B -2, ag = 1, A:Z set; shrinking back (fourth false) -> K -2, A:B +2.
{
  const s3 = { ...state, aFlags: Array(20).fill(false), bFlags: Array(20).fill(false), bb: 22, ag: 0, K: 5, A: 4, AFlag: false };
  stepLegacySelectionFlags(s3, false, false, false, true); // a[4] = fourth -> bb 48
  assert.equal(s3.bb, 48);
  assert.deepEqual([s3.ag, s3.K, s3.A, s3.AFlag], [1, 7, 2, true]);
  s3.ag = 0;
  s3.AFlag = false;
  stepLegacySelectionFlags(s3, false, false, false, false); // bb 48 -> 22
  assert.deepEqual([s3.ag, s3.K, s3.A, s3.AFlag], [-1, 5, 4, true]);
  // only one row of room: no second step, no A:Z
  const s4 = { ...state, aFlags: Array(20).fill(false), bFlags: Array(20).fill(false), bb: 22, ag: 0, K: 94, A: 0, AFlag: false };
  stepLegacySelectionFlags(s4, false, false, false, true);
  assert.deepEqual([s4.ag, s4.K, s4.A, s4.AFlag], [1, 95, -1, false]);
}
console.log("selection flag prefix parity checks passed");
