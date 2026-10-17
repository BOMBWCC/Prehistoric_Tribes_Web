// Regression test for LegacyRuntimeState's subsystemEntityAAlert
// (subsystemB's onA target, private void A(), bytecode/b-javap.txt
// offsets 0..903). RETRACTED-PREMISE (2026-09-07), FULLY PORTED
// (2026-09-07) -- see the method's own docblock in LegacyRuntimeState.ts
// for the full bytecode-derived trace (b:[S] #132 is NOT permanently
// null; it's `saveOffsets`, the same stride table used throughout this
// port).
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

// Full worked example exercising every phase:
//  - phase1 seed (slots 23..26 = 9,9,10,10, unconditional)
//  - phase2 (i=2,1,0 over j=25,26): configured so every i is dropped
//    (lhs>rhs every time), leaving slots 25/26 at their seeded 10s
//  - phase3/4 clamp writes (dense[1818+id], dense[4949+id])
//  - phase4 main loop (i=3..8 over j=23,24): i=3..7 all "continue" (lhs>=rhs
//    at both j), i=8 passes the compare, clears both exclusion checks, and
//    inserts (shift + write) at j=23
//  - phase5 final rewrite over slots 23..26 (one packedBytes[108] remap,
//    three "> 8 -> -1" clears)
{
  const rt = new LegacyRuntimeState();
  const id = 12;

  // offset 0..38 (pre-existing prefix): dense[2222+id] = 15.
  rt.packedOffsets[41] = 600;
  rt.denseState[6464 + id] = 0;
  rt.packedBytes[600 + 0] = 15;

  rt.saveOffsets[23] = 6000;
  rt.saveOffsets[24] = 6200;
  rt.saveOffsets[25] = 6400;
  rt.saveOffsets[26] = 6600;

  rt.packedOffsets[107] = 200;
  rt.packedOffsets[108] = 300;
  // table107: slotType/candidate -> slot index (23/24/25/26)
  rt.packedBytes[200 + 9] = 23;
  rt.packedBytes[200 + 10] = 25;
  rt.packedBytes[200 + 0] = 23;
  rt.packedBytes[200 + 1] = 23;
  rt.packedBytes[200 + 2] = 23;
  rt.packedBytes[200 + 3] = 24;
  rt.packedBytes[200 + 4] = 24;
  rt.packedBytes[200 + 5] = 24;
  rt.packedBytes[200 + 6] = 24;
  rt.packedBytes[200 + 7] = 24;
  rt.packedBytes[200 + 8] = 26;
  // table108: reused both as i=8's exclusion value and slot23's phase5 remap.
  rt.packedBytes[300 + 8] = 5;

  rt.denseState[2525 + id] = 99; // != any tested i, so that exclusion never fires
  rt.denseState[2626 + id] = 99;

  rt.denseState[1616 + id] = 4;
  rt.denseState[1818 + id] = 2;
  rt.denseState[4949 + id] = 20;

  rt["subsystemEntityAAlert"](id);

  assert.equal(rt.denseState[2222 + id], 15, "prefix write unchanged by the rest of the method");
  assert.equal(rt.denseState[6000 + id], 5, "slot23: inserted 8 by phase4, then remapped by phase5");
  assert.equal(rt.denseState[6200 + id], -1, "slot24: valG=9>8 -> -1");
  assert.equal(rt.denseState[6400 + id], -1, "slot25: untouched 10 from phase1 seed, valG=10>8 -> -1");
  assert.equal(rt.denseState[6600 + id], -1, "slot26: untouched 10 from phase1 seed, valG=10>8 -> -1");
  assert.equal(rt.denseState[1818 + id], 5, "clamp(2, 3+trunc(4/2)=5, 7) = 5");
  assert.equal(rt.denseState[4949 + id], 9, "clamp(20, dense[1818+id]+1=6, 9) = 9");
}

// Real dispatch path: A() is reachable from a full tick (subsystemB's onA)
// and must not crash now that it's real logic.
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

console.log("subsystemB's onA target (private void A()) OK");
