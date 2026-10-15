// Regression test for the 2026-09-02 "P" handler onSpriteDraw wiring fix.
//
// f.P() (LegacyGameplayPaintTriggers.ts's stepLegacyP), offsets 292..355 of
// its own tableA0===1 branch, makes two real f.d(int,int,int,int) (#572,
// "LegacyZSubrecordDraw") calls -- records `98+tableA28` and `104`, both at
// (120,176) -- confirmed by direct bytecode read of bytecode/f-javap.txt
// around line 16589 ("private void P()"). LegacyRuntimeState.ts's own
// "P" handler dispatch (stepFrameDispatch()'s Q===17 branch, ~line 5718)
// wires every other stepLegacyP callback (onI/onGameplayDraw/
// onPopulateItems/onElementScan) but never passed `onSpriteDraw` -- so
// these two calls were silently dropped every frame. Live browser trace
// (Q=17, al=2, the story-dialog/cutscene screen) confirmed this callback
// fires on every real frame there, and that the SAME branch clears the
// exact same region two calls earlier
// (`bar.fillRect(11, 120, 240, 128)`) -- so once the drop happened,
// nothing was left to redraw the canvas's middle ~2/3, which painted pure
// black. See docs/unknowns.md's 2026-08-31 entries for the full
// pixel-sampled before/after evidence.
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

const rt = new LegacyRuntimeState();
// Select the real "P" handler (Q===17 with the G/H command-table slot
// unset) exactly like selectLegacyFrameHandler does.
rt.game.Q = 17;
rt.game.c = 0;
// Drive stepLegacyP's own tableA0===1, aR<tableA84 branch (offsets
// 191..343): aS selects table row 0 (packedOffsets all default to 0, so
// no extra offset math is needed), aR>=0 and below tableA84 so the method
// doesn't take the early "aR<0" or "am!==0 re-check" exits, am!==0 so the
// live-observed am=5 path (phase, not aR, as the 4th onSpriteDraw arg) is
// exercised too.
rt.game.aR = 0;
rt.game.am = 5;
rt.game.al = 2; // Matches the live al===2 story-dialog state; gates the epilogue's onElementScan too.
rt.game.aS = 0;
rt.game.H = false; // needsFullReset=false -- isolate the tableA0===1 branch from the unrelated full-reset clear.
rt.game.jFlag = false;
rt.game.fCounter = 20; // The `phase` value onSpriteDraw's 4th argument should carry (am!==0 -> state.phase).
// packedOffsets[155] defaults to 0, so table-155 lookups read packedBytes
// directly at +0/+28/+84 (+aS, which is 0 here).
rt.packedBytes[0] = 1; // tableA0 === 1
rt.packedBytes[28] = 1; // tableA28 === 1 -> sprite record 98+1 = 99
rt.packedBytes[84] = 12; // tableA84 === 12 (aR=0 < 12, takes the draw branch)

let threw = null;
try {
  rt.stepFrameDispatch();
} catch (e) { threw = String(e); }
assert.equal(threw, null);

// Compare only primitive fields, not whole objects/arrays -- the runtime
// class was loaded into a separate vm context, so its own Array/Object
// constructors differ from this script's, and assert.deepStrictEqual
// (this file imports the "/strict" assert) treats that as a mismatch
// even when every value is identical.
const sprites = [];
for (const call of rt.frameHelperCalls) {
  if (call.kind === "p-sprite") sprites.push(call);
}
assert.equal(sprites.length, 2, `expected 2 p-sprite draws, got ${sprites.length}`);
assert.equal(sprites[0].record, 99);
assert.equal(sprites[0].x, 120);
assert.equal(sprites[0].y, 176);
assert.equal(sprites[0].mode, 20);
assert.equal(sprites[1].record, 104);
assert.equal(sprites[1].x, 120);
assert.equal(sprites[1].y, 176);
assert.equal(sprites[1].mode, 20);

console.log("P() onSpriteDraw wiring (records 98+tableA28/104 at (120,176)) OK");
