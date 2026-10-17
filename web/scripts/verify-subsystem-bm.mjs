import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import vm from "node:vm";
import { denseRequire } from "./dense-layout-require.mjs";

const file = new URL("../src/sim/tribe/LegacySubsystemBM.ts", import.meta.url).pathname;
const module = { exports: {} };
const output = ts.transpileModule(fs.readFileSync(file, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
vm.runInNewContext(output, { require: denseRequire, module, exports: module.exports });
const { stepLegacySubsystemBM } = module.exports;

// private boolean m(), bytecode/b-javap.txt line 29197. Unit 3 stands on (4,5).
function make(overrides = {}) {
  const state = new Int8Array(10000);
  const gridC = Array.from({ length: 10 }, () => new Int8Array(10));
  state[3] = 4; state[104] = 5; gridC[5][4] = 3;
  const types = [];
  const input = {
    state, gridC, team: 0, id: 3, Q: 0, fN: false, fC: 0, fQ: [7, 2],
    onChangeType: (id, type) => { types.push([id, type]); state[2828 + id] = type; },
    onNearestBuilding: () => false,
    ...overrides,
  };
  return { input, state, gridC, types };
}

// Without the order bit (7979 & 32) and no CALL TO ARMS: nothing to do.
{
  const { input } = make();
  assert.equal(stepLegacySubsystemBM(input), false);
}

// FORM UP (bit 5, no f.N): target = f.q, bit 5 dropped, type 69, walking.
{
  const { input, state, types } = make();
  state[7979 + 3] = 96;
  assert.equal(stepLegacySubsystemBM(input), true);
  assert.deepEqual([state[3131 + 3], state[3232 + 3], state[7979 + 3] & 0xff], [7, 2, 64]);
  assert.deepEqual(types, [[3, 69]]);
  assert.deepEqual([state[6161 + 3], state[7777 + 3]], [3, 3]);
}

// CALL TO ARMS (f.N, bits 5+6): first the weapon step -- no store, so bit 6
// is dropped and m() returns false; the next call heads for the rally point.
{
  const { input, state, types } = make({ fN: true });
  state[7979 + 3] = 96;
  assert.equal(stepLegacySubsystemBM(input), false);
  assert.equal(state[7979 + 3] & 0xff, 32);
  assert.equal(stepLegacySubsystemBM(input), true);
  assert.deepEqual([state[3131 + 3], state[3232 + 3]], [7, 2]);
  assert.deepEqual(types, [[3, 69]]);
}

// CALL TO ARMS with a store and 6565 == 9: fetch a weapon (type 50).
{
  const { input, state, types } = make({ fN: true, onNearestBuilding: (kind) => kind === 6 });
  state[7979 + 3] = 96; state[6565 + 3] = 9;
  assert.equal(stepLegacySubsystemBM(input), true);
  assert.deepEqual(types, [[3, 50]]);
}

// Already on the rally cell: no walk.
{
  const { input, state, types } = make({ fQ: [4, 5] });
  state[7979 + 3] = 32;
  assert.equal(stepLegacySubsystemBM(input), false);
  assert.deepEqual(types, []);
}

// Team 1: charge unit Q's cell.
{
  const { input, state, types } = make({ team: 1, Q: 1 });
  state[7979 + 3] = 32; state[1] = 9; state[102] = 8;
  assert.equal(stepLegacySubsystemBM(input), true);
  assert.deepEqual([state[3131 + 3], state[3232 + 3]], [9, 8]);
  assert.deepEqual(types, [[3, 69]]);
}
console.log("b.m() rally walk OK");
