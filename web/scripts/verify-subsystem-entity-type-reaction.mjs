// Regression test for LegacySubsystemEntityTypeReaction.ts (private void K(),
// the entity-type-dispatch/AI-target-memory method).
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

const { stepLegacySubsystemEntityTypeReaction } = loadModule("./sim/tribe/LegacySubsystemEntityTypeReaction", srcDir);

function makeTeamMarkerTable() {
  return [0, 1].map(() => Array.from({ length: 5 }, () => new Int8Array(4).fill(0).map((_, i) => (i === 2 ? -1 : 0))));
}

function makeInput(overrides = {}) {
  return {
    state: new Int8Array(10000),
    packedBytes: new Int8Array(2000),
    packedOffsets: new Int16Array(312),
    teamMarkerTable: makeTeamMarkerTable(),
    entityId: 5,
    team: 0,
    scratch: { R: 0, fFlag: false },
    ...overrides,
  };
}

// Shared prologue always runs (regardless of type): dense[404+v]=0,
// onCheckQuad called with packedBytes-lookup args, fFlag set to true.
{
  const input = makeInput();
  const v = input.entityId;
  input.state[404 + v] = 99;
  input.state[2828 + v] = 60; // not 94-97 -> default no-op after prologue
  input.packedOffsets[45] = 10;
  input.packedOffsets[46] = 20;
  input.packedOffsets[47] = 30;
  input.packedOffsets[64] = 40;
  input.packedBytes[10 + 60] = 7; // arg1
  input.packedBytes[20 + 60] = 8; // arg2
  input.packedBytes[30 + 60] = 9; // arg3
  input.packedBytes[40 + 7] = 11; // arg4 = packedBytes[64_offset + arg1]
  let capturedArgs;
  const callbacks = { onCheckQuad: (...args) => { capturedArgs = args; return true; } };
  stepLegacySubsystemEntityTypeReaction(input, callbacks);
  assert.equal(input.state[404 + v], 0);
  assert.deepEqual(capturedArgs, [7, 8, 9, 11]);
  assert.equal(input.scratch.fFlag, true);
}

// type===94: fFlag gets overwritten with onCheckPair(dense[4444+v], 10)'s result.
{
  const input = makeInput();
  const v = input.entityId;
  input.state[2828 + v] = 94;
  input.state[4444 + v] = 42;
  let capturedArgs;
  const callbacks = { onCheckPair: (...args) => { capturedArgs = args; return false; } };
  stepLegacySubsystemEntityTypeReaction(input, callbacks);
  assert.deepEqual(capturedArgs, [42, 10]);
  assert.equal(input.scratch.fFlag, false, "overwritten by onCheckPair's result");
}

// type===94 with no onCheckPair callback wired: fFlag stays at the
// prologue's unconditional `true` (callback optional-chain fallback).
{
  const input = makeInput();
  const v = input.entityId;
  input.state[2828 + v] = 94;
  stepLegacySubsystemEntityTypeReaction(input, {});
  assert.equal(input.scratch.fFlag, true);
}

// type===95: dense[8181+assoc]=0, dense[7979+assoc] gets bit 8 OR'd in.
{
  const input = makeInput();
  const v = input.entityId;
  input.state[2828 + v] = 95;
  input.state[4444 + v] = 42; // assoc
  input.state[8181 + 42] = 55;
  input.state[7979 + 42] = 1; // bit0 already set
  stepLegacySubsystemEntityTypeReaction(input, {});
  assert.equal(input.state[8181 + 42], 0);
  assert.equal(input.state[7979 + 42], 9, "bit3 (8) OR'd in on top of existing bit0");
}

// type===96, gate passes (===0): borrows the target id, calls onActOnTarget,
// and subsystemR/scratch.R ends holding the ORIGINAL entityId (not restored
// to its own pre-call value -- matches the real bytecode's own side effect).
{
  const input = makeInput({ entityId: 7, scratch: { R: 99, fFlag: false } });
  const v = input.entityId;
  input.state[2828 + v] = 96;
  input.state[4444 + v] = 20; // target id
  input.state[8282 + 20] = 0b00000010; // (&127)>>1 === 1 -- wait need ===0 case first
  // (&127)>>1===0 requires bits [7:1] & 0x7F to be 0 after masking -- i.e. value&126===0.
  input.state[8282 + 20] = 0; // (0&127)>>1 = 0 -> gate passes
  input.state[505 + 99] = -1; // pre-existing value at dense[505+oldR]
  let capturedArgs;
  const callbacks = { onActOnTarget: (...args) => { capturedArgs = args; return true; } };
  stepLegacySubsystemEntityTypeReaction(input, callbacks);
  assert.equal(input.state[505 + 99], 99, "dense[505+oldR] written using R's ENTERING value");
  assert.deepEqual(capturedArgs, [20, true]);
  assert.equal(input.scratch.R, 7, "R ends holding the original entityId, not restored to its own prior value");
}

