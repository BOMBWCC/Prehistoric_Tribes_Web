import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function loadModule(file) {
  const module = { exports: {} };
  const output = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(output, { module, exports: module.exports, Int8Array, Int32Array });
  return module.exports;
}

const { LegacyGameState } = loadModule(new URL("../src/j2me/LegacyGameState.ts", import.meta.url).pathname);
const { stepLegacyGameplayTick } = loadModule(new URL("../src/j2me/LegacyGameplayTick.ts", import.meta.url).pathname);

const game = new LegacyGameState();
game.vByte = 1;
game.iByte = 0;
game.frameFlags[4] = true;
game.resourceByte = (offset, add) =>
  offset === 296 ? 3 : offset === 298 ? 7 : offset === 306 ? 2 : offset === 305 && add === 2 ? 9 : 0;
const calls = [];
stepLegacyGameplayTick(game, { loadMode: (mode) => calls.push(["load", mode]) });
assert.equal(game.iByte, -1);
assert.equal(game.vByte, 0);
assert.equal(game.mByte, 1);
assert.equal(game.entityJ, 113);
assert.equal(game.Q, 25);
assert.equal(game.R, 28);
assert.deepEqual(calls, [["load", 9]]);

const counters = new LegacyGameState();
for (let i = 0; i < 8; i += 1) stepLegacyGameplayTick(counters);
assert.equal(counters.timingCounterE, 0);
assert.equal(counters.oInt, 4);
assert.equal(counters.nFlag, false);

// h() offsets 43..59: once e:I reaches 6 it clears E:Z (cEFlag) and q:Z
// (cQFlag) -- not E:B (game.E, the key-repeat count). Fixed 2026-10-08.
{
  const t = new LegacyGameState();
  t.cEFlag = true; t.cQFlag = true; t.E = 2; t.timingCounterE = 5;
  stepLegacyGameplayTick(t);
  assert.equal(t.cEFlag, false);
  assert.equal(t.cQFlag, false);
  assert.equal(t.E, 2);
}

const maintenance = new LegacyGameState();
maintenance.vByte = 1;
maintenance.iByte = 1;
let maintenanceCalls = 0;
for (let i = 0; i < 6; i += 1) {
  stepLegacyGameplayTick(maintenance, { allocateMaintenanceRecord: () => { maintenanceCalls += 1; } });
}
assert.equal(maintenanceCalls, 1);
assert.equal(maintenance.dByte, 0);

// Regression (2026-08-22): private void i() (#610) has three real call
// sites in this method's own body -- the oCounter===3 branch, the
// kFlag-reset block's tail, and the pFlag-gated block right after it --
// all three used to call a bytecode-unfaithful `resetInput` placeholder
// instead. Confirm `onI` actually fires at each site.
{
  const oCounterCase = new LegacyGameState();
  let iCalls = 0;
  for (let i = 0; i < 4; i += 1) stepLegacyGameplayTick(oCounterCase, { onI: () => { iCalls += 1; } });
  assert.equal(iCalls, 1);
  // o:I (#348) is one field: a reset by j()/W()/... (oInt = 0) re-arms the o===3 call (2026-10-08).
  oCounterCase.oInt = 0;
  for (let i = 0; i < 4; i += 1) stepLegacyGameplayTick(oCounterCase, { onI: () => { iCalls += 1; } });
  assert.equal(iCalls, 2);
}
{
  // f.h() tests the lowercase k:Z (#332, kResetFlag), and must leave the
  // chief-pick K:Z (#69, kFlag) alone -- split 2026-09-23.
  const kFlagCase = new LegacyGameState();
  kFlagCase.kResetFlag = true;
  kFlagCase.kFlag = true;
  let iCalls = 0;
  stepLegacyGameplayTick(kFlagCase, { onI: () => { iCalls += 1; } });
  assert.equal(kFlagCase.kResetFlag, false);
  assert.equal(kFlagCase.kFlag, true);
  assert.equal(iCalls, 1);
}
{
  const pFlagCase = new LegacyGameState();
  pFlagCase.pFlag = true;
  let iCalls = 0;
  stepLegacyGameplayTick(pFlagCase, { onI: () => { iCalls += 1; } });
  assert.equal(pFlagCase.pFlag, false);
  assert.equal(iCalls, 1);
}

console.log("gameplay tick bytecode checks passed");
