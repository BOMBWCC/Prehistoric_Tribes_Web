// Behaviour test for LegacyEntityOccupantCare.ts: private void j(int) (#394),
// bytecode/b-javap.txt line 26108, offsets 0..245. Expected values read off
// the bytecode.
import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";
import { denseRequire } from "./dense-layout-require.mjs";

const path = new URL("../src/sim/units/LegacyEntityOccupantCare.ts", import.meta.url).pathname;
const output = ts.transpileModule(fs.readFileSync(path, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(output, { require: denseRequire, module, exports: module.exports, Int8Array, Math });
const { stepLegacyEntityOccupantCare } = module.exports;

// A record (7) whose worker list is 4 -> 5 -> 6, walked by j(int) from
// dense[8993 + dense[4444 + v]].
const make = (v) => {
  const state = new Int8Array(10000);
  state[4444 + v] = 7;
  state[8993 + 7] = 4;
  state[4545 + 4] = 5;
  state[4545 + 5] = 6;
  state[4545 + 6] = 0;
  return state;
};

// arg === 0: every OTHER worker gains (7272[v] + 2) / 2 on both happiness and
// tiredness, clamped to 99; the caller itself is skipped.
{
  const v = 5;
  const state = make(v);
  state[7272 + v] = 6; // step = (6 + 2) / 2 = 4
  state[505 + 4] = 10; state[2121 + 4] = 20;
  state[505 + 5] = 10; state[2121 + 5] = 20;
  state[505 + 6] = 97; state[2121 + 6] = 98;
  const scratch = { S: 0 };
  stepLegacyEntityOccupantCare({ state, v, scratch, onHealthDelta: () => { throw new Error("no heal in arg 0"); } }, 0);
  assert.deepEqual([state[505 + 4], state[2121 + 4]], [14, 24]);
  assert.deepEqual([state[505 + 5], state[2121 + 5]], [10, 20], "the caller is skipped");
  assert.deepEqual([state[505 + 6], state[2121 + 6]], [99, 99], "clamped to 99");
  assert.equal(scratch.S, 0, "the scratch ends at the list terminator");
}

// A quality of 0 still gives (0 + 2) / 2 = 1 per call.
{
  const v = 5;
  const state = make(v);
  state[505 + 4] = 0;
  const scratch = { S: 0 };
  stepLegacyEntityOccupantCare({ state, v, scratch, onHealthDelta: () => {} }, 0);
  assert.equal(state[505 + 4], 1);
}

// arg !== 0: each other worker takes a(S, 10), and one already at full HP is
// turned into a type-87 leaver.
{
  const v = 5;
  const state = make(v);
  state[1919 + 4] = 3; state[6767 + 4] = 9;   // still hurt
  state[1919 + 6] = 9; state[6767 + 6] = 9;   // full
  const heals = [];
  const scratch = { S: 0 };
  stepLegacyEntityOccupantCare({
    state, v, scratch,
    onHealthDelta: (id, delta) => heals.push([id, delta]),
  }, 1);
  assert.deepEqual(heals, [[4, 10], [6, 10]], "the caller is skipped here too");
  assert.equal(state[2828 + 4], 0, "still hurt, stays put");
  assert.equal(state[2828 + 6], 87, "full HP -> sent out");
  assert.equal(state[6161 + 6], 3);
}

console.log("j(int) #394 occupant care OK");
