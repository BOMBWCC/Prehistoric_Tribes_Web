import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { denseRequire } from "./dense-layout-require.mjs";

const hoverModule = { exports: {} };
vm.runInNewContext(ts.transpileModule(fs.readFileSync(new URL("../src/ui/LegacyCursorHover.ts", import.meta.url).pathname, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { require: denseRequire, module: hoverModule, exports: hoverModule.exports });
const { stepLegacyCursorHover } = hoverModule.exports;

// f.k(), bytecode/f-javap.txt offsets 0..407.
const grid = () => Array.from({ length: 96 }, () => new Int8Array(96));
const base = (over = {}) => ({
  cameraColumn: 0, cursorColumn: 5, cameraRow: 0, cursorRow: 9, boxSelecting: false, barMode: 0,
  mapWidth: 40, mapHeight: 32, hoverUnit: 0, acInt: 1000, ...over,
});

// The oracle case (menu run frame 482): empty cursor cell (5,9), villager 4 above it.
{
  const c = grid(); const e = new Int8Array(10000);
  c[8][5] = 4; c[8][4] = 7; c[8][6] = 5; c[9][4] = 8; c[9][6] = 9; c[10][5] = 3;
  const s = base();
  stepLegacyCursorHover(s, c, e);
  // Straight above: 16^2/2 = 128; the diagonals are (16^2+22^2)/2 = 370, sideways 22^2/2 = 242.
  assert.equal(s.hoverUnit, 4, "the original picks villager 4 here (oracle W:B = 4)");
  assert.equal(s.acInt, 128);
}
{
  const c = grid(); const e = new Int8Array(10000);
  c[8][5] = 4; e[303 + 4] = 14; // villager 4 drawn 14 px down -> 16-14 = 2 px from the cursor
  c[8][4] = 7;
  const s = base();
  stepLegacyCursorHover(s, c, e);
  assert.equal(s.hoverUnit, 4);
  assert.equal(s.acInt, 2);
}
// A villager under the cursor wins outright; with w == 1 villagers are dropped at the tail.
{
  const c = grid(); const e = new Int8Array(10000);
  c[9][5] = 12;
  const s = base();
  stepLegacyCursorHover(s, c, e);
  assert.equal(s.hoverUnit, 12);
  const sel = base({ barMode: 1 });
  stepLegacyCursorHover(sel, c, e);
  assert.equal(sel.hoverUnit, 0);
  c[9][5] = 60;
  stepLegacyCursorHover(sel, c, e);
  assert.equal(sel.hoverUnit, 60, "an enemy under the cursor while a unit is selected");
}
// Nothing near: W = 0, ac = 1000. Building marker or u:Z: W = 0 and ac untouched.
{
  const c = grid(); const e = new Int8Array(10000);
  const s = base({ hoverUnit: 9, acInt: 5 });
  stepLegacyCursorHover(s, c, e);
  assert.deepEqual([s.hoverUnit, s.acInt], [0, 1000]);
  c[9][5] = -12;
  const b = base({ hoverUnit: 9, acInt: 5 });
  stepLegacyCursorHover(b, c, e);
  assert.deepEqual([b.hoverUnit, b.acInt], [0, 5]);
}
// Enemies off the cursor cell count only within distance 13.
{
  const c = grid(); const e = new Int8Array(10000);
  c[8][5] = 70; // 128 away
  const s = base({ barMode: 1 });
  stepLegacyCursorHover(s, c, e);
  assert.equal(s.hoverUnit, 0);
  e[303 + 70] = 13; // 3 px away -> 4
  stepLegacyCursorHover(s, c, e);
  assert.equal(s.hoverUnit, 70);
}

console.log("f.k() cursor hover OK");
