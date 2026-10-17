// Regression test for LegacySubsystemAv.ts (private void av()).
import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";
import path from "node:path";

const srcDir = new URL("../src/", import.meta.url).pathname;
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

const { stepLegacySubsystemAv } = loadModule("./sim/tribe/LegacySubsystemAv", srcDir);

function makeInput(overrides = {}) {
  return {
    state: new Int8Array(10000),
    packedBytes: new Int8Array(4000),
    packedOffsets: new Int16Array(400),
    jobTable: new Int8Array(60),
    team: 1,
    aInt: 1000,
    mByte: 5,
    rByte: 0,
    nByte: 3,
    oByte: -1,
    gByte: 0,
    sceneQ: 1, // nonzero avoids the q===0 early-return branch by default
    fBByte: 0,
    simulationCounter: 500,
    fields: { x: -1, y: -1, z: -1, aU: -1, v: -1 },
    ...overrides,
  };
}
function noopCallbacks(overrides = {}) {
  return { onClamp: (v, mi, ma) => Math.max(mi, Math.min(ma, v)), onRandomA: () => 0, ...overrides };
}

// Gate: f.q>=7 && game.missionFrame<A/7 -> no-op, defaults returned.
{
  const input = makeInput({ sceneQ: 7, aInt: 1000, simulationCounter: 100 }); // 100 < 1000/7≈142
  const result = stepLegacySubsystemAv(input, noopCallbacks());
  assert.equal(result.rByte, 0);
  assert.equal(result.nByte, 3);
  assert.equal(result.oByte, -1);
}

// Second early return (offsets 203..246): game.missionFrame<A && q===0 && g:B<11 ->
// returns before the loop; g:B>=11 jumps to 285 and the raid goes ahead.
// (The port had the comparison inverted until 2026-10-02.)
for (const [gByte, expectBroadcast] of [[10, false], [11, true]]) {
  const input = makeInput({ sceneQ: 0, gByte, aInt: 1000, simulationCounter: 100 });
  input.state[7979 + 51] = 0; // team1 slot 51 would be eligible otherwise
  input.state[1919 + 51] = 5;
  input.state[1414 + 51] = 20;
  let broadcastCalled = false;
  const result = stepLegacySubsystemAv(input, noopCallbacks({ onRallyBroadcast: () => { broadcastCalled = true; } }));
  assert.equal(broadcastCalled, expectBroadcast, `g=${gByte}`);
  // N:B / O:B are written only at the tail (offsets 870/875); the early return keeps them
  // (oracle run 3, frame 4809: O:B stays -1 in the original).
  assert.equal(result.oByte, expectBroadcast ? 0 : -1, `g=${gByte}`);
}

// x:I/y:I are stored even when the tutorial gate returns early (offsets
// 140/200 come before 203); the broadcast's b.a(IIIBB) then reads y and aU
// from the fields, so they must hold av()'s values when it runs.
{
  const gated = makeInput({ sceneQ: 0, gByte: 10, aInt: 1000, simulationCounter: 100 });
  gated.packedOffsets[206] = 300; gated.packedBytes[300] = 2;
  gated.packedOffsets[208] = 310; gated.packedBytes[310] = 4;
  gated.packedOffsets[210] = 320; gated.packedBytes[320] = 20;
  gated.packedOffsets[212] = 330; gated.packedBytes[330] = 0;
  gated.fields.y = 98; // a stale value from elsewhere
  stepLegacySubsystemAv(gated, noopCallbacks());
  assert.deepEqual([gated.fields.x, gated.fields.y, gated.fields.aU], [1, 0, 0]);

  const open = makeInput({ sceneQ: 0, gByte: 11, aInt: 1000, simulationCounter: 100 });
  for (const k of [206, 208, 210, 212]) { open.packedOffsets[k] = gated.packedOffsets[k]; }
  open.packedBytes.set(gated.packedBytes);
  open.fields.y = 98;
  let seen = null;
  stepLegacySubsystemAv(open, noopCallbacks({ onRallyBroadcast: (count) => { seen = [count, open.fields.y, open.fields.aU, open.fields.v]; } }));
  assert.deepEqual(seen, [1, 0, 0, 101]);
}

// Entity selection: all gates must pass for a unit to be selected (bit6 set).
{
  const input = makeInput({ sceneQ: 1, aInt: 100000, simulationCounter: 0 }); // game.missionFrame(0) < A -- but q!==0 so no early-return
  const v = 51; // team1, u*50+1=51
  input.state[1919 + v] = 10; // HP>0
  input.state[1414 + v] = 20; // level>=12
  input.jobTable[v - 1 * 50 - 1] = 10; // >= M(5)
  input.state[7979 + v] = 0; // bit6 clear
  input.state[6565 + v] = 0; // !==9
  input.state[1515 + v] = 0;
  input.state[1717 + v] = 999; // spatial exemption trivially satisfied (>= y/2 for any reasonable y)
  // x/y depend on packedBytes tables (all zero by default -> y=0, half=0); 1717>=0 satisfies the OR.
  const result = stepLegacySubsystemAv(input, noopCallbacks());
  assert.equal(input.state[7979 + v] & 64, 64, "unit got selected and flagged");
}

