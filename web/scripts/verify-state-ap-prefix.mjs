import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";
import { denseRequire } from "./dense-layout-require.mjs";

const path = `${new URL("../src/ui/LegacyStateMachine.ts", import.meta.url).pathname}`;
const output = ts.transpileModule(fs.readFileSync(path, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(output, { require: denseRequire, module, exports: module.exports, Int8Array, Int16Array, Math });
const { stepLegacyAPPrefix } = module.exports;

const bytes = new Int8Array(17638); const offsets = new Int16Array(312);
// f.aP() offsets 13..26 index the OFFSETS table by q (`a_s[250 + q]`, the
// `iadd` is before the `saload`), while offsets 27..45 index the BYTE table
// (`a[a_s[262] + q]`). This file used to set `offsets[250] = 300` and expect
// `recordBase === 302` for q === 2, i.e. it pinned the port's own
// `packedOffsets[250] + q` bug as spec -- the two shapes agree only at q === 0.
offsets[252] = 302; offsets[262] = 400; offsets[263] = 2; bytes[400 + 2] = 2;
bytes[302] = 4; bytes[303] = 6; bytes[304] = 9; bytes[305] = -1;
bytes[306] = 10; bytes[307] = 20; bytes[308] = 11; bytes[309] = 21; bytes[310] = 12; bytes[311] = 22;
// Row 0: a_s[263] + 11*q*2 + i = 2 + 44 + 0. Row 1: a_s[263] + 11*(q*2 + 1) + i
// = 2 + 55 + 0 (offsets 407..418: the `iconst_1; iadd` is inside the `imul`).
// The row-1 index used to be written `offsets[263] * (11*q*2 + 1)` == 90 here,
// which this file also pinned.
bytes[2 + 44] = 31; bytes[2 + 55] = 32;
const state = { q: 2, bByte: 3, awByte: 7 };
const events = [];
const shortRows = [new Int16Array(30), new Int16Array(30)];
stepLegacyAPPrefix({ state, packedBytes: bytes, packedOffsets: offsets, shortRows, onPlaceFive: (...args) => events.push(["place", ...args]), onCreateRecord: (...args) => events.push(["create", ...args]) });
assert.deepEqual(events, [["place", 4, 9, 10, 11, 12, true, -1], ["create", 0, 20, 21, 22, 3]]);
assert.equal(shortRows[0][0], 31); assert.equal(shortRows[1][0], 640); assert.equal(state.awByte, 7);

const special = { q: 3, bByte: 0, awByte: 9 };
stepLegacyAPPrefix({ state: special, packedBytes: bytes, packedOffsets: offsets, shortRows });
assert.equal(special.awByte, 2);

const zero = { q: 0, bByte: 0, awByte: 0 }; const writes = [];
stepLegacyAPPrefix({ state: zero, packedBytes: bytes, packedOffsets: offsets, shortRows, onDenseWrite: (index, value) => writes.push([index, value]) });
assert.deepEqual(writes, [[7476, 4], [7479, 5]]);

console.log("f.aP() complete raw table loop OK");
