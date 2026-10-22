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

const {
  isLegacyResourceMarkerRange,
  classifyLegacyMarkerRange,
  prepareLegacyMapMarkerDispatch: prepareRaw,
  drawLegacyMapMarkerPieces,
} = loadModule("./render/LegacyMapMarkerDispatch", srcDir);

// vm.createContext gives the loaded module its own realm, so objects it
// returns (and any nested arrays) carry a different Object/Array prototype
// than this script's own literals -- deepEqual (deepStrictEqual under
// node:assert/strict) treats those as unequal even when every field
// matches. Round-tripping through JSON rebuilds everything with this
// script's own realm's plain Object/Array, sidestepping the mismatch.
function prepareLegacyMapMarkerDispatch(...args) {
  return JSON.parse(JSON.stringify(prepareRaw(...args)));
}

// --- Standalone classifier checks ---
assert.equal(isLegacyResourceMarkerRange(-61), true);
assert.equal(isLegacyResourceMarkerRange(-110), true);
assert.equal(isLegacyResourceMarkerRange(-60), false);
assert.equal(isLegacyResourceMarkerRange(-111), false);

assert.equal(classifyLegacyMarkerRange(-111), 0);
assert.equal(classifyLegacyMarkerRange(-116), 0);
assert.equal(classifyLegacyMarkerRange(-117), 1);
assert.equal(classifyLegacyMarkerRange(-122), 1);
assert.equal(classifyLegacyMarkerRange(-123), 3);
assert.equal(classifyLegacyMarkerRange(0), 2);
assert.equal(classifyLegacyMarkerRange(-50), 2);

function baseState(overrides = {}) {
  const dense = new Int8Array(20000);
  const gridC = Array.from({ length: 20 }, () => new Int8Array(20));
  return {
    ah: 0, ai: 0, originColumn: 0, originRow: 0,
    dense, gridC,
    packedBytes: new Int8Array(2000),
    packedOffsets: new Int16Array(400),
    shortTables: [new Int16Array(2000)],
    byteTables: [new Int8Array(2000)],
    aQ: 0,
    ...overrides,
  };
}

// Test 1: classify1===2, resource-marker range ([-110,-61]).
{
  const state = baseState();
  state.dense[9852] = 5; // local4
  state.dense[9952] = 7; // local7
  state.shortTables[0][31] = 100;
  state.byteTables[0][31] = 50;
  const result = prepareLegacyMapMarkerDispatch(-80, 0, state);
  assert.deepEqual(result, {
    N: 100, O: 50, local3: 19, local7: 7, local4: 5,
    local10: 0, local11: 0, resource: 31, local8: 0, local9: 0, arg2: 0, scratchGWrites: [],
  });
}

// Test 2: classify1===2, classify2===2, marker<175 -> pure pass-through.
{
  const state = baseState({ ah: 2, ai: 3 });
  const result = prepareLegacyMapMarkerDispatch(100, 5, state);
  assert.deepEqual(result, {
    N: 0, O: 0, local3: -100, local7: 0, local4: 0,
    local10: 2 * 22, local11: 3 * 16, resource: 0, local8: 0, local9: 0, arg2: 5, scratchGWrites: [],
  });
}

// Test 3: classify1===2, classify2===2, marker>=175.
{
  const state = baseState({ ai: 2, aQ: 10 });
  state.shortTables[0][54] = 77;
  state.byteTables[0][54] = 33;
  const result = prepareLegacyMapMarkerDispatch(200, 0, state);
  assert.deepEqual(result, {
    N: 77, O: 33, local3: 0, local7: 0, local4: 54,
    local10: 0, local11: 2 * 16 + 10, resource: 54, local8: 0, local9: 0, arg2: 0, scratchGWrites: [],
  });
}

// Test 4: classify1===2, classify2===3 (marker===-123) -- NOT row-clamped.
{
  const state = baseState();
  state.shortTables[0][24] = 11;
  state.byteTables[0][24] = 22;
  const result = prepareLegacyMapMarkerDispatch(-123, 0, state);
  assert.deepEqual(result, {
    N: 11, O: 22, local3: 0, local7: 0, local4: 23,
    local10: 0, local11: 0, resource: 24, local8: 0, local9: 0, arg2: 0, scratchGWrites: [],
  });
}

// Tests 5-8: offsets 422..450 also store the cell value g0 in g[0] (oracle run 15).
// Test 5: classify1===2, classify2===0 (marker in [-116,-111]), g0 classifies
// to 2, nested classify also !=2 -- no clamping needed (local4 lands at 22).
{
  const state = baseState({ ah: 4, ai: 3, originColumn: 0, originRow: 0 });
  state.gridC[3][4] = -90; // g0, classifies to 2
  state.dense[4455] = -113; // dense[4545 + (-90)], classifies to 0 (!=2)
  state.shortTables[0][23] = 200;
  state.byteTables[0][23] = 100;
  const result = prepareLegacyMapMarkerDispatch(-115, 0, state);
  assert.deepEqual(result, {
    N: 200, O: 100, local3: 0, local7: 2, local4: 22,
    local10: 4 * 22, local11: 3 * 16, resource: 23, local8: 0, local9: 0, arg2: 0, scratchGWrites: [{ index: 0, value: -90 }],
  });
}

