// Behaviour test for LegacyEntityScreenIndex.ts: private void T(),
// bytecode/b-javap.txt line 35270, offsets 0..315.
import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";

const path = new URL("../src/sim/units/LegacyEntityScreenIndex.ts", import.meta.url).pathname;
const output = ts.transpileModule(fs.readFileSync(path, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(output, { module, exports: module.exports, Int8Array });
const { stepLegacyEntityScreenIndex } = module.exports;

function fixture() {
  const state = new Int8Array(10000);
  const gridG = Array.from({ length: 32 }, () => new Int8Array(32));
  return {
    input: { state, gridG, viewportI: 10, viewportK: 20, viewportO: 8, viewportP: 6 },
    state, gridG,
  };
}

// A drawn unit inside the viewport is stamped into gridG at its screen cell,
// offset by the viewport origin.
{
  const { input, state, gridG } = fixture();
  state[5959 + 3] = 1;
  state[5252 + 3] = 12; state[5353 + 3] = 22;
  stepLegacyEntityScreenIndex(input);
  assert.equal(gridG[2][2], 3, "gridG[sy - K][sx - I]");
  assert.equal(state[6060 + 3], 0, "nothing was there before");
}

// A second unit on the same cell pushes: it takes the cell and keeps the
// previous occupant in its own 6060, which is the chain.
{
  const { input, state, gridG } = fixture();
  for (const id of [3, 8]) { state[5959 + id] = 1; state[5252 + id] = 12; state[5353 + id] = 22; }
  stepLegacyEntityScreenIndex(input);
  assert.equal(gridG[2][2], 8, "the later id is on top");
  assert.equal(state[6060 + 8], 3, "and points at the one it displaced");
  assert.equal(state[6060 + 3], 0);
}

// dense[5959] at or below 0 means not drawn -- skipped entirely.
{
  const { input, state, gridG } = fixture();
  state[5959 + 3] = 0;
  state[5252 + 3] = 12; state[5353 + 3] = 22;
  stepLegacyEntityScreenIndex(input);
  assert.equal(gridG[2][2], 0);
  assert.equal(state[6060 + 3], 0);
}

// All four bounds are exclusive at the far edge and inclusive at the origin.
{
  for (const [sx, sy, hit] of [
    [10, 20, true],    // exactly the origin
    [17, 25, true],    // last cell inside (I + O - 1, K + P - 1)
    [9, 22, false],    // left of the viewport
    [18, 22, false],   // right of it
    [12, 19, false],   // above
    [12, 26, false],   // below
  ]) {
    const { input, state, gridG } = fixture();
    state[5959 + 4] = 1; state[5252 + 4] = sx; state[5353 + 4] = sy;
    stepLegacyEntityScreenIndex(input);
    const stamped = gridG.some((row) => row.some((cell) => cell === 4));
    assert.equal(stamped, hit, `(${sx}, ${sy}) should ${hit ? "" : "not "}be indexed`);
  }
}

// Both teams are walked, so a team-1 unit is indexed too.
{
  const { input, state, gridG } = fixture();
  state[5959 + 55] = 1; state[5252 + 55] = 11; state[5353 + 55] = 21;
  stepLegacyEntityScreenIndex(input);
  assert.equal(gridG[1][1], 55);
}

// Ids outside 1..100 are never touched.
{
  const { input, state, gridG } = fixture();
  state[5959 + 101] = 1; state[5252 + 101] = 12; state[5353 + 101] = 22;
  stepLegacyEntityScreenIndex(input);
  assert.equal(gridG[2][2], 0);
}

console.log("T() screen index OK");
