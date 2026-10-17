import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";
import { denseRequire } from "./dense-layout-require.mjs";

const path = `${new URL("../src/sim/world/LegacyAuxiliaryCopy.ts", import.meta.url).pathname}`;
const output = ts.transpileModule(fs.readFileSync(path, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(output, { require: denseRequire, module, exports: module.exports, Int8Array, Int16Array });
const { copyLegacyAuxiliary } = module.exports;

// RETRACTED (2026-09-07): c(int,int) (#362) was believed to guaranteed-throw
// on its very first loop iteration (dereferencing class b's own b:[S]/#132,
// believed permanently null). b:[S] is a real, live alias of f.b:[S] (#245)
// -- a 570-entry table this port models as `saveOffsets` -- so the method
// actually runs to completion. This test builds a minimal but realistic
// saveOffsets ("dense stride") table (saveOffsets[k] = 101*k, matching the
// project's documented 0/101/202/303/... pattern) and traces all 7 loop
// iterations plus the tail by hand; see LegacyAuxiliaryCopy.ts's own
// docblock for the full instruction-by-instruction derivation this mirrors.
function buildSaveOffsets() {
  const saveOffsets = new Int16Array(570);
  for (let k = 0; k < 570; k += 1) saveOffsets[k] = 101 * k;
  return saveOffsets;
}

{
  const auxiliaryRows = Array.from({ length: 4 }, () => new Int8Array(8));
  const dense = new Int8Array(10000);
  const packedBytes = new Int8Array(1000);
  const packedOffsets = new Int16Array(400);
  const saveOffsets = buildSaveOffsets();
  const shortRows = [new Int16Array(32)];

  packedOffsets[186] = 100; // category table base
  packedOffsets[187] = 200; // "else" value table base
  packedOffsets[188] = 300; // "cat===29" value table base (indexed by row)

  // Categories for N=1..7 -- deliberately exercise all three branches
  // (29, 46, else) and reuse two categories (29 and 5) across two different
  // N values each, so the test also proves idx is recomputed per-iteration
  // and that iterations that land on the same dense index see each other's
  // writes (the bytecode has no per-iteration-local idx cache).
  packedBytes[100 + 1] = 29;
  packedBytes[100 + 2] = 46;
  packedBytes[100 + 3] = 5;
  packedBytes[100 + 4] = 29;
  packedBytes[100 + 5] = 46;
  packedBytes[100 + 6] = 5;
  packedBytes[100 + 7] = 12;

  packedBytes[300 + 1] = 55; // packedOffsets[188] + row(=1), used whenever cat===29
  packedBytes[200 + 3] = 77; // packedOffsets[187] + N, else branch for N=3
  packedBytes[200 + 6] = 88; // else branch for N=6
  packedBytes[200 + 7] = 99; // else branch for N=7

  const value = 7;
  const row = 1;
  // idx = saveOffsets[cat] + value:
  //   N=1,4 (cat=29): idx = 2929+7 = 2936
  //   N=2,5 (cat=46): idx = 4646+7 = 4653
  //   N=3,6 (cat=5):  idx = 505+7  = 512
  //   N=7   (cat=12): idx = 1212+7 = 1219
  dense[2936] = 10; // seen by N=1's read, before it overwrites
  dense[4653] = 20; // seen by N=2's read
  dense[512] = 30; // seen by N=3's read
  // dense[1219] left at 0 -- seen by N=7's read.

  shortRows[0][17] = 40; // != value, so the tail runs (not skipped).
  dense[8994] = 66; // old "last id" value, must land in dense[4545+value].

  copyLegacyAuxiliary({ auxiliaryRows, dense, packedBytes, packedOffsets, saveOffsets, shortRows, H: 0 }, value, row);

  assert.equal(auxiliaryRows[row][0], 7, "eRows[row][0] = (byte) value");
  assert.equal(auxiliaryRows[row][1], 10, "N=1 reads the pre-existing dense[2936]");
  assert.equal(auxiliaryRows[row][2], 20, "N=2 reads the pre-existing dense[4653]");
  assert.equal(auxiliaryRows[row][3], 30, "N=3 reads the pre-existing dense[512]");
  assert.equal(auxiliaryRows[row][4], 55, "N=4 re-lands on idx 2936, already overwritten by N=1's write to 55");
  assert.equal(auxiliaryRows[row][5], 2, "N=5 re-lands on idx 4653, already overwritten by N=2's write to row+1=2");
  assert.equal(auxiliaryRows[row][6], 77, "N=6 re-lands on idx 512, already overwritten by N=3's write to 77");
  assert.equal(auxiliaryRows[row][7], 0, "N=7 reads untouched dense[1219]");

  assert.equal(dense[2936], 55, "cat===29 writes packedBytes[packedOffsets[188]+row]");
  assert.equal(dense[4653], 2, "cat===46 writes row+1");
  assert.equal(dense[512], 88, "else branch writes packedBytes[packedOffsets[187]+N], last writer N=6");
  assert.equal(dense[1219], 99, "else branch for N=7");

  assert.equal(dense[4545 + value], 66, "tail: dense[4545+value] = old dense[8994], read before overwrite");
  assert.equal(dense[8994], 7, "tail: dense[8994] = (byte) value");
}

// Tail early-return: value === shortRows[0][17] && H !== 0 skips both tail
// writes (offset 197..216's `ifne 245`/`return`), leaving dense[8994] and
// dense[4545+value] untouched.
{
  const auxiliaryRows = Array.from({ length: 4 }, () => new Int8Array(8));
  const dense = new Int8Array(10000);
  const packedBytes = new Int8Array(1000);
  const packedOffsets = new Int16Array(400);
  const saveOffsets = buildSaveOffsets();
  const shortRows = [new Int16Array(32)];
  // All 7 categories point at an unused slot (0) so the loop body is inert
  // for this test -- only the tail branch is under test here.
  for (let n = 1; n < 8; n += 1) packedBytes[100 + n] = 0;

  shortRows[0][17] = 12;
  dense[8994] = 55;
  copyLegacyAuxiliary({ auxiliaryRows, dense, packedBytes, packedOffsets, saveOffsets, shortRows, H: 1 }, 12, 0);
  assert.equal(dense[8994], 55, "value===row17 && H!==0 must skip the tail entirely");
  assert.equal(dense[4545 + 12], 0, "tail writes must not have happened");
}

// Same value===row17 case but H===0: the tail is NOT skipped (only
// value===row17 AND H!==0 together return early).
{
  const auxiliaryRows = Array.from({ length: 4 }, () => new Int8Array(8));
  const dense = new Int8Array(10000);
  const packedBytes = new Int8Array(1000);
  const packedOffsets = new Int16Array(400);
  const saveOffsets = buildSaveOffsets();
  const shortRows = [new Int16Array(32)];
  for (let n = 1; n < 8; n += 1) packedBytes[100 + n] = 0;

  shortRows[0][17] = 12;
  dense[8994] = 55;
  copyLegacyAuxiliary({ auxiliaryRows, dense, packedBytes, packedOffsets, saveOffsets, shortRows, H: 0 }, 12, 0);
  assert.equal(dense[8994], 12, "H===0 must run the tail even when value===row17");
  assert.equal(dense[4545 + 12], 55, "tail dense[4545+value] = old dense[8994]");
}

console.log("b.c(II) raw auxiliary copy OK");
