// Regression test for LegacySubsystemAs.ts (private void as()).
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

const { stepLegacySubsystemAs } = loadModule("./LegacySubsystemAs", srcDir);

function makeInput(overrides = {}) {
  const { oByte = -1, aR = 0, qByte = 0, ...rest } = overrides;
  return {
    state: new Int8Array(10000),
    packedBytes: new Int8Array(4000),
    packedOffsets: new Int16Array(400),
    jobTable: new Int8Array(60),
    team: 1,
    aQ: 1000, // aQ>=c by default -- no recompute unless a test forces it
    fByte: 100,
    fields: { O: oByte, aR, v: 0, w: 0, Q: qByte },
    mByte: 5,
    sceneQ: 0,
    fBByte: 0,
    simulationCounter: 0,
    ...rest,
  };
}

// aQ recompute: only when aQ<c, using the corrected formula (A - B*fBByte)*100, then c+aQ/4+random.
{
  const input = makeInput({ aQ: 0, simulationCounter: 50, sceneQ: 2, fBByte: 3 });
  input.packedOffsets[214] = 10;
  input.packedBytes[10 + 2] = 20; // A
  input.packedOffsets[215] = 20;
  input.packedBytes[20 + 2] = 4; // B
  const expectedFirst = (20 - 4 * 3) * 100; // (A - B*fBByte)*100 = 800
  const expectedFinal = 50 + Math.trunc(expectedFirst / 4) + 7; // + randomA result
  input.fByte = 0; // below threshold (packedOffsets[217] default 0) -- actually need fByte<threshold to skip body; use a high threshold
  input.packedOffsets[217] = 30;
  input.packedBytes[30 + 2] = 999; // threshold high -> fByte(0)<threshold -> skip straight to tail
  const result = stepLegacySubsystemAs(input, { onRandomA: () => 7 });
  assert.equal(result.aQ, expectedFinal);
}

// No recompute when aQ>=c.
{
  const input = makeInput({ aQ: 1000, simulationCounter: 50 });
  let randomCalled = false;
  const result = stepLegacySubsystemAs(input, { onRandomA: () => { randomCalled = true; return 0; } });
  assert.equal(randomCalled, false);
  assert.equal(result.aQ, 1000);
}

// fByte<threshold -> skip the whole body, go straight to tail.
{
  const input = makeInput({ fByte: 0 });
  input.packedOffsets[217] = 30;
  input.packedBytes[30] = 50; // threshold=50, fByte(0)<50 -> skip
  let atCalled = false;
  stepLegacySubsystemAs(input, { onAt: () => { atCalled = true; } });
  assert.equal(atCalled, false);
}

// Section A ((game.c&63)===25): finds an eligible entity, sets Q, and
// flags eligible team-1 units (51..100) with bit5.
{
  const input = makeInput({ simulationCounter: 25, fByte: 100 }); // 25&63===25
  const v = 10;
  input.state[1919 + v] = 5;
  input.state[1414 + v] = 20;
  input.packedOffsets[218] = 40;
  const aT = 40 + input.sceneQ * 4; // q=0 -> aT=40
  input.packedBytes[aT] = 0;
  input.packedBytes[aT + 1] = 0;
  input.packedBytes[aT + 2] = 100;
  input.packedBytes[aT + 3] = 100;
  input.state[v] = 5; // within [0,100]
  input.state[101 + v] = 5;
  const w = 51;
  input.state[1919 + w] = 3;
  input.state[1414 + w] = 20;
  input.state[7979 + w] = 0; // bit6 clear
  const result = stepLegacySubsystemAs(input, {});
  assert.equal(input.fields.Q, v);
  assert.equal(input.state[7979 + w] & 32, 32, "bit5 set on the eligible w-entity");
}

// Section A: w-entity with bit6 already set is excluded from the bit5 flag.
{
  const input = makeInput({ simulationCounter: 25, fByte: 100 });
  const v = 10;
  input.state[1919 + v] = 5;
  input.state[1414 + v] = 20;
  const w = 51;
  input.state[1919 + w] = 3;
  input.state[1414 + w] = 20;
  input.state[7979 + w] = 64; // bit6 already set
  stepLegacySubsystemAs(input, {});
  assert.equal(input.state[7979 + w], 64, "unchanged -- bit5 not added");
}

// Section B (!==25): a ready entity (HP>0, level>=12) with bit6 clear
// triggers onAt() directly.
{
  const input = makeInput({ simulationCounter: 1, team: 0 }); // 1&63!==25
  const v = 1; // team0 base
  input.state[1919 + v] = 5;
  input.state[1414 + v] = 20;
  input.state[7979 + v] = 0; // bit6 clear
  let atCalls = 0;
  stepLegacySubsystemAs(input, { onAt: () => { atCalls += 1; } });
  assert.equal(atCalls, 1);
}

