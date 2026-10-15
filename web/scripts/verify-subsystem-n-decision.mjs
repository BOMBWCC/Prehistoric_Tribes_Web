// Regression test for LegacySubsystemNDecision.ts: private boolean n() offsets 104..936.
// Expected values derived by hand from bytecode/b-javap.txt 29609..30112.
import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";

const path = `${new URL("../src/j2me/LegacySubsystemNDecision.ts", import.meta.url).pathname}`;
const output = ts.transpileModule(fs.readFileSync(path, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(output, { module, exports: module.exports, Math });
const { stepLegacySubsystemNDecision } = module.exports;

function make(over = {}) {
  const state = new Int8Array(10000);
  const log = [];
  const input = {
    state,
    packedBytes: new Int8Array(1000),
    packedOffsets: new Int16Array(100),
    v: 4,
    u: 0,
    entityAt: (row, column) => (row === state[105] && column === state[4] ? 4 : 0),
    onEntityActionSearch: (kind, move) => { log.push(["a", kind, move]); return false; },
    onRawAction: (id, type) => { log.push(["type", id, type]); state[2828 + id] = type; },
    onQueue: () => log.push(["Q"]),
    onNearestBuilding: (kind) => { log.push(["near", kind]); return false; },
    onGroupMode: (arg) => log.push(["g", arg]),
    onMove: () => log.push(["move"]),
    randomRemainder: () => 0,
    ...over,
  };
  state[2828 + 4] = 69;
  state[4] = 3;
  state[105] = 7;
  state[2121 + 4] = 80;
  state[2020 + 4] = 80;
  state[505 + 4] = 80;
  state[1919 + 4] = 50;
  state[6767 + 4] = 50;
  return { state, log, input };
}

// t50[type] == 127 -> false before anything else.
{
  const { state, log, input } = make();
  input.packedOffsets[50] = 100;
  input.packedBytes[100 + 69] = 127;
  state[2121 + 4] = 0;
  assert.equal(stepLegacySubsystemNDecision(input), false);
  assert.deepEqual(log, []);
}

// Tired (2121 <= 20 with 505 > 5), off its own cell: type 87, g(1), true.
{
  const { state, log, input } = make();
  state[2121 + 4] = 20;
  input.entityAt = () => 0;
  assert.equal(stepLegacySubsystemNDecision(input), true);
  assert.deepEqual(log, [["type", 4, 87], ["g", 1]]);
}

// Tired, own cell, has a free hut: walk home, g(1); hut > 0 so no a(1,v,v).
{
  const { state, log, input } = make();
  state[2121 + 4] = 10;
  state[3434 + 4] = 3;
  state[8383 + 3] = 12;
  state[8444 + 3] = 13;
  state[9237 + 3] = 1;
  assert.equal(stepLegacySubsystemNDecision(input), true);
  assert.deepEqual([state[3131 + 4], state[3232 + 4]], [12, 13]);
  assert.deepEqual(log, [["g", 1]]);
}

// Tired, no hut, aJ = 1 but no disco: sleep here (type 79, mode 40), then a(1, v, v).
{
  const { state, log, input } = make({ randomRemainder: () => 1 });
  state[2121 + 4] = 10;
  state[3030 + 4] = 5;
  assert.equal(stepLegacySubsystemNDecision(input), true);
  assert.deepEqual(log, [["near", 7], ["type", 4, 79], ["move"]]);
  assert.deepEqual([state[3131 + 4], state[3232 + 4], state[2929 + 4], state[3030 + 4]], [3, 7, 40, 0]);
}

// 505 <= 5 raises the tiredness threshold to 50.
{
  const { state, log, input } = make();
  state[505 + 4] = 5;
  state[2121 + 4] = 50;
  state[3434 + 4] = 3;
  assert.equal(stepLegacySubsystemNDecision(input), true);
  assert.deepEqual(log, [["g", 1]]);
}

// Hungry (2020 <= 20): kitchen a(4, 0).
{
  const { state, log, input } = make({ onEntityActionSearch: (kind, move) => { return kind === 4; } });
  state[2020 + 4] = 20;
  assert.equal(stepLegacySubsystemNDecision(input), true);
}

// Unhappy (505 <= 30): disco a(7, 2) fails, 505 > 5 -> falls through to the heal test.
{
  const { state, log, input } = make();
  state[505 + 4] = 30;
  assert.equal(stepLegacySubsystemNDecision(input), false);
  assert.deepEqual(log, [["a", 7, 2]]);
}

// Very unhappy (505 <= 5) with t41[type] != 0 on its own cell: Q(); off it: type 87, 6161 = 3, true.
{
  const { state, log, input } = make();
  input.packedOffsets[41] = 200;
  input.packedBytes[200 + 69] = 1;
  state[505 + 4] = 5;
  state[2121 + 4] = 80;
  state[2020 + 4] = 80;
  assert.equal(stepLegacySubsystemNDecision(input), false);
  assert.deepEqual(log, [["a", 7, 2], ["Q"]]);
  const other = make();
  other.input.packedOffsets[41] = 200;
  other.input.packedBytes[200 + 69] = 1;
  other.state[505 + 4] = 5;
  other.input.entityAt = () => 0;
  assert.equal(stepLegacySubsystemNDecision(other.input), true);
  assert.equal(other.state[6161 + 4], 3);
  assert.deepEqual(other.log, [["a", 7, 2], ["type", 4, 87]]);
}

// Hurt: 1919 < 6767*2/3 -> sanctuary a(8, 3); 7979 & 4 alone also qualifies; type 57 does not.
{
  const { state, log, input } = make();
  state[1919 + 4] = 32; // < trunc(50*2/3) = 33
  assert.equal(stepLegacySubsystemNDecision(input), false);
  assert.deepEqual(log, [["a", 8, 3]]);
  const flagged = make();
  flagged.state[7979 + 4] = 4;
  stepLegacySubsystemNDecision(flagged.input);
  assert.deepEqual(flagged.log, [["a", 8, 3]]);
  const healthy = make();
  healthy.state[1919 + 4] = 33;
  stepLegacySubsystemNDecision(healthy.input);
  assert.deepEqual(healthy.log, []);
  const priest = make();
  priest.state[1919 + 4] = 1;
  priest.state[2828 + 4] = 57;
  stepLegacySubsystemNDecision(priest.input);
  assert.deepEqual(priest.log, []);
}

console.log("b.n() needs decision (offsets 104..936) OK");
