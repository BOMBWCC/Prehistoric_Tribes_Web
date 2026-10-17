// Regression test for LegacyEntityModeSelect.ts: b.b(int)Z (#345), b.z() (#425),
// b.g()Z (#385), hand-derived from bytecode/b-javap.txt 14160 / 15102 / 14833.
import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import vm from "node:vm";
import { denseRequire } from "./dense-layout-require.mjs";

const file = new URL("../src/sim/units/LegacyEntityModeSelect.ts", import.meta.url).pathname;
const module = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync(file, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { require: denseRequire, module, exports: module.exports, Int8Array, Int16Array, Math });
const { stepLegacyEntityModeSelect, stepLegacyEntityFaceNeighbour, stepLegacyEntityGreetNeighbour } = module.exports;

function setup() {
  const state = new Int8Array(10000); const packedBytes = new Int8Array(3000); const packedOffsets = new Int16Array(300);
  for (const [row, base] of [[1, 100], [39, 200], [53, 1200], [58, 400], [77, 500], [99, 600], [158, 700], [164, 800], [165, 900], [166, 1000], [167, 1100], [171, 1600], [174, 1700]]) packedOffsets[row] = base;
  const gridC = Array.from({ length: 20 }, () => new Int8Array(20));
  const raw = { x: 50, H: 0, y: 0 };
  const scratch = { C: 0, D: 0 };
  const input = { state, packedBytes, packedOffsets, gridC, entityId: 5, team: 0, mapWidth: 20, mapHeight: 20, readBValue: () => 1, raw, scratch };
  state[5] = 5; state[101 + 5] = 5;
  return { state, packedBytes, gridC, raw, scratch, input };
}

