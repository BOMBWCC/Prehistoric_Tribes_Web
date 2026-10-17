// The map overview (Q 19): f.C() / f.D() / f.e(int,int) -- LegacyMapOverview.ts.
import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";
import path from "node:path";

const srcDir = new URL("../src/", import.meta.url).pathname;
const context = vm.createContext({ Int8Array, Int16Array, Int32Array, Array, Math });
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
const { legacyMapOverviewColor, drawLegacyMapOverview, stepLegacyMapOverviewScroll } = loadModule("./render/LegacyMapOverview", srcDir);

const recorder = (name, log) => ({
  setColor: (c) => log.push([name, "color", c]),
  fillRect: (...a) => log.push([name, "fill", ...a]),
  drawRegion: (img, ...a) => log.push([name, "region", img.id, ...a]),
  drawImage: (img, ...a) => log.push([name, "image", img.id, ...a]),
});

const make = (log) => {
  const colors = [Int32Array.from({ length: 12 }, (_, i) => 100 + i), Int32Array.from({ length: 12 }, (_, i) => 200 + i)];
  const packedBytes = new Int8Array(2000);
  const packedOffsets = new Int16Array(400);
  packedOffsets[194] = 1000;
  packedBytes[1000 + 3] = 2; // terrain 3 -> palette index 2
  packedOffsets[148] = 1100;
  const shortTables = [new Int16Array(1300), new Int16Array(1300)];
  shortTables[1][1181] = 50; // panel sprite record 50, no dy bits
  const byteTables = Array.from({ length: 25 }, () => new Int8Array(1300));
  byteTables[1][1181] = -100;
  byteTables[2][1181] = -70;
  byteTables[23][50] = 44;
  byteTables[24][50] = 40;
  return {
    graphics: [recorder("g0", log), recorder("g1", log), recorder("g2", log), recorder("g3", log)],
    images: [{ id: "i0" }, { id: "i1" }, { id: "i2" }, { id: "i3" }],
    imageSlots: new Int8Array([0, 1]),
    packedBytes, packedOffsets, shortTables, byteTables, colors,
    gridC: Array.from({ length: 4 }, () => new Int8Array(4)),
    gridB: Array.from({ length: 4 }, () => new Int8Array([3, 3, 3, 3])),
    dense: new Int8Array(10000),
    occupancyClass: () => 0,
    drawSprite: (gi, rec, x, y) => log.push([`g${gi}`, "sprite", rec, x, y]),
    mapWidth: 3, mapHeight: 2, W: 0, X: 0, aL: 5, af: 0, ag: 0,
    size: { aM: 0, aN: 0 },
  };
};

// e(int,int) offsets 0..189.
{
  const input = make([]);
  assert.equal(legacyMapOverviewColor({ ...input, occupancyClass: () => 2 }, 0, 0), 6049325, "unexplored");
  assert.equal(legacyMapOverviewColor(input, 0, 0), 102, "terrain via t194");
  input.gridC[0][1] = 7; // own unit
  assert.equal(legacyMapOverviewColor(input, 1, 0), 106);
  input.gridC[0][2] = 60; // enemy unit
  assert.equal(legacyMapOverviewColor(input, 2, 0), 107);
  input.dense[7979 + 60] = 2; // hidden enemy: terrain colour
  assert.equal(legacyMapOverviewColor(input, 2, 0), 102);
  input.gridC[1][0] = -5; // own record
  input.gridC[1][1] = -40; // enemy record
  assert.equal(legacyMapOverviewColor(input, 0, 1), 109);
  assert.equal(legacyMapOverviewColor({ ...input, occupancyClass: () => 1 }, 1, 1), 210);
}

// C(): panel sprite into Graphics[1] at (-11,-8), then one run per same-colour span.
{
  const log = [];
  const input = make(log);
  input.gridC[1][2] = 7; // row 1: terrain, terrain, own unit
  drawLegacyMapOverview(input);
  assert.deepEqual(input.size, { aM: 3, aN: 2 });
  assert.deepEqual(log, [
    ["g1", "sprite", 50, -11, -8],
    ["g1", "color", 102], ["g1", "fill", 0, 20, 15, 4],
    ["g1", "color", 102], ["g1", "fill", 0, 24, 10, 4],
    ["g1", "color", 106], ["g1", "fill", 10, 24, 5, 4],
  ]);
}

// D(), scrolling right (af 1): shift through Image[c[0]], then paint the last column.
{
  const log = [];
  const input = make(log);
  input.size.aM = 3;
  input.size.aN = 2;
  input.af = 1;
  input.packedBytes[1100 + 2] = 1; // t148[af + 1]
  stepLegacyMapOverviewScroll(input);
  assert.deepEqual(log.slice(0, 3), [
    ["g0", "sprite", 50, 120 - 100 + 11, 160 - 70 + 8],
    ["g0", "region", "i1", 5, 0, 44 * 5 - 5 - 44, 40 * 5 - 32, 0, 131 - 100, 168 - 70, 0],
    ["g1", "image", "i0", -(120 - 100 + 11), -(160 - 70 + 8), 0],
  ]);
  assert.deepEqual(log.slice(3), [
    ["g1", "color", 11180356], ["g1", "fill", 10, 0, 5, 240],
    ["g1", "color", 102], ["g1", "fill", 10, 20, 5, 4],
    ["g1", "color", 102], ["g1", "fill", 10, 24, 5, 4],
  ]);
}

console.log("map overview C()/D()/e(int,int) OK");
