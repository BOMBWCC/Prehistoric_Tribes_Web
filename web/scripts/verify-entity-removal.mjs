// Regression test for stepEntityRemoval (final void c(int,boolean), #555,
// bytecode/f-javap.txt offsets 0..577) -- LegacyRuntimeState.ts's own
// private method, composed from already-ported pieces plus the new
// LegacySubsystemBTenSlotThrows.ts guaranteed-throws. Wired as s()'s
// onModeThreeExpire (arg2 always false) and l(int)'s onEntityMode (arg2
// always true).
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

// type===2 reaches b.a(int)(#476) with dense[9237+id]>=1, i.e. past its only
// real guard. RETRACTED 2026-09-07: this used to assert an uncaught throw on
// the premise that c:[[B](#143) is permanently null; f.g() allocates it, so
// the method really walks the cRows table. With cRows all-zero no slot
// matches (c[4][af]===0 everywhere), so it completes without calling d().
{
  const rt = new LegacyRuntimeState();
  const id = 5;
  rt.denseState[8749 + id] = 2; // type
  rt.denseState[9237 + id] = 1; // guard passes
  rt.stepEntityRemoval(id, false);
  assert.equal(rt.denseState[8505 + id], 0);
}

// Same path, but with a matching cRows slot: b.a(int) hands off to
// b.d(int,int)(#367), which clears c[4][af].
{
  const rt = new LegacyRuntimeState();
  const id = 5;
  rt.denseState[8749 + id] = 2;
  rt.denseState[9237 + id] = 1;
  rt.subsystemArrays.cRows[4][2] = 1;
  rt.subsystemArrays.cRows[5][2] = id;
  rt.subsystemArrays.cRows[0][2] = 6;
  rt.denseState[8282 + 6] = 4; // d()'s ae = 1 -> proceeds
  rt.subsystemArrays.cRows[4][1] = 3;
  rt.stepEntityRemoval(id, false);
  assert.equal(rt.subsystemArrays.cRows[4][1], 0, "b.d(int,int) cleared c[4][ae]");
}

// type===2 but dense[9237+id]<1 -> releaseTenEntity is a real no-op, the
// rest of the method proceeds normally (arg2===false branch).
{
  const rt = new LegacyRuntimeState();
  const id = 5;
  rt.denseState[8749 + id] = 2;
  rt.denseState[9237 + id] = 0; // no-op
  rt.denseState[8383 + id] = 10; // x
  rt.denseState[8444 + id] = 20; // y
  rt.game.cameraSFlag = true; // skip the f.a:[[S (mainArrays.aShort)[team][14]/[21] block
  rt.stepEntityRemoval(id, false);
  assert.equal(rt.denseState[8505 + id], 0);
  assert.equal(rt.denseState[8627 + id], 3);
}

// arg2===false, type!==2, type!==0: gridC footprint cleared, no exception
// (the try/catch swallows the guaranteed-throw releaseTen() (#563) call
// near the end of this branch).
{
  const rt = new LegacyRuntimeState();
  const id = 6;
  rt.denseState[8749 + id] = 5; // type, not 0 or 2
  rt.denseState[8383 + id] = 3; // x
  rt.denseState[8444 + id] = 4; // y
  // Width/height come from packed table 138 offsets 104/130; set them to a
  // real 2x2 footprint so the clear loop has something to do.
  rt.packedOffsets[138] = 200;
  rt.packedBytes[200 + 104 + 5] = 2; // width
  rt.packedBytes[200 + 130 + 5] = 2; // height
  rt.gridC[4][3] = 9;
  rt.gridC[5][4] = 9;
  rt.stepEntityRemoval(id, false);
  assert.equal(rt.gridC[4][3], 0);
  assert.equal(rt.gridC[5][4], 0);
  assert.equal(rt.denseState[8505 + id], 0);
  assert.equal(rt.denseState[8627 + id], 3);
}

// arg2===true: stepLegacyF2/enqueueLegacyEffectSlot/dense[8505+id]=-1 all
// fire; no exception even though it's still wrapped in the same try/catch.
{
  const rt = new LegacyRuntimeState();
  const id = 7;
  rt.denseState[8749 + id] = 5;
  rt.stepEntityRemoval(id, true);
  assert.equal(rt.denseState[8505 + id], -1);
  assert.equal(rt.mainArrays.e[0][0], 7); // enqueueLegacyEffectSlot wrote id into the first free slot
  assert.equal(rt.mainArrays.e[2][0], 3);
}

// arg2===true, w:B in {2,4} and id===qCounter -> resets wByte/qCounter and
// refreshes selection.
{
  const rt = new LegacyRuntimeState();
  const id = 8;
  rt.denseState[8749 + id] = 5;
  rt.game.barMode = 2;
  rt.game.qCounter = id;
  rt.stepEntityRemoval(id, true);
  assert.equal(rt.game.barMode, 0);
  assert.equal(rt.game.qCounter, 0);
  assert.equal(rt.game.selectionFlags[0], true);
  assert.equal(rt.game.selectionFlags[2], false);
}

// l(int)'s real onEntityMode wiring: value===-2 fires
// stepEntityRemoval(qCounter, true) through the real stepLegacyL dispatch.
{
  const rt = new LegacyRuntimeState();
  const id = 10;
  rt.game.qCounter = id;
  rt.denseState[8749 + id] = 5;
  rt.stepLegacyL(-2);
  assert.equal(rt.denseState[8505 + id], -1); // stepEntityRemoval's arg2===true branch ran for real
}

console.log("stepEntityRemoval (final void c(int,boolean), #555) OK");
