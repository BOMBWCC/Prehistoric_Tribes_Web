import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import vm from "node:vm";

const file = new URL("../src/j2me/LegacyZCommandConsumer.ts", import.meta.url).pathname;
const module = { exports: {} };
const output = ts.transpileModule(fs.readFileSync(file, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
vm.runInNewContext(output, { module, exports: module.exports, Int8Array, Int16Array, Int32Array, Math, String });
const { consumeLegacyZCommand } = module.exports;

const e = new Int8Array(9200); const packedBytes = new Int8Array(700); const packedOffsets = new Int16Array(312); packedOffsets[138] = 20; packedOffsets[283] = 40;
// CORRECTED 2026-09-14: the value rows are `(10 + i) * 26 + v` (f.j(int)
// offsets 102..113: bipush 10; iload i; iadd; bipush 26; imul). This fixture
// used to sit at `10 + 0 * 26 + 14`, the port's own mis-bracketed index.
packedBytes[20 + 468 + 14] = 3; packedBytes[20 + (10 + 0) * 26 + 14] = 9; packedBytes[40 + 2] = 4;
e[8749 + 2] = 14;
const jTables = [new Int8Array(1200), new Int8Array(1200), new Int8Array(1200), new Int8Array(1200)]; jTables[3][1119] = 64;
const state = { r: new Int8Array([16]), as: 0, ad: 0, q: 2, e, packedBytes, packedOffsets, jTables, d: new Int32Array(12), aF: 42, aI: 600, aJ: 30, aK: 40 };
const sprites = []; const texts = [];
consumeLegacyZCommand(state, 1119, { onSprite: (...args) => sprites.push(args), onText: (...args) => texts.push(args) });
assert.deepEqual(sprites, [[627, 23, 36]]); assert.deepEqual(texts, [[49, 36, 1, "9", 0]]);

const fallback = { ...state, r: new Int8Array([0]), d: new Int32Array(12), aF: 43 };
let defaultSprite;
consumeLegacyZCommand(fallback, 1074, { onDefaultSprite: (...args) => { defaultSprite = args; } });
assert.deepEqual(defaultSprite, [602, 30, 40]); assert.equal(fallback.aF, 2);

// Build-submenu cost float for the Store, against KEmulator ground truth
// (user, 2026-09-14): "25 / 20". ad === 6 keeps v = r[as] = 6; rows 10/11/12
// at column 6 hold 25 / 20 / 0, so two icons are drawn and the third skipped.
{
  const pb = new Int8Array(700);
  pb[20 + 468 + 6] = 2;              // width
  pb[20 + (10 + 0) * 26 + 6] = 25;   // 266
  pb[20 + (10 + 1) * 26 + 6] = 20;   // 292
  pb[20 + (10 + 2) * 26 + 6] = 0;    // 318, skipped
  pb[40 + 2] = 4;                    // step
  // Sentinels where the old mis-bracketed index would have read.
  pb[20 + 10 + 0 * 26 + 6] = 99;
  pb[20 + 10 + 1 * 26 + 6] = 98;
  const store = { r: new Int8Array([6]), as: 0, ad: 6, q: 0, e: new Int8Array(9200), packedBytes: pb, packedOffsets, jTables, d: new Int32Array(12), aF: 0, aI: 0, aJ: 30, aK: 40 };
  const spritesStore = []; const textsStore = [];
  consumeLegacyZCommand(store, 1119, { onSprite: (...a) => spritesStore.push(a), onText: (...a) => textsStore.push(a) });
  // x = aK - trunc(step * (width - 1) / 2) + (step + 2) * used = 38, 44
  assert.deepEqual(spritesStore, [[627, 23, 38], [628, 23, 44]]);
  assert.deepEqual(textsStore, [[49, 38, 1, "25", 0], [49, 44, 1, "20", 0]]);
}

console.log("f.j(int) raw command consumer OK");
