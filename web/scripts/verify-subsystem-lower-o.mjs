// Regression test for LegacySubsystemLowerO.ts (private void o(int)).
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

const { stepLegacySubsystemLowerO } = loadModule("./sim/tribe/LegacySubsystemLowerO", srcDir);

function makeGrid() {
  return Array.from({ length: 20 }, () => new Int8Array(20));
}

function makeInput(overrides = {}) {
  return { state: new Int8Array(10000), gridC: makeGrid(), entityId: 5, arg: -1, ...overrides };
}

// type<=9 -> no-op.
{
  const input = makeInput();
  input.state[2828 + 5] = 9;
  let called = false;
  stepLegacySubsystemLowerO(input, { onChangeEntityType: () => { called = true; } });
  assert.equal(called, false);
}

// 44<=type<=50 -> no-op.
{
  const input = makeInput();
  input.state[2828 + 5] = 47;
  let called = false;
  stepLegacySubsystemLowerO(input, { onChangeEntityType: () => { called = true; } });
  assert.equal(called, false);
}

// type in (9,44) -- e.g. 10 -- proceeds.
{
  const input = makeInput();
  const v = 5;
  input.state[2828 + v] = 10;
  input.state[v] = 3;       // x
  input.state[101 + v] = 4; // y
  input.gridC[4][3] = v;    // self-occupying
  let calls = [];
  stepLegacySubsystemLowerO(input, { onChangeEntityType: (id, t) => calls.push([id, t]) });
  assert.deepEqual(calls, [[5, 50], [5, 69]], "arg=-1 -> newType 50, then gate false -> reset to 69");
}

// type>50 also proceeds (the "OR type>50" half of the gate).
{
  const input = makeInput();
  const v = 5;
  input.state[2828 + v] = 99;
  input.state[v] = 3;
  input.state[101 + v] = 4;
  input.gridC[4][3] = v;
  let calls = [];
  stepLegacySubsystemLowerO(input, { onChangeEntityType: (id, t) => calls.push([id, t]) });
  assert.deepEqual(calls, [[5, 50], [5, 69]]);
}

// Not self-occupying own cell -> type=59, mode=3, return (no further work).
{
  const input = makeInput();
  const v = 5;
  input.state[2828 + v] = 20;
  input.state[v] = 3;
  input.state[101 + v] = 4;
  input.gridC[4][3] = 999; // someone else occupies the cell
  let calls = [];
  stepLegacySubsystemLowerO(input, { onChangeEntityType: (id, t) => calls.push([id, t]) });
  assert.deepEqual(calls, [[5, 59]]);
  assert.equal(input.state[6161 + v], 3);
}

// Self-occupying but dense[202+v]!==0 -> the whole "eligible" branch is skipped.
{
  const input = makeInput();
  const v = 5;
  input.state[2828 + v] = 20;
  input.state[v] = 3;
  input.state[101 + v] = 4;
  input.gridC[4][3] = v;
  input.state[202 + v] = 1;
  let called = false;
  stepLegacySubsystemLowerO(input, { onChangeEntityType: () => { called = true; } });
  assert.equal(called, false);
}

// arg >= 0 -> newType = 44+arg.
{
  const input = makeInput({ arg: 3 });
  const v = 5;
  input.state[2828 + v] = 20;
  input.state[v] = 3;
  input.state[101 + v] = 4;
  input.gridC[4][3] = v;
  let calls = [];
  stepLegacySubsystemLowerO(input, { onChangeEntityType: (id, t) => calls.push([id, t]) });
  assert.equal(calls[0][1], 47, "44+3=47");
}

// onCheckGate(6) returning true -> calls onGroupMode(2) instead of resetting to 69.
{
  const input = makeInput();
  const v = 5;
  input.state[2828 + v] = 20;
  input.state[v] = 3;
  input.state[101 + v] = 4;
  input.gridC[4][3] = v;
  let calls = [];
  let groupArgs;
  let gateArg;
  stepLegacySubsystemLowerO(input, {
    onChangeEntityType: (id, t) => calls.push([id, t]),
    onCheckGate: (arg) => { gateArg = arg; return true; },
    onGroupMode: (id, arg) => { groupArgs = [id, arg]; },
  });
  assert.equal(gateArg, 6);
  assert.deepEqual(groupArgs, [5, 2]);
  assert.deepEqual(calls, [[5, 50]], "no reset-to-69 call when the gate passes");
}

console.log("b.o(int) LowerO OK");
