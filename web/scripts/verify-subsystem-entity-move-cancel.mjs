// Regression test for LegacySubsystemEntityMoveCancel.ts (private void F()).
// Expected values derived by hand from bytecode/b-javap.txt 18599..19389.
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

const { stepLegacySubsystemEntityMoveCancel } = loadModule("./sim/tribe/LegacySubsystemEntityMoveCancel", srcDir);

function makeGrid() {
  const grid = [];
  for (let i = 0; i < 20; i += 1) grid.push(new Int8Array(20));
  return grid;
}

// Gate false (mode>1) -> skips the d(int) call entirely, still runs the
// revert-to-idle tail.
{
  const packedBytes = new Int8Array(2000);
  const packedOffsets = new Int16Array(320);
  const state = new Int8Array(10000);
  state[6161 + 3] = 2; // mode>1
  state[4444 + 3] = 7;
  state[8810 + 7] = 3;
  state[8749 + 7] = 2;
  state[8627 + 7] = 0;
  state[8932 + 7] = 5;
  state[3] = 2;
  state[101 + 3] = 2;
  const gridC = makeGrid();

  const calls = [];
  stepLegacySubsystemEntityMoveCancel({
    state, packedBytes, packedOffsets, gridC, id: 3, readM: () => 0, uInt: 0,
    onChangeType: (id, type) => calls.push([id, type]),
    onSelectionRelease: () => {}, onTrainingSlot: () => {},
  });

  assert.equal(state[202 + 3], 0);
  assert.equal(state[303 + 3], 0);
  assert.equal(state[3030 + 3], 0);
  assert.equal(state[6161 + 3], 2); // only reset when mode===1
  assert.equal(state[8932 + 7], 4); // decremented
  assert.equal(state[1313 + 3], 0);
  assert.equal(gridC[2][2], 3);
  assert.equal(calls.length, 1); // Q()'s changeEntityType call
}

// Gate false (mode===1) -> mode reset to 0; record not owned by id -> decrement
// (offset 186 `if_icmpne 240` jumps straight to it).
{
  const packedBytes = new Int8Array(2000);
  const packedOffsets = new Int16Array(320);
  const state = new Int8Array(10000);
  state[6161 + 3] = 1;
  state[4444 + 3] = 7;
  state[8810 + 7] = 99; // not id
  state[8932 + 7] = 5;
  const gridC = makeGrid();

  stepLegacySubsystemEntityMoveCancel({
    state, packedBytes, packedOffsets, gridC, id: 3, readM: () => 0, uInt: 0, onChangeType: () => {},
    onSelectionRelease: () => {}, onTrainingSlot: () => {},
  });
  assert.equal(state[6161 + 3], 0);
  assert.equal(state[8932 + 7], 4);
}

// Owner of a finished (or non-type-2) record -> no decrement.
{
  const packedBytes = new Int8Array(2000);
  const packedOffsets = new Int16Array(320);
  const state = new Int8Array(10000);
  state[6161 + 3] = 2;
  state[4444 + 3] = 7;
  state[8810 + 7] = 3;
  state[8749 + 7] = 17;
  state[8932 + 7] = 5;
  const gridC = makeGrid();

  stepLegacySubsystemEntityMoveCancel({
    state, packedBytes, packedOffsets, gridC, id: 3, readM: () => 0, uInt: 0, onChangeType: () => {},
    onSelectionRelease: () => {}, onTrainingSlot: () => {},
  });
  assert.equal(state[8932 + 7], 5);
}

function joinTables() {
  const packedBytes = new Int8Array(3000);
  const packedOffsets = new Int16Array(320);
  packedOffsets[39] = 100;
  packedOffsets[41] = 200;
  packedOffsets[27] = 300;
  packedOffsets[57] = 400;
  packedOffsets[174] = 500;
  packedOffsets[17] = 600;
  packedOffsets[16] = 700;
  packedOffsets[42] = 800;
  packedOffsets[172] = 900;
  packedOffsets[138] = 1000;
  packedBytes[100 + 5] = 1;     // t39[unit type 5] == 1
  packedBytes[1000 + 182] = 40; // d(int): t138[182 + 9237] threshold
  return { packedBytes, packedOffsets };
}

