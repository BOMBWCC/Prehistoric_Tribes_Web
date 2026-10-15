import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";

const path = `${new URL("../src/j2me/LegacyMapOverlay.ts", import.meta.url).pathname}`;
const source = fs.readFileSync(path, "utf8");
const output = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(output, { module, exports: module.exports });
const { buildLegacyMapOverlay, applyLegacyMapNeighborPass, isLegacyMapSpecialMarker } = module.exports;
assert.equal(isLegacyMapSpecialMarker(-61), true);
assert.equal(isLegacyMapSpecialMarker(-110), true);
assert.equal(isLegacyMapSpecialMarker(-111), false);
assert.equal(isLegacyMapSpecialMarker(-126), false);

const tiles = Uint8Array.from([1, 175, 180, 2, 3, 4]);
const flags = new Int16Array(256);
const kinds = new Int8Array(256);
flags[1] = 0;
kinds[1] = 0;
kinds[2] = 0;
kinds[3] = 0;
kinds[4] = 0;
const packedBytes = new Int8Array(256);
const packedOffsets = new Int16Array(312);
packedOffsets[110] = 40;
packedBytes[41] = 9;
const special = [];
const result = buildLegacyMapOverlay({
  width: 3,
  height: 2,
  tiles,
  tileFlags: flags,
  tileKinds: kinds,
  mapIndex: 0,
  packedBytes,
  packedOffsets,
  onSpecialTile: (...args) => special.push(args),
});
assert.deepEqual([...result.values], [-126, -126, -126, -126, -126, -126]);
assert.deepEqual(special, [[1, 1, 0, 9]]);
const noSpecial = buildLegacyMapOverlay({
  width: 3,
  height: 3,
  tiles: Uint8Array.from([1, 1, 1, 1, 175, 1, 1, 1, 1]),
  tileFlags: flags,
  tileKinds: kinds,
  mapIndex: 3,
});
// f.aN() offsets 304..315 mark `tile >= 175 || flag === 1` and clear
// otherwise. Tile 175 at the interior cell (1,1) is therefore -126. This line
// used to assert 0, which is what the INVERTED condition produced -- the test
// pinned the bug (see LegacyMapOverlay.ts's 2026-09-09 fix).
assert.equal(noSpecial.values[4], -126);
// The other half of the same condition, and the one that actually mattered in
// play: an ordinary low-numbered tile with flag 0, away from the border rows/
// column, must stay 0 -- i.e. placeable. Under the inverted condition every
// such cell became -126, which blocked most of the tutorial's starting units
// out of gridC and rejected the tent's footprint outright.
assert.equal(noSpecial.values[3], 0);
const neighborTiles = Uint8Array.from([33, 1, 34, 1, 1]);
const neighborOverlay = new Int8Array([0, -61, 0, 0, 0]);
const denseState = new Int8Array(9983);
// Cell -61 is node slot 0: its kind lives at 9833 + 0 (aN() offsets 572..595).
denseState[9833] = 5;
// (stride, rows, columns, ...) since 2026-09-09: aN()'s second loop bounds
// itself with the LOGICAL d:S/c:S while indexing at the DECODE stride e:S.
applyLegacyMapNeighborPass(5, 1, 5, neighborTiles, neighborOverlay, denseState);
assert.equal(neighborOverlay[0], -127);
assert.equal(neighborOverlay[2], -127);
console.log("f.aN raw map overlay pass OK");
