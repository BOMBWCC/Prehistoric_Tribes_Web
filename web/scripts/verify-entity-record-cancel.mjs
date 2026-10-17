import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import vm from "node:vm";
import { denseRequire } from "./dense-layout-require.mjs";

const file = new URL("../src/sim/units/LegacyEntityRecordCancel.ts", import.meta.url).pathname;
const output = ts.transpileModule(fs.readFileSync(file, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(output, { require: denseRequire, module, exports: module.exports });
const { stepLegacyEntityRecordCancel } = module.exports;

function base() {
  return new Int8Array(10000);
}

// f.c:[[B (#262) -- gridC. RETRACTED 2026-09-07: this file used to end with a
// guaranteed-throw case on the premise that #262 is permanently null; e.i()
// allocates it 96x96. See LegacyEntityRecordCancel.ts's docblock.
function grid() {
  return Array.from({ length: 96 }, () => new Int8Array(96));
}

// Safe path: owner2 !== arg1, local3 false -> 87/3.
{
  const dense = base();
  dense[8810 + 2] = 999; // !== arg1(=1)
  let calls = 0;
  stepLegacyEntityRecordCancel(dense, grid(), 1, 2, false, false, () => calls += 1);
  assert.equal(dense[2828 + 1], 87);
  assert.equal(dense[6161 + 1], 3);
  assert.equal(calls, 0);
}

// Safe path via owner===2 && flag===0 shortcut, local3 true (arg3).
{
  const dense = base();
  dense[8810 + 2] = 1;
  dense[8749 + 2] = 2;
  dense[8627 + 2] = 0; // ownerX===2 && flagY===0 -> takes 310 branch
  stepLegacyEntityRecordCancel(dense, grid(), 1, 2, true, false, () => { throw new Error("should not be called"); });
  // local3=true (arg3), flagY===0 so the "flagY!==0" check is false, falls
  // to owner-in-{2,7,4} check: ownerX===2 -> 87/3.
  assert.equal(dense[2828 + 1], 87);
  assert.equal(dense[6161 + 1], 3);
}

// 310 branch, local3 true, flagY!==0 -> 6161=2 only.
{
  const dense = base();
  dense[8810 + 2] = 999;
  dense[8627 + 2] = 7;
  stepLegacyEntityRecordCancel(dense, grid(), 1, 2, true, false, () => { throw new Error("should not be called"); });
  assert.equal(dense[6161 + 1], 2);
  assert.equal(dense[2828 + 1], 0);
}

// 310 branch, local3 true, flagY===0, ownerX not in {2,4,7,8} -> 6161=2 only.
{
  const dense = base();
  dense[8810 + 2] = 999;
  dense[8627 + 2] = 0;
  dense[8749 + 2] = 99;
  stepLegacyEntityRecordCancel(dense, grid(), 1, 2, true, false, () => { throw new Error("should not be called"); });
  assert.equal(dense[6161 + 1], 2);
}

// 310 branch, local3 true (via marker 93/92/106 instead of arg3), ownerX===8 -> 87/3.
{
  const dense = base();
  dense[8810 + 2] = 999;
  dense[8627 + 2] = 0;
  dense[8749 + 2] = 8;
  dense[2828 + 1] = 106;
  stepLegacyEntityRecordCancel(dense, grid(), 1, 2, false, false, () => { throw new Error("should not be called"); });
  assert.equal(dense[2828 + 1], 87);
  assert.equal(dense[6161 + 1], 3);
}

// Main path, local3 true, gridC cell does NOT hold arg1 (offset 108..165):
// clears dense[8810+arg2], calls onCompleteEntityRecord + d(arg2), sets 6161=2.
{
  const dense = base();
  const gridC = grid();
  dense[8810 + 2] = 1;
  dense[8749 + 2] = 5; // not 2, so no shortcut
  let completed; const ds = [];
  stepLegacyEntityRecordCancel(dense, gridC, 1, 2, true, false,
    (record) => { completed = record; }, { onD: (r) => ds.push(r) });
  assert.equal(completed, 2);
  assert.deepEqual(ds, [2]);
  assert.equal(dense[8810 + 2], 0);
  assert.equal(dense[6161 + 1], 2);
  assert.equal(dense[2828 + 1], 0, "the 87 write is the local3===false side");
}

// Same, local3 false: does NOT clear dense[8810+arg2]; gridC mismatch -> 87/3.
{
  const dense = base();
  dense[8810 + 2] = 1;
  dense[8749 + 2] = 5;
  let completed;
  stepLegacyEntityRecordCancel(dense, grid(), 1, 2, false, false, (record) => { completed = record; });
  assert.equal(completed, 2);
  assert.equal(dense[8810 + 2], 1);
  assert.equal(dense[2828 + 1], 87);
  assert.equal(dense[6161 + 1], 3);
}

// Main path, gridC cell DOES hold arg1 (offset 168..297), local3 true.
{
  const dense = base();
  const gridC = grid();
  const arg1 = 1;
  dense[8810 + 2] = 1;
  dense[8749 + 2] = 5;
  dense[arg1] = 4;          // x
  dense[101 + arg1] = 6;    // y
  gridC[6][4] = arg1;
  dense[4747 + arg1] = 9;
  stepLegacyEntityRecordCancel(dense, gridC, arg1, 2, true, false, () => {});
  assert.equal(dense[3131 + arg1], 4);
  assert.equal(dense[3232 + arg1], 6);
  assert.equal(dense[6262 + arg1], 4, "local3 true also mirrors into 6262/6363");
  assert.equal(dense[6363 + arg1], 6);
  assert.equal(dense[2828 + arg1], 69);
  assert.equal(dense[6161 + arg1], 2);
  assert.equal(dense[4747 + arg1], 0);
}

// Same cell match with local3 false: no 6262/6363 mirror, 6161=3, 4747 kept.
{
  const dense = base();
  const gridC = grid();
  const arg1 = 1;
  dense[8810 + 2] = 1;
  dense[8749 + 2] = 5;
  dense[arg1] = 4;
  dense[101 + arg1] = 6;
  gridC[6][4] = arg1;
  dense[4747 + arg1] = 9;
  stepLegacyEntityRecordCancel(dense, gridC, arg1, 2, false, false, () => {});
  assert.equal(dense[6262 + arg1], 0);
  assert.equal(dense[2828 + arg1], 69);
  assert.equal(dense[6161 + arg1], 3);
  assert.equal(dense[4747 + arg1], 9);
}

// arg4 gates the offset-298 a(arg2,false) (#469) call.
{
  const dense = base();
  dense[8810 + 2] = 1;
  dense[8749 + 2] = 5;
  const as = [];
  stepLegacyEntityRecordCancel(dense, grid(), 1, 2, true, true, () => {}, { onA: (...a) => as.push(a) });
  assert.deepEqual(as, [[2, false]]);
  const as2 = [];
  stepLegacyEntityRecordCancel(base(), grid(), 1, 2, true, false, () => {}, { onA: (...a) => as2.push(a) });
  assert.deepEqual(as2, []);
}

console.log("stepLegacyEntityRecordCancel (private void a(IIZZ), #470) OK");
