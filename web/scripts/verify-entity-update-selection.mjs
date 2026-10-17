import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";
import { denseRequire } from "./dense-layout-require.mjs";

const path = `${new URL("../src/sim/units/LegacyEntityUpdateSelection.ts", import.meta.url).pathname}`;
const output = ts.transpileModule(fs.readFileSync(path, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(output, { require: denseRequire, module, exports: module.exports, Int8Array });
const { selectLegacyEntityUpdateCandidates } = module.exports;

const state = new Int8Array(9983);
const auxiliaryF = Array.from({ length: 4 }, () => new Int8Array(30));
const subsystemG = Array.from({ length: 3 }, () => new Int8Array(20));
const candidates = [];
const cleanups = [];
// Entity 1: mode===1, g2>0 && g1>=g2 -> the "association" cleanup gate.
state[8505 + 1] = 1;
state[8749 + 1] = 12;
state[8627 + 1] = 1;
state[9054 + 1] = 0xff;
auxiliaryF[0][0] = 1;
subsystemG[0][0] = 1;
subsystemG[1][0] = 2;
subsystemG[2][0] = 1;

// Entity 2: mode===0 -> the whole association/capacity/flag block is
// skipped entirely (real bytecode offset 296 jumps straight past it), so
// this must reach onCandidate even though its flag byte is 0. CORRECTION
// (2026-08-24): previously asserted as "blocked/flag", which was wrong --
// the flag check only applies when mode!==0.
state[8505 + 2] = 1;
state[8749 + 2] = 2;
state[8627 + 2] = 0;
state[9054 + 2] = 0;

selectLegacyEntityUpdateCandidates({
  state, simulationCounter: 16, auxiliaryF, subsystemG,
  onPeriodicReset: () => candidates.push(["periodic"]),
  onPreUpdate: () => candidates.push(["pre"]),
  onCandidate: (value) => candidates.push(["candidate", value]),
  onCleanup: (...args) => cleanups.push(args),
});
// JSON.stringify avoids a cross-realm Object.prototype mismatch: the
// candidate objects are constructed inside the vm-compiled module, so
// assert.deepEqual's prototype check fails even on identical own
// properties (same reason the pre-existing assertion below already used
// this pattern).
assert.equal(
  JSON.stringify(candidates),
  JSON.stringify([["pre"], ["candidate", { id: 2, team: 0, type: 2, associationIndex: 0 }]]),
);
assert.equal(JSON.stringify(cleanups), JSON.stringify([[1, 0]]));
assert.equal(state[9054 + 1], 127);

state[8505 + 3] = 1;
state[8749 + 3] = 4;
state[8627 + 3] = 0;
state[9054 + 3] = 1;
selectLegacyEntityUpdateCandidates({
  state, simulationCounter: 20, auxiliaryF, subsystemG,
  onCandidate: (value) => candidates.push(["candidate", value]),
});
assert.equal(JSON.stringify(candidates.at(-1)), JSON.stringify(["candidate", { id: 3, team: 0, type: 4, associationIndex: 0 }]));

// Entity 4: mode===2, capacity reached (8505 >= 8566) -> cleanup gate.
{
  const state4 = new Int8Array(9983);
  const cleanups4 = [];
  const subsystemG4 = Array.from({ length: 3 }, () => new Int8Array(20));
  subsystemG4[0][0] = 4; // association-index scan match, so associationIndex resolves to 0
  state4[8505 + 4] = 5;
  state4[8566 + 4] = 5;
  state4[8749 + 4] = 4;
  state4[8627 + 4] = 2;
  selectLegacyEntityUpdateCandidates({
    state: state4, simulationCounter: 1, auxiliaryF: Array.from({ length: 4 }, () => new Int8Array(30)),
    subsystemG: subsystemG4,
    onCleanup: (...args) => cleanups4.push(args),
    onCandidate: () => { throw new Error("should not reach onCandidate"); },
  });
  assert.deepEqual(cleanups4, [[4, 0]]);
}

// Entity 5: mode===2, capacity NOT reached (8505 < 8566), flag bit clear
// -> proceeds to onCandidate, not blocked.
{
  const state5 = new Int8Array(9983);
  const candidates5 = [];
  state5[8505 + 5] = 2;
  state5[8566 + 5] = 5;
  state5[8749 + 5] = 4;
  state5[8627 + 5] = 2;
  state5[9054 + 5] = 0;
  selectLegacyEntityUpdateCandidates({
    state: state5, simulationCounter: 1, auxiliaryF: Array.from({ length: 4 }, () => new Int8Array(30)),
    subsystemG: Array.from({ length: 3 }, () => new Int8Array(20)),
    onCandidate: (value) => candidates5.push(value),
    onCleanup: () => { throw new Error("should not reach onCleanup"); },
  });
  assert.equal(candidates5.length, 1);
}

console.log("b.g() raw entity-update selection gates OK");
