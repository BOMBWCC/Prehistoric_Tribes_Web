// Regression test for LegacySubsystemEntityAssociationScan.ts (private boolean j()).
// CONFIRMED unreachable (its only call site is itself unreachable, see the
// module's own docblock) -- tested standalone anyway.
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

const { stepLegacySubsystemEntityAssociationScan } = loadModule("./sim/tribe/LegacySubsystemEntityAssociationScan", srcDir);

function baseInput(overrides = {}) {
  return {
    state: new Int8Array(10000),
    packedBytes: new Int8Array(2000),
    packedOffsets: new Int16Array(320),
    mainShort: [new Int16Array(30), new Int16Array(30)],
    entityId: 5,
    team: 0,
    zValue: 0,
    f: { value: false },
    ...overrides,
  };
}

// mode===-116, dense[404]>=table49, type in [94,97] -> calls K(), returns false.
{
  const input = baseInput();
  input.state[2929 + 5] = -116;
  input.state[2828 + 5] = 95;
  input.state[404 + 5] = 5;
  let called = false;
  const result = stepLegacySubsystemEntityAssociationScan({ ...input, onK: () => { called = true; } });
  assert.equal(result, false);
  assert.equal(called, true);
}

// mode===-116 branch, type===55 -> onJInt(1), resets dense[404], returns false.
{
  const input = baseInput();
  input.state[2929 + 5] = -116;
  input.state[2828 + 5] = 55;
  input.state[404 + 5] = 5;
  let calledWith = null;
  const result = stepLegacySubsystemEntityAssociationScan({ ...input, onJInt: (a) => { calledWith = a; } });
  assert.equal(result, false);
  assert.equal(calledWith, 1);
  assert.equal(input.state[404 + 5], 0);
}

// mode===-116 branch, dense[404]<table49 -> gate fails entirely, falls to the
// main tail's own table(33)!==4 check (default 0 !== 4) -> false immediately.
{
  const input = baseInput();
  input.state[2929 + 5] = -116;
  input.state[2828 + 5] = 20;
  input.state[404 + 5] = 0;
  input.packedOffsets[49] = 1000;
  input.packedBytes[1000 + 20] = 5; // table49(type)=5 > dense[404]=0
  const result = stepLegacySubsystemEntityAssociationScan(input);
  assert.equal(result, false);
}

// Main tail: table(33)!==4 -> false immediately.
{
  const input = baseInput();
  input.state[2929 + 5] = 0;
  input.state[2828 + 5] = 7;
  const result = stepLegacySubsystemEntityAssociationScan(input);
  assert.equal(result, false);
}

// Main tail reaches the g:[[B] crash: dense[4646]>=0, dense[8627+assoc]!==0.
{
  const input = baseInput();
  input.packedOffsets[33] = 1000;
  input.packedBytes[1000 + 7] = 4; // table33(type)===4
  input.state[2828 + 5] = 7;
  input.state[404 + 5] = 10; // >= table49 (default 0)
  input.state[4646 + 5] = 0; // >=0
  input.state[4444 + 5] = 9; // assoc
  input.state[8627 + 9] = 1; // !==0 -> triggers g:[[B] crash
  assert.throws(() => stepLegacySubsystemEntityAssociationScan(input));
}

// Main tail reaches the b:[S] crash instead: dense[4646]>=0, dense[8627]===0,
// table(31,type)!==13.
{
  const input = baseInput();
  input.packedOffsets[33] = 1000;
  input.packedBytes[1000 + 7] = 4;
  input.state[2828 + 5] = 7;
  input.state[404 + 5] = 10;
  input.state[4646 + 5] = 0;
  input.state[4444 + 5] = 9;
  input.state[8627 + 9] = 0; // ===0, skips g:[[B] crash
  input.packedOffsets[31] = 1100;
  input.packedBytes[1100 + 7] = 5; // !==13 -> triggers b:[S] crash
  assert.throws(() => stepLegacySubsystemEntityAssociationScan(input));
}

// Both crash gates bypassed -> real tail logic runs: type in {11,14} with
// dense[3636]<dense[3737] calls N() and returns true.
{
  const input = baseInput();
  input.packedOffsets[33] = 1000;
  input.packedBytes[1000 + 11] = 4;
  input.state[2828 + 5] = 11;
  input.state[404 + 5] = 10;
  input.state[4646 + 5] = 0;
  input.state[4444 + 5] = 9;
  input.state[8627 + 9] = 0;
  input.packedOffsets[31] = 1100;
  input.packedBytes[1100 + 11] = 13; // ===13, bypasses b:[S] crash
  input.state[3636 + 5] = 1;
  input.state[3737 + 5] = 5;
  let called = false;
  const result = stepLegacySubsystemEntityAssociationScan({ ...input, onN: () => { called = true; } });
  assert.equal(result, true);
  assert.equal(called, true);
}

// Same bypass, type in the decrement set -> dense[9883+assoc] decremented, false.
{
  const input = baseInput();
  input.packedOffsets[33] = 1000;
  input.packedBytes[1000 + 10] = 4;
  input.state[2828 + 5] = 10;
  input.state[404 + 5] = 10;
  input.state[4646 + 5] = 0;
  input.state[4444 + 5] = 9;
  input.state[8627 + 9] = 0;
  input.packedOffsets[31] = 1100;
  input.packedBytes[1100 + 10] = 13;
  input.state[9883 + 9] = 3;
  const result = stepLegacySubsystemEntityAssociationScan(input);
  assert.equal(result, false);
  assert.equal(input.state[9883 + 9], 2);
}

// offset 892..984 (b-javap.txt 23642): t31 36, t30 99 and a full carry set the shared
// f:Z that i()Z reads at 917 (CORRECTED 2026-09-14: this used to be a discarded local).
{
  const input = baseInput({ saveOffsets: new Int16Array(570), gRows: [new Int8Array(20), new Int8Array(20), new Int8Array(20)], s: { value: 0 }, aValue: 1 });
  const { state, packedBytes, packedOffsets } = input;
  packedOffsets[33] = 100; packedOffsets[49] = 200; packedOffsets[31] = 300; packedOffsets[30] = 400; packedOffsets[48] = 500;
  state[2828 + 5] = 11; state[4646 + 5] = -1; state[3838 + 5] = 5;
  packedBytes[100 + 11] = 4; packedBytes[300 + 11] = 36; packedBytes[400 + 11] = 99; packedBytes[500 + 11] = 2;
  input.saveOffsets[36] = 3636;
  state[3636 + 5] = 1; state[3737 + 5] = 2;
  let n = 0;
  assert.equal(stepLegacySubsystemEntityAssociationScan({ ...input, onN: () => { n += 1; } }), false, "carry 1 + A 1 = 2 >= 2: full");
  assert.equal(state[3636 + 5], 2); assert.equal(input.f.value, true); assert.equal(n, 0);
}

console.log("private boolean j() (entity association scan) OK");
