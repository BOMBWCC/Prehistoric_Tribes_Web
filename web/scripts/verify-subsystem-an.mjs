// Regression test for LegacySubsystemAn.ts (private void an(),
// bytecode/b-javap.txt offsets 0..396), subsystemB's own onAn target.
import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";
import { denseRequire } from "./dense-layout-require.mjs";

const file = new URL("../src/sim/tribe/LegacySubsystemAn.ts", import.meta.url).pathname;
const module = { exports: {} };
const output = ts.transpileModule(fs.readFileSync(file, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
vm.runInNewContext(output, { require: denseRequire, module, exports: module.exports, Int8Array, Int16Array });
const { stepLegacySubsystemAn } = module.exports;

function make(overrides = {}) {
  const dense = new Int8Array(20000);
  const grid = Array.from({ length: 10 }, () => new Int8Array(10));
  return {
    dense,
    packedBytes: new Int8Array(1000),
    packedOffsets: new Int16Array(200),
    grid,
    id: 4,
    onOccupantCheck: () => false,
    onBBoolean: () => false,
    onRawAction: () => {},
    onN: () => {},
    onGroupMode: () => {},
    randomRemainder: () => 0,
    mapWidth: 96,
    mapHeight: 96,
    ...overrides,
  };
}

// type included, occupant check accepts -> onGroupMode(1), nothing else.
{
  const calls = [];
  const input = make({
    onOccupantCheck: () => true,
    onGroupMode: (mode) => calls.push(["group", mode]),
    onBBoolean: () => { calls.push("bbool"); return false; },
  });
  input.dense[2828 + 4] = 10;
  input.dense[6262 + 4] = 3;
  input.dense[6363 + 4] = 5;
  stepLegacySubsystemAn(input);
  assert.deepEqual(calls, [["group", 1]]);
  assert.equal(input.dense[3131 + 4], 3);
  assert.equal(input.dense[3232 + 4], 5);
}

// type included, occupant check rejects, onBBoolean returns true ->
// stop immediately, no further action.
{
  const calls = [];
  const input = make({
    onOccupantCheck: () => false,
    onBBoolean: () => true,
    onRawAction: (...args) => calls.push(["action", ...args]),
    onN: () => calls.push("n"),
  });
  input.dense[2828 + 4] = 12;
  stepLegacySubsystemAn(input);
  assert.deepEqual(calls, []);
}

// type included, rejected, onBBoolean false, dense[3636+id]>0 -> onRawAction + onN.
{
  const calls = [];
  const input = make({
    onOccupantCheck: () => false,
    onBBoolean: () => false,
    onRawAction: (id, action) => calls.push(["action", id, action]),
    onN: () => calls.push("n"),
  });
  input.dense[2828 + 4] = 13;
  input.dense[3636 + 4] = 1;
  input.packedOffsets[160] = 50;
  input.packedBytes[50 + 13] = 7;
  stepLegacySubsystemAn(input);
  assert.deepEqual(calls, [["action", 4, 7], "n"]);
}

// type included, rejected, onBBoolean false, dense[3636+id]<=0, type in {12,16} -> reset path.
{
  const calls = [];
  const input = make({
    onOccupantCheck: () => false,
    onBBoolean: () => false,
    onRawAction: (id, action) => calls.push(["action", id, action]),
  });
  input.dense[2828 + 4] = 16;
  input.dense[3636 + 4] = 0;
  stepLegacySubsystemAn(input);
  assert.deepEqual(calls, [["action", 4, 60]]);
  assert.equal(input.dense[6464 + 4], 12);
  assert.equal(input.dense[4444 + 4], 0);
}

// type included, rejected, onBBoolean false, dense[3636+id]<=0, type NOT in {12,16} -> no-op.
{
  const calls = [];
  const input = make({
    onOccupantCheck: () => false,
    onBBoolean: () => false,
    onRawAction: (...args) => calls.push(args),
  });
  input.dense[2828 + 4] = 10;
  input.dense[3636 + 4] = 0;
  stepLegacySubsystemAn(input);
  assert.deepEqual(calls, []);
}

// type NOT included -> onLargeGate fires with clamped coordinates.
{
  const calls = [];
  const input = make({
    onLargeGate: (x, y) => calls.push([x, y]),
    randomRemainder: () => 2,
  });
  input.dense[2828 + 4] = 20; // not in {10,12,13,15,16}
  input.dense[4] = 1; // dense[id]
  input.dense[101 + 4] = 1; // dense[101+id]
  stepLegacySubsystemAn(input);
  // x = clamp(1 - 3 + 2, 0, 95) = clamp(0, 0, 95) = 0
  assert.deepEqual(calls, [[0, 0]]);
}

console.log("subsystemB's onAn target (private void an()) OK");
