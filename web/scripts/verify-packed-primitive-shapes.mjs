// f.b(int,int,int)'s >= 27 primitive branches (fixed 2026-09-09).
//
// Offsets 263..358 pick a colour from the 3-byte palette at j[17], indexed by
// a 4-bit selector: `((j[20][i] & 255) >> 5) | ((j[21][i] & 128) >> 4)`. The
// port had a hardcoded setColor(0), so every primitive drew black.
//
// CORRECTION (same day): class f has two parallel families here --
// a(III)#439 -> b(III)#535 (what this port models: x/y shifted +11/+8 once at
// entry, the `an` remapping, and the j[17] palette) and
// a(Graphics,III)#436 -> b(Graphics,III)#537 (paint()'s variant: no shift, no
// remapping, a literal setColor(0)). The first version of this file asserted
// the #537 coordinates against the #535 port.
//
// Within #535 the four shape branches use three different helpers:
//   type 27, offsets 368..426: d(#574) -- bare Graphics.drawLine(IIII), called
//     as (x + sx, y + sy, x + width, y + height). Two POINTS, both relative to
//     (x, y).
//   type 28, offsets 434..488: b(#536) -- bare Graphics.drawRect(IIII), called
//     as (x + sx, y + sy, width, height).
//   type 29, offsets 496..556: a(#437) -- fillRect(11 + x, 8 + y, w, h), called
//     with x + sx - 11 and y + sy - 8, so the shift cancels.
//   type 30, offsets 564..632: the same #437, with every value scaled by 4.
//
// The port added +11/+8 to 27 and 28 (which have no such helper) and passed
// width/height as drawLine's second POINT, drawing a line from the sprite back
// toward the canvas origin -- the long diagonal streaks over the tutorial map.
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
  const output = ts.transpileModule(fs.readFileSync(absPath, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const fn = vm.compileFunction(output, ["module", "exports", "require"], { parsingContext: context });
  fn(module, module.exports, (spec) => loadModule(spec, path.dirname(absPath)));
  return module.exports;
}
const { LegacyPackedSpriteRenderer } = loadModule("./render/LegacyPackedSpriteRenderer", srcDir);

const byteTables = Array.from({ length: 25 }, () => new Int8Array(256));
const shortTables = Array.from({ length: 11 }, () => new Int16Array(256));

const INDEX = 5;
byteTables[21][INDEX] = 0x03;  // sx = 3, bit 7 clear -> palette selector bit 3 = 0
byteTables[22][INDEX] = 4;     // sy
byteTables[23][INDEX] = 30;    // width
byteTables[24][INDEX] = 40;    // height
// j[17] palette: selector 1 -> entries 3,4,5.
byteTables[17][3] = 0x12;
byteTables[17][4] = 0x34;
byteTables[17][5] = 0x56;

function render(type) {
  byteTables[20][INDEX] = (1 << 5) | type; // selector 1 in the top bits, type in the low 5
  const calls = [];
  const graphics = {
    setColor: (v) => calls.push(["setColor", v]),
    setColorRgb: (r, g, b) => calls.push(["setColorRgb", r, g, b]),
    drawLine: (...a) => calls.push(["drawLine", ...a]),
    drawRect: (...a) => calls.push(["drawRect", ...a]),
    fillRect: (...a) => calls.push(["fillRect", ...a]),
    drawRegion: (...a) => calls.push(["drawRegion", ...a]),
  };
  const renderer = new LegacyPackedSpriteRenderer({ shortTables, byteTables, imageGroups: [], graphics });
  renderer.drawSprite(INDEX, 100, 200);
  return calls;
}

// The palette lookup runs for every >= 27 type, before the shape branch.
for (const type of [27, 28, 29, 30]) {
  assert.deepEqual(render(type)[0], ["setColorRgb", 0x12, 0x34, 0x56], `type ${type} takes j[17]'s colour`);
}

// b(III)#535 offsets 19..22 shift x/y ONCE at entry (`iinc 2, 11; iinc 3, 8`),
// so with x=100 y=200 every branch works from (111, 208). sx=3, sy=4,
// width=30, height=40.
assert.deepEqual(render(27)[1], ["drawLine", 114, 212, 141, 248], "type 27: two POINTS, both from the shifted origin");
assert.deepEqual(render(28)[1], ["drawRect", 114, 212, 30, 40], "type 28: point plus extent");
assert.deepEqual(render(29)[1], ["fillRect", 114, 212, 30, 40], "type 29: the -11/-8 cancels #437's +11/+8, entry shift survives");
assert.deepEqual(render(30)[1], ["fillRect", 123, 224, 120, 160], "type 30: sx/sy/w/h all scaled by 4");

console.log("f.b(int,int,int) >= 27 primitive shapes OK");
