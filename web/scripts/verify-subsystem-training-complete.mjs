// Regression test for LegacySubsystemTrainingComplete.ts (private void ad()).
//
// RETRACTED (2026-09-07): previously believed a guaranteed-throw plus
// unreachable call site (both premises rested on class b's own `g:[[B]`
// (#176) being permanently null -- it is not, see the file's own
// docblock). The method now runs to completion for real.
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

const { stepLegacySubsystemTrainingComplete } = loadModule("./sim/tribe/LegacySubsystemTrainingComplete", srcDir);

function makeInput(overrides = {}) {
  return {
    state: new Int8Array(10000),
    buildingId: 5,
    gRows: [new Int8Array(20), new Int8Array(20), new Int8Array(20)],
    subsystemX: 7,
    ...overrides,
  };
}

// bit0 of dense[9054+v] clear -> fires the completion effect, and (since
// dense[8627+v]===1) bumps dense[9115+v] -- then the unconditional tail
// (gRows[0][subsystemX]=0, onRecordCompletion(v)) runs for real.
{
  const input = makeInput();
  input.state[9054 + 5] = 0; // bit0 clear
  input.state[8627 + 5] = 1;
  input.state[9115 + 5] = 4;
  input.gRows[0][7] = 99;
  let effectArgs;
  input.onEnqueueEffect = (a, b) => { effectArgs = [a, b]; };
  let completionArg;
  input.onRecordCompletion = (record) => { completionArg = record; };
  assert.doesNotThrow(() => stepLegacySubsystemTrainingComplete(input));
  assert.deepEqual(effectArgs, [5, 0]);
  assert.equal(input.state[9115 + 5], 5);
  assert.equal(input.gRows[0][7], 0, "gRows[0][subsystemX] = 0");
  assert.equal(completionArg, 5, "onRecordCompletion(v) fires with the building id");
}

// bit0 clear but dense[8627+v]!==1 -> effect still fires, but no counter bump.
{
  const input = makeInput();
  input.state[9054 + 5] = 0;
  input.state[8627 + 5] = 0;
  input.state[9115 + 5] = 4;
  let fired = false;
  input.onEnqueueEffect = () => { fired = true; };
  stepLegacySubsystemTrainingComplete(input);
  assert.equal(fired, true);
  assert.equal(input.state[9115 + 5], 4);
}

// bit0 SET -> no effect fired, no counter bump, but the unconditional
// cleanup writes and tail still happen.
{
  const input = makeInput();
  input.state[9054 + 5] = 1; // bit0 set
  input.state[8627 + 5] = 1;
  input.state[9115 + 5] = 4;
  input.gRows[0][7] = 55;
  let fired = false;
  input.onEnqueueEffect = () => { fired = true; };
  let completed = false;
  input.onRecordCompletion = () => { completed = true; };
  stepLegacySubsystemTrainingComplete(input);
  assert.equal(fired, false);
  assert.equal(input.state[9115 + 5], 4);
  assert.equal(input.gRows[0][7], 0, "tail still runs even when the effect is skipped");
  assert.equal(completed, true);
}

// Unconditional prefix writes (bit0 cleared from dense[9054+v],
// dense[8627+v]=0, dense[8810+v] saved from dense[9237+v], dense[9237+v]
// reset to 0), then the tail.
{
  const input = makeInput({ buildingId: 5 });
  input.state[9054 + 5] = 0b101; // bit0 set among others
  input.state[8627 + 5] = 1;
  input.state[9237 + 5] = 42;
  stepLegacySubsystemTrainingComplete(input);
  assert.equal(input.state[9054 + 5] & 1, 0, "bit0 cleared");
  assert.equal(input.state[9054 + 5], 0b100, "only bit0 cleared, other bits untouched");
  assert.equal(input.state[8627 + 5], 0);
  assert.equal(input.state[8810 + 5], 42, "saved the old progress value");
  assert.equal(input.state[9237 + 5], 0, "progress reset");
  assert.equal(input.gRows[0][input.subsystemX], 0);
}

// Callbacks are optional -- must not throw when omitted.
{
  const input = makeInput();
  input.state[9054 + 5] = 0;
  assert.doesNotThrow(() => stepLegacySubsystemTrainingComplete(input));
}

console.log("b.ad() training-complete (real, non-throwing) OK");
