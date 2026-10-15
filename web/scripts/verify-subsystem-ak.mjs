import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import vm from "node:vm";

const file = new URL("../src/j2me/LegacySubsystemAk.ts", import.meta.url).pathname;
const output = ts.transpileModule(fs.readFileSync(file, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(output, { module, exports: module.exports, Int8Array, Int16Array });
const { stepLegacySubsystemAk } = module.exports;

function make() {
  return {
    q: 5,
    u: 0,
    fByte: 0,
    dense: new Int8Array(10000),
    shortRows: [new Int16Array(26), new Int16Array(26)],
    packedBytes: new Int8Array(400),
    packedOffsets: new Int16Array(400),
  };
}

const setTable = (state, table, index, value) => {
  state.packedOffsets[table] = 100;
  state.packedBytes[100 + index] = value;
};

const firstGate = make();
setTable(firstGate, 279, 5, 1);
stepLegacySubsystemAk(firstGate);
assert.equal(firstGate.u, 1);

const mapEvents = [];
const mapBranch = make();
mapBranch.u = 20;
mapBranch.onMapSession = () => mapEvents.push("map");
setTable(mapBranch, 279, 5, 1);
stepLegacySubsystemAk(mapBranch);
assert.equal(mapBranch.u, 0);
assert.deepEqual(mapEvents, ["map"]);

// q == 2 tail: enemy force <= 4 and NO ENEMY left (a[1][11], not ours).
const q2 = make();
q2.q = 2;
q2.shortRows[1][14] = 4;
q2.shortRows[0][11] = 9; // we are alive
q2.shortRows[1][11] = 0;
stepLegacySubsystemAk(q2);
assert.equal(q2.fByte, 2);
assert.equal(q2.u, 0, "no win/lose while we are alive and t279 has no bits");
const q2b = make();
q2b.q = 2; q2b.shortRows[1][14] = 4; q2b.shortRows[0][11] = 9; q2b.shortRows[1][11] = 3;
stepLegacySubsystemAk(q2b);
assert.equal(q2b.fByte, 0, "enemies still alive: no jump");

// Losing every unit always loses (u = 50), whatever t279 says.
const wiped = make();
wiped.q = 3; wiped.shortRows[1][14] = 9; wiped.shortRows[0][11] = 0;
stepLegacySubsystemAk(wiped);
assert.equal(wiped.u, 50);

// Record 1 (dense[8506], our home) destroyed loses only with t279 bit 1.
const home = make();
home.q = 3; home.shortRows[1][14] = 9; home.shortRows[0][11] = 5; home.dense[8506] = 0;
stepLegacySubsystemAk(home);
assert.equal(home.u, 0);
setTable(home, 279, 3, 2);
stepLegacySubsystemAk(home);
assert.equal(home.u, 50);

// An already running countdown is never restarted.
const running = make();
running.q = 3; running.u = 30; running.shortRows[0][11] = 0;
stepLegacySubsystemAk(running);
assert.equal(running.u, 30);

console.log("b.ak() confirmed gate, map-session, and q=2 writes OK");
