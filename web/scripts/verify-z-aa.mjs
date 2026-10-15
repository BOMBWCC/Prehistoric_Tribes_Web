import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import vm from "node:vm";

const file = new URL("../src/j2me/LegacyZAa.ts", import.meta.url).pathname;
const module = { exports: {} };
const output = ts.transpileModule(fs.readFileSync(file, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
vm.runInNewContext(output, { module, exports: module.exports, Int8Array, Int16Array, Math });
const { stepLegacyZAa } = module.exports;

const make = (mode) => {
  const e = new Int8Array(9200); e[8749 + 4] = mode; e[9115 + 4] = 2;
  const packed = new Int8Array(900); const packedOffsets = new Int16Array(200);
  packedOffsets[143] = 100; packedOffsets[144] = 200;
  const tiles = [[new Int8Array(20), new Int8Array(20)]]; tiles[0][1][11] = 4;
  const a2dByte = [new Int8Array(8)]; const a2dShort = [new Int16Array(12)];
  return { e, packed, packedOffsets, tiles, a2dByte, a2dShort, s: new Int8Array(16), r: new Int8Array(16), q: 4, k: 0, F: -1, au: 0, av: 0, at: 9, ar: 0 };
};

// mode 0: no row crosses the av threshold (row>=6) -- av stays -1.
const normal = make(0);
normal.packed[201] = 0; normal.packed[202] = 2; normal.packed[100] = 1; normal.packed[101] = 3;
normal.tiles[0][1][1] = 7; normal.tiles[0][1][3] = 8;
stepLegacyZAa(normal);
assert.deepEqual(Array.from(normal.r.slice(0, normal.ar)), [1, 3]);
assert.deepEqual(Array.from(normal.s.slice(0, normal.ar)), [7, 8]);
assert.equal(normal.av, -1);
assert.equal(normal.at, 9);

// mode 0: a row crosses the threshold mid-loop -- av = value - sectionStart
// at that exact point (not row - section, and not tied to ar).
const thresholded = make(0);
thresholded.e[9115 + 4] = 3; // section = 2
thresholded.packed[202] = 5; thresholded.packed[203] = 8; // sectionStart=5, sectionEnd=8
thresholded.packed[105] = 2; thresholded.packed[106] = 9; thresholded.packed[107] = 4;
thresholded.tiles[0][1][2] = 10; thresholded.tiles[0][1][9] = 11; thresholded.tiles[0][1][4] = 12;
stepLegacyZAa(thresholded);
assert.deepEqual(Array.from(thresholded.r.slice(0, thresholded.ar)), [2, 9, 4]);
assert.deepEqual(Array.from(thresholded.s.slice(0, thresholded.ar)), [10, 11, 12]);
assert.equal(thresholded.av, 1);
assert.equal(thresholded.at, 9);

const six = make(6); six.k = 2; six.e[3636 + 2] = 1; six.at = 3; six.a2dShort[0][3] = 25; six.a2dShort[0][5] = 4; six.a2dShort[0][7] = 6;
stepLegacyZAa(six);
assert.deepEqual(Array.from(six.r.slice(0, six.ar)), [29, 0, 1, 2]);
assert.deepEqual(Array.from(six.s.slice(0, six.ar)), [0, 4, 3, 6]);
assert.equal(six.a2dShort[0][6], 3);

const eight = make(8); eight.e[9115 + 4] = 3; stepLegacyZAa(eight);
assert.deepEqual(Array.from(eight.r.slice(0, eight.ar)), [19, 20, 21, 22, 23, 24]);

console.log("f.aa() raw candidate builder OK");

// Overflow/hang regression (2026-09-03, array-bounds-loop-terminator sweep,
// same class of bug as composeLegacyC's `1d926c8` fix): real Java's `au`
// is `f`'s own byte field (`au:B`, #224, confirmed via bytecode/f-javap.txt
// offset 16..53's raw `getfield #224 // Field au:B`), incremented as
// `au=(byte)(au+1)`, and read DIRECTLY as `tiles[0][au][11]` with no added
// base offset -- so the instant `au` wraps to -128 (or reaches
// `tiles[0]`'s real length, whichever comes first), Java's `aaload` throws
// ArrayIndexOutOfBoundsException uncaught (`aa()` itself has no bytecode
// try/catch). `f.Z()` (the sole caller) wraps its entire body and silently
// swallows that. Plain JS array indexing has neither guarantee: an
// out-of-bounds `tiles[0][au]` read used to return `undefined`,
// `?.[11]` degraded that to `undefined`, and `undefined !== state.q` was
// true forever -- confirmed via `git stash` + `timeout 8s` that this exact
// case hangs against the pre-fix code (no row in `tiles[0]` ever matches
// `q`, so `au` walked straight past the array with no explicit bound).
{
  const e = new Int8Array(9200); e[8749 + 4] = 0; e[9115 + 4] = 2;
  const packed = new Int8Array(900); const packedOffsets = new Int16Array(200);
  packedOffsets[143] = 100; packedOffsets[144] = 200;
  // No row's [11] ever equals q=4 -- au must walk off the end of tiles[0].
  const tiles = [[new Int8Array(20), new Int8Array(20), new Int8Array(20)]];
  const state = {
    e, packed, packedOffsets, tiles, a2dByte: [new Int8Array(8)], a2dShort: [new Int16Array(12)],
    s: new Int8Array(16), r: new Int8Array(16), q: 4, k: 0, F: -1, au: 0, av: 0, at: 9, ar: 0,
  };
  assert.throws(
    () => stepLegacyZAa(state),
    /out of bounds/,
    "stepLegacyZAa must abort once its tiles[0] row scan overflows, not spin forever",
  );
}

console.log("f.aa() au-scan overflow regression OK");
