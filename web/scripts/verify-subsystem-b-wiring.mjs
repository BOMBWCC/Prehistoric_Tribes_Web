// Integration test: LegacyRuntimeState's subsystemB() now wires two of
// stepLegacySubsystemBDecision's real callback targets to already-ported
// (but previously never-called) functions: onRawAction -> changeEntityType
// (b.a(int,byte), LegacyEntityTypeChange.ts) and onQueue ->
// selectEntityTypeAfterQ (b.Q(), LegacyEntityModePromotion.ts). Both were
// confirmed via raw bytecode (bytecode/b-javap.txt, private boolean b()
// offsets ~859..1020 and ~614..868) to be the real targets of these
// callback names -- not guessed. Spies on the two runtime methods (rather
// than asserting on state mutation) since selectEntityTypeAfterQ's own
// no-op-when-type-unchanged gate makes some real trigger scenarios
// legitimately produce no observable state delta.
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

const { LegacyRuntimeState } = loadModule("./LegacyRuntimeState", srcDir);

// onRawAction: reach stepLegacySubsystemBDecision's table-41-mismatch
// branch (state[6464+id]===12, differing table-41 lookups for m vs the
// entity's stored value) and confirm changeEntityType fires with (id, 12).
{
  const rt = new LegacyRuntimeState();
  const id = 4;
  rt.denseState[1414 + id] = 12; // mayContinue's own >=12 gate
  rt.denseState[5050 + id] = 0;
  rt.denseState[6464 + id] = 12; // triggers the onRawAction(id,12) sub-branch
  // b() offsets 872..1170 sit inside the idle-69 block (guards 672..834):
  // idle type, no order/mode, target away from the work spot.
  rt.denseState[2828 + id] = 69;
  rt.denseState[6262 + id] = 3;
  rt.packedOffsets[41] = 200;
  rt.packedBytes[200 + 5] = 1; // table41(m=5) = 1
  rt.packedBytes[200 + 12] = 0; // table41(state[6464+id]=12) = 0 -- mismatch, enters the branch

  rt.game.c = 1;
  rt.game.subsystemU = 0;
  rt.game.outerLoopNFlag = false;
  rt.game.outerLoopLFlag = false;
  rt.game.subsystemQ = 0;
  rt.game.subsystemMByte = 5; // b.m:B (#202), "m" in stepLegacySubsystemBDecision

  const calls = [];
  const originalChange = rt.changeEntityType.bind(rt);
  rt.changeEntityType = (entityId, type, onC) => { calls.push([entityId, type]); return originalChange(entityId, type, onC); };

  // a(6262,6363,true) needs a live map; this check is only about onRawAction.
  rt.subsystemEntityTransform = () => {};
  rt["stepEntityDecisionCheck"](id);

  // Q() (the idle block's own type reset) runs first; then the job switch.
  assert.ok(calls.some(([entityId, type]) => entityId === id && type === 12), JSON.stringify(calls));
}

// onQueue and onEntityTransform fire from the SAME if-block in
// stepLegacySubsystemBDecision (type===69 + position-mismatch), back to
// back, onEntityTransform first.
//
// RETRACTED (2026-09-07), onEntityTransform FULLY PORTED (2026-09-07): this
// used to assert that onEntityTransform is a guaranteed throw and therefore
// that onQueue/selectEntityTypeAfterQ is unreachable through this trigger.
// That rested on b:[S] (#132) being permanently null; e.f() allocates it.
// subsystemEntityTransform (a(int,int,boolean)/c(int,int,int,int)/
// e(int,int,int), LegacySubsystemEntityTransform.ts) is now fully ported,
// so it returns normally and onQueue IS reached.
{
  const rt = new LegacyRuntimeState();
  const id = 7;
  rt.denseState[1414 + id] = 12;
  rt.denseState[5050 + id] = 0;
  rt.denseState[2828 + id] = 69; // type===69
  rt.denseState[7777 + id] = 0;
  rt.denseState[6161 + id] = 0;
  rt.denseState[3131 + id] = 1; rt.denseState[6262 + id] = 9; // position mismatch
  rt.denseState[3232 + id] = 1; rt.denseState[6363 + id] = 1;
  // e(int,int,int)'s own table-92 divisor lookup (offset 96..101, packedBytes[
  // packedOffsets[92]+p2]) is 0 by default with no packed resource loaded,
  // which is a genuine Java ArithmeticException (idiv by zero, no local
  // exception table) -- give it a real, non-zero-triggering value (>=127
  // takes the k[3]=0 branch instead of dividing) rather than let the test
  // hit an unrepresentative fixture gap.
  rt.packedBytes[0] = 127;

  rt.game.c = 1;
  rt.game.subsystemU = 0;
  rt.game.outerLoopNFlag = false;
  rt.game.outerLoopLFlag = false;
  rt.game.subsystemQ = 0;
  rt.game.subsystemMByte = 0;

  const calls = [];
  const originalSelect = rt.selectEntityTypeAfterQ.bind(rt);
  rt.selectEntityTypeAfterQ = (entityId) => { calls.push(entityId); return originalSelect(entityId); };

  rt["stepEntityDecisionCheck"](id);
  assert.deepEqual(calls, [id], "onQueue is reached now that onEntityTransform no longer throws");
}

console.log("subsystemB() real wiring (onRawAction -> changeEntityType; onEntityTransform + the co-located onQueue both reached) OK");
