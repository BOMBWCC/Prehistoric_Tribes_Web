import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";

const cache = new Map();
function loadModule(path) {
  if (cache.has(path)) return cache.get(path).exports;
  const module = { exports: {} };
  cache.set(path, module);
  const source = fs.readFileSync(path, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const localRequire = (specifier) => loadModule(`${path.slice(0, path.lastIndexOf("/"))}/${specifier.replace("./", "")}.ts`);
  vm.runInNewContext(output, { module, exports: module.exports, require: localRequire });
  return module.exports;
}

const root = new URL("../src/j2me/", import.meta.url).pathname;
const { LegacyResourceTables } = loadModule(`${root}LegacyResourceTables.ts`);
const { LegacyGeometryDecoder } = loadModule(`${root}LegacyGeometryDecoder.ts`);
const tables = new LegacyResourceTables();
tables.smallOffsets[0] = 0;
tables.smallOffsets[1] = 3;
tables.smallBytes.set([31, 126, 97], 0);
const callbacks = [];
const decoder = new LegacyGeometryDecoder(new Int8Array(17638), new Int16Array(312), tables, {
  onRecord97: (...args) => callbacks.push(args),
});
decoder.setTableByte(0);
decoder.decodeRecord(10, 0, 0, 0, 0);
if (tables.geometryC[0][0] !== 1 || tables.geometryB[0][0] !== 1) throw new Error("31 quotient/remainder mismatch");
if (tables.geometryC[0][1] !== 126) throw new Error("126 marker mismatch");
if (tables.geometryC[0][2] !== 3 || tables.geometryB[0][2] !== 7) throw new Error("97 quotient/remainder mismatch");
// Offsets 452..487 test the record argument (local 4), not the bytes: a 97 byte draws nothing...
if (callbacks.length !== 0) throw new Error("byte 97 must not draw the emblems");
// ...record 97 draws composites 1041 at x 26 and 1047 at x 211, at y - 2.
tables.smallOffsets[97] = 0;
tables.smallOffsets[98] = 1;
decoder.setTableByte(0);
decoder.decodeRecord(10, 40, 0, 97, 0);
if (callbacks.length !== 1 || callbacks[0].join(",") !== "1041,26,1047,211,38") throw new Error("record 97 callback mismatch");

// c.a(int,int,int,int,int) offsets 163..449: total width d[h] for centring.
// Glyph widths come from a[a_s[281 + value] + q*21 + r + 1] - a[... + r].
// Counted when q != 0 or r < 14; '~' (126) subtracts 2*value + 2; no extra +1.
{
  const packed = new Int8Array(17638);
  const offsets = new Int16Array(312);
  offsets[281 + 2] = 100;
  for (let i = 0; i < 40; i += 1) packed[100 + i] = i * 3; // every glyph is 3 wide
  const t = new LegacyResourceTables();
  t.smallOffsets[0] = 0;
  t.smallOffsets[1] = 5;
  // 1 (q0 r1: counted), 15 (q0 r15: not counted), 31 (q1 r1: counted), 126, 2 (counted)
  t.smallBytes.set([1, 15, 31, 126, 2], 0);
  const d = new LegacyGeometryDecoder(packed, offsets, t, {});
  d.setTableByte(0);
  d.decodeRecord(100, 0, 1, 0, 2);
  // (5-1)*2 + 3 glyphs * 3 - (2*2 + 2) = 8 + 9 - 6 = 11; centred: 100 - 11/2 = 95
  if (t.rowDShort[0] !== 11) throw new Error(`width ${t.rowDShort[0]} != 11`);
  if (t.rowFShort[0] !== 95) throw new Error(`x ${t.rowFShort[0]} != 95`);
}
console.log("compact geometry decoder OK");