// dense[1919+v]<=0 excludes a unit.
{
  const input = makeInput({ sceneQ: 1 });
  const v = 51;
  input.state[1919 + v] = 0;
  input.state[1414 + v] = 20;
  input.jobTable[v - 51] = 10;
  input.state[1717 + v] = 999;
  stepLegacySubsystemAv(input, noopCallbacks());
  assert.equal(input.state[7979 + v] & 64, 0);
}

// dense[1414+v]<12 excludes a unit.
{
  const input = makeInput({ sceneQ: 1 });
  const v = 51;
  input.state[1919 + v] = 10;
  input.state[1414 + v] = 5;
  input.jobTable[v - 51] = 10;
  input.state[1717 + v] = 999;
  stepLegacySubsystemAv(input, noopCallbacks());
  assert.equal(input.state[7979 + v] & 64, 0);
}

// Already-selected units (bit6 already set) are excluded from re-selection.
{
  const input = makeInput({ sceneQ: 1 });
  const v = 51;
  input.state[1919 + v] = 10;
  input.state[1414 + v] = 20;
  input.jobTable[v - 51] = 10;
  input.state[7979 + v] = 64; // already selected
  input.state[1717 + v] = 999;
  stepLegacySubsystemAv(input, noopCallbacks());
  // still 64 (unchanged, not double-processed in a way that would break -- just confirming the gate excludes it from HP-regen etc)
  assert.equal(input.state[7979 + v], 64);
}

// Spatial exemption: all three of 1717/1616/7575 below y/2 -> excluded.
{
  const input = makeInput({ sceneQ: 1 });
  const v = 51;
  input.state[1919 + v] = 10;
  input.state[1414 + v] = 20;
  input.jobTable[v - 51] = 10;
  input.packedOffsets[212 + 0] = 50;
  input.packedBytes[50 + 1] = 100; // y = 100 for sceneQ=1 (q!==0 path adjusts it, but let's just check exclusion holds when all 3 are 0)
  input.state[1717 + v] = 0;
  input.state[1616 + v] = 0;
  input.state[7575 + v] = 0;
  stepLegacySubsystemAv(input, noopCallbacks());
  assert.equal(input.state[7979 + v] & 64, 0, "all three spatial fields below y/2 excludes the unit");
}

// HP-regen only happens while game.missionFrame<A, and overwrites BOTH 1919 and 6767 with the same value.
{
  const input = makeInput({ sceneQ: 1, aInt: 100000, simulationCounter: 10 });
  const v = 51;
  input.state[1919 + v] = 1;
  input.state[1414 + v] = 20;
  input.jobTable[v - 51] = 10;
  input.state[1717 + v] = 999;
  input.state[6767 + v] = 20; // "maxHP"
  stepLegacySubsystemAv(input, noopCallbacks());
  const expected = Math.trunc(20 / 2) + Math.trunc(Math.trunc((20 * 10) / 100000) / 2);
  assert.equal(input.state[1919 + v], expected);
  assert.equal(input.state[6767 + v], expected, "6767 is overwritten too, not read as a fixed max");
}

// No HP-regen when game.missionFrame>=A.
{
  const input = makeInput({ sceneQ: 1, aInt: 5, simulationCounter: 100 });
  const v = 51;
  input.state[1919 + v] = 3;
  input.state[1414 + v] = 20;
  input.jobTable[v - 51] = 10;
  input.state[1717 + v] = 999;
  input.state[6767 + v] = 20;
  stepLegacySubsystemAv(input, noopCallbacks());
  assert.equal(input.state[1919 + v], 3, "unchanged since game.missionFrame>=A");
  assert.equal(input.state[6767 + v], 20);
}

// Tail: onRallyBroadcast fires with (x-aU, packedBytes-derived x/y, team, 0).
{
  const input = makeInput({ sceneQ: 1, team: 0 });
  input.packedOffsets[233] = 60;
  input.packedOffsets[234] = 61;
  input.packedBytes[60 + 1] = 77;
  input.packedBytes[61 + 1] = 88;
  let captured;
  stepLegacySubsystemAv(input, noopCallbacks({ onRallyBroadcast: (...args) => { captured = args; } }));
  assert.equal(captured[1], 77);
  assert.equal(captured[2], 88);
  assert.equal(captured[3], 0);
  assert.equal(captured[4], 0);
}

console.log("b.av() muster-selection OK");
