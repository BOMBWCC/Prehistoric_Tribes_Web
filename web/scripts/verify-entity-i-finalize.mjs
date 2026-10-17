// Regression test for LegacyEntityIFinalize.ts (private void I(), #245).
// Expected values derived by hand from bytecode/b-javap.txt 24732..24998.
import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";
import path from "node:path";

const srcDir = new URL("../src/", import.meta.url).pathname;
const context = vm.createContext({ Int8Array, Int16Array, Array, console, Math });

function loadModule(specifier, fromDir) {
  const absPath = path.resolve(fromDir, specifier) + ".ts";
  const module = { exports: {} };
  const output = ts.transpileModule(fs.readFileSync(absPath, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const fn = vm.compileFunction(output, ["module", "exports", "require"], { parsingContext: context });
  fn(module, module.exports, (spec) => loadModule(spec, path.dirname(absPath)));
  return module.exports;
}

const { stepLegacyEntityIFinalize } = loadModule("./sim/units/LegacyEntityIFinalize", srcDir);

function fixture() {
  const packedBytes = new Int8Array(1000);
  const packedOffsets = new Int16Array(200);
  packedOffsets[160] = 100;
  packedOffsets[39] = 400;
  packedBytes[100 + 11] = 21;
  packedBytes[100 + 21] = 11;
  packedBytes[100 + 12] = 16;
  const state = new Int8Array(10000);
  const gridC = Array.from({ length: 20 }, () => new Int8Array(20));
  const log = [];
  const run = (id) => stepLegacyEntityIFinalize({
    state, packedBytes, packedOffsets, gridC, id,
    onChangeType: (entityId, type) => { log.push(["a", entityId, type]); state[2828 + entityId] = type; },
    onF: (flag) => log.push(["f", flag]),
    onN: () => log.push(["N"]),
    onAn: () => log.push(["an"]),
  });
  return { packedBytes, state, gridC, log, run };
}

// Full gatherer (11) on its own cell -> carrier t160[11] = 21, then N().
{
  const { state, gridC, log, run } = fixture();
  state[2828 + 6] = 11;
  state[6] = 3;
  state[101 + 6] = 9;
  gridC[9][3] = 6;
  run(6);
  assert.deepEqual(log, [["a", 6, 21], ["N"]]);
}

// Carrier (21) with 6464 == 69 -> 69; not on its own cell, t39 != 2, no N().
{
  const { state, log, run } = fixture();
  state[2828 + 6] = 21;
  state[6464 + 6] = 69;
  run(6);
  assert.deepEqual(log, [["a", 6, 69]]);
}

// 6161 >= 2 blocks N() even when the unit is on its own cell.
{
  const { state, gridC, log, run } = fixture();
  state[2828 + 6] = 11;
  state[6161 + 6] = 2;
  gridC[0][0] = 6;
  run(6);
  assert.deepEqual(log, [["a", 6, 21]]);
}

// Type 12 -> 16: t39[16] == 2 gives N(), then an().
{
  const { packedBytes, state, log, run } = fixture();
  packedBytes[400 + 16] = 2;
  state[2828 + 6] = 12;
  run(6);
  assert.deepEqual(log, [["a", 6, 16], ["N"], ["an"]]);
}

// Type 85 with saved 3939 = 46: 3535 = 10, a(v, 46), new type 46 -> 3535 = 0.
{
  const { state, log, run } = fixture();
  state[2828 + 6] = 85;
  state[3939 + 6] = 46;
  state[3535 + 6] = 5;
  state[1313 + 6] = 3;
  state[404 + 6] = 7;
  state[6161 + 6] = 2;
  run(6);
  assert.deepEqual(log, [["a", 6, 69]]);
  assert.equal(state[3535 + 6], 10, "6161 >= 2 rewrote 3939 to 69 before a()");
  assert.equal(state[3939 + 6], 69);
  assert.equal(state[1313 + 6], 0);
  assert.equal(state[404 + 6], 0);
}
{
  const { state, log, run } = fixture();
  state[2828 + 6] = 85;
  state[3939 + 6] = 46;
  state[3535 + 6] = 5;
  state[6161 + 6] = 2;
  state[6161 + 6] = 0;
  state[0 + 6] = 1;
  run(6);
  assert.deepEqual(log, [["a", 6, 46]]);
  assert.equal(state[3535 + 6], 0);
}

// New type 26 -> f(false).
{
  const { packedBytes, state, log, run } = fixture();
  packedBytes[100 + 52] = 26;
  state[2828 + 6] = 52;
  state[6] = 1;
  run(6);
  assert.deepEqual(log, [["a", 6, 26], ["f", false]]);
}

console.log("private void I() (work done: follow-up type) OK");
