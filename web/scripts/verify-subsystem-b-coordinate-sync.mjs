// Direct port test for class b's private void a(int, boolean) (#278,
// bytecode/b-javap.txt offsets 0..289), ported as
// syncLegacySubsystemBCoordinate.
import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";
import { denseRequire } from "./dense-layout-require.mjs";

const source = fs.readFileSync(new URL("../src/sim/tribe/LegacySubsystemBCoordinateSync.ts", import.meta.url), "utf8");
const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const module = { exports: {} };
vm.runInNewContext(output, { require: denseRequire, module, exports: module.exports, Math });
const { syncLegacySubsystemBCoordinate } = module.exports;

// Always copies dense[0+id]/[101+id] into dense[3131+id]/[3232+id] first,
// and always zeroes dense[808+id] at the end.
{
  const dense = new Int8Array(20000);
  const packedBytes = new Int8Array(2000);
  const packedOffsets = new Int16Array(400);
  dense[0 + 5] = 11;
  dense[101 + 5] = 22;
  dense[2929 + 5] = 8; // &255 > 7 -> skip the middle adjustment entirely
  dense[808 + 5] = 3;
  syncLegacySubsystemBCoordinate({ dense, packedBytes, packedOffsets }, 5, false);
  assert.equal(dense[3131 + 5], 11);
  assert.equal(dense[3232 + 5], 22);
  assert.equal(dense[808 + 5], 0);
}

// (2929+id)&255<=7, mask<threshold, 1313>=0, 808>0 -> the two coordinate
// adjustments fire, adding the packed table-1 lookups.
{
  const dense = new Int8Array(20000);
  const packedBytes = new Int8Array(2000);
  const packedOffsets = new Int16Array(400);
  dense[0 + 5] = 10;
  dense[101 + 5] = 20;
  dense[2929 + 5] = 3; // <=7
  dense[1111 + 5] = 2; // mask = 2
  packedOffsets[15] = 100;
  dense[606 + 5] = 1; // &1 = 1 -> +9
  dense[1010 + 5] = 5;
  dense[7777 + 5] = 2;
  // tableIndex = 100 + 1*9 + 5 - 2 = 112
  packedBytes[112] = 5; // threshold = (5+1)/2 = 3, mask(2) < 3 -> pass
  dense[1313 + 5] = 0; // >= 0
  dense[808 + 5] = 1; // > 0
  packedOffsets[1] = 200;
  packedBytes[200 + 1] = 7; // dense[606+id]=1, x adjustment
  packedBytes[200 + 8 + 1] = 9; // y adjustment
  syncLegacySubsystemBCoordinate({ dense, packedBytes, packedOffsets }, 5, false);
  assert.equal(dense[3131 + 5], 10 + 7);
  assert.equal(dense[3232 + 5], 20 + 9);
  assert.equal(dense[808 + 5], 0);
}

// Same setup, but mask>=threshold -> adjustments skipped, coordinates
// stay at the raw copy.
{
  const dense = new Int8Array(20000);
  const packedBytes = new Int8Array(2000);
  const packedOffsets = new Int16Array(400);
  dense[0 + 5] = 10;
  dense[101 + 5] = 20;
  dense[2929 + 5] = 3;
  dense[1111 + 5] = 10; // mask = 10, will be >= threshold
  packedOffsets[15] = 100;
  dense[606 + 5] = 1;
  dense[1010 + 5] = 5;
  dense[7777 + 5] = 2;
  packedBytes[112] = 5; // threshold = 3
  syncLegacySubsystemBCoordinate({ dense, packedBytes, packedOffsets }, 5, false);
  assert.equal(dense[3131 + 5], 10);
  assert.equal(dense[3232 + 5], 20);
}

// markSpawn=true fires onSpawnMark and mirrors 3131/3232 into 6262/6363;
// the real bytecode's own inner a(int,byte)(#275) call is unreachable via
// subsystemBC's real trigger (arg2 always false there) -- exposed here as
// an optional callback only, not consumed.
{
  const dense = new Int8Array(20000);
  const packedBytes = new Int8Array(2000);
  const packedOffsets = new Int16Array(400);
  dense[0 + 5] = 4;
  dense[101 + 5] = 6;
  dense[2929 + 5] = 8; // skip middle adjustment
  let marked = -1;
  syncLegacySubsystemBCoordinate({ dense, packedBytes, packedOffsets, onSpawnMark: (id) => { marked = id; } }, 5, true);
  assert.equal(dense[6262 + 5], 4);
  assert.equal(dense[6363 + 5], 6);
  assert.equal(marked, 5);
}

console.log("class b private void a(int,boolean) (#278) coordinate sync OK");
