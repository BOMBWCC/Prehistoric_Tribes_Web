// Regression test for LegacyEntityActionCommit.ts (private boolean a(byte,
// boolean), b.t()'s onAction target). See the file's own docblock for the
// full bytecode-derived chain (2026-08-27, resource-gathering investigation).
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

const { stepLegacyEntityActionCommit } = loadModule("./sim/units/LegacyEntityActionCommit", srcDir);

function makeInput(overrides = {}) {
  const state = new Int8Array(10000);
  const packedBytes = new Int8Array(2000);
  const packedOffsets = new Int16Array(400);
  const gridC = [new Int8Array(50), new Int8Array(50)];
  const jRows = [new Int8Array(256), new Int8Array(256), new Int8Array(256), new Int8Array(256), new Int8Array(256)];
  state[4646 + 5] = -1; // default: skip the "already tracking a target" block
  state[2828 + 5] = 3; // default type, not in {79,80,83..85}
  return {
    state,
    packedBytes,
    packedOffsets,
    gridC,
    jRows,
    entityId: 5,
    actionCode: -1,
    allowRestart: false,
    ...overrides,
  };
}

// dense[4646+id] >= 0 and matches the first (173/174) nested target -> true, no writes.
{
  const input = makeInput();
  input.state[4646 + 5] = 7;
  input.state[4444 + 5] = 2; // association
  input.state[8749 + 2] = 4; // kind
  input.packedOffsets[174] = 100;
  input.packedBytes[100 + 4] = 9; // packedBytes[packedOffsets[174]+kind] = 9
  input.packedOffsets[173] = 200;
  input.packedBytes[200 + 9 + 7] = 42; // packedBytes[packedOffsets[173] + 9 + dense[4646+id]]
  input.state[2929 + 5] = 42;
  const before = input.state[2929 + 5];
  const result = stepLegacyEntityActionCommit(input);
  assert.equal(result, true);
  assert.equal(input.state[2929 + 5], before, "no mutation on the early-match path");
}

// dense[2929+id]!==-108 and not skipping the gate -> returns false, no writes.
{
  const input = makeInput();
  input.state[2929 + 5] = 10; // not -108
  const before = Array.from(input.state.slice(2929, 2932));
  const result = stepLegacyEntityActionCommit(input);
  assert.equal(result, false);
  assert.deepEqual(Array.from(input.state.slice(2929, 2932)), before);
}

// dense[2929+id]===-108 and the action counter matches jRows[4] target-1 -> false (action still running).
{
  const input = makeInput();
  input.state[2929 + 5] = -108;
  input.jRows[4][(-108) & 255] = 6; // target = 6 - 1 = 5
  input.state[3030 + 5] = 5;
  const result = stepLegacyEntityActionCommit(input);
  assert.equal(result, false);
}

// type in {79,80,83,84,85} skips the -108 gate entirely, even with a mismatched marker.
// 83/84 -> changeEntityType(id, 85).
{
  let changedTo;
  const input = makeInput({ onChangeType: (id, type) => { changedTo = { id, type }; } });
  input.state[2828 + 5] = 83;
  input.state[2929 + 5] = 10; // would normally fail the -108 check, but the type gate skips it
  input.actionCode = 9;
  const result = stepLegacyEntityActionCommit(input);
  assert.equal(result, true);
  assert.deepEqual(changedTo, { id: 5, type: 85 });
  assert.equal(input.state[3030 + 5], 9);
}

// type===79 -> changeEntityType(id, 80).
{
  let changedTo;
  const input = makeInput({ onChangeType: (id, type) => { changedTo = { id, type }; } });
  input.state[2828 + 5] = 79;
  input.actionCode = 3;
  const result = stepLegacyEntityActionCommit(input);
  assert.equal(result, true);
  assert.deepEqual(changedTo, { id: 5, type: 80 });
  assert.equal(input.state[3030 + 5], 3);
}

