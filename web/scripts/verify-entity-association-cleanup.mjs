// Regression test for LegacyEntityAssociationCleanup.ts (private void x()).
// Expected values derived by hand from bytecode/b-javap.txt 11946..12641.
import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import vm from "node:vm";
import { denseRequire } from "./dense-layout-require.mjs";

const module = { exports: {} };
const output = ts.transpileModule(fs.readFileSync(new URL("../src/sim/units/LegacyEntityAssociationCleanup.ts", import.meta.url).pathname, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
vm.runInNewContext(output, { require: denseRequire, module, exports: module.exports, Int8Array, Int16Array });
const { stepLegacyEntityAssociationCleanup } = module.exports;

function make(over = {}) {
  const state = new Int8Array(10000);
  const packedBytes = new Int8Array(1000);
  const packedOffsets = new Int16Array(200);
  const gridC = Array.from({ length: 30 }, () => new Int8Array(30));
  const log = [];
  const id = 4;
  const record = 7;
  packedOffsets[24] = 20; packedOffsets[25] = 40; packedOffsets[111] = 60; packedOffsets[160] = 100;
  packedBytes[20 + 3] = 8; packedBytes[40 + 3] = 11; packedBytes[60 + 3] = 13;
  packedBytes[100 + 59] = 69;
  state[4444 + id] = record;
  state[8932 + record] = 3;
  state[8993 + record] = id;
  state[8749 + record] = 3;
  state[8383 + record] = 2;
  state[8444 + record] = 5;
  state[id] = 12; state[101 + id] = 9;
  state[2828 + id] = 59;
  state[1818 + id] = 4;
  state[1010 + id] = 6;
  const input = {
    state, packedBytes, packedOffsets, gridC, entityId: id, fields: { x: -7 }, team: 0, fP: 0, fQ: 0, mapWidth: 20, mapHeight: 20,
    onRecordWorkerLevel: (r) => log.push(["b", r]),
    // The door search writes the free cell it finds into 3131/3232.
    onGate: (mode, scan, x, y) => { log.push(["gate", mode, scan, x, y]); if (scan === 127) { state[3131 + id] = 10; state[3232 + id] = 16; } },
    onP: () => log.push(["P"]),
    onSelectionRelease: (v) => log.push(["h", v]),
    onAuxiliary: (...args) => log.push(["aux", ...args]),
    onSceneDispatch: (value) => log.push(["scene", value]),
    onFP: (value) => log.push(["fp", value]),
    onNeeds: () => { log.push(["n"]); return false; },
    onQ: () => log.push(["Q"]),
    onPStep: () => log.push(["p"]),
    onOccupancy: (x, y, layer) => log.push(["z", x, y, layer]),
    onN: () => log.push(["N"]),
    randomRemainder: () => 1,
    ...over,
  };
  return { state, gridC, log, input, id, record };
}

// A released type-59 worker: unlinked, stepped onto the door cell, then looks for its next task.
{
  const { state, gridC, log, input, id, record } = make();
  stepLegacyEntityAssociationCleanup(input);
  assert.equal(state[8932 + record], 2);
  assert.equal(state[8993 + record], 0);
  assert.equal(state[4646 + id], -1);
  assert.deepEqual([state[id], state[101 + id]], [10, 16], "position = the door cell in 3131/3232");
  assert.equal(gridC[16][10], id);
  assert.equal(state[606 + id], 13);
  assert.equal(state[1818 + id], 2);
  assert.deepEqual([state[6464 + id], state[6262 + id], state[6363 + id]], [69, 10, 16]);
  assert.equal(state[5050 + id], 6);
  // Wander target x-3+1 = 8, y-3+1 = 14.
  assert.deepEqual(log, [
    ["b", record], ["gate", 1, 127, 10, 16], ["P"], ["h", id],
    ["n"], ["gate", 1, 21, 8, 14], ["Q"], ["p"], ["z", 10, 16, 0],
  ]);
}

// n() found something: no wander, still p() and z.
{
  const { log, input } = make({ onNeeds: () => true });
  stepLegacyEntityAssociationCleanup(input);
  assert.deepEqual(log.slice(4), [["p"], ["z", 10, 16, 0]]);
}

// Scout hint: f.p & 3 == 1, 7575 > 3, team 0, f.q < 7.
{
  const { state, log, input, id } = make({ fP: 1 });
  state[7575 + id] = 4;
  stepLegacyEntityAssociationCleanup(input);
  assert.deepEqual(log.slice(4), [["aux", id, 0, 1], ["scene", 61], ["fp", 3]]);
}

// A type whose t160 is not 69: N() when 6161 < 2; type >= 109 also clears 6161.
{
  const { state, log, input, id } = make();
  state[2828 + id] = 110;
  state[6161 + id] = 3;
  stepLegacyEntityAssociationCleanup(input);
  assert.equal(state[6161 + id], 0);
  assert.deepEqual(log.slice(4), [["N"]]);
}

// Multi-hop predecessor unlink (20 -> 10 -> id -> 0).
{
  const { state, input, id, record } = make();
  state[8993 + record] = 20;
  state[4545 + 20] = 10;
  state[4545 + 10] = id;
  stepLegacyEntityAssociationCleanup(input);
  assert.equal(state[4545 + 10], 0);
  assert.equal(state[8993 + record], 20);
  // The walk's cursor is b.x:I itself (offsets 117..164): it is left on the predecessor.
  assert.equal(input.fields.x, 10);
}

console.log("b.x() worker release OK");
