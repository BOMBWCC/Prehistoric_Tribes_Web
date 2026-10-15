// Regression test for LegacyEntityWorkDeposit.ts (private boolean f(), #381),
// hand-derived from bytecode/b-javap.txt line 13687.
import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import vm from "node:vm";

const file = new URL("../src/j2me/LegacyEntityWorkDeposit.ts", import.meta.url).pathname;
const module = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { module, exports: module.exports, Int8Array, Int16Array, RangeError });
const { stepLegacyEntityWorkDeposit } = module.exports;

function setup() {
  const state = new Int8Array(10000); const packedBytes = new Int8Array(1000); const packedOffsets = new Int16Array(300);
  packedOffsets[41] = 100; packedOffsets[42] = 300;
  packedBytes[100 + 56] = 3; packedBytes[100 + 69] = 3; packedBytes[300 + 3] = 2; // class 2 for types 56 and 69
  const fRows = [new Int8Array(10), new Int8Array(10)];
  const gRows = [new Int8Array(20), new Int8Array(20), new Int8Array(20)];
  const log = [];
  // unit 5: joined builder of record 2 (a type-16 site), owner of it, carrying a full load
  state[2828 + 5] = 56; state[6464 + 5] = 69; state[4646 + 5] = 0; state[1313 + 5] = -2; state[4444 + 5] = 2;
  state[8810 + 2] = 5; state[8749 + 2] = 16; state[3636 + 5] = 9; state[3535 + 5] = 2;
  fRows[0][1] = 2;
  const input = { state, packedBytes, packedOffsets, entityId: 5, fRows, gRows, scratch: { C: 0 },
    onRecordCompletion: (r) => log.push(["d", r]), onReroll: () => log.push(["x"]) };
  return { state, packedBytes, fRows, gRows, log, input };
}

// Full load delivered to a site: f[1][1]++, carry cleared, 1313 = 1, mode -102.
{
  const { state, fRows, log, input } = setup();
  assert.equal(stepLegacyEntityWorkDeposit(input), true);
  assert.deepEqual(log, [["d", 2]]);
  assert.equal(fRows[1][1], 1);
  assert.deepEqual([state[3636 + 5], state[3535 + 5], state[1313 + 5], state[2929 + 5]], [0, 0, 1, -102]);
}
// Type 78 in modes 113..116: true before anything else.
{
  const { state, log, input } = setup();
  state[2828 + 5] = 78; state[2929 + 5] = 115;
  assert.equal(stepLegacyEntityWorkDeposit(input), true); assert.deepEqual(log, []);
}
// Not joined (4646 < 0 or 1313 != -2): reroll, false.
{
  const a = setup(); a.state[4646 + 5] = -1;
  assert.equal(stepLegacyEntityWorkDeposit(a.input), false); assert.deepEqual(a.log, [["x"]]);
  const b = setup(); b.state[1313 + 5] = 0;
  assert.equal(stepLegacyEntityWorkDeposit(b.input), false); assert.deepEqual(b.log, [["x"]]);
}
// Work classes differ (6464 class 0 vs type class 2): mode -109; 1313 from the record.
{
  const { state, packedBytes, log, input } = setup();
  packedBytes[100 + 69] = 0; // 6464 class 0
  assert.equal(stepLegacyEntityWorkDeposit(input), true);
  assert.deepEqual(log, [["d", 2]]);
  assert.deepEqual([state[2929 + 5], state[1313 + 5]], [-109, 1]);
  const built = setup(); built.packedBytes[100 + 69] = 0; built.state[8627 + 2] = 1;
  stepLegacyEntityWorkDeposit(built.input); assert.equal(built.state[1313 + 5], 50);
  const seven = setup(); seven.packedBytes[100 + 69] = 0; seven.state[8749 + 2] = 7;
  stepLegacyEntityWorkDeposit(seven.input); assert.equal(seven.state[1313 + 5], 51);
}
// Type 51: record owner C joined -> C becomes 55; otherwise the unit gives up (6161 3, type 87).
{
  const { state, packedBytes, input } = setup();
  state[2828 + 5] = 51; state[8810 + 2] = 9; packedBytes[100 + 51] = 3;
  stepLegacyEntityWorkDeposit(input);
  assert.equal(input.scratch.C, 9); assert.equal(state[2828 + 9], 55);
  const off = setup(); off.state[2828 + 5] = 51; off.state[8810 + 2] = 9; off.state[1313 + 9] = -1;
  stepLegacyEntityWorkDeposit(off.input);
  assert.deepEqual([off.state[6161 + 5], off.state[2828 + 5]], [3, 87]);
}
// Not the owner, or not a full load: reroll, false (after f.d).
{
  const a = setup(); a.state[8810 + 2] = 7;
  assert.equal(stepLegacyEntityWorkDeposit(a.input), false); assert.deepEqual(a.log, [["d", 2], ["x"]]);
  const b = setup(); b.state[3636 + 5] = 8;
  assert.equal(stepLegacyEntityWorkDeposit(b.input), false);
}
// Built small record (type 5, 8627 1): negate g[2][i] where g[0][i] == rec; 1313 = 50.
{
  const { state, gRows, input } = setup();
  state[8749 + 2] = 5; state[8627 + 2] = 1; gRows[0][3] = 2; gRows[2][3] = 4;
  assert.equal(stepLegacyEntityWorkDeposit(input), true);
  assert.equal(gRows[2][3], -4); assert.equal(state[1313 + 5], 50);
  const unbuilt = setup(); unbuilt.state[8749 + 2] = 5;
  assert.equal(stepLegacyEntityWorkDeposit(unbuilt.input), false, "unbuilt small record");
}
// A site missing from f[0]: index reaches 10 and f[1][10] throws (caught by e()'s handler).
{
  const { fRows, input } = setup();
  fRows[0][1] = 0;
  assert.throws(() => stepLegacyEntityWorkDeposit(input), RangeError);
}
console.log("private boolean f() (work deposit) OK");