// Test 6: same marker range, g0 classifies to 2, nested ALSO classifies to 2
// -- local4/local7 stay at their top-of-method values (0).
{
  const state = baseState({ ah: 4, ai: 3 });
  state.gridC[3][4] = -90;
  state.dense[4455] = -90; // classifies to 2 too
  state.shortTables[0][1] = 9;
  state.byteTables[0][1] = 8;
  const result = prepareLegacyMapMarkerDispatch(-115, 0, state);
  assert.deepEqual(result, {
    N: 9, O: 8, local3: 0, local7: 0, local4: 0,
    local10: 4 * 22, local11: 3 * 16, resource: 1, local8: 0, local9: 0, arg2: 0, scratchGWrites: [{ index: 0, value: -90 }],
  });
}

// Test 7: g0 classifies to 1 -> arg2 mutated to -1 regardless of input;
// also exercises the row-clamp loop (local4 starts at 28, clamps to 22).
{
  const state = baseState({ ah: 4, ai: 3 });
  state.gridC[3][4] = -119; // g0, classifies to 1
  state.shortTables[0][23] = 300;
  state.byteTables[0][23] = 100;
  const result = prepareLegacyMapMarkerDispatch(-115, 7, state);
  assert.deepEqual(result, {
    N: 300, O: 100, local3: 0, local7: 1, local4: 22,
    local10: 4 * 22, local11: 3 * 16, resource: 23, local8: 0, local9: 0, arg2: -1, scratchGWrites: [{ index: 0, value: -119 }],
  });
}

// Test 8: g0 classifies to 0 (neither 1 nor 2) -- same local4/local7 formula
// as classify 1, but arg2 is left untouched.
{
  const state = baseState({ ah: 4, ai: 3 });
  state.gridC[3][4] = -114; // g0, classifies to 0
  state.shortTables[0][21] = 60;
  state.byteTables[0][21] = 40;
  const result = prepareLegacyMapMarkerDispatch(-115, 9, state);
  assert.deepEqual(result, {
    N: 60, O: 40, local3: 0, local7: 1, local4: 20,
    local10: 4 * 22, local11: 3 * 16, resource: 21, local8: 0, local9: 0, arg2: 9, scratchGWrites: [{ index: 0, value: -114 }],
  });
}

// Test 9: MAIN case (classify1 !== 2, e.g. marker in [-60,-1]), arg2===0 ->
// offsets 187..276 step N to this cell's ground piece: the
// (width*local9 + local8)-th entry with P == 0.
{
  const state = baseState({ ah: 5, ai: 3, originColumn: 10, originRow: 7 });
  state.byteTables[3] = new Int8Array(2000);
  state.dense[8779] = 8; // local4
  state.dense[9145] = 2; // local7
  state.dense[8413] = 12; // entity x -> local8 = 5+10-12 = 3
  state.dense[8474] = 8; // entity y -> local9 = 3+7-8 = 2
  state.packedBytes[104 + 8] = 4; // footprint width
  state.shortTables[0][9] = 555;
  state.byteTables[0][9] = 44;
  state.byteTables[3][556] = 0x40; // a P=1 piece is not counted
  const result = prepareLegacyMapMarkerDispatch(-30, 0, state);
  assert.deepEqual(result, {
    N: 555 + 12, O: 44 - 12, local3: 30, local7: 2, local4: 8,
    local10: 44, local11: 16, resource: 9, local8: 3, local9: 2, arg2: 0, scratchGWrites: [],
  });

  // The scan stops at the first entry whose low 3 bits are set.
  state.byteTables[3][560] = 1;
  assert.equal(prepareLegacyMapMarkerDispatch(-30, 0, state).N, 560);
}

// Offsets 994..1140: draw piece N at (ah-local8, ai-local9), then stacked
// pieces (low bits clear, P != 0) while P <= local7.
{
  const shortTables = [new Int16Array(10), new Int16Array([0, 0, 0x1000 | 7, 8, 9, 10, 11])];
  const byteTables = [new Int8Array(10), new Int8Array([0, 0, 1, 2, 3, 0, 0]), new Int8Array([0, 0, 4, 5, 6, 0, 0]),
    new Int8Array([0, 0, 0, 0x80, 0x40, 0x40 | 1, 0])];
  const calls = [];
  drawLegacyMapMarkerPieces({ N: 2, local7: 1, local8: 1, local9: 2 }, 5, 3, shortTables, byteTables,
    (...args) => calls.push(args));
  assert.deepEqual(JSON.parse(JSON.stringify(calls)), [[7, 4 * 22 + 1, 16 + 4], [9, 4 * 22 + 3, 16 + 6]]);
}

// Test 10: MAIN case, arg2!==0 -> walks the e[4545+n]/e[4646+n] linked list
// into scratchGWrites.
{
  const state = baseState({ ah: 5, ai: 3, originColumn: 10, originRow: 7 });
  state.dense[8779] = 8;
  state.dense[9145] = 2;
  state.dense[8413] = 12;
  state.dense[8474] = 8;
  state.dense[9023] = 5; // dense[8993 + local3(30)] -- list head
  state.dense[4651] = 2; // dense[4646 + 5]
  state.dense[4550] = 0; // dense[4545 + 5] -- list ends
  const result = prepareLegacyMapMarkerDispatch(-30, 1, state);
  assert.deepEqual(result.scratchGWrites, [{ index: 2, value: 5 }]);
  assert.equal(result.local3, 30);
}

console.log("f.a(int,byte)'s dispatch/preparation half (marker routing) OK");
