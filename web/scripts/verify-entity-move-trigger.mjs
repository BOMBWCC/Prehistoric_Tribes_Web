import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import vm from "node:vm";

const file = new URL("../src/sim/units/LegacyEntityMoveTrigger.ts", import.meta.url).pathname;
const output = ts.transpileModule(fs.readFileSync(file, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(output, { module, exports: module.exports, Int16Array });
const { triggerLegacyEntityMove } = module.exports;

const base = (overrides = {}) => ({
  id: 5,
  id2: 5,
  action: 4,
  fQByte: 10,
  packedBytes: new Int8Array(2000),
  packedOffsets: new Int16Array(400),
  dShort: new Int16Array(6).fill(-1),
  bField28: 50,
  bField235: 0,
  bField6: 0,
  IByte: 0,
  viewportO: 10,
  KByte: 0,
  viewportP: 10,
  ...overrides,
});

// id > 50 -> safe early return, no dShort mutation, no onNotify.
{
  const calls = [];
  const input = base({ id: 51, onNotify: (...args) => calls.push(args) });
  triggerLegacyEntityMove(input);
  assert.equal(calls.length, 0);
  assert.deepEqual(Array.from(input.dShort), [-1, -1, -1, -1, -1, -1]);
}

// fQByte below the table293 threshold -> safe early return.
{
  const calls = [];
  const input = base({ fQByte: 2, onNotify: (...args) => calls.push(args) });
  input.packedOffsets[293] = 0;
  input.packedBytes[input.action] = 5; // threshold 5, fQByte(2) < 5
  triggerLegacyEntityMove(input);
  assert.equal(calls.length, 0);
}

// Past both guards, dShort[dsIndex] already >= 0 -> debounced, no write, no call.
{
  const calls = [];
  const input = base({ onNotify: (...args) => calls.push(args) });
  input.packedOffsets[293] = 0;
  input.packedBytes[input.action] = 5;
  input.packedOffsets[292] = 100;
  input.packedBytes[100 + input.action] = 2; // dsIndex = 2
  input.dShort[2] = 0; // already >= 0
  triggerLegacyEntityMove(input);
  assert.equal(calls.length, 0);
  assert.equal(input.dShort[2], 0); // unchanged
}

// Past the debounce (dShort[dsIndex]<0) -> cleared to 0 as a real side
// effect regardless of what happens next. action NOT in {4,5}, bField28<50
// -> returns without calling onNotify (per the real bytecode's fallthrough
// at offset 96..103).
{
  const calls = [];
  const input = base({
    action: 7, bField28: 10, onNotify: (...args) => calls.push(args),
  });
  input.packedOffsets[293] = 0;
  input.packedBytes[7] = 5;
  input.packedOffsets[292] = 100;
  input.packedBytes[100 + 7] = 3; // dsIndex = 3
  triggerLegacyEntityMove(input);
  assert.equal(input.dShort[3], 0); // side effect happened
  assert.equal(calls.length, 0); // but no notify
}

// action NOT in {4,5}, bField28>=50 (the constructor default, and the
// common case since nothing in this port lowers it) -> unconditional call,
// viewport check entirely skipped.
{
  const calls = [];
  const input = base({
    action: 7, bField28: 50, bField235: 999, bField6: 999, // would be "in view" if checked
    onNotify: (...args) => calls.push(args),
  });
  input.packedOffsets[293] = 0;
  input.packedBytes[7] = 5;
  input.packedOffsets[292] = 100;
  input.packedBytes[100 + 7] = 4;
  triggerLegacyEntityMove(input);
  assert.deepEqual(calls, [[7, 5, 5]]);
}

// action===4, position INSIDE the viewport rect -> no call.
{
  const calls = [];
  const input = base({
    action: 4, bField235: 5, bField6: 5, IByte: 0, viewportO: 10, KByte: 0, viewportP: 10,
    onNotify: (...args) => calls.push(args),
  });
  input.packedOffsets[293] = 0;
  input.packedBytes[4] = 5;
  input.packedOffsets[292] = 100;
  input.packedBytes[100 + 4] = 5;
  triggerLegacyEntityMove(input);
  assert.equal(calls.length, 0);
}

// action===5, position OUTSIDE the viewport rect -> calls onNotify with
// the byte-narrowed args.
{
  const calls = [];
  const input = base({
    action: 5, bField235: 50, bField6: 5, IByte: 0, viewportO: 10, KByte: 0, viewportP: 10,
    id: 200, id2: 200, // > byte range, exercises the i2b narrowing
    onNotify: (...args) => calls.push(args),
  });
  // id>50 would return early -- but the id>50 guard uses the raw arg2, not
  // the byte-narrowed value, so use a valid id for the guard and rely on
  // action/id2 narrowing instead.
  input.id = 5;
  input.packedOffsets[293] = 0;
  input.packedBytes[5] = 5;
  input.packedOffsets[292] = 100;
  input.packedBytes[100 + 5] = 5;
  triggerLegacyEntityMove(input);
  assert.deepEqual(calls, [[5, 5, -56]]); // 200 narrowed to a signed byte: 200-256=-56
}

console.log("triggerLegacyEntityMove (final void a(byte,int,int), #274, RETRACTED 2026-09-07) OK");
