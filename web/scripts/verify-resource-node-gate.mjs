// Behaviour test for LegacyResourceNodeGate.ts: private boolean c(byte)
// (#360), bytecode/b-javap.txt line 21972, offsets 0..290. Expected values
// read off the bytecode.
import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";
import { denseRequire } from "./dense-layout-require.mjs";

const path = new URL("../src/sim/world/LegacyResourceNodeGate.ts", import.meta.url).pathname;
const output = ts.transpileModule(fs.readFileSync(path, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(output, { require: denseRequire, module, exports: module.exports, Int8Array, Int16Array });
const { checkLegacyResourceNodeGate } = module.exports;

// t17[3] = 40; t16[40 + kind] maps a node kind to the unit type that works it.
const make = () => {
  const packedBytes = new Int8Array(2000);
  const tableOffsets = new Int16Array(64);
  tableOffsets[16] = 100;
  tableOffsets[17] = 300;
  packedBytes[300 + 3] = 40;
  packedBytes[100 + 40 + 2] = 10; // kind 2 -> a type-10 gatherer
  packedBytes[100 + 40 + 5] = 12; // kind 5 -> a type-12 unit
  return { state: new Int8Array(10000), packedBytes, tableOffsets, v: 4 };
};

const CELL = -64; // slot 3: kind at 9772+64, amount at 9822+64, regrow at 9872+64

// Offsets 0..108: the unit's own current target answers true for any type
// outside {10,12,13,15,16}.
{
  const input = make();
  input.state[4747 + 4] = CELL;
  input.state[2828 + 4] = 69;
  assert.equal(checkLegacyResourceNodeGate(input, CELL), true);
  // ... but one of those five types falls through to the real checks.
  input.state[2828 + 4] = 10;
  assert.equal(checkLegacyResourceNodeGate(input, CELL), false, "no amount, no regrow");
}

// Offsets 110..154: only types 10..16, and only node cells.
{
  const input = make();
  input.state[2828 + 4] = 69;
  assert.equal(checkLegacyResourceNodeGate(input, CELL), false, "type out of range");
  input.state[2828 + 4] = 10;
  assert.equal(checkLegacyResourceNodeGate(input, -60), false, "cell above the node range");
  assert.equal(checkLegacyResourceNodeGate(input, -111), false, "cell below the node range");
}

// Offsets 197..254: a type-12 unit at a type-12 node passes on amount alone.
{
  const input = make();
  input.state[2828 + 4] = 12;
  input.state[9772 - CELL] = 5; // kind 5 -> mapped 12
  input.state[9822 - CELL] = 3; // still has stock
  assert.equal(checkLegacyResourceNodeGate(input, CELL), true);
  input.state[9822 - CELL] = 0; // emptied, and no regrow yet
  assert.equal(checkLegacyResourceNodeGate(input, CELL), false);
}

// Offsets 258..290: any other unit needs the regrow counter AND a matching kind.
{
  const input = make();
  input.state[2828 + 4] = 10;
  input.state[9772 - CELL] = 2; // kind 2 -> mapped 10
  input.state[9822 - CELL] = 9; // amount alone is NOT enough for a type-10 unit
  assert.equal(checkLegacyResourceNodeGate(input, CELL), false, "regrow counter is 0");
  input.state[9872 - CELL] = 1;
  assert.equal(checkLegacyResourceNodeGate(input, CELL), true);
  input.state[9772 - CELL] = 5; // kind 5 -> mapped 12, not this unit's type
  assert.equal(checkLegacyResourceNodeGate(input, CELL), false);
}

console.log("c(byte) #360 resource-node gate OK");
