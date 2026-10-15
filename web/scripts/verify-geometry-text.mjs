import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";

const cache = new Map();
function loadModule(path) {
  if (cache.has(path)) return cache.get(path).exports;
  const module = { exports: {} };
  cache.set(path, module);
  const output = ts.transpileModule(fs.readFileSync(path, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const localRequire = (specifier) => loadModule(`${path.slice(0, path.lastIndexOf("/"))}/${specifier.replace("./", "")}.ts`);
  vm.runInNewContext(output, { module, exports: module.exports, require: localRequire, Int8Array, Int16Array });
  return module.exports;
}

const root = new URL("../src/j2me/", import.meta.url).pathname;
const { LegacyResourceTables } = loadModule(`${root}LegacyResourceTables.ts`);
const { LegacyGeometryDecoder } = loadModule(`${root}LegacyGeometryDecoder.ts`);
const tables = new LegacyResourceTables();
tables.smallOffsets[228] = 40;
tables.smallBytes.set([31, 126, 97], 40);
const packed = new Int8Array(17638);
const offsets = new Int16Array(312);
offsets[280] = 100;
packed[100 + 65] = 31;
packed[100 + 66] = 126;
packed[100 + 67] = 97;
const decoder = new LegacyGeometryDecoder(packed, offsets, tables);
decoder.setTableByte(0);
const row = decoder.queueText(10, 0, "ABC", 1);
assert.equal(row, 0);
assert.deepEqual([...tables.smallBytes.slice(40, 43)], [31, 126, 97]);
assert.equal(tables.smallOffsets[229], 43);
// c.b() (2026-09-28): a pending hit-point-mirror value becomes a floating
// "-7" text in ring row 13 + b:B, only on the entity's own third frame.
{
  const t = new LegacyResourceTables();
  t.smallOffsets[228] = 40;
  const p = new Int8Array(17638);
  const o = new Int16Array(312);
  o[280] = 100;
  const d = new LegacyGeometryDecoder(p, o, t);
  t.rowFByte[5] = -7;
  d.stepFloatingTexts(4);            // 5 % 3 != 4 % 3: not its turn
  assert.equal(t.rowFByte[5], -7);
  d.stepFloatingTexts(5);
  assert.equal(t.rowFByte[5], 0);
  assert.equal(t.rowFShort[13], 5); // attached to entity 5
  assert.equal(t.rowEByte[13], 1);  // style 1: our unit, a loss
  assert.equal(t.cBByte, 1);
  // Ageing: the rise grows e += e/4 + 1 until 15, then the row is freed.
  let n = 0;
  while (t.cCByte === 0 && n < 20) { d.stepFloatingTexts(0); n += 1; }
  assert.equal(t.rowFShort[13], 0);
  assert.equal(t.cCByte, 1);
  assert.ok(n > 3 && n < 12);
}
console.log("c.a(int,int,int,String,int) text-to-geometry boundary OK");
