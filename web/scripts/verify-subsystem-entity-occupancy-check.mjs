// Regression test for LegacySubsystemEntityOccupancyCheck.ts
// (private int a(int,int,int), RETRACTED 2026-09-07 -- real logic, not a throw).
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

const { stepLegacySubsystemEntityOccupancyCheck } = loadModule("./LegacySubsystemEntityOccupancyCheck", srcDir);

function makeTables() {
  const packedBytes = new Int8Array(2000);
  const packedOffsets = new Int16Array(320);
  const saveOffsets = new Int16Array(570);
  // The stride table starts i*101 -- set the handful of indices this
  // method actually touches.
  for (const i of [28, 29, 31, 32, 44, 53, 83, 110, 112, 113, 138]) saveOffsets[i] = i * 101;
  return { packedBytes, packedOffsets, saveOffsets };
}

// arg3===0 and dense[4444+id]<-1 -> real early return, 0.
{
  const { packedBytes, packedOffsets, saveOffsets } = makeTables();
  const state = new Int8Array(20000);
  state[4444 + 5] = -5;
  const result = stepLegacySubsystemEntityOccupancyCheck(state, packedBytes, packedOffsets, saveOffsets, 5, 0, 0, 0);
  assert.equal(result, 0);
}

// arg3!==0 -> the dense[4444+id]<-1 guard doesn't apply at all.
// local4 = dense[saveOffsets[110]+id]; here 0, so local4<1 -> takes the
// offset 91..151 branch: q=dense[saveOffsets[112]+id], r=dense[saveOffsets[113]+id].
{
  const { packedBytes, packedOffsets, saveOffsets } = makeTables();
  const state = new Int8Array(20000);
  state[4444 + 5] = -5; // would have escaped the guard if arg3 were 0 -- irrelevant here
  state[saveOffsets[112] + 5] = 10; // q
  state[saveOffsets[113] + 5] = 10; // r
  // d1 = q-x = 10-10 = 0, d2 = r-y = 10-10 = 0, both in [-12,12].
  const result = stepLegacySubsystemEntityOccupancyCheck(state, packedBytes, packedOffsets, saveOffsets, 5, 10, 10, 1);
  const expected = packedBytes[(packedOffsets[53] ?? 0) + (12 + 0) * 25 + 12 + 0] ?? 0;
  assert.equal(result, expected);
}

// arg3===0, local4>=1, table28[type]!==43 -> the 154..421 branch;
// tableVal!==83 -> no reclamp/writeback, straight to the join.
{
  const { packedBytes, packedOffsets, saveOffsets } = makeTables();
  const state = new Int8Array(20000);
  state[4444 + 5] = 7; // local4 source (saveOffsets[44]=4444)
  state[2828 + 5] = 2; // type
  packedOffsets[28] = 500;
  packedBytes[500 + 2] = 20; // tableVal, !== 43 and !== 83
  state[saveOffsets[20] + 7] = 15; // q = dense[saveOffsets[tableVal]+local4]
  state[saveOffsets[21] + 7] = 15; // r = dense[saveOffsets[tableVal+1]+local4]
  const result = stepLegacySubsystemEntityOccupancyCheck(state, packedBytes, packedOffsets, saveOffsets, 5, 15, 15, 0);
  const expected = packedBytes[(packedOffsets[53] ?? 0) + 12 * 25 + 12] ?? 0;
  assert.equal(result, expected);
  // No writeback since tableVal!==83.
  assert.equal(state[3131 + 5], 0);
  assert.equal(state[3232 + 5], 0);
}

// arg3===0, local4>=1, tableVal===43 -> takes the 91..151 branch instead
// (the "OR arg3!==0" fallthrough also covers tableVal===43).
{
  const { packedBytes, packedOffsets, saveOffsets } = makeTables();
  const state = new Int8Array(20000);
  state[4444 + 5] = 7;
  state[2828 + 5] = 2;
  packedOffsets[28] = 500;
  packedBytes[500 + 2] = 43;
  state[saveOffsets[31] + 5] = 8; // q
  state[saveOffsets[32] + 5] = 8; // r
  const result = stepLegacySubsystemEntityOccupancyCheck(state, packedBytes, packedOffsets, saveOffsets, 5, 8, 8, 0);
  const expected = packedBytes[(packedOffsets[53] ?? 0) + 12 * 25 + 12] ?? 0;
  assert.equal(result, expected);
}