// allowRestart===false, ordinary type, already mid-action (-108) with a
// non-matching counter -> falls through the type2 block to "return true",
// no further commit writes (the allowRestart===false early return).
{
  const input = makeInput({ allowRestart: false });
  input.state[2828 + 5] = 3;
  input.state[2929 + 5] = -108;
  input.state[3030 + 5] = 5; // deliberately not matching jRows[4][148]-1 (=-1)
  const before = Array.from(input.state.slice(2929, 2932));
  const result = stepLegacyEntityActionCommit(input);
  assert.equal(result, true);
  assert.deepEqual(Array.from(input.state.slice(2929, 2932)), before);
}

// allowRestart===true, gate/gate2 both compute to 0 (same table lookup, read
// twice in the real bytecode) -> the initial -108 gate applies, so this also
// needs dense[2929+id]===-108 with a non-matching counter to reach gate2<=0.
{
  const input = makeInput({ allowRestart: true });
  input.state[2828 + 5] = 3;
  input.state[6464 + 5] = 1;
  input.packedOffsets[41] = 300;
  input.packedBytes[300 + 1] = 2;
  input.packedOffsets[42] = 400;
  input.packedBytes[400 + 2] = 0; // gate = gate2 = 0
  input.state[2929 + 5] = -108;
  input.state[3030 + 5] = 5; // non-matching counter
  const before = Array.from(input.state.slice(2929, 2932));
  const result = stepLegacyEntityActionCommit(input);
  assert.equal(result, true);
  assert.deepEqual(Array.from(input.state.slice(2929, 2932)), before);
}

// allowRestart===true, gate2>0, dense[2929+id] already -108 -> returns true, no writes.
{
  const input = makeInput({ allowRestart: true });
  input.state[2828 + 5] = 3;
  input.state[6464 + 5] = 1;
  input.packedOffsets[41] = 300;
  input.packedBytes[300 + 1] = 2;
  input.packedOffsets[42] = 400;
  input.packedBytes[400 + 2] = 5; // gate2 > 0
  input.state[2929 + 5] = -108;
  input.state[3030 + 5] = 77;
  const result = stepLegacyEntityActionCommit(input);
  assert.equal(result, true);
  assert.equal(input.state[3030 + 5], 77, "unchanged -- already tracking an action");
}

// Real commit: allowRestart, gate2>0, not already -108, occupant !== id -> full writes including duration.
{
  const input = makeInput({ allowRestart: true });
  input.state[2828 + 5] = 3;
  input.state[6464 + 5] = 1;
  input.packedOffsets[41] = 300;
  input.packedBytes[300 + 1] = 2;
  input.packedOffsets[42] = 400;
  input.packedBytes[400 + 2] = 5; // gate2 > 0
  input.state[2929 + 5] = 0; // not -108
  input.actionCode = -1;
  input.state[101 + 5] = 1; // row
  input.state[5] = 9; // column
  input.gridC[1][9] = 0; // occupant !== id(5)
  input.state[4444 + 5] = 2; // association/record
  input.state[8627 + 2] = 0; // record's flag
  input.state[8749 + 2] = 7; // record's kind === 7 -> duration 51
  const result = stepLegacyEntityActionCommit(input);
  assert.equal(result, true);
  assert.equal(input.state[808 + 5], 0);
  assert.equal(input.state[2929 + 5], -108);
  assert.equal(input.state[3030 + 5], -1);
  assert.equal(input.state[1313 + 5], 51);
}

// Same real commit, but occupant === id -> duration is left untouched (occupying its own target cell).
{
  const input = makeInput({ allowRestart: true });
  input.state[2828 + 5] = 3;
  input.state[6464 + 5] = 1;
  input.packedOffsets[41] = 300;
  input.packedBytes[300 + 1] = 2;
  input.packedOffsets[42] = 400;
  input.packedBytes[400 + 2] = 5;
  input.state[2929 + 5] = 0;
  input.state[101 + 5] = 1;
  input.state[5] = 9;
  input.gridC[1][9] = 5; // occupant === id
  input.state[1313 + 5] = 123;
  const result = stepLegacyEntityActionCommit(input);
  assert.equal(result, true);
  assert.equal(input.state[2929 + 5], -108);
  assert.equal(input.state[1313 + 5], 123, "duration untouched when occupant === id");
}

console.log("b.t()'s onAction target (private boolean a(byte,boolean)) OK");
