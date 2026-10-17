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

// AND-masks dense[7979+id] with 159 for all 50 ids, regardless of gate state.
{
  const rt = new LegacyRuntimeState();
  for (let id = 1; id <= 50; id += 1) rt.denseState[7979 + id] = 0xff;
  rt.subsystemBC();
  for (let id = 1; id <= 50; id += 1) {
    assert.equal(rt.denseState[7979 + id] & 0xff, 0xff & 159);
  }
}

// a(int,boolean)(#278) fires only for ids matching all three gates
// (dense[1919+id]>0, dense[2828+id]===69, dense[6161+id]===0) -- BUG FIX
// (2026-08-22): #278 is now fully ported and called directly (was a no-op
// onA seam before); verify via its real dense[3131+id]/[808+id] side
// effects (copy-then-zero, per LegacySubsystemBCoordinateSync.ts), not a
// spy, since the callback parameter no longer exists.
{
  const rt = new LegacyRuntimeState();
  rt.denseState[1919 + 5] = 1;
  rt.denseState[2828 + 5] = 69;
  rt.denseState[6161 + 5] = 0;
  rt.denseState[0 + 5] = 11;
  rt.denseState[101 + 5] = 22;
  rt.denseState[2929 + 5] = 8; // &255 > 7 -> skip the packed adjustment
  rt.denseState[808 + 5] = 3;

  rt.denseState[1919 + 6] = 0; // fails first gate
  rt.denseState[2828 + 6] = 69;
  rt.denseState[6161 + 6] = 0;
  rt.denseState[0 + 6] = 99;
  rt.denseState[3131 + 6] = 42; // must stay untouched: gate never fires

  rt.denseState[1919 + 7] = 1;
  rt.denseState[2828 + 7] = 70; // fails second gate
  rt.denseState[6161 + 7] = 0;
  rt.denseState[3131 + 7] = 42;

  rt.subsystemBC();
  assert.equal(rt.denseState[3131 + 5], 11);
  assert.equal(rt.denseState[3232 + 5], 22);
  assert.equal(rt.denseState[808 + 5], 0);
  assert.equal(rt.denseState[3131 + 6], 42);
  assert.equal(rt.denseState[3131 + 7], 42);
}

// No gate matches: no-op, does not throw.
{
  const rt = new LegacyRuntimeState();
  rt.subsystemBC();
}

console.log("subsystemBC (b.c(), final void c()) OK");
