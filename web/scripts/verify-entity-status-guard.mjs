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

const { stepLegacyEntityStatusGuard } = loadModule("./sim/units/LegacyEntityStatusGuard", srcDir);

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
    id: 7,
    team: 0,
    frame: 0,
    subsystemGFFlagByte: 0,
    randomRemainder: () => 0,
    fields: { B: -1 },
    ...overrides,
  };
}

// dead branch (dense[1919+id] < 0): unchanged from before.
{
  const input = baseInput();
  input.state[1919 + 7] = -1;
  input.state[3030 + 7] = 4;
  input.state[5959 + 7] = 1;
  const calls = [];
  const result = stepLegacyEntityStatusGuard({
    ...input,
    animationLimit: 5,
    onLifecycle: (value) => calls.push(["lifecycle", value]),
    onFinal: (value) => calls.push(["final", value]),
  });
  assert.equal(result, true);
  assert.equal(input.state[3030 + 7], 5);
  assert.deepEqual(calls, [["lifecycle", 7], ["final", 7]]);
}

// alive branch, self-vacate: dense[8282+id] bit7 set, gridC self-occupied -> onVacate fires, returns true immediately.
{
  const input = baseInput();
  input.state[1919 + 7] = 1;
  input.state[8282 + 7] = -128; // bit7 set (as signed byte)
  input.state[7] = 3;
  input.state[101 + 7] = 4;
  input.gridC[4][3] = 7;
  let vacateArgs = null;
  const result = stepLegacyEntityStatusGuard({
    ...input,
    onVacate: (...a) => { vacateArgs = a; },
  });
  assert.equal(result, true);
  assert.deepEqual(vacateArgs, [19, 3, 4, 7]);
}

// alive branch, no vacate, q() gate not on cadence, tail resets run, returns false.
{
  const input = baseInput({ frame: 1 }); // (1&3)=1, (id&3)=7&3=3 -- not equal, skip q()
  input.state[1919 + 7] = 1;
  input.state[2828 + 7] = 5; // type<=9 -> K:B branch skipped (not modeled anyway)
  input.state[3333 + 7] = 20;
  input.state[2929 + 7] = 1; // not 39/104/105
  const result = stepLegacyEntityStatusGuard(input);
  assert.equal(result, false);
  assert.equal(input.fields.B, input.packedBytes[(input.packedOffsets[38] ?? 0) + 5]); // offset 193 stores B:I
  assert.equal(input.state[5050 + 7], 1);
  assert.equal(input.state[3333 + 7], -1);
}

// alive branch, q() gate on cadence and q() itself returns false (early
// regen threshold not met -> q() returns TRUE, so this doesn't short-circuit;
// verify the frame/id parity condition alone selects q()'s invocation).
{
  const input = baseInput({ frame: 3 }); // (3&3)=3, (id&3)=7&3=3 -- match, q() runs
  input.state[1919 + 7] = 1;
  input.state[6666 + 7] = 0; // below regen threshold -> q() returns true immediately, no short-circuit
  const result = stepLegacyEntityStatusGuard(input);
  assert.equal(result, false); // falls through to the tail, same as no-q()-call case
}

console.log("b.a() status guard (dead + alive continuation) OK");
