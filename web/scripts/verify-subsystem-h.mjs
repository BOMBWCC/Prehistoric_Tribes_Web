import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { denseRequire } from "./dense-layout-require.mjs";

function loadModule(file) {
  const module = { exports: {} };
  const output = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(output, { require: denseRequire, module, exports: module.exports, Int8Array, Int16Array });
  return module.exports;
}

const { stepLegacySubsystemH } = loadModule(
  new URL("../src/sim/tribe/LegacySubsystemH.ts", import.meta.url).pathname,
);
const state = new Int8Array(10000);
const bBytes = new Int8Array(400);
const bShorts = new Int16Array(312);
bShorts[202] = 0;
bShorts[204] = 1;
bShorts[205] = 2;
bShorts[185] = 20;
bShorts[201] = 30;
bShorts[199] = 40;
bShorts[200] = 50;
bBytes[0] = 1;
bBytes[1] = 1;
bBytes[2] = 2;
bBytes[4] = 1;
bBytes[5] = 1;
bBytes[6] = 3; // t205[4]: per-kind cap, above fT[0] = 2
bBytes[20] = 0;
bBytes[30] = 1;
bBytes[34] = 1;
bBytes[40 + 1] = 7;
bBytes[50 + 1] = 8;
// CORRECTION (2026-09-22): t185 is addressed as
// `a_s[185] + (b[a_s[201] + q] + u) * 3 + w`, so with t201[q] = 1 and u = 0
// the animal-kind group for this fixture lives at bBytes[23..25]. It holds
// cumulative percentages ending in 100, which is what keeps `w` inside the
// three-entry kind tables. The old fixture put a single 100 at bBytes[21],
// which only matched the port's then-wrong index.
bBytes[23] = 25;
bBytes[24] = 25;
bBytes[25] = 100;
state[9513] = 1;
state[9469] = 0;
// CORRECTION (2026-08-24): onSubsystemRecord's real args are
// (raw.w, state[3131], state[3232], raw.u) -- was wrongly modeled as
// (bBytes[3131], bBytes[3232], raw.u), reading the packed resource table
// instead of the dense entity array and omitting raw.w entirely.
state[3131] = 42;
state[3232] = 43;
const fT = new Int8Array([2, 0, 0]);
const raw = { u: 0, v: 0, w: 0 };
const events = [];
stepLegacySubsystemH({
  state, bBytes, bShorts, frame: 5010, q: 4, fT, raw,
  randomRemainder: (_mask, _divisor) => 0,
  onFootprint: (...args) => events.push(["footprint", ...args]),
  onSubsystemRecord: (...args) => events.push(["record", ...args]),
  onTailMaintenance: (index) => events.push(["tail", index]),
});
assert.equal(raw.u, 0);
assert.equal(raw.w, 0);
assert.deepEqual(events.slice(0, 2), [["footprint", 1, 10, 7, 8], ["record", 0, 42, 43, 0]]);
assert.equal(state[9469], 2);
assert.equal(fT[0], 0);
assert.deepEqual(events.at(-1), ["tail", 0]);

// The w loop picks the animal kind out of t185's cumulative percentages, and
// must always land in 0..2 because the third entry is 100 and `v` is 0..99.
for (const [roll, expected] of [[0, 0], [24, 0], [25, 2], [99, 2]]) {
  const raw2 = { u: 0, v: 0, w: 0 };
  const seen = [];
  stepLegacySubsystemH({
    state, bBytes, bShorts, frame: 5010, q: 4, fT: new Int8Array([2, 0, 0]), raw: raw2,
    randomRemainder: (_mask, divisor) => (divisor === 100 ? roll : 0),
    onSubsystemRecord: (...args) => seen.push(args),
  });
  assert.equal(raw2.w, expected, `roll ${roll} should pick kind ${expected}`);
  assert.equal(seen[0][0], expected, "... and that kind is what f.b(IIII) gets");
}

// REGRESSION (2026-09-22): all three spawn gates are `goto 604` in the real
// bytecode, not returns, and 604 is the 22-slot af()/ah() maintenance loop.
// So the loop must still run on a frame that cannot spawn.
{
  const seen = [];
  const quiet = new Int8Array(10000);
  quiet[9513 + 0] = 1;
  quiet[9513 + 5] = 1;
  stepLegacySubsystemH({
    state: quiet, bBytes, bShorts,
    frame: 5011,           // not `% period === 10`, so the spawn half bails
    q: 4, fT: new Int8Array([2, 0, 0]), raw: { u: 0, v: 0, w: 0 },
    randomRemainder: () => 0,
    onSubsystemRecord: () => { throw new Error("must not spawn on this frame"); },
    onTailMaintenance: (index) => seen.push(index),
  });
  assert.deepEqual(seen, [0, 5], "af()/ah() run every frame, spawn or not");
}

// ... and it runs even when scheduleCount is 0, the very first gate.
{
  const seen = [];
  const quiet = new Int8Array(10000);
  quiet[9513 + 3] = 1;
  const zeroShorts = Int16Array.from(bShorts);
  zeroShorts[202] = 300;   // bBytes[300] is 0
  stepLegacySubsystemH({
    state: quiet, bBytes, bShorts: zeroShorts,
    frame: 5010, q: 4, fT: new Int8Array([2, 0, 0]), raw: { u: 0, v: 0, w: 0 },
    randomRemainder: () => 0,
    onTailMaintenance: (index) => seen.push(index),
  });
  assert.deepEqual(seen, [3]);
}

// Offsets 85..263 (oracle run 3, frame 6323): the cap is per kind, f.t[u] >= t205[q]. A drawn
// kind at its cap falls back to the first kind below it, and with none left nothing spawns.
// The port compared t205[q] with u itself.
{
  const capped = (fTValues, schedule) => {
    const shorts = Int16Array.from(bShorts);
    const bytes = Int8Array.from(bBytes);
    shorts[202] = 310; bytes[310 + 4] = schedule;
    const raw = { u: 0, v: 0, w: 0 };
    const seen = [];
    stepLegacySubsystemH({
      state: new Int8Array(10000), bBytes: bytes, bShorts: shorts, frame: 5010, q: 4,
      fT: Int8Array.from(fTValues), raw,
      randomRemainder: () => 0,
      onSubsystemRecord: (...args) => seen.push(args),
    });
    return seen.map((args) => args[3]);
  };
  assert.deepEqual(capped([3], 1), [], "the only kind is at its cap");
  assert.deepEqual(capped([3, 1], 2), [1], "drawn kind 0 is capped -> kind 1");
}

console.log("b.h() raw subsystem scheduler OK");
