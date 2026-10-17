// Regression test for LegacyRuntimeState's subsystemEntityJTrigger (b.w()'s
// onJ target, private void J() #246). RETRACTED-PREMISE (2026-09-07), FULLY
// PORTED (2026-09-07) -- see the method's own docblock in
// LegacyRuntimeState.ts for the full bytecode-derived trace (b:[S] #132 is
// NOT permanently null; it's `saveOffsets`, the same stride table used
// throughout this port).
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

// Case A: mask bits both clear (A ends at -1 both times), x3 outside
// [69,74] (multiplier phase skipped), x6>0 (dense-stride branch), x8>=0
// (plain-assign branch).
{
  const rt = new LegacyRuntimeState();
  const id = 5;
  const type = 3;
  rt.denseState[2828 + id] = type;

  rt.packedOffsets[27] = 0;
  rt.packedBytes[0 + type] = 0; // bit&32===0 -> A=-1; bit&16===0 -> A=-1

  rt.packedOffsets[35] = 10;
  rt.packedBytes[10 + type] = 60; // t35 = x3 = 60 (not in [69,74])
  rt.saveOffsets[60] = 1000;
  rt.denseState[1000 + id] = 7; // x1

  rt.packedOffsets[36] = 20;
  rt.packedBytes[20 + type] = 4; // t36
  // C = (x1+t36)*A = (7+4)*(-1) = -11

  rt.packedOffsets[33] = 30;
  rt.packedBytes[30 + type] = 5; // x6 = 5 (>0)
  rt.saveOffsets[5] = 2000;
  rt.denseState[2000 + id] = 50; // dense[saveOffsets[x6]+id] before

  rt.packedOffsets[34] = 40;
  rt.packedBytes[40 + type] = 9; // x8 = 9 (>=0) -> C = 9

  rt.packedOffsets[31] = 50;
  rt.packedBytes[50 + type] = 6; // x9 = 6
  rt.saveOffsets[6] = 3000;
  rt.denseState[3838 + id] = 2;
  rt.denseState[3000 + 2] = 10; // dense[off] before, off = 3000+2 = 3002

  rt["subsystemEntityJTrigger"](id);

  assert.equal(rt.denseState[2000 + id], 39, "x6>0 branch: dense[saveOffsets[x6]+id] += C");
  assert.equal(rt.subsystemArrays.bField10, 9, "bField10 ends at the x8>=0 plain assignment");
  assert.equal(rt.denseState[3002], 1, "final dense[off] += C*A = 10 + 9*(-1)");
  assert.equal(rt.game.subsystemR, 1, "subsystemR reads the just-updated dense[off]");
  assert.equal(rt.game.subsystemA, -1, "A ends at -1 (bit 16 clear on the second mask check)");
}

// Case B: mask bit 32 set (A=1 first check) but bit 16 clear (A=-1 second
// check); x3 in [69,74] with team===0 and both delta checks in range
// (multiplier phase fires: C = trunc(C*3/2)); x6<=0 (aShort branch);
// x8<0 (dense-stride read branch).
{
  const rt = new LegacyRuntimeState();
  const id = 8;
  const type = 1;
  rt.denseState[2828 + id] = type;
  rt.game.bTeam = 0; // team

  rt.packedOffsets[27] = 0;
  rt.packedBytes[0 + type] = 32; // bit&32!==0 -> skip override (A=1); bit&16===0 -> A=-1 later

  rt.packedOffsets[35] = 100;
  rt.packedBytes[100 + type] = 70; // t35 = x3 = 70, in [69,74]
  rt.saveOffsets[70] = 1200;
  rt.denseState[1200 + id] = 3; // x1

  rt.packedOffsets[36] = 110;
  rt.packedBytes[110 + type] = 2; // t36
  // C = (x1+t36)*A = (3+2)*1 = 5, then multiplier: trunc(5*3/2) = 7

  rt.mainArrays.aShort[0][17] = 50; // idx17
  rt.denseState[id] = 20;
  rt.denseState[50] = 18; // d1 = 20-18 = 2, in [-4,4]
  rt.denseState[101 + id] = 30;
  rt.denseState[101 + 50] = 28; // d2 = 30-28 = 2, in [-4,4]

  rt.packedOffsets[33] = 120;
  rt.packedBytes[120 + type] = -3; // x6 = -3 (<=0) -> aShort[team][3] += C
  rt.mainArrays.aShort[0][3] = 100;

  rt.packedOffsets[34] = 130;
  rt.packedBytes[130 + type] = -5; // x8 = -5 (<0) -> C = dense[saveOffsets[5]+id]
  rt.saveOffsets[5] = 2500;
  rt.denseState[2500 + id] = 42;

  rt.packedOffsets[31] = 140;
  rt.packedBytes[140 + type] = 7; // x9 = 7
  rt.saveOffsets[7] = 2600;
  rt.denseState[3838 + id] = 4;
  rt.denseState[2600 + 4] = 20; // dense[off] before, off = 2600+4 = 2604

  rt["subsystemEntityJTrigger"](id);

  assert.equal(rt.mainArrays.aShort[0][3], 107, "x6<=0 branch: aShort[team][-x6] += C (7)");
  assert.equal(rt.subsystemArrays.bField10, 42, "bField10 ends at the x8<0 dense read");
  assert.equal(rt.denseState[2604], -22, "final dense[off] += C*A = 20 + 42*(-1)");
  assert.equal(rt.game.subsystemR, -22, "subsystemR reads the just-updated dense[off]");
  assert.equal(rt.game.subsystemA, -1, "A ends at -1 (bit 16 clear on the second mask check)");
}

// Real dispatch path: J() is reachable from a full tick (b.w()'s onJ,
// inside the entity loop) and must not crash now that it's real logic.
{
  const rt = new LegacyRuntimeState();
  rt.packedData = { shortTables: [], byteTables: [] };
  let threw = null;
  try {
    for (let i = 0; i < 30; i += 1) {
      rt.stepFrame({ map: rt.gridC, updateSubsystem: () => rt.stepSubsystemFrame() });
    }
  } catch (err) {
    threw = String(err);
  }
  assert.equal(threw, null, `full tick threw: ${threw}`);
}

console.log("b.w()'s onJ target (private void J()) OK");
