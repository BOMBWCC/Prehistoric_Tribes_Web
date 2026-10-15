// Regression test for LegacySubsystemAa.ts (private void aa()), hand-derived from b-javap.txt 38130.
import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";
import path from "node:path";

const srcDir = new URL("../src/j2me/", import.meta.url).pathname;
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
const { stepLegacySubsystemAa } = loadModule("./LegacySubsystemAa", srcDir);

function setup() {
  const state = new Int8Array(10000); const packedBytes = new Int8Array(2000); const packedOffsets = new Int16Array(300);
  packedOffsets[41] = 100; packedOffsets[42] = 300; packedOffsets[138] = 500;
  packedBytes[500 + 182] = 40;
  packedBytes[100 + 69] = 3; packedBytes[100 + 56] = 3; packedBytes[300 + 3] = 1;
  const cycleLengths = new Int8Array(256); cycleLengths[75] = 7;
  state[8749 + 2] = 16; state[8505 + 2] = 5; state[8993 + 2] = 5; state[4545 + 5] = 9;
  // worker 5: builder with its cycle done; worker 9: builder mid-cycle
  state[2828 + 5] = 56; state[6464 + 5] = 69; state[1313 + 5] = -2; state[2929 + 5] = 75; state[3030 + 5] = 6;
  state[2828 + 9] = 56; state[6464 + 9] = 69; state[1313 + 9] = -2; state[2929 + 9] = 75; state[3030 + 9] = 2;
  const scratch = { u: 0, v: 2, z: 16, x: 0, A: 0, C: 0 };
  const ab = [];
  return { state, packedBytes, scratch, ab, input: { state, packedBytes, packedOffsets, cycleLengths, scratch, onAb: (w) => ab.push(w) } };
}

{
  const { scratch, ab, input } = setup();
  stepLegacySubsystemAa(input);
  assert.deepEqual(ab, [5], "only the builder whose cycle is done (3030 6 >= 7 - 1)");
  assert.equal(scratch.C, 2);
}
{
  const { state, ab, input } = setup();
  state[3636 + 5] = 1;
  stepLegacySubsystemAa(input);
  assert.deepEqual(ab, [], "a builder carrying something is skipped");
  state[3636 + 5] = 0; state[6464 + 5] = 70; input.packedBytes[100 + 70] = 4;
  stepLegacySubsystemAa(input);
  assert.deepEqual(ab, [], "t42[t41[6464]] != t42[t41[2828]]");
}
// Construction finished: team 0 workers -> type 87, 6161 3; team 1 -> 6161 2.
{
  const { state, scratch, ab, input } = setup();
  state[8505 + 2] = 40;
  stepLegacySubsystemAa(input);
  assert.deepEqual(ab, []);
  assert.deepEqual([state[2828 + 5], state[6161 + 5], state[2828 + 9], state[6161 + 9]], [87, 3, 87, 3]);
  const second = setup(); second.state[8505 + 2] = 40; second.scratch.u = 1;
  stepLegacySubsystemAa(second.input);
  assert.deepEqual([second.state[2828 + 5], second.state[6161 + 5]], [56, 2]);
}
// Type-2 record, unbuilt: x = slot-0 worker, A |= 1 + 1515 for a type-111 worker with 1313 > 0.
{
  const { state, scratch, ab, input } = setup();
  scratch.z = 2; state[8749 + 2] = 2;
  state[4646 + 5] = 0; state[4646 + 9] = 1; state[2828 + 9] = 111; state[1313 + 9] = 1; state[1515 + 9] = 2;
  stepLegacySubsystemAa(input);
  assert.equal(scratch.x, 5); assert.equal(scratch.A, 3); assert.deepEqual(ab, []);
}
// Built record: only worker types 56/76/77/78 reach ab(); mode -109 needs its cycle done.
{
  const { state, ab, input } = setup();
  state[8627 + 2] = 1;
  state[1313 + 5] = 0; state[1313 + 9] = 0; state[2828 + 9] = 69;
  stepLegacySubsystemAa(input);
  assert.deepEqual(ab, [5]);
  ab.length = 0; state[2929 + 5] = -109; state[3030 + 5] = 0; input.cycleLengths[147] = 4;
  stepLegacySubsystemAa(input);
  assert.deepEqual(ab, [], "-109 & 255 = 147, cycle 0 < 3");
}
console.log("private void aa() OK");
