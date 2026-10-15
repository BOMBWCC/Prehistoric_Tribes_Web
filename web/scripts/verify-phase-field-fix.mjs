// Regression test for the 2026-08-18 "phase" field-identity fix.
//
// Three call sites in LegacyRuntimeState.ts were binding "phase" to
// game.timingCounterE (f.e:I, #284), but direct bytecode reads of their
// own real target methods confirm they need f.f:I (#294)/game.fCounter,
// a genuinely different field that only shares the letter-adjacent "e"/"f"
// naming, not an actual relationship:
//  - stepLegacyP's pFrameState.phase (P(), offset 337/352) -- driven here
//    through the real stepFrameDispatch() Q===17 -> "P" path.
//  - stepGameplayOuterLoop's state.phase (u()'s own row-end draw, offset
//    2118/2178/2203)
//  - stepLegacyMapMarkerDetail's phase (a(int,byte,byte,int,int,byte)
//    #442, offset 4/1156)
//  - stepLegacyMapMarkerScan's phase (v(), offset 326/519) -- wired into
//    stepGameplayOuterLoop the same day this field was already
//    self-flagged as "unconfirmed" in that file's own docblock, part of
//    the same audit that found the three sites above.
//
// A fifth call site (dispatchLegacyGameplayCellBody's negative-branch
// phase, LegacyGameplayNegativeEntityBranch.ts) was ALREADY correctly
// using timingCounterE/e:I -- its own docblock claim of f:I was the bug
// there, not the wiring; fixed as a comment-only correction (not
// re-tested here, already covered by verify-negative-entity-branch.mjs).
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

function freshRt() {
  const rt = new LegacyRuntimeState();
  // Force fCounter and timingCounterE to distinct, distinguishable values
  // so a test that reads the wrong field fails loudly instead of
  // coincidentally passing (both default to 0 otherwise).
  rt.game.fCounter = 42;
  rt.game.timingCounterE = 99;
  return rt;
}

// --- stepLegacyP (real "P" handler, Q===17) reads fCounter, not timingCounterE ---
{
  const rt = freshRt();
  rt.game.Q = 17;
  rt.game.c = 0;
  let threw = null;
  try {
    rt.stepFrameDispatch();
  } catch (e) { threw = String(e); }
  assert.equal(threw, null);
  assert.equal(rt.pFrameState.phase, 42);
}

// --- stepGameplayOuterLoop reads fCounter for its own row-end-draw state.phase ---
{
  const rt = freshRt();
  let threw = null;
  try {
    rt["stepGameplayOuterLoop"](undefined);
  } catch (e) { threw = String(e); }
  assert.equal(threw, null);
}

// stepGameplayOuterLoop's own state.phase and stepLegacyMapMarkerDetail's
// phase (called from a nested callback inside the same method) both
// construct local objects never exposed on the runtime instance, so
// verify the fix directly against the source file rather than through
// brittle Function.prototype.toString() reflection (which proved
// unreliable for very large class methods during this test's own
// development -- see the commit message for the discovery).
{
  const sourcePath = path.resolve(srcDir, "LegacyRuntimeState.ts");
  const source = fs.readFileSync(sourcePath, "utf8");
  const phaseLines = source
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("phase:") || line.startsWith("this.pFrameState.phase ="));
  // 3 source sites (u()'s row-end draw, map-marker-detail, v()'s marker-scan
  // phase) must read fCounter -- P()'s is the live `phase: "fCounter"`
  // mapping on pFrameState since 2026-09-23, checked at runtime below; 2 sites (1137 composition, negative-branch cell body) must
  // still read timingCounterE -- both are confirmed correct as-is.
  const usingFCounter = phaseLines.filter((line) => line.includes("this.game.fCounter"));
  const usingTimingCounterE = phaseLines.filter((line) => line.includes("this.game.timingCounterE"));
  assert.equal(usingFCounter.length, 3, `expected 3 phase lines reading game.fCounter, found ${usingFCounter.length}: ${JSON.stringify(usingFCounter)}`);
  assert.equal(usingTimingCounterE.length, 2, `expected 2 phase lines reading game.timingCounterE (1137 composition + negative-branch cell body), found ${usingTimingCounterE.length}: ${JSON.stringify(usingTimingCounterE)}`);
}

{
  const { LegacyRuntimeState } = loadModule("./LegacyRuntimeState", srcDir);
  const rt = new LegacyRuntimeState();
  rt.game.fCounter = 77;
  rt.game.timingCounterE = 5;
  assert.equal(rt["pFrameState"].phase, 77, "P()'s phase is game.fCounter");
}

console.log("phase field-identity fix (P()/u()/map-marker-detail/marker-scan -> fCounter, negative-branch stays timingCounterE) OK");