// arg3===0, local4>=1, tableVal===83, type<=9 -> reclamp via clampToRange
// and write dense[3131+id]/dense[3232+id].
{
  const { packedBytes, packedOffsets, saveOffsets } = makeTables();
  const state = new Int8Array(20000);
  state[4444 + 5] = 7; // local4
  state[2828 + 5] = 3; // type <=9
  packedOffsets[28] = 500;
  packedBytes[500 + 3] = 83; // tableVal
  state[saveOffsets[83] + 7] = 20; // q base
  state[saveOffsets[84] + 7] = 30; // r base
  state[8749 + 7] = 2; // level
  packedOffsets[138] = 1000;
  packedBytes[1000 + 104 + 2] = 5; // spanQ -> q clamped into [20, 24]
  packedBytes[1000 + 130 + 2] = 5; // spanR -> r clamped into [30, 34]
  // x=100 (way above the [20,24] range) -> clampToRange returns max (24).
  // y=1 (way below [30,34]) -> clampToRange returns min (30).
  const result = stepLegacySubsystemEntityOccupancyCheck(state, packedBytes, packedOffsets, saveOffsets, 5, 100, 1, 0);
  assert.equal(state[3131 + 5], 24);
  assert.equal(state[3232 + 5], 30);
  const d1 = (24 - 100) & 0xff; // toJavaByte narrowing
  const d1Signed = d1 >= 0x80 ? d1 - 0x100 : d1;
  const d2 = (30 - 1) & 0xff;
  const d2Signed = d2 >= 0x80 ? d2 - 0x100 : d2;
  if (d1Signed < -12 || d1Signed > 12 || d2Signed < -12 || d2Signed > 12) {
    assert.equal(result, 200);
  } else {
    assert.equal(result, packedBytes[(packedOffsets[53] ?? 0) + (12 + d2Signed) * 25 + 12 + d1Signed] ?? 0);
  }
}

// d1/d2 outside [-12,12] -> returns the literal 200.
{
  const { packedBytes, packedOffsets, saveOffsets } = makeTables();
  const state = new Int8Array(20000);
  state[4444 + 5] = 7;
  state[2828 + 5] = 2;
  packedOffsets[28] = 500;
  packedBytes[500 + 2] = 20;
  state[saveOffsets[20] + 7] = 100; // q
  state[saveOffsets[21] + 7] = 100; // r
  // x=0,y=0 -> d1=100, d2=100, both way outside [-12,12].
  const result = stepLegacySubsystemEntityOccupancyCheck(state, packedBytes, packedOffsets, saveOffsets, 5, 0, 0, 0);
  assert.equal(result, 200);
}

// q/r land in b.q:B / b.r:B (#212/#215) for d(int) (#366) -- 2026-09-28.
// The early `4444 < -1` return (arg3 == 0) writes neither.
{
  const { packedBytes, packedOffsets, saveOffsets } = makeTables();
  const state = new Int8Array(20000);
  state[saveOffsets[112] + 5] = 33;
  state[saveOffsets[113] + 5] = 44;
  const fields = { bField212: 0, bField215: 0 };
  stepLegacySubsystemEntityOccupancyCheck(state, packedBytes, packedOffsets, saveOffsets, 5, 30, 40, 1, fields);
  assert.deepEqual([fields.bField212, fields.bField215], [33, 44]);
  const untouched = { bField212: 9, bField215: 9 };
  state[4444 + 5] = -5;
  assert.equal(stepLegacySubsystemEntityOccupancyCheck(state, packedBytes, packedOffsets, saveOffsets, 5, 30, 40, 0, untouched), 0);
  assert.deepEqual([untouched.bField212, untouched.bField215], [9, 9]);
}

console.log("b.a(int,int,int) occupancy-check (RETRACTED 2026-09-07, real logic) OK");
