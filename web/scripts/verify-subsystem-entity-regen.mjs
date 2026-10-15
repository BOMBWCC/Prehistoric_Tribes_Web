// Regression test for LegacySubsystemEntityRegen.ts (private boolean q()).
import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";
import path from "node:path";

const srcDir = new URL("../src/j2me/", import.meta.url).pathname;
const context = vm.createContext({ Int8Array, Int16Array, Int32Array, Array, console, Math });
const cache = new Map();

function loadModule(specifier, fromDir) {
  const absPath = path.resolve(fromDir, specifier) + ".ts";
  if (cache.has(absPath)) return cache.get(absPath).exports;
  const module = { exports: {} };
  cache.set(absPath, module);
  const source = fs.readFileSync(absPath, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const localRequire = (spec) => loadModule(spec, path.dirname(absPath));
  const fn = vm.compileFunction(output, ["module", "exports", "require"], { parsingContext: context });
  fn(module, module.exports, localRequire);
  return module.exports;
}

const { stepLegacySubsystemEntityRegen } = loadModule("./LegacySubsystemEntityRegen", srcDir);

function makeGrid() {
  const grid = [];
  for (let i = 0; i < 20; i += 1) grid.push(new Int8Array(20));
  return grid;
}

function baseInput(overrides = {}) {
  return {
    state: new Int8Array(10000),
    packedBytes: new Int8Array(2000),
    packedOffsets: new Int16Array(320),
    gridC: makeGrid(),
    entityId: 5,
    team: 0,
    frame: 0,
    randomRemainder: () => 0,
    fQByte: 0,
    // Default gate value (bShort[shortTableBOffsets[4]+fQByte]) is a huge
    // sentinel so existing small-frame tests never fall into r()'s newly
    // restored level>=12 block by accident; tests that want to exercise it
    // set state[1414+id] to reach 12 AND lower this via an override.
    bShort: new Int16Array(600).fill(30000),
    shortTableBOffsets: new Int16Array(5),
    outerLoopLFlag: false,
    ...overrides,
  };
}

// Below regen threshold -> true immediately, no state change.
{
  const input = baseInput();
  input.state[6666 + 5] = 10; // < 125 for team 0
  const result = stepLegacySubsystemEntityRegen(input);
  assert.equal(result, true);
  assert.equal(input.state[1414 + 5], 0); // untouched
}

// Team 1 uses threshold 50.
{
  const input = baseInput({ team: 1 });
  input.state[6666 + 5] = 49;
  assert.equal(stepLegacySubsystemEntityRegen(input), true);
  input.state[6666 + 5] = 50;
  input.state[1919 + 5] = 5; // alive so s() returns true without vacating
  const result = stepLegacySubsystemEntityRegen(input);
  assert.equal(input.state[1414 + 5], 1); // leveled up
}

// Full regen tick: level up, aJ computed, dense[6767]/[1919] updated, s() ok,
// level!==11/12/35, r() reaches its own real branch (level<12) and returns
// true via its default branch.
{
  const input = baseInput({ frame: 100 });
  input.state[6666 + 5] = 125; // >= 125
  input.state[1414 + 5] = 3; // level becomes 4
  input.state[1919 + 5] = 10; // alive
  input.packedOffsets[97] = 100;
  input.packedBytes[100 + 4] = 5; // table(97,4)
  input.packedOffsets[98] = 200;
  input.packedBytes[200 + 4] = 50; // table(98,4) -- regen ceiling cap
  input.randomRemainder = () => 3; // randomRemainder(255,5)=3
  // aJ = table(97,4)=5 + 3 - 2 = 6
  const result = stepLegacySubsystemEntityRegen(input);
  assert.equal(input.state[1414 + 5], 4);
  assert.equal(input.state[6666 + 5], 0);
  assert.equal(input.state[6767 + 5], 6); // clamp(0+6, 0, 50)
  // HP += aJ (10+6=16), then the final unconditional clamp(16, 0, regenCeil=6) -> 6.
  assert.equal(input.state[1919 + 5], 6);
  assert.equal(result, true);
}

// dense[1515+id]===1 adjusts aJ by +1/-1.
{
  const input = baseInput({ frame: 5 });
  input.state[6666 + 5] = 125;
  input.state[1414 + 5] = 0; // becomes 1
  input.state[1515 + 5] = 1;
  input.state[1919 + 5] = 1;
  input.packedOffsets[97] = 100;
  input.packedBytes[100 + 1] = 0;
  input.packedOffsets[98] = 200;
  input.packedBytes[200 + 1] = 100;
  input.randomRemainder = () => 0;
  // aJ = table(97,1)=0 + 0 - 2 = -2 -> <=0 -> aJ += 1 -> aJ = -1.
  // dense[6767+id] = clamp(0+(-1), 0, 100) = 0, which then clamps HP
  // (starting at 1) down to 0 too -- and THAT triggers s()'s own "HP<=0,
  // not self-occupied" revive branch, which resets both dense[1919+id]
  // AND dense[6767+id] back to 1. This cascade is real (matches the
  // original bytecode's own call order: the HP/ceiling clamp runs before
  // s() does), not a test artifact.
  stepLegacySubsystemEntityRegen(input);
  assert.equal(input.state[6767 + 5], 1);
  assert.equal(input.state[1919 + 5], 1);
}

// level reaches exactly 12 -> real milestone side effects (RETRACTED
// 2026-09-04: this used to assert a guaranteed throw here via the fake
// A()-crash stand-in; A() is a real, separate, still-unfixed method now
// exposed as the onA callback instead, and the four dense writes bytecode
// makes right after it (offsets 428..534) are real and restored).
{
  const input = baseInput({ frame: 1 });
  input.state[6666 + 5] = 125;
  input.state[1414 + 5] = 11; // becomes 12
  input.state[1919 + 5] = 1;
  input.state[5] = 42; // dense[id] -> dense[3131+id]/dense[6262+id]
  input.state[101 + 5] = 7; // dense[101+id] -> dense[3232+id]/dense[6363+id]
  input.packedOffsets[97] = 100;
  input.packedOffsets[98] = 200;
  input.packedBytes[200 + 12] = 100;
  let changeTypeArgs = null;
  let aCalledWith = null;
  const result = stepLegacySubsystemEntityRegen({
    ...input,
    onChangeType: (...a) => { changeTypeArgs = a; },
    onA: (id) => { aCalledWith = id; },
  });
  assert.equal(result, true);
  assert.deepEqual(changeTypeArgs, [5, 69]);
  assert.equal(aCalledWith, 5);
  assert.equal(input.state[6464 + 5], 69);
  assert.equal(input.state[3030 + 5], 20);
  assert.equal(input.state[3131 + 5], 42);
  assert.equal(input.state[6262 + 5], 42);
  assert.equal(input.state[3232 + 5], 7);
  assert.equal(input.state[6363 + 5], 7);
}

// level reaches exactly 12 with onA left unwired: no throw (onA is optional,
// matching every other unresolved-callback convention in this port).
{
  const input = baseInput({ frame: 1 });
  input.state[6666 + 5] = 125;
  input.state[1414 + 5] = 11; // becomes 12
  input.state[1919 + 5] = 1;
  input.packedOffsets[97] = 100;
  input.packedOffsets[98] = 200;
  input.packedBytes[200 + 12] = 100;
  assert.equal(stepLegacySubsystemEntityRegen(input), true);
}

// level>=12 AND frame past r()'s own escalation gate: q() forwards
// fQByte/bShort/shortTableBOffsets/outerLoopLFlag/onMove through to r()
// unchanged, and r()'s own newly-restored branch runs (full branch coverage
// for r() itself lives in verify-subsystem-entity-r-roll.mjs).
{
  const input = baseInput({ frame: 15, entityId: 15 });
  input.state[6666 + 15] = 125;
  input.state[1414 + 15] = 11; // becomes 12 -> q()'s own milestone writes run first,
  input.state[1919 + 15] = 1; // including dense[6464+id]=69 (so the table lookup
  input.state[2020 + 15] = 98; // below keys off 69, not a pre-set value).
  input.packedOffsets[97] = 100;
  input.packedBytes[100 + 12] = 10; // keep aJ positive so HP/regenCeil don't collapse to 0 and trigger s()'s vacate path
  input.packedOffsets[98] = 200;
  input.packedBytes[200 + 12] = 100;
  input.randomRemainder = () => 3;
  // Unlock r()'s escalation gate at frame 10 (below this tick's frame 15).
  input.bShort = new Int16Array(600);
  input.shortTableBOffsets[4] = 10;
  input.bShort[10] = 10;
  // table(41, dense[6464+id]=69 post-milestone) === 9, and (frame&63)===(id&63) (15===15).
  input.packedOffsets[41] = 300;
  input.packedBytes[300 + 69] = 9;
  // r()'s unconditional aJ block (offset 322..401) runs regardless of which
  // branch above fired; table(170,0)>=127 keeps its own modulo skipped so
  // this test stays focused on the table(41,...)===9 branch.
  input.packedOffsets[170] = 400;
  input.packedBytes[400] = 127;
  const result = stepLegacySubsystemEntityRegen(input);
  assert.equal(result, true);
  assert.equal(input.state[6464 + 15], 69); // q()'s own milestone write, confirmed still in effect
  assert.equal(input.state[2020 + 15], 99); // r()'s own dense[2020+id] bump, capped at 100
}

// Below the birthday threshold q() still runs r() (offset 27 jumps to 583):
// an adult past r()'s frame gate loses hunger on the t50 cadence.
{
  const input = baseInput({ frame: 200 });
  input.state[6666 + 5] = 3;
  input.state[1414 + 5] = 30;
  input.state[1919 + 5] = 10;
  input.state[2828 + 5] = 69;
  input.state[2020 + 5] = 50;
  input.bShort = new Int16Array(600);
  input.packedOffsets[50] = 500;
  input.packedBytes[500 + 69] = 100; // 200 % 100 <= 3
  input.packedOffsets[52] = 600;
  input.packedBytes[600 + 69] = 127;
  input.packedOffsets[170] = 700;
  input.packedBytes[700] = 127;
  assert.equal(stepLegacySubsystemEntityRegen(input), true);
  assert.equal(input.state[1414 + 5], 30, "no birthday");
  assert.equal(input.state[2020 + 5], 49, "r() ran");
}

// A child turning 11 on its own cell stays put; off it (gridC != v, 1313 >= 0) -> 6161 = 3, type 59.
{
  const onCell = baseInput({ frame: 999 });
  onCell.state[6666 + 5] = 125;
  onCell.state[1414 + 5] = 10;
  onCell.state[1919 + 5] = 1;
  onCell.state[5] = 2;
  onCell.state[101 + 5] = 3;
  onCell.gridC[3][2] = 5;
  onCell.packedOffsets[97] = 100;
  onCell.packedBytes[100 + 11] = 10;
  onCell.packedOffsets[98] = 200;
  onCell.packedBytes[200 + 11] = 100;
  const calls = [];
  stepLegacySubsystemEntityRegen({ ...onCell, onChangeType: (...a) => calls.push(a) });
  assert.deepEqual(calls, []);
}
{
  const input = baseInput({ frame: 999 }); // pick a frame unlikely to trigger r()'s own side branches meaningfully
  input.state[6666 + 5] = 125;
  input.state[1414 + 5] = 10; // becomes 11
  input.state[1919 + 5] = 1;
  input.state[1313 + 5] = 0;
  input.state[5] = 2;
  input.state[101 + 5] = 3;
  input.packedOffsets[97] = 100;
  input.packedBytes[100 + 11] = 10; // keep aJ positive so HP/regenCeil don't collapse to 0 and trigger s()'s vacate path
  input.packedOffsets[98] = 200;
  input.packedBytes[200 + 11] = 100;
  const changeCalls = [];
  const result = stepLegacySubsystemEntityRegen({
    ...input,
    onChangeType: (...a) => changeCalls.push(a),
  });
  assert.equal(input.state[6161 + 5], 3);
  assert.deepEqual(changeCalls, [[5, 59]]);
  assert.equal(result, true);
}

console.log("private boolean q() (level/HP regen) OK");