// type===96, gate fails (!==0): onActOnTarget is never called, but the
// R bookkeeping (dense[505+oldR] write, R:=v) still happens unconditionally.
{
  const input = makeInput({ entityId: 7, scratch: { R: 99, fFlag: false } });
  const v = input.entityId;
  input.state[2828 + v] = 96;
  input.state[4444 + v] = 20;
  input.state[8282 + 20] = 4; // (4&127)>>1 = 2 !== 0 -> gate fails
  let called = false;
  const callbacks = { onActOnTarget: () => { called = true; return true; } };
  stepLegacySubsystemEntityTypeReaction(input, callbacks);
  assert.equal(called, false);
  assert.equal(input.scratch.R, 7);
}

// type===95, default, and 96 must NOT reach type===97's marker-write logic
// (CORRECTED bug: an earlier doc claimed the marker write was a shared
// method tail, not scoped to type===97 alone).
{
  const input = makeInput();
  const v = input.entityId;
  input.state[2828 + v] = 95;
  input.state[4444 + v] = 1;
  input.state[3131 + v] = 111;
  input.state[3232 + v] = 222;
  stepLegacySubsystemEntityTypeReaction(input, {});
  assert.equal(input.teamMarkerTable[0][0][0], 0, "no marker write leaked from type===95");
}

// type===97: no existing valid entries -> just writes the new marker into
// slot 0 (x, y from dense[3131/3232+v], type=0, flag=team^1).
{
  const input = makeInput({ team: 0 });
  const v = input.entityId;
  input.state[2828 + v] = 97;
  input.state[3131 + v] = 15; // x
  input.state[3232 + v] = 27; // y
  stepLegacySubsystemEntityTypeReaction(input, {});
  assert.deepEqual(Array.from(input.teamMarkerTable[0][0]), [15, 27, 0, 1], "team^1 = 0^1 = 1");
}

// type===97, team===1: flag = 1^1 = 0.
{
  const input = makeInput({ team: 1 });
  const v = input.entityId;
  input.state[2828 + v] = 97;
  input.state[3131 + v] = 5;
  input.state[3232 + v] = 6;
  stepLegacySubsystemEntityTypeReaction(input, {});
  assert.deepEqual(Array.from(input.teamMarkerTable[1][0]), [5, 6, 0, 0]);
}

// type===97: existing valid entries (type>=0) shift from slot r into slot
// r+1 (toward the HIGHER index), freeing slot 0 for the new entry; an
// invalid slot (type<0) is left untouched by the shift (not copied).
{
  const input = makeInput({ team: 0 });
  const v = input.entityId;
  input.state[2828 + v] = 97;
  input.state[3131 + v] = 99;
  input.state[3232 + v] = 88;
  // slot 0: valid, [10,20,0,1]; slot 1: invalid (type=-1); slot 2: valid, [30,40,1,0]
  input.teamMarkerTable[0][0] = new Int8Array([10, 20, 0, 1]);
  input.teamMarkerTable[0][1] = new Int8Array([0, 0, -1, 0]);
  input.teamMarkerTable[0][2] = new Int8Array([30, 40, 1, 0]);
  stepLegacySubsystemEntityTypeReaction(input, {});
  // slot0 valid -> copied into slot1; slot1 invalid -> NOT copied into slot2;
  // slot2 valid -> copied into slot3; then slot0 overwritten with the new marker.
  assert.deepEqual(Array.from(input.teamMarkerTable[0][0]), [99, 88, 0, 1], "new marker in slot0");
  assert.deepEqual(Array.from(input.teamMarkerTable[0][1]), [10, 20, 0, 1], "old slot0 shifted into slot1");
  assert.deepEqual(Array.from(input.teamMarkerTable[0][3]), [30, 40, 1, 0], "old slot2 shifted into slot3");
}

// type outside 94-97: prologue runs (already covered above) but no
// case-specific work and no marker write.
{
  const input = makeInput();
  const v = input.entityId;
  input.state[2828 + v] = 50;
  stepLegacySubsystemEntityTypeReaction(input, {});
  assert.deepEqual(Array.from(input.teamMarkerTable[0][0]), [0, 0, -1, 0], "untouched");
}

console.log("b.K() entity-type dispatch / AI-target-memory OK");
