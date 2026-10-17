// f.aN()'s /ma tile stream is run-length encoded, and the run counter's reset
// is what makes it so (fixed 2026-09-09).
//
// Offsets 145..252 of aN():
//   145..165  if (counter < a[a_s[197] + 0 + tableIndex]) skip the read
//   168..205  tile = v[h[a[a_s[248] + q]] + cursor] & 255; cursor++
//   208..248  if (tile >= 250) { counter = 0;                 <-- offsets 215..216
//                                tableIndex = tile - 250;
//                                tile = a[a_s[197] + 6 + tableIndex] & 255; }
//   249       counter++
//
// The port had every line of that EXCEPT `counter = 0`. Without it the counter
// only ever grows, `counter >= threshold` stays true after the first read, and
// the stream is consumed one byte per cell -- the map decoded as garbage.
// Nothing in the suite covered the run path, so nothing caught it; this file
// exists to cover exactly that.
import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";

const path = `${new URL("../src/sim/world/LegacyMapRleDecoder.ts", import.meta.url).pathname}`;
const output = ts.transpileModule(fs.readFileSync(path, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(output, { module, exports: module.exports, Int8Array, Int16Array, Uint8Array, Number, RangeError });
const { decodeLegacyMapTiles } = module.exports;

const packedBytes = new Int8Array(512);
const packedOffsets = new Int16Array(312);

// 4x2 map at mapIndex 1 (neither of aN()'s two hardcoded special cases).
packedOffsets[149] = 100;
packedBytes[100 + 1 * 2] = 4;      // width
packedBytes[100 + 1 * 2 + 1] = 2;  // height

// Section lookup: a[a_s[248] + q] -> h[..] -> the stream base.
packedOffsets[248] = 150;
packedBytes[150 + 1] = 0;

// Threshold table at a_s[197]: [0] is the run length for marker 0, [1] for
// marker 1; +6 holds the tile each marker expands to.
packedOffsets[197] = 200;
packedBytes[200 + 0] = 3;
packedBytes[200 + 1] = 5;
packedBytes[200 + 6 + 0] = 77;
packedBytes[200 + 6 + 1] = 88;

const maBytes = Uint8Array.from([250, 42, 251, 0, 0, 0, 0, 0]);
const result = decodeLegacyMapTiles({ packedBytes, packedOffsets, maBytes, maOffsets: [0] }, 1);

// counter starts at 10, so the first cell always reads.
//   byte 250 -> marker 0: counter = 0, tile = 77, threshold = 3
//     cells 0,1,2 all take 77 (counter 1,2 stay under 3)
//   cell 3: counter 3 >= 3 -> byte 42, a literal tile
//   cell 4: counter 4 >= 3 -> byte 251 -> marker 1: counter = 0, tile = 88,
//     threshold = 5, so cells 4,5,6,7 all take 88
assert.deepEqual([...result.tiles], [77, 77, 77, 42, 88, 88, 88, 88]);
// Three stream bytes for eight cells. Without the reset this is 8 -- the
// decoder degenerates into a raw byte-per-tile copy.
assert.equal(result.bytesConsumed, 3);
assert.equal(result.width, 4);
assert.equal(result.height, 2);
// mapIndex 1 has no dimension override, so the decode and logical pairs agree
// here. They diverge for mapIndex 0 and 5 -- see the next block.
assert.equal(result.logicalWidth, 4);
assert.equal(result.logicalHeight, 2);
assert.equal(result.streamSection, 0);

// aN() offsets 14..115: the table entry goes into BOTH e:S/c:S and f:S/d:S,
// and only c:S/d:S are then overridden. The decode loop (offsets 127..139)
// reads f:S/e:S, so mapIndex 0 decodes at the TABLE size and is only read back
// as 40x32. Decoding it at 40 wide instead sheared every row -- fixed
// 2026-09-09 alongside the run counter above.
{
  const wideBytes = new Int8Array(512);
  const wideOffsets = new Int16Array(312);
  wideOffsets[149] = 100;
  wideBytes[100 + 0] = 6;   // e:S / c:S before the override
  wideBytes[100 + 1] = 3;   // f:S / d:S
  wideOffsets[248] = 150;
  wideBytes[150 + 0] = 0;
  wideOffsets[197] = 200;
  wideBytes[200 + 0] = 100; // one long run covers the whole grid
  wideBytes[200 + 6 + 0] = 12;
  const wide = decodeLegacyMapTiles(
    { packedBytes: wideBytes, packedOffsets: wideOffsets, maBytes: Uint8Array.from([250]), maOffsets: [0] },
    0,
  );
  assert.equal(wide.width, 6, "decode stride is e:S, NOT the 40 override");
  assert.equal(wide.height, 3, "decode row count is f:S, NOT the 32 override");
  assert.equal(wide.logicalWidth, 40, "c:S takes the q === 0 override");
  assert.equal(wide.logicalHeight, 32, "d:S takes the q === 0 override");
  assert.equal(wide.tiles.length, 18, "tiles are laid out at the decode size");
}

console.log("f.aN() /ma run-length decode OK");