// Type 11 in mode 8 (a villager just ordered to a tree): own group H = 11; rows
// t166[11] = 3 .. t166[12] = 6; x = 50 picks y = 4 (t165[3] = 10 <= 50, t165[4] = 60 > 50),
// mode t164[4] = 7; t171[7] = -2 keeps it; not joined (4646 < 0) -> false.
{
  const { state, packedBytes, raw, input } = setup();
  state[2828 + 5] = 11; state[2929 + 5] = 8; state[4646 + 5] = -1; state[4848 + 5] = 3;
  packedBytes[1000 + 11] = 3; packedBytes[1000 + 12] = 6;
  packedBytes[900 + 3] = 10; packedBytes[900 + 4] = 60; packedBytes[900 + 5] = 100;
  packedBytes[800 + 4] = 7; packedBytes[1600 + 7] = -2;
  assert.equal(stepLegacyEntityModeSelect(input, 0), false);
  assert.deepEqual([raw.H, raw.y, state[2929 + 5], state[4848 + 5]], [11, 4, 7, 0]);
}
// 4444 < 0 and not 105/85: H from 1414 (69 at >= 12, else 17); no rows -> mode untouched.
{
  const a = setup(); a.state[4444 + 5] = -1; a.state[1414 + 5] = 20; a.state[2929 + 5] = 8; a.state[4848 + 5] = 3;
  stepLegacyEntityModeSelect(a.input, 0);
  assert.deepEqual([a.raw.H, a.state[4848 + 5], a.state[2929 + 5]], [69, 3, 8]);
  const b = setup(); b.state[4444 + 5] = -1; b.state[2828 + 5] = 85;
  stepLegacyEntityModeSelect(b.input, 0);
  assert.equal(b.raw.H, 85);
}
// H 13 below mode 141: mode -111, facing 4 unless the right cell is a marker (-110..-61).
{
  const a = setup(); a.state[2828 + 5] = 13; a.state[2929 + 5] = 8; a.gridC[5][6] = -124;
  assert.equal(stepLegacyEntityModeSelect(a.input, 0), true);
  assert.deepEqual([a.state[2929 + 5], a.state[606 + 5]], [-111, 4]);
  const b = setup(); b.state[2828 + 5] = 13; b.state[2929 + 5] = 8; b.gridC[5][6] = -70; b.state[606 + 5] = 2;
  stepLegacyEntityModeSelect(b.input, 0); assert.equal(b.state[606 + 5], 0);
  const c = setup(); c.state[2828 + 5] = 13; c.state[2929 + 5] = -110;
  assert.equal(stepLegacyEntityModeSelect(c.input, 0), true);
}
// Joined worker at a small unbuilt record, x >= 85: t171 swaps the mode, 1313 = y - t166[H].
{
  const { state, packedBytes, raw, input } = setup();
  raw.x = 90;
  state[2828 + 5] = 30; state[4646 + 5] = 1; state[4444 + 5] = 2; state[8749 + 2] = 5;
  packedBytes[1000 + 30] = 2; packedBytes[1000 + 31] = 4; packedBytes[900 + 2] = 95; packedBytes[800 + 2] = 20; packedBytes[1600 + 20] = 12;
  assert.equal(stepLegacyEntityModeSelect(input, 0), false);
  assert.deepEqual([state[2929 + 5], state[1313 + 5]], [12, 0]);
  const built = setup(); Object.assign(built.raw, { x: 90 });
  built.state[2828 + 5] = 30; built.state[4646 + 5] = 1; built.state[4444 + 5] = 2; built.state[8749 + 2] = 5; built.state[8627 + 2] = 1;
  built.packedBytes[1000 + 30] = 2; built.packedBytes[1000 + 31] = 4; built.packedBytes[900 + 2] = 95; built.packedBytes[800 + 2] = 20;
  stepLegacyEntityModeSelect(built.input, 0); assert.equal(built.state[1313 + 5], 50, "built record -> 50");
  // type-2 record with 1313 > 0 stops right after the mode write
  const two = setup(); Object.assign(two.raw, { x: 90 });
  two.state[2828 + 5] = 30; two.state[4646 + 5] = 1; two.state[4444 + 5] = 2; two.state[8749 + 2] = 2; two.state[1313 + 5] = 4;
  two.packedBytes[1000 + 30] = 2; two.packedBytes[1000 + 31] = 4; two.packedBytes[900 + 2] = 95; two.packedBytes[800 + 2] = 20; two.packedBytes[1600 + 20] = 12;
  stepLegacyEntityModeSelect(two.input, 0);
  assert.deepEqual([two.state[2929 + 5], two.state[1313 + 5]], [20, 4]);
}
// Row selection: H 72 -> t158[t77[6565]]; H 84 -> t167[1313]; H 83 -> 1313; H 60 carrying -> 1.
{
  const run = (typeValue, setupFn) => {
    const s = setup(); s.state[2828 + 5] = typeValue; setupFn?.(s);
    stepLegacyEntityModeSelect(s.input, 0);
    return s.raw.y;
  };
  assert.equal(run(72, (s) => { s.state[6565 + 5] = 3; s.packedBytes[500 + 3] = 4; s.packedBytes[700 + 4] = 9; }), 9);
  assert.equal(run(84, (s) => { s.state[1313 + 5] = 2; s.packedBytes[1100 + 2] = 7; }), 7);
  assert.equal(run(83, (s) => { s.state[1313 + 5] = 5; }), 5);
  assert.equal(run(60, (s) => { s.state[3535 + 5] = 1; }), 1);
  assert.equal(run(51, (s) => { s.state[6565 + 5] = 1; }), 2);
}
// z(): the teammate in front (facing 2 -> t1[2] = 1, t1[10] = 0) in mode 16 turns to face back.
{
  const { state, packedBytes, gridC, raw, input } = setup();
  state[606 + 5] = 2; packedBytes[100 + 2] = 1; packedBytes[100 + 10] = 0;
  gridC[5][6] = 7; state[2929 + 7] = 16; packedBytes[600 + 8 + 6] = 3;
  stepLegacyEntityFaceNeighbour(input);
  assert.equal(raw.y, 7);
  assert.deepEqual([state[2929 + 7], state[606 + 7], state[3030 + 7], state[4646 + 7]], [-101, 6, -1, -95]);
}
// b(int): modes -101/-100 with x > 20 call z() (seen through its effect on the neighbour).
{
  const { state, packedBytes, gridC, input } = setup();
  state[2828 + 5] = 11; state[2929 + 5] = -100; state[606 + 5] = 2; packedBytes[100 + 2] = 1;
  gridC[5][6] = 8; state[2929 + 8] = 9; state[3535 + 8] = 1;
  stepLegacyEntityModeSelect(input, 0);
  assert.equal(state[2929 + 8], -100);
}
// g(): H 69, x > 98, idle teammate at (6,4) -> own mode -100 (carrying), facing t53[..] % 10.
{
  const { state, packedBytes, gridC, raw, scratch, input } = setup();
  raw.x = 99; state[2828 + 5] = 69; state[3535 + 5] = 1;
  gridC[4][6] = 9; state[2929 + 9] = 9;
  packedBytes[1200 + (12 + 4 - 5) * 25 + 12 + 6 - 5] = 23; packedBytes[600 + 8 + 3] = 2;
  assert.equal(stepLegacyEntityModeSelect(input, 0), true);
  assert.deepEqual([state[2929 + 5], state[606 + 5], state[606 + 9], state[4646 + 5], raw.y, scratch.C, scratch.D], [-100, 3, 7, -94, 9, 6, 4]);
  const none = setup(); none.raw.x = 99; none.state[2828 + 5] = 69;
  assert.equal(stepLegacyEntityGreetNeighbour(none.input), false);
}
console.log("b.b(int)Z / z() / g()Z mode selection OK");
