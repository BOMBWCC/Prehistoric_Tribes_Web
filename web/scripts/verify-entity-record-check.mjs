// Regression test for LegacyEntityRecordCheck.ts (private boolean c(int)).
// Expected values derived by hand from bytecode/b-javap.txt 15301 (c) and 15676 (d).
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
  const output = ts.transpileModule(fs.readFileSync(absPath, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const fn = vm.compileFunction(output, ["module", "exports", "require"], { parsingContext: context });
  fn(module, module.exports, (spec) => loadModule(spec, path.dirname(absPath)));
  return module.exports;
}
const { checkLegacyEntityRecord } = loadModule("./sim/units/LegacyEntityRecordCheck", srcDir);

// Unit 5 (type 77) at construction record 2 (type 16, 9115 = 3), as in the
// tutorial: d(int) passes (8505 5 < t138[182] 40; t41[m] == t41[77]).
function setup() {
  const state = new Int8Array(10000); const packedBytes = new Int8Array(2000); const packedOffsets = new Int16Array(200);
  packedOffsets[41] = 100; packedOffsets[138] = 200;
  packedBytes[100 + 77] = 12;
  packedBytes[200 + 182] = 40;
  packedBytes[200 + 2 * 26 + 16] = 2; // s
  packedBytes[200 + 156 + 16] = 0;    // column 6
  state[2828 + 5] = 77;
  state[8749 + 2] = 16; state[8505 + 2] = 5; state[9115 + 2] = 3; state[8383 + 2] = 7; state[8444 + 2] = 5;
  let m = 0; const log = [];
  const input = {
    state, packedBytes, packedOffsets, entityId: 5, record: 2,
    readCell: () => 0,
    readM: () => m,
    onEntityTransform: (x, y, flag) => { log.push(["transform", x, y, flag]); m = 77; },
    onQ: () => log.push(["Q"]),
  };
  return { state, packedBytes, input, log };
}

// m:B is read after d(int)'s transform call (the stub writes 77 there).
{
  const { input, log } = setup();
  assert.equal(checkLegacyEntityRecord(input), true, "s 2 > 8932 0");
  assert.deepEqual(log, [["transform", 7, 5, true]]);
}

// d(int) false (8505 >= threshold): Q() and false.
{
  const { state, input, log } = setup();
  state[8505 + 2] = 40;
  assert.equal(checkLegacyEntityRecord(input), false);
  assert.deepEqual(log, [["Q"]]);
}

// Owner 9 != unit: decrement when it belongs to another record, not when it
// is this record's and off its own cell.
{
  const { state, input } = setup();
  state[8932 + 2] = 1; state[8810 + 2] = 9; state[4444 + 9] = 8;
  assert.equal(checkLegacyEntityRecord(input), false, "s 2 - 1 = 1, not > 1");
  state[4444 + 9] = 2;
  assert.equal(checkLegacyEntityRecord(input), true, "no decrement: 2 > 1");
  input.readCell = () => 9;
  assert.equal(checkLegacyEntityRecord(input), false, "owner on its own cell: decrement");
}

// Column 6 <= -1 with 8627 == 0: no decrement even for a foreign owner.
{
  const { state, packedBytes, input } = setup();
  packedBytes[200 + 156 + 16] = -1;
  state[8932 + 2] = 1; state[8810 + 2] = 9; state[4444 + 9] = 8;
  assert.equal(checkLegacyEntityRecord(input), true);
}

// Type-51 unit: only the owner test decides, even when s > 8932.
{
  const { state, input } = setup();
  state[2828 + 5] = 51; input.readM = () => 51;
  const { packedBytes } = input; packedBytes[100 + 51] = 12;
  state[8810 + 2] = 9; state[4444 + 9] = 2; state[2828 + 9] = 57; state[1313 + 9] = 1; state[8932 + 2] = 1;
  assert.equal(checkLegacyEntityRecord(input), true);
  state[9237 + 2] = 1; packedBytes[200 + 182 + 1] = 40;
  assert.equal(checkLegacyEntityRecord(input), false, "9237 != 0");
}

console.log("b.c(int) entity record check OK");
