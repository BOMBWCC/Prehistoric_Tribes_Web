// Regression test for the 2026-09-02 "gameplay HUD renders nothing" fix.
//
// f.b:[Z] (#234) is a single field in the real bytecode -- written by
// f.a(ZZZZZZZZZ) (#464, runSelectionFlagsRefresh), O(), l(int) (stepLegacyL)
// and ai() (stepLegacyZAi), and read by f.a(byte,int,int)'s own `selection`
// gate (LegacyFrameCommandDraw.ts's `Boolean(flags[command])`) among other
// places. This project had split it into TWO separate JS arrays --
// `game.frameFlags` (read by drawLegacyFrameCommand and several other
// confirmed #234 call sites, e.g. LegacyEntityRecordLifecycle.ts) and an
// orphan `game.selectionMirrorFlags` (written by all four sites above) --
// that were never kept in sync. Every write landed in the orphan; the HUD
// command dispatch kept reading the other one and always saw it false,
// so `drawLegacyFrameCommand` always took its "changed" (ae=1) fallback
// path instead of the real "selection" (ae=0) path, which -- for a fresh
// gameplay frame with an all-zero `k:[B]` allocation table -- silently
// discards every single row (see docs/unknowns.md's 2026-09-02 entry for
// the full live-trace derivation: zero `frame-row-command` events for the
// resource-bar commands 0/9/17 before this fix, 13/9/2 after).
//
// This test asserts the real bytecode invariant directly: after any of
// the four confirmed #234 write sites runs, `game.frameFlags` (not some
// separate mirror) carries the write. Before the fix, every assertion
// below failed (the write landed in `game.selectionMirrorFlags` instead,
// so `game.frameFlags` never moved off its `false` default) -- confirmed
// with `git stash` against the pre-fix tree.
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

// --- f.a(ZZZZZZZZZ) (#464), runSelectionFlagsRefresh -- the site the live
// "HUD is blank" trace pointed to: game.selectionFlags[0] is set true
// during boot (stepLegacyS()'s unconditional refresh call, see
// verify-selection-preset-wiring.mjs), which is what makes f.m()'s
// 20-slot scan dispatch command 0 at all; game.frameFlags[0] must move
// in lockstep so drawLegacyFrameCommand's own `selection` gate sees it. ---
{
  const rt = new LegacyRuntimeState();
  assert.equal(rt.game.frameFlags[0], false);
  rt["runSelectionFlagsRefresh"](true, false, false, false);
  assert.equal(rt.game.selectionFlags[0], true);
  assert.equal(rt.game.frameFlags[0], true, "runSelectionFlagsRefresh must sync game.frameFlags, not an orphan mirror");
}

// --- O() (LegacyRuntimeState's stepLegacyO), offset 68..83: `if (a[i])
// b[i] = true`. ---
{
  // a(i, 0, d[...]) runs right after and clears b[i] at its own offset
  // 1053, so observe the flag at the moment of the draw.
  const rt = new LegacyRuntimeState();
  rt.game.selectionFlags[3] = true;
  let seen;
  rt.drawFrameCommandPrimitive = (aD) => { if (aD === 3) seen = rt.game.frameFlags[3]; };
  rt["stepLegacyO"]();
  assert.equal(seen, true, "O() must write game.frameFlags, not an orphan mirror");
}

console.log("f.b:[Z] (#234) frameFlags/selectionMirrorFlags merge OK");
