import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";

const path = `${new URL("../src/platform/BinaryResource.ts", import.meta.url).pathname}`;
const output = ts.transpileModule(fs.readFileSync(path, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(output, { module, exports: module.exports, Uint8Array, Int8Array, Int16Array });
const { decodeShortTableB } = module.exports;
const bytes = new Uint8Array(312 * 2 + 570 * 2 + 10);
let cursor = 0;
for (let record = 0; record < 312; record += 1) { bytes[cursor] = 0; bytes[cursor + 1] = 0; cursor += 2; }
const lengths = [2, 2, 2, 2, 2];
for (let section = 0; section < 5; section += 1) {
  bytes[cursor] = lengths[section]; bytes[cursor + 1] = 0; cursor += 2;
  for (let index = 0; index < lengths[section]; index += 1) {
    bytes[cursor] = 0x12 + section; bytes[cursor + 1] = 0x34 + section + index; cursor += 2;
  }
}
const decoded = decodeShortTableB(bytes);
// e.f() reads each element LITTLE-endian (offsets 260..303): `lo = read() & 255`
// then `(short)(((read() & 255) << 8) + lo)`. This case used to expect the bytes
// in the other order (0x1234 for a 0x12,0x34 pair), which is the byte-swap fixed
// on 2026-09-04 -- see decodeShortTableB's own docblock.
assert.deepEqual(Array.from(decoded.shortTableB.slice(0, 5)), [0x3412, 0x3512, 0x3513, 0x3613, 0x3614]);
assert.deepEqual(Array.from(decoded.shortTableBOffsets), [0, 2, 4, 6, 8]);
assert.equal(decoded.sourceCursor, cursor);
const original = new Uint8Array(fs.readFileSync(new URL("../public/assets/a", import.meta.url)));
const originalDecoded = decodeShortTableB(original);
assert.equal(originalDecoded.shortTableB.length, 570);
assert.equal(originalDecoded.sourceCursor, original.length);
// The real /a table is f.b:[S], the dense-array stride table f.a(int,int,int,int,byte)
// indexes with `dense[b[Y] + aq]`. Byte-swapped it decoded as noise
// (25856/-13824/12033/...); correctly it is a plain 101-stride run.
assert.deepEqual(Array.from(originalDecoded.shortTableB.slice(0, 8)), [0, 101, 202, 303, 404, 505, 606, 707]);
assert.equal(originalDecoded.shortTableB[29], 2929);
console.log("e.f() f.b[S] five-section loader OK");
