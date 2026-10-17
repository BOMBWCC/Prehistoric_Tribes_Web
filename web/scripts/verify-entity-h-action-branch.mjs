import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";
import { denseRequire } from "./dense-layout-require.mjs";

const path = `${new URL("../src/sim/units/LegacyEntityHActionBranch.ts", import.meta.url).pathname}`;
const output = ts.transpileModule(fs.readFileSync(path, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(output, { require: denseRequire, module, exports: module.exports, Int8Array, Int16Array });
const { stepLegacyEntityHActionBranch } = module.exports;

// Hand-derived from b-javap.txt 5221, offsets 163..960.
function setup() {
  const state = new Int8Array(10000); const packedBytes = new Int8Array(1000); const packedOffsets = new Int16Array(100);
  packedOffsets[29] = 100; packedOffsets[39] = 200; packedOffsets[41] = 300;
  packedBytes[100 + 4] = 69; packedBytes[100 + 16] = 21;
  state[3] = 5; state[101 + 3] = 6; state[3131 + 3] = 7; state[3232 + 3] = 8; state[8810 + 2] = 3;
  state[6464 + 3] = -9; state[6262 + 3] = -9; state[6363 + 3] = -9;
  const log = [];
  const input = {
    state, packedBytes, packedOffsets, entityId: 3, argument: 0, k1: 1, k2: 2, m: 4, fN: false, K: 60, mapWidth: 10,
    readEntityCell: () => 3,
    onFC: (id) => log.push(["fc", id]),
    onChangeType: (id, type) => { log.push(["a", id, type]); state[2828 + id] = type; },
    onNearestCandidate: (a, b) => log.push(["b", a, b]),
  };
  return { state, packedBytes, input, log };
}

// arg 0, K >= 50 skips the t41[m] test; own cell and t39[m] != 1 -> f.c(v);
// target written; 1414 < 12 -> no a(); t39[type 0] != 1 -> no b().
{
  const { state, input, log } = setup();
  stepLegacyEntityHActionBranch(input);
  assert.deepEqual(log, [["fc", 3]]);
  assert.equal(state[6464 + 3], 69); assert.equal(state[6262 + 3], 7); assert.equal(state[6363 + 3], 8);
}

// t39[m] == 1 and 8810[k2] == v: no f.c, no target write, but 535.. still runs:
// 1414 >= 12 with arg < 2 -> a(v, m); new type has t39 == 1 -> b(k1, k2).
{
  const { state, packedBytes, input, log } = setup();
  packedBytes[200 + 4] = 1; packedBytes[300 + 4] = 1;
  state[1414 + 3] = 12;
  stepLegacyEntityHActionBranch(input);
  assert.deepEqual(log, [["a", 3, 4], ["b", 1, 2]]);
  assert.equal(state[6464 + 3], -9);
}

// K < 50 and t41[m] == 0: target block stops before f.c, the rest continues.
{
  const { state, input, log } = setup();
  input.K = 10; state[1414 + 3] = 30;
  stepLegacyEntityHActionBranch(input);
  assert.deepEqual(log, [["a", 3, 4]]);
  assert.equal(state[6262 + 3], -9);
}

// arg 2, m 16, t41[6464] == 7: target via t29[m] = 21; 535.. re-reads
// 6464, so a(v, 16) needs t41[21] in {3,7}; cell not the unit's -> no f.c.
{
  const { state, packedBytes, input, log } = setup();
  input.argument = 2; input.m = 16; input.readEntityCell = () => 0;
  state[6464 + 3] = 9; packedBytes[300 + 9] = 7; packedBytes[300 + 21] = 3; state[1414 + 3] = 12;
  stepLegacyEntityHActionBranch(input);
  assert.equal(state[6464 + 3], 21);
  assert.deepEqual(log, [["a", 3, 16]]);
  packedBytes[300 + 21] = 0; state[6464 + 3] = 9; log.length = 0;
  stepLegacyEntityHActionBranch(input);
  assert.deepEqual(log, [], "t41[21] == 0 after the rewrite: no a()");
}

// f.N: the arg != 0 target block stops and a() is skipped for arg >= 2;
// a type-13 unit slides 3131 left onto -127, then right onto itself.
{
  const { state, input, log } = setup();
  input.argument = 5; input.fN = true; state[1414 + 3] = 20;
  state[2828 + 3] = 13; state[3131 + 3] = 4; state[3232 + 3] = 2;
  const cells = { "2,3": -127, "2,4": 3 };
  input.readEntityCell = (row, column) => cells[`${row},${column}`] ?? 0;
  stepLegacyEntityHActionBranch(input);
  assert.deepEqual(log, []);
  assert.equal(state[3131 + 3], 4, "4 -> 3 (left is -127) -> 4 (right is the unit)");
}

console.log("b.h(int) action branch OK");
