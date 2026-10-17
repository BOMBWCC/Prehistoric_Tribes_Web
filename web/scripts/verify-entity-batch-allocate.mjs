// Integration test (like verify-gameplay-cell-body-dispatch.mjs): loads
// LegacyEntityBatchAllocate.ts's real cross-file imports (LegacyRecordAllocator,
// LegacyEntityNearbySearch) into one shared vm context via a require shim.
import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";
import path from "node:path";

const srcDir = new URL("../src/", import.meta.url).pathname;
const context = vm.createContext({ Int8Array, Int16Array, Int32Array, console });
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

const { stepLegacyEntityBatchAllocate } = loadModule("./sim/units/LegacyEntityBatchAllocate", srcDir);

const state = new Int8Array(10000);
const map = Array.from({ length: 40 }, () => new Int8Array(40));
const counters = Array.from({ length: 2 }, () => new Int16Array(20));
const packedBytes = new Int8Array(2000);
const packedOffsets = new Int16Array(2000);
let lastId = 0;
const baseInput = {
  state, map, packedBytes, packedOffsets, counters,
  randomRemainder: () => 0,
  mapWidth: 40, mapHeight: 40,
  frameFlag: false, q: 0, aw: 0, suppressCounters: false,
  setV: () => {}, setLastRecordId: (x) => { lastId = x; },
};

// type=0, aU=0: allocation succeeds, no throw (type!==1 skips the throwing branch).
stepLegacyEntityBatchAllocate({ ...baseInput, aU: 0, subsystemY: 5 }, 1, 3, 3, 0, 9);
assert.ok(lastId > 0, "expected a successful allocation");
assert.equal(state[6565 + lastId], 9);

// type=1, aU=0 (>=0): offsets 110..182. CORRECTED 2026-09-23: this used to
// assert a throw, "faithfully reproducing the original's confirmed-dead-field
// NullPointerException". b:[S] (#132) is saveOffsets and is not null; the old
// assertion only passed because this fixture never supplied saveOffsets. The
// real branch sets v:I, writes subsystemY into dense[saveOffsets[16 + (id&1)]
// + id], hands the new unit a weapon through L(), and sets 7979 bit 6.
{
  const saveOffsets = new Int16Array(570);
  saveOffsets[16] = 5000;
  saveOffsets[17] = 5100;
  const equipped = [];
  let v = -1;
  stepLegacyEntityBatchAllocate({
    ...baseInput, aU: 0, subsystemY: 5, saveOffsets,
    setV: (x) => { v = x; },
    onEquipIssue: (id) => equipped.push(id),
  }, 1, 6, 6, 1, 2);
  const id = lastId;
  assert.ok(id > 0);
  assert.equal(v, id, "v:I is the new unit");
  assert.equal(state[(id & 1 ? 5100 : 5000) + id], 5, "subsystemY written");
  assert.deepEqual(equipped, [id], "L() runs on the new unit");
  assert.equal(state[7979 + id] & 64, 64, "7979 bit 6 set");
}

// aU < 0 skips the whole tail.
{
  const saveOffsets = new Int16Array(570);
  const equipped = [];
  stepLegacyEntityBatchAllocate({
    ...baseInput, aU: -1, subsystemY: 5, saveOffsets,
    onEquipIssue: (id) => equipped.push(id),
  }, 1, 9, 9, 1, 2);
  assert.deepEqual(equipped, []);
  assert.equal(state[7979 + lastId] & 64, 0);
}

console.log("b.a(IIIBB) entity batch allocate OK");
