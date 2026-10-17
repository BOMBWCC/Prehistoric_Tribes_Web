// Regression test for LegacySubsystemTrainingCount.ts (private void ac(),
// part of b.g()'s AI building-economy cluster). See the file's own
// docblock for the corrected derivation (2026-08-27).
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

const { stepLegacySubsystemTrainingCount } = loadModule("./sim/tribe/LegacySubsystemTrainingCount", srcDir);

function makeState() {
  return new Int8Array(10000);
}

// Zero eligible entities -> count stays 0.
{
  const state = makeState();
  stepLegacySubsystemTrainingCount({ state, team: 0, buildingId: 5 });
  assert.equal(state[8932 + 5], 0);
}

// One entity satisfying all four base gates (alive, linked to this building,
// under training, waiting) counts, when it is NOT the building's own
// dense[8810+v] reference.
{
  const state = makeState();
  const v = 5;
  const id = 3;
  state[1919 + id] = 1;
  state[4444 + id] = v;
  state[4646 + id] = -1;
  state[1313 + id] = -1;
  state[8810 + v] = 99; // not equal to id, so the extra building-kind checks are skipped
  stepLegacySubsystemTrainingCount({ state, team: 0, buildingId: v });
  assert.equal(state[8932 + v], 1);
}

// C:I (#10) is a FIELD shared with g()/aa(): ac() continues from whatever
// aa() left in it, and writes the running total back (offsets 130..163).
{
  const state = makeState();
  const v = 5;
  const id = 3;
  state[1919 + id] = 1;
  state[4444 + id] = v;
  state[4646 + id] = -1;
  state[1313 + id] = -1;
  state[8810 + v] = 99;
  const scratch = { C: 2 };
  stepLegacySubsystemTrainingCount({ state, team: 0, buildingId: v, scratch });
  assert.equal(state[8932 + v], 3, "aa()'s 2 workers plus this method's 1 match");
  assert.equal(scratch.C, 3);
}

// Failing any one of the four base gates excludes the entity.
{
  const state = makeState();
  const v = 5;
  const id = 3;
  state[1919 + id] = 0; // dead/inactive
  state[4444 + id] = v;
  state[4646 + id] = -1;
  state[1313 + id] = -1;
  stepLegacySubsystemTrainingCount({ state, team: 0, buildingId: v });
  assert.equal(state[8932 + v], 0);
}

// When id === dense[8810+v] (this entity IS the building's own primary
// reference), the extra checks read the BUILDING's own kind/busy fields
// (dense[8749+v]/dense[8627+v]), not the entity's -- confirms the
// 2026-08-27 correction.
{
  const state = makeState();
  const v = 5;
  const id = 3;
  state[1919 + id] = 1;
  state[4444 + id] = v;
  state[4646 + id] = -1;
  state[1313 + id] = -1;
  state[8810 + v] = id; // this entity IS the primary reference
  state[8749 + v] = 2; // building kind === 2
  state[8627 + v] = 0; // building not busy
  // Deliberately give the ENTITY itself a mismatched kind/busy state to
  // prove those fields are NOT what gets checked.
  state[8749 + id] = 99;
  state[8627 + id] = 1;
  stepLegacySubsystemTrainingCount({ state, team: 0, buildingId: v });
  assert.equal(state[8932 + v], 1, "counts based on the building's own fields, not the entity's");
}

// Same primary-reference case, but the building's own kind !== 2 -> excluded.
{
  const state = makeState();
  const v = 5;
  const id = 3;
  state[1919 + id] = 1;
  state[4444 + id] = v;
  state[4646 + id] = -1;
  state[1313 + id] = -1;
  state[8810 + v] = id;
  state[8749 + v] = 3; // building kind !== 2
  state[8627 + v] = 0;
  stepLegacySubsystemTrainingCount({ state, team: 0, buildingId: v });
  assert.equal(state[8932 + v], 0);
}

// Same primary-reference case, but the building is busy (dense[8627+v]!==0) -> excluded.
{
  const state = makeState();
  const v = 5;
  const id = 3;
  state[1919 + id] = 1;
  state[4444 + id] = v;
  state[4646 + id] = -1;
  state[1313 + id] = -1;
  state[8810 + v] = id;
  state[8749 + v] = 2;
  state[8627 + v] = 1; // busy
  stepLegacySubsystemTrainingCount({ state, team: 0, buildingId: v });
  assert.equal(state[8932 + v], 0);
}

// Only scans the requested team's 50-slot range -- an otherwise-eligible
// entity on the other team is not counted.
{
  const state = makeState();
  const v = 5;
  const idOnTeam1 = 60; // team 1's range (51..100)
  state[1919 + idOnTeam1] = 1;
  state[4444 + idOnTeam1] = v;
  state[4646 + idOnTeam1] = -1;
  state[1313 + idOnTeam1] = -1;
  state[8810 + v] = 99;
  stepLegacySubsystemTrainingCount({ state, team: 0, buildingId: v });
  assert.equal(state[8932 + v], 0);
  stepLegacySubsystemTrainingCount({ state, team: 1, buildingId: v });
  assert.equal(state[8932 + v], 1);
}

console.log("b.ac() building training-count scan OK");