// Section B: ready entity, bit6 SET, but oByte>=0 -> excluded from the g(1) path.
{
  const input = makeInput({ simulationCounter: 1, team: 0, oByte: 5 });
  const v = 1;
  input.state[1919 + v] = 5;
  input.state[1414 + v] = 20;
  input.state[7979 + v] = 64; // bit6 set
  let groupCalls = 0;
  stepLegacySubsystemAs(input, { onGroupMode: () => { groupCalls += 1; } });
  assert.equal(groupCalls, 0);
}

// Section B: ready, bit6+bit1 set, oByte<0, occupancy<29, both markers
// zero -> writes dense[3131/3232+v] from the bare 8384/8445 cells and calls g(1).
{
  const input = makeInput({ simulationCounter: 1, team: 0, oByte: -1 });
  const v = 1;
  input.state[1919 + v] = 5;
  input.state[1414 + v] = 20;
  input.state[7979 + v] = 64 | 2; // bit6 + bit1 set
  input.state[202 + v] = 0;
  input.state[303 + v] = 0;
  input.state[8384] = 33;
  input.state[8445] = 44;
  let groupArgs;
  let occArgs;
  stepLegacySubsystemAs(input, {
    onCheckOccupancy: (...args) => { occArgs = args; return 10; },
    onGroupMode: (id, arg) => { groupArgs = [id, arg]; },
  });
  assert.equal(input.state[3131 + v], 33);
  assert.equal(input.state[3232 + v], 44);
  assert.deepEqual(groupArgs, [1, 1]);
}

// Section B: NOT ready -> the tick-throttled job-table swap block is
// entered, but its own inner re-check reads the SAME v's HP/level fields
// the outer "ready" gate just failed on -- so it can NEVER actually swap
// anything, regardless of which condition made v "not ready". Confirmed
// via direct bytecode read (both re-checks use getfield #225 = "v", not
// #96/"aU").
{
  const input = makeInput({ team: 0 });
  input.simulationCounter = 1; // 1&63=1, matches (v&31) for v=1
  const v = 1; // aT = 0
  input.state[1919 + v] = 0; // not ready via low HP
  input.state[1414 + v] = 20;
  input.jobTable[0] = 2; // < M(5)
  input.jobTable[2] = 9; // >= M(5) at aU=3 (aUIdx=2) -- a plausible swap target
  stepLegacySubsystemAs(input, {});
  assert.equal(input.jobTable[2], 9, "never touched -- the swap can't reach here");
  assert.equal(input.jobTable[0], 2, "v's own slot untouched too");
}
{
  const input = makeInput({ team: 0 });
  input.simulationCounter = 1;
  const v = 1;
  input.state[1919 + v] = 3; // HP fine this time
  input.state[1414 + v] = 5; // not ready via low level instead
  input.jobTable[0] = 2;
  input.jobTable[2] = 9;
  stepLegacySubsystemAs(input, {});
  assert.equal(input.jobTable[2], 9, "still never touched -- either reason for 'not ready' blocks the inner re-check");
  assert.equal(input.jobTable[0], 2);
}

// aR:I is a field that only the av() branch writes, and aU:I ends at -1
// (offsets 928 / 959..961). aR used to come back as 0 every call (2026-10-08).
{
  const input = makeInput({ aQ: 1000, simulationCounter: 50, aR: -1 });
  const result = stepLegacySubsystemAs(input);
  assert.equal(input.fields.aR, -1);
  assert.equal(result.aU, -1);
}

// O:B and aR:I are live fields: av() (the raid launch) sets O = 0 and the tail
// then calls aw() in the same call, which already sees the new aR (oracle run 7, frame 25143).
{
  const input = makeInput({ aQ: 64, simulationCounter: 64, oByte: -1, aR: -1 });
  input.packedOffsets[217] = 30;
  input.packedBytes[30] = 127; // fByte below threshold: straight to the tail
  input.fields.Q = -1;
  const seen = [];
  stepLegacySubsystemAs(input, {
    onAv: () => { seen.push(['av', input.fields.aR]); input.fields.O = 0; },
    onAw: () => seen.push(['aw', input.fields.aR, input.fields.O]),
  });
  assert.deepEqual(seen, [['av', 64], ['aw', 64, 0]]);
}

// (c & 63) === 25: block A falls through into block B (offset 449), so at()
// still runs for every ready team-1 unit; v:I/w:I are the live loop fields
// (oracle run 13, play10 frame 30021).
{
  const input = makeInput({ simulationCounter: 25 });
  input.state[1919 + 51] = 10;
  input.state[1414 + 51] = 20;
  const at = [];
  stepLegacySubsystemAs(input, { onAt: (v, aT) => at.push([v, aT, input.fields.Q]) });
  // at() already sees offset 175's Q = -1 (oracle run 15, play25 frame 94174).
  assert.deepEqual(at, [[51, 0, -1]]);
  assert.equal(input.fields.v, 101);
}

console.log("b.as() combat dispatch / at()-trigger OK");
