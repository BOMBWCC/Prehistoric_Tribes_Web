// Integration test for LegacyRuntimeState's stepLegacyX() (private void X(),
// bytecode/f-javap.txt offsets 0..484). Now wired to its real call site
// (V()'s wByte===3 branch, via stepLegacyGameplayInput's onXDispatch --
// see verify-gameplay-input.mjs for that dispatch-routing test and
// verify-gameplay-input-dispatch.mjs for the sibling d/e/a(byte,byte)/f
// targets), but still tested directly via bracket notation here since
// it's a private method and this file predates the wiring.
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

// Gate: cRFlag===false is a total no-op.
{
  const rt = new LegacyRuntimeState();
  rt.game.cSInt = 100;
  rt["stepLegacyX"]();
  assert.equal(rt.game.outerLoopRowEndMarker[0], 0);
  assert.equal(rt.game.outerLoopRowEndMarker[1], 0);
}

// Branch A (s===100), O:Z path: sets N=O, M=false, L=false, writes q[]=I+y/K+A,
// calls l(-1) (resets cSInt to 0, moves wByte to zlXByte's prior value).
{
  const rt = new LegacyRuntimeState();
  rt.game.cRFlag = true;
  rt.game.cSInt = 100;
  rt.game.xOFlag = true;
  rt.game.xMFlag = true; // must be forced false by the O:Z branch
  rt.game.cameraColumn = 15; rt.game.cursorColumn = 3;
  rt.game.cameraRow = 5; rt.game.cursorRow = 2;
  rt["stepLegacyX"]();
  assert.equal(rt.game.callToArmsActive, true);
  assert.equal(rt.game.xMFlag, false);
  assert.equal(rt.game.formUpActive, false);
  assert.equal(rt.game.outerLoopRowEndMarker[0], 18);
  assert.equal(rt.game.outerLoopRowEndMarker[1], 7);
  assert.equal(rt.game.cSInt, 0); // l(-1) always resets s:I to 0
}

// Branch A, M:Z path (O:Z false): sets L=M, still calls l(-1).
{
  const rt = new LegacyRuntimeState();
  rt.game.cRFlag = true;
  rt.game.cSInt = 100;
  rt.game.xOFlag = false;
  rt.game.xMFlag = true;
  rt["stepLegacyX"]();
  assert.equal(rt.game.formUpActive, true);
  assert.equal(rt.game.cSInt, 0);
}

// Branch B (s<0): dense-state writes, no l(-1) call (cSInt stays negative).
{
  const rt = new LegacyRuntimeState();
  rt.game.cRFlag = true;
  rt.game.cSInt = -5;
  rt.game.cRInt = 2;
  rt.game.qCounter = 1;
  rt.denseState[8383 + 1] = 9;
  rt.denseState[8444 + 1] = 11;
  rt["stepLegacyX"]();
  assert.equal(rt.denseState[3131 + 2], 9);
  assert.equal(rt.denseState[3232 + 2], 11);
  assert.equal(rt.denseState[2828 + 2], 43 - -5);
  assert.equal(rt.denseState[6161 + 2], 3);
  assert.equal(rt.game.cSInt, -5); // unchanged -- this branch never calls l()
}

// Branch C, value-written===3 "spawn" sub-case: writes all 4 slot rows and calls l(-1).
{
  const rt = new LegacyRuntimeState();
  rt.game.cRFlag = true;
  rt.game.cSInt = 3;
  rt.game.qCounter = 7;
  rt.game.cameraColumn = 10; rt.game.cursorColumn = 1;
  rt.game.cameraRow = 20; rt.game.cursorRow = 2;
  rt["stepLegacyX"]();
  assert.equal(rt.game.xNByte, 0); // first slot was empty
  assert.equal(rt.game.xSlotTable[0][1][0], 3);
  assert.equal(rt.game.xSlotTable[0][0][0], 7);
  assert.equal(rt.game.xSlotTable[0][2][0], 11);
  assert.equal(rt.game.xSlotTable[0][3][0], 22);
  assert.equal(rt.game.cSInt, 0); // l(-1) fired
}

// Branch C, value!==3, team-accept sub-case (cRInt in 1..50 -> classify===0).
{
  const rt = new LegacyRuntimeState();
  rt.game.cRFlag = true;
  rt.game.cSInt = 1;
  rt.game.qCounter = 4;
  rt.game.cRInt = 25;
  rt["stepLegacyX"]();
  assert.equal(rt.game.xSlotTable[0][1][0], 1);
  assert.equal(rt.game.xSlotTable[0][0][0], 4);
  assert.equal(rt.game.xSlotTable[0][2][0], 25);
  assert.equal(rt.game.cSInt, 1); // no l() call on this path
}

// Branch C, value!==3, team-reject sub-case (cRInt out of 1..100 -> classify===2, early return).
{
  const rt = new LegacyRuntimeState();
  rt.game.cRFlag = true;
  rt.game.cSInt = 1;
  rt.game.qCounter = 4;
  rt.game.cRInt = 200;
  rt["stepLegacyX"]();
  assert.equal(rt.game.xSlotTable[0][1][0], 1); // this write happens before the reject check
  assert.equal(rt.game.xSlotTable[0][0][0], 0); // but the slot0/slot2 completion writes are skipped
}

// Branch D (s>3, default): out-of-bounds coordinate is a no-op.
{
  const rt = new LegacyRuntimeState();
  rt.game.cRFlag = true;
  rt.game.cSInt = 5;
  rt.game.cameraColumn = -50; rt.game.cTInt = 0; // x = -50, out of bounds
  const wByteBefore = rt.game.barMode;
  rt["stepLegacyX"]();
  assert.equal(rt.game.barMode, wByteBefore);
}

console.log("f.X() (private void X()) OK");
