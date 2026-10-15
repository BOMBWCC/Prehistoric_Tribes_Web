import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import vm from "node:vm";

const file = new URL("../src/j2me/LegacyZhText.ts", import.meta.url).pathname;
const output = ts.transpileModule(fs.readFileSync(file, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(output, { module, exports: module.exports, Map, Set, Array, Math });
const { tokenizeZh, wrapZh, tokensWidth, ZhStrings } = module.exports;
const plain = (value) => JSON.parse(JSON.stringify(value));

// /a[280]-like table: 'A'/'a' -> 0, '(' -> 0 (missing from the font), '&' -> 127, ' ' -> 42, ',' -> 73, '1' -> 61.
const table = { 65: 0, 97: 0, 40: 0, 41: 0, 38: 127, 32: 42, 44: 73, 49: 61, 3: 93 };
const translate = (code) => table[code] ?? 5;

// ASCII the font has stays a marker; what it lacks (mapped to 0, not 'A') and CJK become text.
assert.deepEqual(plain(tokenizeZh("A(中1&", translate)), [{ marker: 0 }, { text: "(" }, { text: "中" }, { marker: 61 }, { marker: 127 }]);
assert.deepEqual(plain(tokenizeZh("\u0003", translate)), [{ marker: 93 }]);

// Glyph widths: every marker 6 px wide in font 0 (t281[0] = 0, entries 0, 6, 12, ...).
const packedBytes = new Int8Array(200);
for (let i = 0; i < 100; i += 1) packedBytes[i] = (i * 6) & 0x7f;
const tables = { packedBytes, packedOffsets: new Int16Array(312) };
const textWidth = (text) => 12 * Array.from(text).length;

assert.equal(tokensWidth(tables, 0, tokenizeZh("中文", translate), textWidth), 24);
assert.equal(tokensWidth(tables, 0, [{ marker: 93 }], textWidth), 15, "an icon is 15 wide");

// 127 forces a break; a closing mark never starts a line; centring widths drop trailing spaces.
const lines = wrapZh(tables, 0, tokenizeZh("一二三，四&五 ", translate), 36, textWidth);
assert.deepEqual(plain(lines.map((line) => line.tokens.map((t) => t.text ?? t.marker).join("|"))), ["一|二", "三|，|四", "五|42"]);
assert.deepEqual(plain(lines.map((line) => line.width)), [24, 36, 12]);

// Records equal to the original (names) and blank pages give null; /d0 starts at large record 71.
const strings = new ZhStrings({
  s: [{ i: 0, en: "hut", zh: "小屋" }, { i: 1, en: "Mumbo", zh: "Mumbo" }],
  t: [{ i: 0, en: "yes", zh: "是" }],
  d0: [{ i: 0, en: "", zh: "" }, { i: 1, en: "story", zh: "故事" }],
});
assert.equal(strings.label(0), "小屋");
assert.equal(strings.label(1), null);
assert.equal(strings.paragraph(0), "是");
assert.equal(strings.paragraph(71), null);
assert.equal(strings.paragraph(72), "故事");
console.log("Chinese text tokens, wrap and strings OK");
