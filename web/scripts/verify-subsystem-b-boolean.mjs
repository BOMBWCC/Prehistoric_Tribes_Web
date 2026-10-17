// Unit test for LegacySubsystemBBoolean.ts's stepLegacySubsystemBBoolean
// (private boolean b(boolean), bytecode/b-javap.txt offsets 0..364).
//
// REDERIVED 2026-09-07: b.b:[S] (#132), the field this method reads via
// saveOffsets, is NOT permanently null (RETRACTED-PREMISE, was believed so
// 2026-08-18/2026-09-04) -- e.f() allocates it (e-javap.txt:1115). This is
// a real closest-scored-candidate scan over the 9833/9733/9783 scratch
// table; see the file's own docblock for the full derivation, including
// the persistent bField235/bField6 writes.
import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";
import { denseRequire } from "./dense-layout-require.mjs";

const file = new URL("../src/sim/tribe/LegacySubsystemBBoolean.ts", import.meta.url).pathname;
const module = { exports: {} };
const output = ts.transpileModule(fs.readFileSync(file, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
vm.runInNewContext(output, { require: denseRequire, module, exports: module.exports, Int8Array, Int16Array, Math });
const { stepLegacySubsystemBBoolean } = module.exports;

function makeSaveOffsets() {
  // Mirrors the real table's shape: saveOffsets[N] = N*101 (dense stride
  // table), large enough that index 0/1/62/63 are all distinct bases.
  const saveOffsets = new Int16Array(600);
  for (let i = 0; i < 600; i += 1) saveOffsets[i] = i * 10;
  return saveOffsets;
}

function makeArrays() {
  return { bField235: 0, bField6: 0 };
}

// No active records in the 9833-table -> loop finds nothing, returns
// false, no crash, arrays untouched.
{
  const dense = new Int8Array(20000);
  const arrays = makeArrays();
  const result = stepLegacySubsystemBBoolean({
    dense, packedBytes: new Int8Array(2000), packedOffsets: new Int16Array(200),
    saveOffsets: makeSaveOffsets(), arrays, v: 4, arg: false,
  });
  assert.equal(result, false);
  assert.equal(arrays.bField235, 0);
  assert.equal(arrays.bField6, 0);
}

// One active record, real (non-null) saveOffsets -> no throw. onC omitted
// (callee not modeled) -> never accepted -> returns false, but the
// per-iteration z/A fields are still persisted (bytecode writes them
// unconditionally for every scanned active slot, independent of scoring).
{
  const dense = new Int8Array(20000);
  const packedBytes = new Int8Array(2000);
  const packedOffsets = new Int16Array(200);
  const saveOffsets = makeSaveOffsets();
  const arrays = makeArrays();
  dense[9833 + 0] = 1; // mark slot 0 active
  dense[9733 + 0] = 50; // candidate col
  dense[9783 + 0] = 60; // candidate row
  dense[saveOffsets[62] + 4] = 40; // reference col for arg=false (zIndex 62)
  dense[saveOffsets[63] + 4] = 55; // reference row for arg=false (aIndex 63)
  const result = stepLegacySubsystemBBoolean({
    dense, packedBytes, packedOffsets, saveOffsets, arrays, v: 4, arg: false,
  });
  assert.equal(result, false);
  assert.equal(arrays.bField235, 50 - 40, "z persisted even without a winning onC");
  assert.equal(arrays.bField6, 60 - 55, "A persisted even without a winning onC");
}

// arg=true selects the OTHER pair of saveOffsets indices (0/1 instead of
// 62/63) and the caller-supplied threshold (dense[4949+v]) instead of the
// constant 9.
{
  const dense = new Int8Array(20000);
  const packedBytes = new Int8Array(2000);
  const packedOffsets = new Int16Array(200);
  const saveOffsets = makeSaveOffsets();
  const arrays = makeArrays();
  dense[9833 + 0] = 1;
  dense[9733 + 0] = 12;
  dense[9783 + 0] = 8;
  dense[saveOffsets[0] + 4] = 10; // zIndex for arg=true
  dense[saveOffsets[1] + 4] = 6; // aIndex for arg=true
  dense[4949 + 4] = 100; // generous threshold so the candidate always qualifies
  stepLegacySubsystemBBoolean({
    dense, packedBytes, packedOffsets, saveOffsets, arrays, v: 4, arg: true,
  });
  assert.equal(arrays.bField235, 12 - 10);
  assert.equal(arrays.bField6, 8 - 6);
}

// onC accepts the candidate -> writes dense[3131+v]/dense[3232+v] to the
// candidate's own stored position, calls onG, returns true.
{
  const dense = new Int8Array(20000);
  const packedBytes = new Int8Array(2000);
  const packedOffsets = new Int16Array(200);
  const saveOffsets = makeSaveOffsets();
  const arrays = makeArrays();
  dense[9833 + 0] = 1;
  dense[9733 + 0] = 5;
  dense[9783 + 0] = 7;
  // Reference position equal to the candidate -> delta 0 both axes -> a
  // real, small table-53 score guaranteed under both the constant (9) and
  // any positive caller threshold.
  dense[saveOffsets[62] + 4] = 5;
  dense[saveOffsets[63] + 4] = 7;
  let gCalled = false;
  const result = stepLegacySubsystemBBoolean({
    dense, packedBytes, packedOffsets, saveOffsets, arrays, v: 4, arg: false,
    onC: (value) => { assert.equal(value, -0 - 61); return true; },
    onG: () => { gCalled = true; },
  });
  assert.equal(result, true);
  assert.equal(dense[3131 + 4], 5);
  assert.equal(dense[3232 + 4], 7);
  assert.equal(gCalled, true);
}

// onC rejects (returns false) -> candidate is scored but not kept; method
// still returns false since bestScore never drops below 12.
{
  const dense = new Int8Array(20000);
  const packedBytes = new Int8Array(2000);
  const packedOffsets = new Int16Array(200);
  const saveOffsets = makeSaveOffsets();
  const arrays = makeArrays();
  dense[9833 + 0] = 1;
  dense[9733 + 0] = 5;
  dense[9783 + 0] = 7;
  dense[saveOffsets[62] + 4] = 5;
  dense[saveOffsets[63] + 4] = 7;
  let gCalled = false;
  const result = stepLegacySubsystemBBoolean({
    dense, packedBytes, packedOffsets, saveOffsets, arrays, v: 4, arg: false,
    onC: () => false,
    onG: () => { gCalled = true; },
  });
  assert.equal(result, false);
  assert.equal(dense[3131 + 4], 0);
  assert.equal(gCalled, false);
}

console.log("private boolean b(boolean) (LegacySubsystemBBoolean.ts) OK");
