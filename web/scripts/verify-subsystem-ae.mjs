// Regression test for LegacySubsystemAe.ts (private void ae()), hand-derived from b-javap.txt 39409.
import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";
import path from "node:path";

const srcDir = new URL("../src/", import.meta.url).pathname;
const context = vm.createContext({ Int8Array, Int16Array, Int32Array, Array, console, Math, RangeError, Error });
const cache = new Map();
function loadModule(specifier, fromDir) {
  const absPath = path.resolve(fromDir, specifier) + ".ts";
  if (cache.has(absPath)) return cache.get(absPath).exports;
  const module = { exports: {} };
  cache.set(absPath, module);
  const output = ts.transpileModule(fs.readFileSync(absPath, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const fn = vm.compileFunction(output, ["module", "exports", "require"], { parsingContext: context });
  fn(module, module.exports, (spec) => loadModule(spec, path.dirname(absPath)));
  return module.exports;
}
const grid = () => Array.from({ length: 20 }, () => new Int8Array(20));
const { stepLegacySubsystemAe } = loadModule("./sim/tribe/LegacySubsystemAe", srcDir);

function setup() {
  const state = new Int8Array(10000); const packedBytes = new Int8Array(2000); const packedOffsets = new Int16Array(300);
  packedOffsets[41] = 100; packedOffsets[42] = 300; packedOffsets[138] = 500; packedOffsets[242] = 900;
  packedBytes[500 + 2 * 26 + 16] = 2; // aK for 9115 3, type 16, unbuilt
  packedBytes[100 + 69] = 5; packedBytes[300 + 5] = 2; // work class 2
  state[8749 + 2] = 16; state[9115 + 2] = 3; state[8383 + 2] = 7; state[8444 + 2] = 5;
  const gridC = grid();
  // unit 1: idle villager on its own cell (1,1), last target cell (3,4) empty
  state[1] = 1; state[101 + 1] = 1; gridC[1][1] = 1;
  state[2828 + 1] = 69; state[6464 + 1] = 69; state[6262 + 1] = 3; state[6363 + 1] = 4;
  // unit 2: idle villager whose target cell holds built record 3
  state[2828 + 2] = 69; state[6464 + 2] = 69; state[6262 + 2] = 8; state[6363 + 2] = 8; gridC[8][8] = -3; state[8627 + 3] = 1;
  // unit 3: type 84 carrying a 69, not on its own cell
  state[2828 + 3] = 84; state[3939 + 3] = 69; state[6464 + 3] = 69; state[3] = 2; state[101 + 3] = 2;
  // unit 4: another idle villager, never reached (aK filled)
  state[2828 + 4] = 69; state[6464 + 4] = 69;
  const scratch = { u: 0, v: 2, z: 16, x: 0, A: 0, C: 0 };
  return { state, gridC, scratch, input: { state, packedBytes, packedOffsets, gridC, scratch, fN: false, qByte: 0, fQ: 0, jobTable: new Int8Array(50) } };
}

{
  const { state, input } = setup();
  stepLegacySubsystemAe(input);
  assert.deepEqual([state[3131 + 1], state[6262 + 1], state[3232 + 1], state[6363 + 1], state[2828 + 1], state[6464 + 1], state[6161 + 1]], [7, 7, 5, 5, 77, 77, 3]);
  assert.equal(state[2828 + 2], 69, "target cell is a built own record: skipped");
  assert.deepEqual([state[2828 + 3], state[6464 + 3], state[6161 + 3]], [87, 77, 3], "off its own cell -> type 87");
  assert.equal(state[2828 + 4], 69, "aK 2 reached");
  assert.equal(state[9298 + 2], 2);
}
{
  const { state, input } = setup();
  input.fN = true;
  stepLegacySubsystemAe(input);
  assert.equal(state[2828 + 1], 69, "team 0 returns while f.N");
}
{
  const { state, input } = setup();
  state[8932 + 2] = 2; state[8810 + 2] = 5;
  stepLegacySubsystemAe(input);
  assert.equal(state[9298 + 2], 2); assert.equal(state[2828 + 1], 69, "9298 raised to 8932 = aK: return");
}
console.log("private void ae() OK");
