// Behaviour test for LegacyEntityStrikeGate.ts: private boolean
// a(int,int,int,int,int,int,int,int) (#298), bytecode/b-javap.txt line 34401,
// offsets 0..1435. Expected values read off the bytecode.
import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";
import { denseRequire } from "./dense-layout-require.mjs";

const path = new URL("../src/sim/units/LegacyEntityStrikeGate.ts", import.meta.url).pathname;
const output = ts.transpileModule(fs.readFileSync(path, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(output, { require: denseRequire, module, exports: module.exports, Int8Array, Int16Array, Math });
const { stepLegacyEntityStrikeGate } = module.exports;

const V = 4;
const CHIEF = 9;
const TARGET = 52;

// t78: index 14+p4 picks the coordinate row pair, index k[0] picks the row the
// damage lands on. Rows are saveOffsets entries, so 0/101 are the entity x/y
// rows and 1919 the entity hit-point row.
function fixture(k = [1, 0, TARGET, 1], overrides = {}) {
  const packedBytes = new Int8Array(3000);
  const packedOffsets = new Int16Array(320);
  const saveOffsets = new Int16Array(320);
  packedOffsets[78] = 100;
  packedOffsets[53] = 400;   // the 25x25 distance table
  packedOffsets[138] = 900;
  packedOffsets[178] = 1000;
  packedBytes[100 + 14 + 1] = 20;   // t78[15] -> row pair 20/21
  packedBytes[100 + 1] = 19;        // t78[k0 1] -> row 19
  packedBytes[100 + 2] = 21;        // t78[k0 2] -> row 21
  packedBytes[100 + 5] = 19;        // t78[k0 5]
  packedBytes[1000 + 1] = 77;       // t178[1]
  saveOffsets[19] = 1919;
  saveOffsets[20] = 0;
  saveOffsets[21] = 101;
  saveOffsets[22] = 8505;

  const state = new Int8Array(10000);
  const dShort = new Int16Array(6);
  const cHitPoints = new Int8Array(300);
  const calls = [];
  const scratch = { ax: 0, ay: 0, D: 0, z: 0, A: 0, team: 0 };

  state[V] = 5; state[101 + V] = 6;
  state[CHIEF] = 40; state[101 + CHIEF] = 40;   // far from V unless moved
  state[TARGET] = 5; state[101 + TARGET] = 7;
  state[1919 + TARGET] = 40;
  state[1414 + TARGET] = 20;
  state[2828 + TARGET] = 69;

  const input = {
    state, packedBytes, packedOffsets, saveOffsets,
    k: Int8Array.from(k),
    v: V, chief: CHIEF, dShort, cHitPoints, agFlag: false, scratch,
    onClassifyCell: (...args) => calls.push(["classify", ...args]),
    onMarkerRescan: (...args) => calls.push(["rescan", ...args, "team" + scratch.team]),
    onFilterWorkers: (...args) => calls.push(["filter", ...args]),
    onVacate: (...args) => calls.push(["vacate", ...args]),
    onHitSprite: (...args) => calls.push(["sprite", ...args]),
    onMoveTrigger: (...args) => calls.push(["move", ...args]),
    onByteAction: (...args) => calls.push(["queue", ...args]),
    random: () => 0,
    ...overrides,
  };
  return { input, state, calls, scratch, packedBytes, cHitPoints, dShort };
}

// --- offsets 0..109: ax and ay ---

// p4 === 0 -> ay is the literal 10; p4 === 2 -> 0; otherwise the t53 lookup.
{
  const { input, scratch } = fixture();
  stepLegacyEntityStrikeGate(input, 5, 6, 3, 0, TARGET, 0, 100, 0);
  assert.equal(scratch.ay, 10);

  const second = fixture();
  stepLegacyEntityStrikeGate(second.input, 5, 6, 3, 2, TARGET, 0, 100, 0);
  assert.equal(second.scratch.ay, 0);
}

// The t53 index is (12 + rowY - p2) * 25 + 12 + rowX - p1, over rows 20/21 of
// the TARGET -- here (5,7) against a blow aimed at (5,6).
{
  const { input, scratch, packedBytes } = fixture();
  packedBytes[400 + (12 + 7 - 6) * 25 + 12 + 5 - 5] = 70;
  stepLegacyEntityStrikeGate(input, 5, 6, 3, 1, TARGET, 0, 100, 0);
  assert.equal(scratch.ax, 20);
  assert.equal(scratch.ay, 7, "70 / 10");
}

// Offsets 112..165: inside p8 the blow is relocated onto the target's cell.
{
  const { input, calls, packedBytes } = fixture();
  packedBytes[400 + (12 + 7 - 6) * 25 + 12] = 20;   // ay = 2
  stepLegacyEntityStrikeGate(input, 5, 6, 3, 1, TARGET, 0, 100, 5);
  assert.deepEqual(calls[0], ["classify", 5, 7, 1, 1], "p1/p2 became the target's own cell");
}

// --- offsets 176..311: the refusals ---
{
  // f.ag with a team-0 entity target.
  const a = fixture([1, 0, 30, 1], { agFlag: true });
  assert.equal(stepLegacyEntityStrikeGate(a.input, 5, 6, 3, 0, TARGET, 0, 100, 0), false);

  // t78[k0] === 127.
  const b = fixture();
  b.packedBytes[100 + 1] = 127;
  assert.equal(stepLegacyEntityStrikeGate(b.input, 5, 6, 3, 0, TARGET, 0, 100, 0), false);

  // A target already down.
  const c = fixture();
  c.state[1919 + TARGET] = 0;
  assert.equal(stepLegacyEntityStrikeGate(c.input, 5, 6, 3, 0, TARGET, 0, 100, 0), false);

  // Below p3 2, k[3] === 0 means same team -- never hit.
  const e = fixture([1, 0, TARGET, 0]);
  assert.equal(stepLegacyEntityStrikeGate(e.input, 5, 6, 1, 0, TARGET, 0, 100, 0), false);
  // ... but p3 >= 2 goes through.
  const f = fixture([1, 0, TARGET, 0]);
  assert.equal(stepLegacyEntityStrikeGate(f.input, 5, 6, 2, 0, TARGET, 0, 100, 0), true);
}

// --- offsets 312..456: fighting beside the chief hits 1.5x as hard ---
{
  const near = fixture();
  near.state[CHIEF] = 5; near.state[101 + CHIEF] = 6;
  stepLegacyEntityStrikeGate(near.input, 5, 6, 0, 0, TARGET, 0, 100, 0);
  // p7 100 -> 150, then / (ay 10 + 1) = 13
  assert.equal(near.state[1919 + TARGET], 40 - 13);

  const far = fixture();
  stepLegacyEntityStrikeGate(far.input, 5, 6, 0, 0, TARGET, 0, 100, 0);
  assert.equal(far.state[1919 + TARGET], 40 - 9, "100 / 11");
}

// --- offsets 458..673: a record target wakes up ---
{
  const { input, state, calls, packedBytes } = fixture([2, 3, 30, 1]);
  packedBytes[100 + 2] = 22;         // t78[2] -> row 22 (8505, record hp)
  state[8505 + 30] = 60;
  state[8383 + 30] = 12; state[8444 + 30] = 13;
  packedBytes[900 + 104 + 3] = 4;    // t138[104 + k1]
  packedBytes[900 + 130 + 3] = 6;
  stepLegacyEntityStrikeGate(input, 5, 6, 3, 0, TARGET, 0, 100, 0);
  assert.equal(state[9054 + 30] & 128 ? 1 : 0, 1, "9054 bit 7 set");
  assert.deepEqual(calls.find((c) => c[0] === "rescan"), ["rescan", 14, 16, 8, "team1"],
    "rescan runs from the record's centre with the team bit flipped");
  assert.equal(scratchTeamRestored(input), true);
  assert.deepEqual(calls.find((c) => c[0] === "filter"), ["filter", 30, true]);
  // 100 halved = 50, / (10 + 1) = 4
  assert.equal(state[8505 + 30], 60 - 4);
}
function scratchTeamRestored(input) { return input.scratch.team === 0; }

// ... and an already-awake record skips the rescan but still halves.
{
  const { input, state, calls, packedBytes } = fixture([2, 3, 30, 1]);
  packedBytes[100 + 2] = 22;
  state[8505 + 30] = 60;
  state[9054 + 30] = -128;   // bit 7 already set
  stepLegacyEntityStrikeGate(input, 5, 6, 3, 0, TARGET, 0, 100, 0);
  assert.equal(calls.some((c) => c[0] === "rescan"), false);
  assert.equal(state[8505 + 30], 60 - 4);
}

// --- offsets 674..738: the 7979 & 8 halving, and a blow too weak to land ---
{
  const { input, state } = fixture();
  state[7979 + TARGET] = 8;
  stepLegacyEntityStrikeGate(input, 5, 6, 3, 0, TARGET, 0, 100, 0);
  assert.equal(state[1919 + TARGET], 40 - 4, "50 / 11");

  const weak = fixture();
  assert.equal(stepLegacyEntityStrikeGate(weak.input, 5, 6, 3, 0, TARGET, 0, 5, 0), false,
    "5 / (10 + 1) is 0, below 1");
  assert.equal(weak.state[1919 + TARGET], 40, "nothing was taken off");
}

// --- offsets 739..920: the target turns on its attacker ---
{
  const { input, state } = fixture();
  stepLegacyEntityStrikeGate(input, 5, 6, 3, 0, TARGET, 0, 100, 0);
  assert.equal(state[6161 + TARGET], 4);
  assert.equal(state[4747 + TARGET], V, "4747 points back at the attacker");
}

// A type-87 leaver, a child, or an already-busy unit does not retaliate.
{
  for (const [field, value] of [[2828, 87], [2828, 59], [2828, 50], [2828, 5], [1414, 8], [6161, 3]]) {
    const { input, state } = fixture();
    state[field + TARGET] = value;
    stepLegacyEntityStrikeGate(input, 5, 6, 3, 0, TARGET, 0, 100, 0);
    if (field === 6161) assert.equal(state[6161 + TARGET], 3);
    else assert.notEqual(state[6161 + TARGET], 4, `${field} = ${value} should not retaliate`);
  }
}

// --- offsets 921..1036: the hit-point mirror and the animal's attacker note ---
{
  const { input, cHitPoints } = fixture();
  cHitPoints[TARGET] = 90;
  stepLegacyEntityStrikeGate(input, 5, 6, 3, 0, TARGET, 0, 100, 0);
  assert.equal(cHitPoints[TARGET], 90 - 9);

  const animal = fixture([5, 0, TARGET, 1]);
  animal.cHitPoints[TARGET + 101] = 90;
  stepLegacyEntityStrikeGate(animal.input, 5, 6, 3, 0, TARGET, 0, 100, 0);
  assert.equal(animal.cHitPoints[TARGET + 101], 90 - 9, "k0 5 offsets the mirror by 101");
  assert.equal(animal.state[9447 + TARGET], 19 + V, "the animal records who hit it");
}

// --- offsets 1079..1150: a killing blow vacates and returns false ---
{
  const { input, state, calls } = fixture();
  state[1919 + TARGET] = 5;
  assert.equal(stepLegacyEntityStrikeGate(input, 5, 6, 3, 0, TARGET, 0, 100, 0), false);
  assert.deepEqual(calls.find((c) => c[0] === "vacate"), ["vacate", 19, 5, 6, TARGET]);
  assert.equal(calls.some((c) => c[0] === "sprite"), false, "no hit sprite for a kill");
}

// --- offsets 1200..1262: the hit sprite ---
{
  const { input, calls } = fixture();
  stepLegacyEntityStrikeGate(input, 5, 6, 3, 0, TARGET, 33, 100, 0);
  // p7 ends at 9: 52 + (9/4)*3 + 0 = 58, inside [52, 61]
  assert.deepEqual(calls.find((c) => c[0] === "sprite"), ["sprite", TARGET, 77, 33, 58]);
}

// --- offsets 1263..1433: a team-0 casualty raises the alarm ---
{
  // A child alerts the chief.
  const child = fixture([1, 0, 30, 1]);
  child.state[1919 + 30] = 40; child.state[1414 + 30] = 8; child.state[2828 + 30] = 17;
  stepLegacyEntityStrikeGate(child.input, 5, 6, 2, 0, TARGET, 0, 100, 0);
  assert.deepEqual(child.calls.find((c) => c[0] === "move"), ["move", 16, CHIEF, 30]);

  // An adult, the first time d[0] is still negative, queues f.a(7, x, y, 0).
  const first = fixture([1, 0, 30, 1]);
  first.state[1919 + 30] = 40; first.state[1414 + 30] = 20; first.state[2828 + 30] = 69;
  first.dShort[0] = -1;
  stepLegacyEntityStrikeGate(first.input, 5, 6, 2, 0, TARGET, 0, 100, 0);
  assert.equal(first.dShort[0], 0);
  assert.deepEqual(first.calls.find((c) => c[0] === "queue"), ["queue", 7, 5, 6, 0]);

  // Afterwards, in mission 2, a non-2/7 type gets a(5, target, target).
  const later = fixture([1, 0, 30, 1]);
  later.state[1919 + 30] = 40; later.state[1414 + 30] = 20; later.state[2828 + 30] = 69;
  stepLegacyEntityStrikeGate(later.input, 5, 6, 2, 0, TARGET, 0, 100, 0);
  assert.deepEqual(later.calls.find((c) => c[0] === "move"), ["move", 5, 30, 30]);
  assert.deepEqual([later.scratch.z, later.scratch.A], [5, 6]);

  // A type 2 or 7 casualty is already fighting, so it is not re-alerted.
  const fighting = fixture([1, 0, 30, 1]);
  fighting.state[1919 + 30] = 40; fighting.state[1414 + 30] = 20; fighting.state[2828 + 30] = 7;
  stepLegacyEntityStrikeGate(fighting.input, 5, 6, 2, 0, TARGET, 0, 100, 0);
  assert.equal(fighting.calls.some((c) => c[0] === "move"), false);
}

// The web alerts' observer (not in the original) hears each blow that lands, kind / target / cell,
// including a killing one, and never a refused one.
{
  const landed = fixture([1, 0, 30, 1], { onHitLanded: (...args) => landed.calls.push(["landed", ...args]) });
  landed.state[1919 + 30] = 1; landed.state[1414 + 30] = 20; landed.state[2828 + 30] = 69;
  stepLegacyEntityStrikeGate(landed.input, 5, 6, 2, 0, TARGET, 0, 100, 0);
  assert.deepEqual(landed.calls.find((c) => c[0] === "landed"), ["landed", 1, 30, 5, 6]);

  const refused = fixture([1, 0, TARGET, 0], { onHitLanded: () => assert.fail("a refused blow is not reported") });
  stepLegacyEntityStrikeGate(refused.input, 5, 6, 1, 0, TARGET, 0, 100, 0);
}

console.log("a(IIIIIIII) #298 strike gate OK");
