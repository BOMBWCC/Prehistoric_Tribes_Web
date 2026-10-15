import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";

const path = new URL("../src/j2me/LegacyPaintScreen.ts", import.meta.url).pathname;
const output = ts.transpileModule(fs.readFileSync(path, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(output, { module, exports: module.exports });
const { stepLegacyPaintScreen } = module.exports;

function mockGraphics() {
  const calls = [];
  return {
    calls,
    setColor: (v) => calls.push(["setColor", v]),
    fillRect: (...a) => calls.push(["fillRect", ...a]),
    drawRegion: (...a) => calls.push(["drawRegion", ...a]),
  };
}

const image = { width: 251, height: 328 };

function freshState() {
  return { cameraSFlag: false, jSceneFlag: false, aPInt: 0 };
}

// Offset 465: the blit is UNCONDITIONAL -- fires regardless of the gate
// fields, with a:S/b:S both proven-constant-0 (zero putfield sites in
// f-javap.txt), giving dest (-11, -8), source (0,0,251,328), transform 0,
// anchor 0. This is the exact bug fixed 2026-08-31: the previous port
// gated this on `game.c === -1`, a fabricated condition absent from the
// bytecode, which left Q=17 (c !== -1) with a black screen.
{
  const graphics = mockGraphics();
  stepLegacyPaintScreen(freshState(), graphics, image);
  assert.deepEqual(graphics.calls[0], ["drawRegion", image, 0, 0, 251, 328, 0, -11, -8, 0]);
}

// Gate closed (any one of the three conditions false) -> blit only, no
// fillRect/setColor calls, matching the three separate `goto 600` guards
// (offsets 502/509/516).
{
  const graphics = mockGraphics();
  const state = freshState();
  state.cameraSFlag = false; // s:Z == false -> goto 600
  state.jSceneFlag = false;
  state.aPInt = -5;
  stepLegacyPaintScreen(state, graphics, image);
  assert.equal(graphics.calls.length, 1);
}
{
  const graphics = mockGraphics();
  const state = freshState();
  state.cameraSFlag = true;
  state.jSceneFlag = true; // J:Z != false -> goto 600
  state.aPInt = -5;
  stepLegacyPaintScreen(state, graphics, image);
  assert.equal(graphics.calls.length, 1);
}
{
  const graphics = mockGraphics();
  const state = freshState();
  state.cameraSFlag = true;
  state.jSceneFlag = false;
  state.aPInt = 0; // aP:I >= 0 -> goto 600
  stepLegacyPaintScreen(state, graphics, image);
  assert.equal(graphics.calls.length, 1);
}

// Gate open (s:Z=true, J:Z=false, aP:I<0) -> setColor(0) then the two
// fillRects, exact pixel math per the bytecode-derived formulas:
//   rect1: fillRect(0, 0,          240, 16 - aP)
//   rect2: fillRect(0, 336 + aP,   240, -aP)
{
  const graphics = mockGraphics();
  const state = { cameraSFlag: true, jSceneFlag: false, aPInt: -5 };
  stepLegacyPaintScreen(state, graphics, image);
  assert.deepEqual(graphics.calls, [
    ["drawRegion", image, 0, 0, 251, 328, 0, -11, -8, 0],
    ["setColor", 0],
    ["fillRect", 0, 0, 240, 21],
    ["fillRect", 0, 331, 240, 5],
  ]);
}

// aP:I = -1 (smallest magnitude that still opens the gate): rect1 height
// 17, rect2 at y=335 height 1 -- exercises the boundary the `>= 0` guard
// protects.
{
  const graphics = mockGraphics();
  const state = { cameraSFlag: true, jSceneFlag: false, aPInt: -1 };
  stepLegacyPaintScreen(state, graphics, image);
  assert.deepEqual(graphics.calls.slice(1), [
    ["setColor", 0],
    ["fillRect", 0, 0, 240, 17],
    ["fillRect", 0, 335, 240, 1],
  ]);
}

console.log("verify-paint-screen: ok");
