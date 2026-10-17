// Regression test for LegacyEntityCWatch.ts (private void c(int,int,int),
// b.w()'s onC callback target). REDERIVED 2026-09-07: c()'s own bytecode
// (offsets 0..292) never touches b:[S] -- it builds 8 args, calls the
// unexamined gate `a(IIIIIIII)Z` (#298) via onGate, and only runs its own
// tail when that gate returns true. See the file's own docblock.
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

const { stepLegacyEntityCWatch } = loadModule("./sim/units/LegacyEntityCWatch", srcDir);

function makeInput(overrides = {}) {
  const dense = new Int8Array(10000);
  const packedBytes = new Int8Array(2000);
  const packedOffsets = new Int16Array(400);
  packedOffsets[79] = 500;
  packedOffsets[124] = 700;
  packedOffsets[102] = 900;
  return {
    dense,
    packedBytes,
    packedOffsets,
    id: 4,
    x: 10,
    y: 20,
    value: 3,
    u: 7,
    kBytes: new Int8Array(4),
    subsystemX: 0,
    ...overrides,
  };
}

function passTail(input, id = input.id) {
  input.dense[2929 + id] = 40; // &0xff >= 31, passes first tail check
  input.dense[6565 + id] = 1; // !== 9, passes second tail check
}

// onGate omitted (the honest "callee not modeled" default) -> treated as
// false, so the whole method is a safe no-op regardless of tail state.
{
  const input = makeInput();
  passTail(input);
  input.kBytes[0] = 1;
  input.kBytes[2] = 2;
  input.dense[2929 + 2] = 50;
  const before = input.dense[2929 + 2];
  assert.doesNotThrow(() => stepLegacyEntityCWatch(input));
  assert.equal(input.dense[2929 + 2], before, "gate not accepted -> no writes");
}

// onGate is called with the exact 8 bytecode-derived arguments (offsets
// 0..100): (x, y, u, packedBytes[packedOffsets[79]+dense[2828+id]],
// dense[4444+id], value, packedBytes[packedOffsets[124]+dense[1717+id]] +
// packedBytes[packedOffsets[102]+dense[6565+id]], 0).
{
  const input = makeInput({ x: 11, y: 22, value: 33, u: 44 });
  input.dense[2828 + input.id] = 5; // type
  input.packedBytes[input.packedOffsets[79] + 5] = 9; // arg4
  input.dense[4444 + input.id] = 6; // arg5
  input.dense[1717 + input.id] = 2;
  input.packedBytes[input.packedOffsets[124] + 2] = 3;
  input.dense[6565 + input.id] = 1; // also feeds arg7's table read, before it's overwritten by passTail
  input.packedBytes[input.packedOffsets[102] + 1] = 4;
  let seen = null;
  input.onGate = (...args) => { seen = args; return false; };
  stepLegacyEntityCWatch(input);
  assert.deepEqual(seen, [11, 22, 44, 9, 6, 33, 3 + 4, 0]);
}

// onGate accepts, but dense[2929+id]&0xff < 31 -> return before k[] tail.
{
  const input = makeInput();
  input.onGate = () => true;
  input.dense[2929 + input.id] = 5;
  const before = Array.from(input.dense.slice(2929, 2933));
  stepLegacyEntityCWatch(input);
  assert.deepEqual(Array.from(input.dense.slice(2929, 2933)), before);
}

// onGate accepts, first check passes, but dense[6565+id] === 9 -> no-op.
{
  const input = makeInput();
  input.onGate = () => true;
  input.dense[2929 + input.id] = 40;
  input.dense[6565 + input.id] = 9;
  const before = Array.from(input.dense.slice(2929, 2933));
  stepLegacyEntityCWatch(input);
  assert.deepEqual(Array.from(input.dense.slice(2929, 2933)), before);
}

// Gate accepted, tail passes, but k[0] !== 1 -> no-op.
{
  const input = makeInput();
  input.onGate = () => true;
  passTail(input);
  input.kBytes[0] = 0;
  const before = input.dense[2929 + 5];
  stepLegacyEntityCWatch(input);
  assert.equal(input.dense[2929 + 5], before);
}

// Gate accepted, k[0]===1, but dense[202+k[2]] !== 0 -> no-op.
{
  const input = makeInput();
  input.onGate = () => true;
  passTail(input);
  input.kBytes[0] = 1;
  input.kBytes[2] = 5;
  input.dense[202 + 5] = 1;
  const before = input.dense[2929 + 5];
  stepLegacyEntityCWatch(input);
  assert.equal(input.dense[2929 + 5], before);
}

// Gate accepted, dense[202+slot]===0, but dense[303+slot] !== 0 -> no-op.
{
  const input = makeInput();
  input.onGate = () => true;
  passTail(input);
  input.kBytes[0] = 1;
  input.kBytes[2] = 6;
  input.dense[303 + 6] = 1;
  const before = input.dense[2929 + 6];
  stepLegacyEntityCWatch(input);
  assert.equal(input.dense[2929 + 6], before);
}

// Gate accepted, all gates pass, but dense[2929+slot] already in [106,108]
// -> no-op. (Note: the original bytecode reads this byte UNMASKED, unlike
// the earlier dense[2929+id]&0xff check -- but since 106..108 < 128, masked
// and unmasked agree for every representable byte value, so this is not
// separately distinguishable by a test; ported unmasked to match bytecode.)
{
  const input = makeInput();
  input.onGate = () => true;
  passTail(input);
  input.kBytes[0] = 1;
  input.kBytes[2] = 7;
  input.dense[2929 + 7] = 107;
  stepLegacyEntityCWatch(input);
  assert.equal(input.dense[2929 + 7], 107, "unchanged inside [106,108]");
}

// Gate accepted, all gates pass, marker outside [106,108] -> real writes:
// dense[2929+slot]=42, dense[3030+slot]=0, dense[4646+slot]=-(62+(subsystemX&1)).
{
  const input = makeInput();
  input.onGate = () => true;
  passTail(input);
  input.kBytes[0] = 1;
  input.kBytes[2] = 8;
  input.dense[2929 + 8] = 50;
  input.dense[3030 + 8] = 9;
  input.subsystemX = 4; // even -> &1 === 0
  stepLegacyEntityCWatch(input);
  assert.equal(input.dense[2929 + 8], 42);
  assert.equal(input.dense[3030 + 8], 0);
  assert.equal(input.dense[4646 + 8], -62);
}

// Same, but subsystemX is odd -> the &1 term flips the marker by one.
{
  const input = makeInput();
  input.onGate = () => true;
  passTail(input);
  input.kBytes[0] = 1;
  input.kBytes[2] = 9;
  input.dense[2929 + 9] = 50;
  input.subsystemX = 5; // odd -> &1 === 1
  stepLegacyEntityCWatch(input);
  assert.equal(input.dense[4646 + 9], -63);
}

// The accept tail is indexed by k[2] (a slot selector), NOT by the method's
// own id/v -- confirm id's dense[2929+id]/[6565+id] gates and k[2]'s
// dense[2929+slot] write target genuinely different offsets when id !== k[2].
{
  const input = makeInput({ id: 20 });
  input.onGate = () => true;
  passTail(input, 20);
  input.kBytes[0] = 1;
  input.kBytes[2] = 8; // slot !== id
  input.dense[2929 + 8] = 50;
  stepLegacyEntityCWatch(input);
  assert.equal(input.dense[2929 + 8], 42, "slot (k[2]) is written");
  assert.equal(input.dense[2929 + 20] & 0xff, 40, "id's own gate value is untouched");
}

console.log("b.w()'s onC target (private void c(int,int,int)) OK");
