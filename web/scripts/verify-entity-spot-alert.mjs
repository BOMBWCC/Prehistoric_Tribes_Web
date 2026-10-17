// Behaviour test for LegacyEntitySpotAlert.ts: private boolean h(),
// bytecode/b-javap.txt line 16152, offsets 0..738.
import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";
import { denseRequire } from "./dense-layout-require.mjs";

const path = new URL("../src/sim/units/LegacyEntitySpotAlert.ts", import.meta.url).pathname;
const output = ts.transpileModule(fs.readFileSync(path, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(output, { require: denseRequire, module, exports: module.exports, Int8Array, Int16Array, Math });
const { stepLegacyEntitySpotAlert } = module.exports;

const V = 8;   // (8 & 7) === 0, so frame 0 hits its scan turn

function fixture(overrides = {}) {
  const packedBytes = new Int8Array(2000);
  const packedOffsets = new Int16Array(200);
  packedOffsets[53] = 300;   // the 25x25 score table
  const state = new Int8Array(10000);
  const markerTable = [
    Array.from({ length: 5 }, () => new Int8Array(5)),
    Array.from({ length: 5 }, () => new Int8Array(5)),
  ];
  const calls = [];
  const scratch = { B: 0, z: 0, A: 0 };
  state[V] = 20; state[101 + V] = 30;
  state[7575 + V] = 10;
  state[2828 + V] = 5;   // not an idle 69 unless a case says so
  const input = {
    state, packedBytes, packedOffsets, v: V, team: 0, frame: 0,
    markerTable, jRow4: () => 6, scratch,
    onSpiralGate: (...a) => calls.push(a),
    ...overrides,
  };
  return { input, state, markerTable, calls, scratch, packedBytes };
}

// The scan turn sets 7979 bit 0 and runs the gate.
{
  const { input, state, calls } = fixture();
  stepLegacyEntitySpotAlert(input);
  assert.equal(state[7979 + V] & 1, 1);
  assert.deepEqual(calls, [[7, 17, 20, 30]]);
}

// Off its turn, neither happens.
{
  const { input, state, calls } = fixture({ frame: 3 });
  stepLegacyEntitySpotAlert(input);
  assert.equal(state[7979 + V] & 1, 0);
  assert.deepEqual(calls, []);
}

// A close enough, unseen team-1 marker is marked seen. Score = t53[...] / 10
// must be <= 7575 - 3 = 7.
{
  const { input, markerTable, packedBytes } = fixture();
  markerTable[1][2].set([22, 31, 4, 0], 0);   // dz 2, dA 1 -> ay 13, ax 14
  packedBytes[300 + 13 * 25 + 14] = 70;       // score 7, exactly the limit
  stepLegacyEntitySpotAlert(input);
  assert.equal(markerTable[1][2][3], 1, "marked seen");
}

// ... one point further away is not.
{
  const { input, markerTable, packedBytes } = fixture();
  markerTable[1][2].set([22, 31, 4, 0], 0);
  packedBytes[300 + 13 * 25 + 14] = 80;       // score 8 > 7
  stepLegacyEntitySpotAlert(input);
  assert.equal(markerTable[1][2][3], 0);
}

// A slot with no real type, or already seen, is skipped.
{
  const { input, markerTable, packedBytes } = fixture();
  packedBytes[300 + 13 * 25 + 14] = 0;
  markerTable[1][0].set([22, 31, -1, 0], 0);  // type < 0
  markerTable[1][1].set([22, 31, 4, 1], 0);   // already seen
  stepLegacyEntitySpotAlert(input);
  assert.equal(markerTable[1][0][3], 0, "no type -> untouched");
  assert.equal(markerTable[1][1][3], 1, "already seen -> left at 1");
}

// Team 1 never scans the marker table at all.
{
  const { input, markerTable, packedBytes } = fixture({ team: 1 });
  markerTable[1][2].set([22, 31, 4, 0], 0);
  packedBytes[300 + 13 * 25 + 14] = 0;
  stepLegacyEntitySpotAlert(input);
  assert.equal(markerTable[1][2][3], 0);
}

// Mid-animation: 3030 advances and the unit is held (true) until the frame
// count runs out.
{
  const { input, state } = fixture({ frame: 3 });
  state[2929 + V] = -106;
  state[3030 + V] = 2;
  assert.equal(stepLegacyEntitySpotAlert(input), true);
  assert.equal(state[3030 + V], 3);
}

// ... and at the end it releases, with -107 additionally setting bit 1.
{
  const { input, state } = fixture({ frame: 3 });
  state[2929 + V] = -106; state[3030 + V] = 5;
  assert.equal(stepLegacyEntitySpotAlert(input), false);
  assert.equal(state[7979 + V] & 2, 0, "-106 does not set bit 1");

  const other = fixture({ frame: 3 });
  other.state[2929 + V] = -107; other.state[3030 + V] = 5;
  assert.equal(stepLegacyEntitySpotAlert(other.input), false);
  assert.equal(other.state[7979 + V] & 2, 2, "-107 does");
}

// An idle villager with bit 0 set and bit 1 clear starts the -107 look.
{
  const { input, state } = fixture({ frame: 3 });
  state[2828 + V] = 69; state[6464 + V] = 69; state[7777 + V] = 0;
  state[7979 + V] = 1;
  assert.equal(stepLegacyEntitySpotAlert(input), true);
  assert.equal(state[2929 + V], -107);
  assert.equal(state[3030 + V], 0);
}

// With bit 1 set, a NON-settled unit starts the -106 reaction and clears it.
{
  const { input, state } = fixture({ frame: 3 });
  state[2828 + V] = 20;    // not 69 or 105
  state[7979 + V] = 2;
  assert.equal(stepLegacyEntitySpotAlert(input), true);
  assert.equal(state[2929 + V], -106);
  assert.equal(state[7979 + V] & 2, 0, "bit 1 cleared");
}

// ... but a settled idle 69 with bit 0 set and no player order is left alone.
{
  const { input, state } = fixture({ frame: 3 });
  state[2828 + V] = 69; state[7777 + V] = 0;
  state[7979 + V] = 3;     // bits 0 and 1
  state[6464 + V] = 1;     // so the 485 branch does not take it first
  assert.equal(stepLegacyEntitySpotAlert(input), false);
  assert.equal(state[2929 + V], 0, "no animation started");
  assert.equal(state[7979 + V], 3, "and bit 1 is still set");
}

// ... a player order (7777 > 0) makes it react after all.
{
  const { input, state } = fixture({ frame: 3 });
  state[2828 + V] = 69; state[7777 + V] = 2; state[6464 + V] = 1;
  state[7979 + V] = 3;
  assert.equal(stepLegacyEntitySpotAlert(input), true);
  assert.equal(state[2929 + V], -106);
}

// Nothing pending at all -> false, nothing touched.
{
  const { input, state } = fixture({ frame: 3 });
  assert.equal(stepLegacyEntitySpotAlert(input), false);
  assert.equal(state[2929 + V], 0);
}

console.log("h() spot alert OK");
