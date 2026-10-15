// Regression test for LegacySubsystemEntityTrainingSlot.ts (private void G()).
// Expected values are derived by hand from bytecode/b-javap.txt 19389..19934.
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

const { stepLegacySubsystemEntityTrainingSlot } = loadModule("./LegacySubsystemEntityTrainingSlot", srcDir);

function makeTables() {
  const packedBytes = new Int8Array(3000);
  const packedOffsets = new Int16Array(320);
  packedOffsets[138] = 1000;
  packedOffsets[93] = 1300;
  packedOffsets[94] = 1400;
  packedOffsets[95] = 1100;
  packedOffsets[96] = 1200;
  return { packedBytes, packedOffsets };
}
const noRandom = () => { throw new Error("should not randomize"); };

// Unowned record -> claims the default slot directly (offsets 309..462).
{
  const { packedBytes, packedOffsets } = makeTables();
  packedBytes[1000 + 156 + 3] = 2;
  const state = new Int8Array(10000);
  state[4444 + 5] = 7;
  state[8749 + 7] = 3;
  stepLegacySubsystemEntityTrainingSlot({ state, packedBytes, packedOffsets, entityId: 5, randomRemainder: noRandom, owners: new Int8Array(8) });
  assert.equal(state[4646 + 5], 2);
  assert.equal(state[8810 + 7], 5);
  assert.equal(state[8932 + 7], 0);
}

// Owner already === entity -> 8932 incremented (offsets 363..417).
{
  const { packedBytes, packedOffsets } = makeTables();
  packedBytes[1000 + 156 + 3] = 1;
  const state = new Int8Array(10000);
  state[4444 + 5] = 7;
  state[8749 + 7] = 3;
  state[8810 + 7] = 5;
  state[8932 + 7] = 4;
  stepLegacySubsystemEntityTrainingSlot({ state, packedBytes, packedOffsets, entityId: 5, randomRemainder: noRandom, owners: new Int8Array(8) });
  assert.equal(state[4646 + 5], 1);
  assert.equal(state[8932 + 7], 5);
}

// Live owner (slot >= 0, same record): no w increment (546 if_icmpeq 560).
// 8627 == 0 -> slot count t138[(9115-1)*26 + type] (601 ifne 653 not taken),
// and no t95 tail (932 ifeq 992).
function liveOrStale(ownerRecord) {
  const { packedBytes, packedOffsets } = makeTables();
  packedBytes[1000 + 156 + 3] = 2;          // default slot
  packedBytes[1000 + (1 - 1) * 26 + 3] = 4; // slot count, 9115 = 1
  packedBytes[1000 + 494 + 3] = 7;          // the swapped read must not be used
  packedBytes[1100 + 3] = 50;               // t95 sentinel, must not be used
  const state = new Int8Array(10000);
  state[4444 + 5] = 7;
  state[8749 + 7] = 3;
  state[9115 + 7] = 1;
  state[8810 + 7] = 9;
  state[4646 + 9] = 5;
  state[4444 + 9] = ownerRecord;
  let args = null;
  stepLegacySubsystemEntityTrainingSlot({
    state, packedBytes, packedOffsets, entityId: 5, owners: new Int8Array(8),
    randomRemainder: (mask, divisor) => { args = [mask, divisor]; return 2; },
  });
  return { state, args };
}
{
  const { state, args } = liveOrStale(7);
  assert.deepEqual(args, [16777215, 5], "w = 0: 4 - 0 + 1");
  // rank 3 over owners [0,0,9,0]: slot0 ->1, slot1 ->2, slot2 taken, slot3 ->3.
  assert.equal(state[4646 + 5], 3);
}
{
  const { state, args } = liveOrStale(8);
  assert.deepEqual(args, [16777215, 4], "stale owner (other record): w = 1");
  assert.equal(state[4646 + 5], 3);
}

// Flagged record (8627 != 0): default slot 0, worker slots mapped through
// t93/t94, slot count t138[494+type], tail t95[t96[type] + slot].
{
  const { packedBytes, packedOffsets } = makeTables();
  packedBytes[1400 + 3] = 0;       // t94[type]
  packedBytes[1300 + 0 + 4] = 0;   // t93[0 + 4] -> worker 9 sits in slot 0
  packedBytes[1000 + 494 + 3] = 3; // slot count
  packedBytes[1200 + 3] = 5;       // t96[type]
  packedBytes[1100 + 5 + 2] = 40;  // t95[5 + 2]
  const state = new Int8Array(10000);
  state[4444 + 5] = 7;
  state[8749 + 7] = 3;
  state[8627 + 7] = 1;
  state[8993 + 7] = 9;
  state[4646 + 9] = 4;
  let args = null;
  stepLegacySubsystemEntityTrainingSlot({
    state, packedBytes, packedOffsets, entityId: 5, owners: new Int8Array(8),
    randomRemainder: (mask, divisor) => { args = [mask, divisor]; return 1; },
  });
  assert.deepEqual(args, [16777215, 4]);
  // rank 2 over owners [9,0,0]: slot1 ->1, slot2 ->2 -> 2; tail t95[5+2] = 40.
  assert.equal(state[4646 + 5], 40);
}

// The cursors are the fields b.x:I / b.y:I (offsets 722..907): after the rank search x is the
// chosen slot and y the free-slot count (oracle run 5, frame 10727).
{
  const { packedBytes, packedOffsets } = makeTables();
  packedBytes[1400 + 3] = 0; packedBytes[1300 + 4] = 0; packedBytes[1000 + 494 + 3] = 3;
  packedBytes[1200 + 3] = 5; packedBytes[1100 + 5 + 2] = 40;
  const state = new Int8Array(10000);
  state[4444 + 5] = 7; state[8749 + 7] = 3; state[8627 + 7] = 1; state[8993 + 7] = 9; state[4646 + 9] = 4;
  const fields = { x: 99, y: 99 };
  const owners = new Int8Array([7, 7, 7, 7, 7, 7, 7, 7]);
  stepLegacySubsystemEntityTrainingSlot({
    state, packedBytes, packedOffsets, entityId: 5, randomRemainder: () => 1, fields, owners,
  });
  assert.deepEqual(fields, { x: 2, y: 2 });
  // b.i:[B is the field too: cleared on entry (offsets 108..141), then the owners stay (oracle run 15).
  assert.deepEqual([...owners], [9, 0, 0, 0, 0, 0, 0, 0]);
}

console.log("private void G() (work-slot assignment) OK");
