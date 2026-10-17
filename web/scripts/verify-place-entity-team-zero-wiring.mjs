// Integration test for LegacyRuntimeState's placeEntity onTeamZeroSubsystem
// / onTeamZeroReset wiring (bytecode/f-javap.txt's `final byte a(byte, int,
// int, int, int, boolean, int)`, offsets 0..~1109). Both were previously
// fully inert placeholders, never investigated or documented.
//
// onTeamZeroSubsystem (fires when type not in [12,19] and team===0) maps to
// `final void a(int,int,int)` in class b (constant pool #473, confirmed via
// direct bytecode read of placeEntity offset 849..936, whose exact argument
// expressions match markLegacySpatialRecord/LegacySpatialRecordUpdate.ts
// -- the SAME method already ported and wired via runSpatialPass) --
// bytecode-spot-checked directly (offsets 0..79 of b's own `final void
// a(int,int,int)`) to confirm the aV loop-counter/span-window/table54-55
// structure matches, not just the signature+docblock description.
//
// onTeamZeroReset (fires when specialPlacement && team===0, called with
// (5,x,y,0)) maps to `private void a(byte,byte,byte,byte)` in class f
// (constant pool #433, confirmed via direct bytecode read of placeEntity
// offset 1089..1106: `iload 6(specialPlacement); ifeq skip; iload_1(team);
// ifne skip; iconst_5; x; y; iconst_0; invokevirtual #433`) -- the SAME
// method already ported/wired as stepLegacyByteActionQueue via
// stepByteActionQueueMaintenance (type=100 case); factored into a shared
// runByteActionQueue(type,x,y,value) helper so placeEntity's type=5 call
// can reuse it instead of duplicating the state setup/write-back.
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

const { LegacyRuntimeState } = loadModule("./core/LegacyRuntimeState", srcDir);
const { markLegacySpatialRecord } = loadModule("./sim/world/LegacySpatialRecordUpdate", srcDir);

// Known-working placeEntity fixture (mirrors verify-entity-placement.mjs's
// own proven pure-function setup) so canPlaceLegacyFootprint/width/height
// lookups succeed for real instead of silently early-returning.
function setupPlacementFixture(rt) {
  rt.packedOffsets[138] = 100;
  rt.packedOffsets[113] = 300;
  rt.packedBytes[100 + 104] = 1; // width(type=0)
  rt.packedBytes[100 + 130] = 1; // height(type=0)
  rt.packedBytes[100 + 182] = 11; // state[8505+id] table
  rt.packedBytes[300] = 7;
  rt.game.mapWidth = 8;
  rt.game.mapHeight = 8;
  // f.a(int,int,int,boolean) offset 113 (`ifeq 119`) passes a cell when its
  // occupancy class is 0 and fails it otherwise. This line used to return 1
  // and call it "clear" -- which only worked because the port's own test was
  // inverted the same way it was (fixed 2026-09-09, see LegacyFootprintCheck).
  rt.occupancyClass = () => 0; // class 0 == placeable, per #447's own callers
}

