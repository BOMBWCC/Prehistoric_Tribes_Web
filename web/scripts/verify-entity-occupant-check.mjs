// Regression test for LegacyEntityOccupantCheck.ts (private boolean
// c(byte), an()'s own occupant-compatibility check).
import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";
import { denseRequire } from "./dense-layout-require.mjs";

const file = new URL("../src/sim/units/LegacyEntityOccupantCheck.ts", import.meta.url).pathname;
const module = { exports: {} };
const output = ts.transpileModule(fs.readFileSync(file, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
vm.runInNewContext(output, { require: denseRequire, module, exports: module.exports, Int8Array, Int16Array });
const { checkLegacyEntityOccupant } = module.exports;

function make(overrides = {}) {
  return {
    state: new Int8Array(20000),
    packedBytes: new Int8Array(1000),
    packedOffsets: new Int16Array(200),
    id: 4,
    ...overrides,
  };
}

// occupant === state[4747+id] AND type NOT excluded -> immediate accept.
{
  const input = make();
  input.state[4747 + 4] = 9;
  input.state[2828 + 4] = 20; // not in {10,12,13,15,16}
  assert.equal(checkLegacyEntityOccupant(input, 9), true);
}

// occupant === state[4747+id] but type IS excluded -> falls through to
// the second gate, which then rejects on the type<10||type>16 check
// (excluded types are all within [10,16], so the range check itself
// doesn't reject -- but the occupant-range check does, since 9 is
// outside [-110,-61]).
{
  const input = make();
  input.state[4747 + 4] = 9;
  input.state[2828 + 4] = 12; // excluded
  assert.equal(checkLegacyEntityOccupant(input, 9), false);
}

// type outside [10,16] entirely, occupant mismatch -> reject at the
// second gate's own type check.
{
  const input = make();
  input.state[4747 + 4] = 9;
  input.state[2828 + 4] = 5;
  assert.equal(checkLegacyEntityOccupant(input, 3), false);
}

// Second-gate accept path: type in [10,16], occupant in [-110,-61],
// (type===12||16) && (local2===12||16) && state[9822-occupant]>0.
{
  const input = make();
  input.state[4747 + 4] = 0; // mismatch, forces fallthrough
  input.state[2828 + 4] = 12;
  const occupant = -80;
  input.packedOffsets[16] = 300;
  input.packedOffsets[17] = 400;
  input.packedBytes[400 + 3] = 5;
  input.state[9772 - occupant] = 11; // local2 index = 300+5+11 = 316
  input.packedBytes[316] = 16; // local2 = 16
  input.state[9822 - occupant] = 1; // > 0
  assert.equal(checkLegacyEntityOccupant(input, occupant), true);
}

// Second-gate fallback accept path: state[9872-occupant]>0 && local2===type.
{
  const input = make();
  input.state[4747 + 4] = 0;
  input.state[2828 + 4] = 11; // not 12/16, so first accept path is skipped
  const occupant = -75;
  input.packedOffsets[16] = 300;
  input.packedOffsets[17] = 400;
  input.packedBytes[400 + 3] = 2;
  input.state[9772 - occupant] = 4; // local2 index = 300+2+4 = 306
  input.packedBytes[306] = 11; // local2 === type (11)
  input.state[9872 - occupant] = 1; // > 0
  assert.equal(checkLegacyEntityOccupant(input, occupant), true);
}

console.log("an()'s occupant check (private boolean c(byte)) OK");