// Gate true, construction site (record type 16 >= 12): joins the record.
{
  const { packedBytes, packedOffsets } = joinTables();
  packedBytes[500 + 16] = 2;      // t174[16]
  packedBytes[400 + 2 + 1] = 33;  // t57[2 + slot 1] -> a(3, 33)
  packedBytes[1000 + 156 + 16] = 0;
  packedBytes[600 + 2] = 4;       // t17[2]
  packedBytes[700 + 4 + 16] = 3;  // t16[4 + 16]
  packedBytes[200 + 3] = 6;       // t41[3]
  packedBytes[800 + 6] = 0;       // t42[6] == 0 -> 6464 written
  packedBytes[900 + 2 + 1] = 9;   // t172[2 + 1]
  const state = new Int8Array(10000);
  state[2828 + 3] = 5;
  state[3] = 4;
  state[101 + 3] = 6;
  state[1818 + 3] = 1;
  state[1111 + 3] = 0x37;
  state[7979 + 3] = 4;
  state[4444 + 3] = 7;
  state[8749 + 7] = 16;
  state[8505 + 7] = 5;
  state[8993 + 7] = 9;
  state[8383 + 7] = 10;
  state[8444 + 7] = 11;
  state[8871 + 7] = 1;
  const gridC = makeGrid();

  const calls = [];
  stepLegacySubsystemEntityMoveCancel({
    state, packedBytes, packedOffsets, gridC, id: 3, readM: () => 0, uInt: 0,
    onChangeType: (id, type) => calls.push(["a", id, type]),
    onEntityTransform: (x, y, flag) => calls.push(["transform", x, y, flag]),
    onSelectionRelease: (id) => calls.push(["h", id]),
    onTrainingSlot: (id) => { calls.push(["G", id]); state[4646 + id] = 1; },
  });

  assert.deepEqual(calls, [["transform", 10, 11, true], ["h", 3], ["G", 3], ["a", 3, 33]]);
  assert.equal(state[1111 + 3], 0x30);
  assert.equal(state[3131 + 3], 4);
  assert.equal(state[3232 + 3], 6);
  assert.equal(state[1313 + 3], -2);
  assert.equal(state[1818 + 3], 3);
  assert.equal(state[4545 + 3], 9, "old worker-list head");
  assert.equal(state[8993 + 7], 3, "unit is the new head");
  assert.equal(state[8688 + 7], 5, "b(byte): type != 11 stops after the write");
  assert.equal(state[6464 + 3], 3);
  assert.equal(state[6262 + 3], 10);
  assert.equal(state[6363 + 3], 11);
  assert.equal(state[8871 + 7], 3);
  assert.equal(state[2929 + 3], 9);
  assert.equal(gridC[6][4], 0, "revert-to-idle tail not run");
}

// Gate true, finished type-11 record: t27 bit 128 skips a(); type < 12 with
// slot != t138[156+type] >= 0 and 8627 == 0 skips the 6262/6363 block;
// 7979 bit 4 clear skips 8871; b(byte) folds the worker levels.
{
  const { packedBytes, packedOffsets } = joinTables();
  packedBytes[300 + 5] = -128;    // t27[5] & 128
  packedBytes[500 + 11] = 6;      // t174[11]
  packedBytes[900 + 6 + 1] = 12;  // t172[6 + 1]
  const state = new Int8Array(10000);
  state[2828 + 3] = 5;
  state[6262 + 3] = -5;
  state[4444 + 3] = 7;
  state[4949 + 3] = 4;
  state[7575 + 3] = 2;
  state[8749 + 7] = 11;
  state[8505 + 7] = 1;
  state[8993 + 7] = 9;
  state[4949 + 9] = 1;
  state[7575 + 9] = 3;
  const gridC = makeGrid();

  let changed = false;
  stepLegacySubsystemEntityMoveCancel({
    state, packedBytes, packedOffsets, gridC, id: 3, readM: () => 0, uInt: 0,
    onChangeType: () => { changed = true; },
    onEntityTransform: () => {},
    onSelectionRelease: () => {},
    onTrainingSlot: (id) => { state[4646 + id] = 1; },
  });
  assert.equal(changed, false);
  assert.equal(state[6262 + 3], -5);
  assert.equal(state[8871 + 7], 0);
  assert.equal(state[2929 + 3], 12);
  // node 3: 4+3=7 > 5 -> 7; 2 > 0 -> 7+32=39. node 9: 4 > 7 no; 3 > 2 -> 7+48=55.
  assert.equal(state[8688 + 7], 55);
}

// Gate true on d(int)'s check but t41[m] != t41[unit type]: d() is false,
// so the revert-to-idle tail runs instead.
{
  const { packedBytes, packedOffsets } = joinTables();
  packedBytes[200 + 5] = 1;
  const state = new Int8Array(10000);
  state[2828 + 3] = 5;
  state[4444 + 3] = 7;
  state[8749 + 7] = 16;
  state[8505 + 7] = 5;
  state[1313 + 3] = -1;
  const gridC = makeGrid();
  let joined = false;
  stepLegacySubsystemEntityMoveCancel({
    state, packedBytes, packedOffsets, gridC, id: 3, readM: () => 0, uInt: 0,
    onChangeType: () => {}, onEntityTransform: () => {},
    onSelectionRelease: () => { joined = true; }, onTrainingSlot: () => { joined = true; },
  });
  assert.equal(joined, false);
  assert.equal(state[1313 + 3], 0);
  assert.equal(state[8993 + 7], 0);
}

console.log("private void F() (arrival: join record or revert to idle) OK");
