// Behaviour test for LegacyEntityMarkerCommit.ts: private void H() (#244),
// bytecode/b-javap.txt line 21160, offsets 0..1392. Expected values read off
// the bytecode.
import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";
import { denseRequire } from "./dense-layout-require.mjs";

const path = new URL("../src/sim/units/LegacyEntityMarkerCommit.ts", import.meta.url).pathname;
const output = ts.transpileModule(fs.readFileSync(path, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(output, { require: denseRequire, module, exports: module.exports, Int8Array, Int16Array, Math });
const { stepLegacyEntityMarkerCommit } = module.exports;

const V = 4;

function fixture(overrides = {}) {
  const packedBytes = new Int8Array(2000);
  const packedOffsets = new Int16Array(320);
  packedOffsets[101] = 100;   // the mission rectangle, 4 bytes per q
  packedOffsets[61] = 200;    // marker kind -> unit type
  packedOffsets[62] = 210;    // marker kind -> record multiplier
  packedOffsets[287] = 400;   // tutorial: is this step a "place something" step?
  packedOffsets[288] = 410;   // tutorial: per-mission base
  packedOffsets[291] = 420;   // tutorial: per-mission step count
  const state = new Int8Array(10000);
  const gridC = Array.from({ length: 64 }, () => new Int8Array(64));
  const dShort = new Int16Array(6);
  const calls = [];
  const scratch = { y: 3, z: 11, A: 12, B: 0, a: true, f: false, zInt: 0, D: 0, F: 0 };

  state[V] = 5; state[101 + V] = 6;   // the unit's own cell
  state[2828 + V] = 5;                // an adult worker type
  state[4949 + V] = 2;
  gridC[6][5] = V;                    // ... and it is the one standing on it

  const input = {
    state, packedBytes, packedOffsets, gridC, v: V,
    team: 0, sceneQ: 0, fByte: 0, IByte: 0, bValue: () => 3, nFlag: false,
    dShort, scratch,
    onCoordinateSync: (id, flag) => calls.push(["sync", id, flag]),
    onChangeType: (id, type) => calls.push(["type", id, type]),
    onGroupMode: (arg) => calls.push(["g", arg]),
    onOccupancy: (x, y, mode) => { calls.push(["occ", x, y, mode]); return 50; },
    onPVoid: () => calls.push("p"),
    onIUpdate: (arg) => calls.push(["i", arg]),
    onMoveTrigger: (action, id, id2) => calls.push(["move", action, id, id2]),
    onByteAction: (...args) => calls.push(["queue", ...args]),
    onMarkerRescan: (...args) => calls.push(["rescan", ...args]),
    onAuxRecord: (...args) => calls.push(["aux", ...args]),
    ...overrides,
  };
  return { input, state, calls, scratch, packedBytes, gridC, dShort };
}

// --- offsets 21..211: the out-of-bounds handler ---

// f:B >= 50 skips the rectangle test entirely (offset 41's if_icmpge 141),
// so a flagged team lands straight on the kind-4 handler. An overlay icon
// (dense[4646+v] < 0) takes the a(v,false) + type 69 branch.
{
  const { input, state, calls, scratch } = fixture({ IByte: 1, fByte: 50 });
  scratch.y = 4;
  state[4646 + V] = -1;
  stepLegacyEntityMarkerCommit(input);
  assert.deepEqual(calls, [["sync", V, false], ["type", V, 69]]);
}

// ... and a real slot instead sends the unit away as a type 87.
{
  const { input, state, calls, scratch } = fixture({ IByte: 1, fByte: 50 });
  scratch.y = 4;
  state[4646 + V] = 0;
  stepLegacyEntityMarkerCommit(input);
  assert.deepEqual(calls, [["type", V, 87]]);
  assert.equal(state[6161 + V], 3);
}

// Direction check: a marker OUTSIDE the rectangle is NOT reserved (offsets
// 71..137 each `goto 214` on a failed compare), so the normal body runs.
{
  const { input, calls, scratch, packedBytes } = fixture({ IByte: 1, fByte: 10 });
  packedBytes[100] = 20; packedBytes[101] = 20; packedBytes[102] = 30; packedBytes[103] = 30;
  scratch.y = 4;
  stepLegacyEntityMarkerCommit(input);
  assert.ok(calls.some(([name]) => name === "g"), "the normal body ran");
}

// ... and the same marker inside it is reserved: the unit is sent away.
{
  const { input, calls, scratch, packedBytes } = fixture({ IByte: 1, fByte: 10 });
  packedBytes[100] = 0; packedBytes[101] = 0; packedBytes[102] = 20; packedBytes[103] = 20;
  scratch.y = 4;
  stepLegacyEntityMarkerCommit(input);
  assert.deepEqual(calls, [["type", V, 87]]);
}

// A kind-2 marker is exempt from the rectangle (offset 49's if_icmpeq 214).
{
  const { input, calls, scratch, packedBytes } = fixture({ IByte: 1, fByte: 10 });
  packedBytes[100] = 0; packedBytes[101] = 0; packedBytes[102] = 20; packedBytes[103] = 20;
  scratch.y = 2;
  stepLegacyEntityMarkerCommit(input);
  assert.ok(calls.some(([name]) => name === "g"), "the normal body ran");
}

// --- offsets 214..653: a:Z set, may walk, standing on its own cell ---
{
  const { input, state, calls, scratch, gridC } = fixture();
  gridC[12][11] = 9;               // whoever is already on the marker's cell
  stepLegacyEntityMarkerCommit(input);
  assert.equal(scratch.B, 9, "B:B = gridC[A][z]");
  assert.equal(scratch.f, true, "no stray gate -> may walk");
  assert.deepEqual([state[3131 + V], state[3232 + V]], [11, 12], "target = the marker");
  assert.deepEqual(calls, [["g", 1], ["occ", 5, 6, 0], "p"], "50 / 10 = 5 > bValue 3");
  assert.equal(scratch.zInt, 50);
}

// ... and with the score under B:I, p() is skipped.
{
  const { input, calls } = fixture({ bValue: () => 9, onOccupancy: () => 50 });
  stepLegacyEntityMarkerCommit(input);
  assert.deepEqual(calls, [["g", 1]]);
}

// ... B:I is read after g(1), which may re-type the unit (oracle run 5, frame 12645).
{
  let b = 3;
  const { input, calls } = fixture({ bValue: () => b, onGroupMode: () => { b = 9; calls.push(["g", 1]); }, onOccupancy: () => 50 });
  stepLegacyEntityMarkerCommit(input);
  assert.deepEqual(calls, [["g", 1]], "g(1) raised B:I to 9, so 50 / 10 does not exceed it");
}

// --- offsets 656..902: the marker's cell belongs to someone else ---
{
  const { input, state, calls, scratch, packedBytes, gridC } = fixture();
  gridC[6][5] = 9;                 // the unit is NOT the one on its own cell
  scratch.y = 2;
  state[2828 + V] = 80;            // <= 82 -> teleported onto its record door
  state[4444 + V] = 7;
  state[8383 + 7] = 20; state[8444 + 7] = 21;
  gridC[12][11] = 6;               // B:B
  packedBytes[210 + 2] = 3;        // t62[y]
  packedBytes[200 + 2] = 77;       // t61[y]
  stepLegacyEntityMarkerCommit(input);
  assert.deepEqual([state[V], state[101 + V]], [20, 21], "moved to the record's door");
  assert.equal(state[4747 + V], 6);
  assert.equal(state[4444 + V], 6 * 3 - 101, "B * t62[y] - 101 for kind 2");
  assert.deepEqual(calls, [["type", V, 77], ["occ", 20, 21, 0], ["i", 50]]);
  assert.equal(state[3030 + V], 0);
  assert.equal(state[1313 + V], 1);
}

// --- offsets 239..409 + 905..972: strayed too far -> back to a type-59 idler ---
{
  const { input, state, calls, scratch } = fixture();
  state[6565 + V] = 9;
  state[2828 + V] = 20;            // > 9
  state[V] = 20; state[8384] = 0; state[8445] = 0;   // 20 cells from record 1
  stepLegacyEntityMarkerCommit(input);
  assert.equal(scratch.f, false);
  assert.deepEqual([state[3131 + V], state[3232 + V]], [20, 6], "target = its own cell");
  assert.deepEqual(calls, [["type", V, 59]]);
  assert.equal(state[2929 + V], -95);
  assert.deepEqual([state[3030 + V], state[3636 + V], state[808 + V]], [0, 0, 0]);
}

// ... but a unit already inside the 6-cell box around record 1 may still walk.
{
  const { input, state, scratch } = fixture();
  state[6565 + V] = 9;
  state[2828 + V] = 20;
  state[V] = 5; state[8384] = 3; state[8445] = 4;
  stepLegacyEntityMarkerCommit(input);
  assert.equal(scratch.f, true);
}

// A type-59 baby that may NOT walk stops at offset 434.
{
  const { input, state, calls, scratch } = fixture();
  state[6565 + V] = 9;
  state[2828 + V] = 59;
  state[V] = 20; state[8384] = 0; state[8445] = 0;
  stepLegacyEntityMarkerCommit(input);
  assert.deepEqual(calls, []);
  assert.equal(state[3131 + V], 0, "the target was never written");
  assert.equal(scratch.f, false);
}

// --- offsets 975..1055: a:Z clear ---
{
  const { input, state, scratch, gridC } = fixture();
  scratch.a = false;
  gridC[6][5] = 9;
  state[1313 + V] = 5;
  stepLegacyEntityMarkerCommit(input);
  assert.equal(state[2828 + V], 87);
  assert.equal(state[6161 + V], 3);
}

// --- offsets 1056..1235: the kind-4 extras ---
{
  const { input, state, calls, scratch, gridC, dShort } = fixture();
  scratch.y = 4;
  scratch.F = 17;
  gridC[12][11] = 6;
  dShort[0] = -1;
  state[4949 + V] = 2;
  stepLegacyEntityMarkerCommit(input);
  assert.ok(calls.some((c) => c[0] === "move" && c[1] === 4 && c[2] === V && c[3] === 6));
  assert.equal(dShort[0], 0);
  assert.ok(calls.some((c) => c[0] === "queue" && c[1] === 6 && c[2] === 11 && c[3] === 12));
  assert.equal(scratch.D, 17, "D:B = F:B");
  assert.ok(calls.some((c) => c[0] === "rescan" && c[1] === 5 && c[2] === 6 && c[3] === 2));
}

// dense[7979+v] & 2 suppresses both the move trigger and the rescan.
{
  const { input, state, calls, scratch } = fixture();
  scratch.y = 4;
  state[7979 + V] = 2;
  stepLegacyEntityMarkerCommit(input);
  assert.ok(!calls.some((c) => c[0] === "move"));
  assert.ok(!calls.some((c) => c[0] === "rescan"));
}

// --- offsets 1238..1392: the tutorial hook ---
{
  const { input, calls, scratch, packedBytes } = fixture();
  scratch.y = 4;
  scratch.B = 0;
  packedBytes[420] = 1;      // t291[q] -- step 0 is still live
  packedBytes[410] = 2;      // t288[q]
  packedBytes[400 + 2] = 1;  // t287[t288[q] + f:B] == 1
  stepLegacyEntityMarkerCommit(input);
  assert.ok(calls.some((c) => c[0] === "aux" && c[1] === V && c[2] === 0 && c[3] === 11 && c[4] === 12));
}

// It also fires from the reserved-marker exit (both paths fall into 1238).
{
  const { input, calls, scratch, packedBytes } = fixture({ IByte: 1, fByte: 0 });
  scratch.y = 4;
  packedBytes[100] = 0; packedBytes[101] = 0; packedBytes[102] = 20; packedBytes[103] = 20;
  packedBytes[420] = 1; packedBytes[410] = 2; packedBytes[400 + 2] = 1;
  stepLegacyEntityMarkerCommit(input);
  assert.deepEqual(calls[0], ["type", V, 87], "the reserved-marker handler ran");
  assert.ok(calls.some((c) => c[0] === "aux"), "... and the tutorial hook still fired");
}

// A retired step (f:B past t291[q]) does not.
{
  const { input, calls, scratch, packedBytes } = fixture({ fByte: 50 });
  scratch.y = 4;
  packedBytes[420] = 1; packedBytes[410] = 2; packedBytes[400 + 2] = 1;
  stepLegacyEntityMarkerCommit(input);
  assert.ok(!calls.some((c) => c[0] === "aux"));
}

console.log("H() #244 marker commit OK");
