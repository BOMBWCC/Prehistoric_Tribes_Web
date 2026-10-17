// Regression test for LegacyEntityRecordLifecycle.ts (final void g(int) /
// final void b(byte), the record allocator's own onRecordInitialized/
// onRecordIndexed targets).
import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";
import { denseRequire } from "./dense-layout-require.mjs";

const file = new URL("../src/sim/world/LegacyEntityRecordLifecycle.ts", import.meta.url).pathname;
const module = { exports: {} };
const output = ts.transpileModule(fs.readFileSync(file, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
vm.runInNewContext(output, { require: denseRequire, module, exports: module.exports, Int8Array, Int16Array });
const { initializeLegacyEntityRecord, indexLegacyEntityRecord } = module.exports;

function make(overrides = {}) {
  return {
    state: new Int8Array(10000),
    packedBytes: new Int8Array(2000),
    packedOffsets: new Int16Array(400),
    randomRemainder: () => 0,
    focusId: -1,
    selectionFlags: new Array(20).fill(false),
    frameFlags: new Array(20).fill(false),
    ...overrides,
  };
}

// g(int): id===51/52 -> -2.
{
  const input = make();
  initializeLegacyEntityRecord(input, 51);
  assert.equal(input.state[6868 + 51], -2);
  initializeLegacyEntityRecord(input, 52);
  assert.equal(input.state[6868 + 52], -2);
}

// g(int): id>52 -> -1.
{
  const input = make();
  initializeLegacyEntityRecord(input, 53);
  assert.equal(input.state[6868 + 53], -1);
}

// g(int): id in (3,51), uses randomRemainder.
{
  const input = make({ randomRemainder: () => 5 });
  input.state[1515 + 10] = 2;
  initializeLegacyEntityRecord(input, 10);
  // x = 1+5 = 6; value = (6%60) + 60*2 - 1 = 6 + 120 - 1 = 125 -> truncated to Int8Array range
  const expected = new Int8Array([125])[0];
  assert.equal(input.state[6868 + 10], expected);
}

// g(int): id<=3, no RNG used.
{
  const input = make({ randomRemainder: () => { throw new Error("should not be called"); } });
  input.state[1515 + 2] = 0;
  initializeLegacyEntityRecord(input, 2);
  // x = id = 2; value = (2%60) + 0 - 1 = 1
  assert.equal(input.state[6868 + 2], 1);
}

// b(byte): id<51, bucket selection from state[1414+id], table lookup + roll.
{
  const input = make({ randomRemainder: (mask, divisor) => { assert.equal(divisor, 9); return 3; } });
  input.state[1414 + 4] = 5; // < 12 -> bucket 0
  input.state[1515 + 4] = 1;
  input.packedOffsets[189] = 100;
  const tableBase = 100 + 1 * 10 + 0 * 2;
  input.packedBytes[tableBase] = 20;
  input.packedBytes[tableBase + 1] = 9;
  indexLegacyEntityRecord(input, 4);
  assert.equal(input.state[2727 + 4], 23); // 20 + 3
}

// b(byte): focus-id flag copy fires only when id===focusId.
{
  const input = make({ focusId: 7 });
  input.selectionFlags[4] = true;
  input.state[1414 + 7] = 50; // bucket 2, irrelevant here
  input.packedOffsets[189] = 0;
  indexLegacyEntityRecord(input, 7);
  assert.equal(input.frameFlags[4], true);
}
{
  const input = make({ focusId: 7 });
  input.selectionFlags[4] = true;
  indexLegacyEntityRecord(input, 8); // id !== focusId
  assert.equal(input.frameFlags[4], false);
}

console.log("record allocator's onRecordInitialized/onRecordIndexed (g(int)/b(byte)) OK");
