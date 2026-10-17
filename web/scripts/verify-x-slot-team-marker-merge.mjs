// Regression test for the mainArrays.b/mainArrays.c duplicate-field fix
// (2026-08-22): f.b:[[[B](#237)/f.c:[[[B](#256) were split into two
// unsynced copies each -- mainArrays.b/c (used by resetLegacyAM,
// resetGameplayLoadPrefix, and the RMS save/load record hydrate/snapshot
// pair) vs. game.xSlotTable/game.teamMarkerTable (used by X()'s real
// writes and LegacyMapMarkerScan.ts's real reads). A reset or a loaded
// save never affected what live gameplay actually saw. Fixed by merging
// all four call sites onto game.xSlotTable/game.teamMarkerTable and
// removing mainArrays.c entirely.
//
// CORRECTION (2026-08-24): mainArrays.b's one remaining use
// (stepLegacySubsystemOAdvanced's `auxiliary` input, b.O()'s type-94..97
// branch) turned out to be the SAME field too (confirmed via b.O()'s own
// constant-pool index #139, "Field f.b:[[[B"), not a separate untraced
// one as previously documented -- the same duplicate-field bug just
// missed on 2026-08-22. Fixed the same way; mainArrays.b now removed
// entirely.
import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";
import path from "node:path";

const srcDir = new URL("../src/", import.meta.url).pathname;
const context = vm.createContext({ Int8Array, Int16Array, Int32Array, Array, console, Math, DataView, ArrayBuffer });
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

function dirty(table, value) {
  for (const plane of table) for (const row of plane) row.fill(value);
}

// resetMapEntryAllocation (f.aM()'s real wrapper) must reset the SAME
// arrays X()/LegacyMapMarkerScan.ts actually read/write.
{
  const rt = new LegacyRuntimeState();
  dirty(rt.game.xSlotTable, 9);
  dirty(rt.game.teamMarkerTable, 9);

  rt.resetMapEntryAllocation(0);

  assert.ok(rt.game.xSlotTable.every((plane) => plane.every((row) => row.every((v) => v === 0))));
  for (let i = 0; i < 5; i += 1) assert.equal(rt.game.teamMarkerTable[0][i][2], -1);
}

// snapshotGameplayRecord/hydrateGameplayRecord must round-trip through
// game.xSlotTable/game.teamMarkerTable, not a disconnected copy.
{
  const rt = new LegacyRuntimeState();
  rt.game.xSlotTable[1][2][3] = 42;
  rt.game.teamMarkerTable[0][4][1] = 17;

  const record = rt.snapshotGameplayRecord();
  assert.equal(record.b2x5x30[1][2][3], 42);
  assert.equal(record.c2x5x5[0][4][1], 17);

  const rt2 = new LegacyRuntimeState();
  rt2.hydrateGameplayRecord(record);
  assert.equal(rt2.game.xSlotTable[1][2][3], 42);
  assert.equal(rt2.game.teamMarkerTable[0][4][1], 17);
}

// stepSubsystemN's onOther -> stepLegacySubsystemOAdvanced (b.O()'s
// type-94..97 branch) must read the SAME game.xSlotTable X() writes,
// not a disconnected copy. Real dispatch, not a direct call to the raw
// helper (already unit-tested separately in verify-subsystem-o.mjs).
{
  const rt = new LegacyRuntimeState();
  const id = 5;
  const team = 0;
  rt.denseState[2828 + id] = 94; // type: falls through eligible/109/110 to onOther
  rt.denseState[4040 + id] = 42; // this entity's own lookup key
  rt.denseState[7] = 11; // "value" entity's x
  rt.denseState[108] = 22; // "value" entity's y
  rt.game.xSlotTable[team][0][5] = 42; // association row, matches the lookup key above
  rt.game.xSlotTable[team][2][5] = 7; // "value": another entity id (>=0)
  rt.gridC[0][0] = id; // on its own cell (dense[5] = dense[106] = 0), so N() reaches O()

  rt.stepSubsystemN(id, team);

  assert.equal(rt.denseState[3131 + id], 11, "state[3131+id] should copy state[value]'s x from xSlotTable, not a stale mainArrays.b duplicate");
  assert.equal(rt.denseState[3232 + id], 22, "state[3232+id] should copy state[101+value]'s y from xSlotTable");
  assert.equal(rt.denseState[4444 + id], 7);
  assert.equal(rt.denseState[4747 + id], 7);
}

console.log("game.xSlotTable/teamMarkerTable merge (mainArrays.b/c removed) OK");
