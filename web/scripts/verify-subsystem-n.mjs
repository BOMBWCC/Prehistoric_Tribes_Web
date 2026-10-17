import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import vm from "node:vm";
import { denseRequire } from "./dense-layout-require.mjs";

const file = new URL("../src/sim/tribe/LegacySubsystemN.ts", import.meta.url).pathname;
const output = ts.transpileModule(fs.readFileSync(file, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(output, { require: denseRequire, module, exports: module.exports, Math });
const { stepLegacySubsystemN } = module.exports;

const grid = () => Array.from({ length: 20 }, () => new Int8Array(20));
const base = (overrides = {}) => {
  const state = new Int8Array(20000);
  const gridC = grid();
  const id = 5;
  state[id] = 10; state[101 + id] = 10;
  gridC[10][10] = id; // on its own cell by default (offset 33 if_icmpeq 185)
  return {
    state, id, team: 0, gridC, mapWidth: 20, mapHeight: 20,
    randomRemainder: () => 0,
    onGate: () => false,
    ...overrides,
  };
};

// 1a. Off its own cell, swap condition NOT met (dense[4646+id]!==0) -> onGroupMode(2) only, no swap.
{
  const groupModeCalls = [];
  const input = base({ onGroupMode: (a) => groupModeCalls.push(a) });
  input.gridC[10][10] = 0;
  input.state[4646 + input.id] = 5; // !==0, swap condition fails
  stepLegacySubsystemN(input);
  assert.deepEqual(groupModeCalls, [2]);
}

// 1b. Off its own cell, swap condition met via dense[8993+linked]!==id -> swaps 4646 values.
{
  const groupModeCalls = [];
  const input = base({ onGroupMode: (a) => groupModeCalls.push(a) });
  const id = input.id;
  input.gridC[10][10] = 0;
  input.state[4444 + id] = 7; // linked
  input.state[8749 + 7] = 2;
  input.state[4646 + id] = 0;
  input.state[8993 + 7] = 3; // replacement = 3 (!== id)
  input.state[4646 + 3] = 42;
  stepLegacySubsystemN(input);
  assert.equal(input.state[4646 + id], 42);
  assert.equal(input.state[4646 + 3], 0);
  assert.deepEqual(groupModeCalls, [2]);
}

// 1c. Off its own cell, replacement falls back to dense[4545+id] when dense[8993+linked]===id.
{
  const input = base();
  const id = input.id;
  input.gridC[10][10] = 0;
  input.state[4444 + id] = 7;
  input.state[8749 + 7] = 2;
  input.state[4646 + id] = 0;
  input.state[8993 + 7] = id; // replacement === id -> use dense[4545+id] instead
  input.state[4545 + id] = 9;
  input.state[4646 + 9] = 77;
  stepLegacySubsystemN(input);
  assert.equal(input.state[4646 + id], 77);
  assert.equal(input.state[4646 + 9], 0);
}

// 2. Eligible, type=60 (not 17) -> gate called with mode=0, scanLimit from 4949+id.
{
  const gateCalls = [];
  const input = base({ onGate: (...a) => { gateCalls.push(a); return false; } });
  input.state[2828 + input.id] = 60;
  input.state[4949 + input.id] = 3;
  stepLegacySubsystemN(input);
  assert.equal(gateCalls.length, 1);
  assert.equal(gateCalls[0][0], 0); // mode
  assert.equal(gateCalls[0][1], 7); // scanLimit = 3*2+1
}

// 3. Eligible, type=17, linked record in range and linked type===107 -> position sync, no gate call.
{
  const gateCalls = [];
  const input = base({ onGate: (...a) => { gateCalls.push(a); return false; } });
  const id = input.id;
  input.state[2828 + id] = 17;
  input.team = 0; // otherTeam = 1, range (50,100]
  input.state[4444 + id] = 60; // linked record in (50,100]
  input.state[2828 + 60] = 107;
  input.state[id] = 3; input.state[101 + id] = 4;
  input.state[60] = 7; input.state[101 + 60] = 9;
  input.gridC[4][3] = id;
  stepLegacySubsystemN(input);
  // Offsets 403..468: the target is the linked unit's cell, not the child's own.
  assert.equal(input.state[3131 + id], 7);
  assert.equal(input.state[3232 + id], 9);
  assert.deepEqual(gateCalls, []);
}

// 4. Eligible, type=17, linked record in range but linked type!==107 -> link cleared, no gate call.
{
  const gateCalls = [];
  const input = base({ onGate: (...a) => { gateCalls.push(a); return false; } });
  const id = input.id;
  input.state[2828 + id] = 17;
  input.state[4444 + id] = 60;
  input.state[2828 + 60] = 99;
  stepLegacySubsystemN(input);
  assert.equal(input.state[4444 + id], 0);
  assert.deepEqual(gateCalls, []);
}

// 5. Eligible, type=17, linked record NOT in range -> falls through to gate call.
{
  const gateCalls = [];
  const input = base({ onGate: (...a) => { gateCalls.push(a); return false; } });
  const id = input.id;
  input.state[2828 + id] = 17;
  input.state[4444 + id] = 5; // not in (50,100]
  stepLegacySubsystemN(input);
  assert.equal(gateCalls.length, 1);
  assert.equal(gateCalls[0][0], 0);
}

// 6. type=109 -> ae:I (#105) = pair slot, gate mode 3 at the hut door (cRows[2/3][ae]), g(3).
{
  const gateCalls = [];
  const groupModeCalls = [];
  const cRows = Array.from({ length: 6 }, () => new Int8Array(10));
  cRows[2][1] = 7; cRows[3][1] = 9;
  const scratch = { bField105: 31 };
  const input = base({
    cRows, scratch,
    onGate: (...a) => { gateCalls.push([...a, scratch.bField105]); return false; },
    onGroupMode: (a) => groupModeCalls.push(a),
  });
  input.state[2828 + input.id] = 109;
  input.state[8282 + input.id] = 4; // slot (4 >> 1) - 1 = 1
  stepLegacySubsystemN(input);
  assert.deepEqual(gateCalls, [[3, 127, 7, 9, 1]], "the gate sees the field already set");
  assert.deepEqual(groupModeCalls, [3]);
}

// 7. type=110, gate mode=4 returns false -> type 109, then the same mode-3 gate with ae set.
{
  const changeCalls = [];
  const gateCalls = [];
  const cRows = Array.from({ length: 6 }, () => new Int8Array(10));
  cRows[2][0] = 3; cRows[3][0] = 13;
  const scratch = { bField105: 31 };
  const input = base({
    cRows, scratch,
    onGate: (...a) => { gateCalls.push([...a, scratch.bField105]); return false; },
    onChangeEntityType: (id, type) => changeCalls.push([id, type]),
  });
  input.state[2828 + input.id] = 110;
  input.state[4949 + input.id] = 2;
  input.state[8282 + input.id] = 3; // slot 0, partner bit
  stepLegacySubsystemN(input);
  assert.deepEqual(changeCalls, [[input.id, 109]]);
  assert.deepEqual(gateCalls, [[4, 5, 10, 10, 31], [3, 127, 3, 13, 0]]);
}

// 8. type=110, gate mode=4 returns true (contrived, practically unreachable) -> onGroupMode(3).
{
  const groupModeCalls = [];
  const input = base({ onGate: () => true, onGroupMode: (a) => groupModeCalls.push(a) });
  input.state[2828 + input.id] = 110;
  stepLegacySubsystemN(input);
  assert.deepEqual(groupModeCalls, [3]);
}

// 9a. Not eligible via plain fallback (type matches nothing) -> onOther.
{
  const otherCalls = [];
  const input = base({ onOther: (id, team) => otherCalls.push([id, team]) });
  input.state[2828 + input.id] = 1; // not 17/60/83/11/14/109/110
  input.team = 1;
  stepLegacySubsystemN(input);
  assert.deepEqual(otherCalls, [[input.id, 1]]);
}

// 9b. type=11 but counter<=0 -> falls through to onOther too (NOT a silent no-op).
{
  const otherCalls = [];
  const input = base({ onOther: (id, team) => otherCalls.push([id, team]) });
  input.state[2828 + input.id] = 11;
  input.state[3636 + input.id] = 0; // counter <= 0 -> not eligible
  stepLegacySubsystemN(input);
  assert.deepEqual(otherCalls, [[input.id, 0]]);
}

console.log("stepLegacySubsystemN (private void N()) OK");