// --- onTeamZeroSubsystem reaches the real markLegacySpatialRecord via placeEntity(team=0) ---
{
  const rt = new LegacyRuntimeState();
  setupPlacementFixture(rt);
  rt.game.S = 0;
  // markLegacySpatialRecord's own table54/table55 lookups. span =
  // state[8688+id]&15 = 5 (unconditionally set by placeEntity before
  // onTeamZeroSubsystem fires). selector = packedBytes[table55+span]
  // (index 305, distinct from the placement fixture's packedBytes[300]),
  // left at its default 0. width = packedBytes[table54+selector+offset];
  // with y=3, row = y-span+offset = offset-2, so offset=2 is the first
  // non-negative row (row=0) -- set a nonzero width there.
  rt.packedOffsets[54] = 200;
  rt.packedOffsets[55] = 300;
  rt.packedBytes[200 + 0 + 2] = 4;
  const gridC = Array.from({ length: 8 }, () => new Int8Array(8));

  let threw = null;
  let placedId = null;
  try {
    // NOTE: placeEntity() itself does not supply onTeamZeroSubsystem --
    // each real caller (stepLegacyTAi37/38/45, stepMapEntry's onAP) wires
    // it in its own placementOptions. Reproduce that exact wiring here
    // (copied verbatim from LegacyRuntimeState.ts) so this test exercises
    // the real callback body against real placeEntity-computed x/y/value,
    // without needing to drive one of those larger caller methods whole.
    placedId = rt.placeEntity(gridC, 0, 0, 2, 3, 0, false, -1, {
      auxiliaryIndex: 0,
      frameS: 0,
      qByte: 0,
      qCounter: 0,
      teamZeroSlotValue: 0,
      teamOneSlotValue: 0,
      suppressCounters: false,
      onTeamZeroSubsystem: (x, y, value) => {
        markLegacySpatialRecord({
          packedBytes: rt.packedBytes,
          packedOffsets: rt.packedOffsets,
          layers: rt.mainArrays.aInt,
          layerIndex: rt.game.S,
          mapHeight: rt.game.mapHeight,
        }, x, y, value);
      },
    });
  } catch (e) { threw = String(e); }

  assert.equal(threw, null);
  assert.equal(placedId, 1);
  // markLegacySpatialRecord's real effect: some bit gets OR'd into intLayers[S][segment][row].
  const layer = rt.mainArrays.aInt[0];
  const touched = layer.some((rows) => rows.some((v) => v !== 0));
  assert.ok(touched, "expected markLegacySpatialRecord to mark at least one bit");
}

// --- onTeamZeroReset reaches the real runByteActionQueue via placeEntity(team=0, specialPlacement=true) ---
{
  const rt = new LegacyRuntimeState();
  setupPlacementFixture(rt);
  const calls = [];
  const original = rt["runByteActionQueue"].bind(rt);
  rt["runByteActionQueue"] = (type, x, y, value) => { calls.push([type, x, y, value]); return original(type, x, y, value); };

  const gridC = Array.from({ length: 8 }, () => new Int8Array(8));
  rt.game.missionFrame = 1; // gate: f.a(BBBB) returns when c:I == 0 or u:B > 0
  rt.game.uByte = 0;

  let threw = null;
  try {
    // Same note as above: reproduce the real onTeamZeroReset wiring
    // (LegacyRuntimeState.ts) verbatim rather than relying on placeEntity
    // itself to supply it.
    rt.placeEntity(gridC, 0, 0, 4, 6, 0, true, -1, {
      auxiliaryIndex: 0,
      frameS: 0,
      qByte: 0,
      qCounter: 0,
      teamZeroSlotValue: 0,
      teamOneSlotValue: 0,
      suppressCounters: false,
      onTeamZeroReset: (mode, x, y, flags) => rt.runByteActionQueue(mode, x, y, flags),
    });
  } catch (e) { threw = String(e); }

  assert.equal(threw, null);
  assert.deepEqual(calls, [[5, 4, 6, 0]]); // mode=5, x=4, y=6, flags=0 -- exact bytecode-predicted args
  assert.equal(rt.mainArrays.uBytes[0], 5); // real queue side effect: type=5 enqueued
}

// --- onTeamZeroReset does NOT fire when team!==0 ---
{
  const rt = new LegacyRuntimeState();
  setupPlacementFixture(rt);
  const calls = [];
  const original = rt["runByteActionQueue"].bind(rt);
  rt["runByteActionQueue"] = (...args) => { calls.push(args); return original(...args); };

  const gridC = Array.from({ length: 8 }, () => new Int8Array(8));
  rt.placeEntity(gridC, 1, 0, 4, 6, 0, true, -1, {
    auxiliaryIndex: 0,
    frameS: 0,
    qByte: 0,
    qCounter: 0,
    teamZeroSlotValue: 0,
    teamOneSlotValue: 0,
    suppressCounters: false,
    onTeamZeroReset: (mode, x, y, flags) => rt.runByteActionQueue(mode, x, y, flags),
  });
  assert.deepEqual(calls, []);
}

console.log("placeEntity's onTeamZeroSubsystem (b.a(III)/markLegacySpatialRecord) and onTeamZeroReset (f.a(BBBB)/runByteActionQueue) wiring OK");
