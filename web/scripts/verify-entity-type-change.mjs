import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";
import { denseRequire } from "./dense-layout-require.mjs";

const path = `${new URL("../src/sim/units/LegacyEntityTypeChange.ts", import.meta.url).pathname}`;
const output = ts.transpileModule(fs.readFileSync(path, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(output, { require: denseRequire, module, exports: module.exports, Int8Array, Int16Array });
const { changeLegacyEntityType, deriveLegacyEntityB } = module.exports;

const state = new Int8Array(5000);
const packedBytes = new Int8Array(1000);
const packedOffsets = new Int16Array(200);
const shortTableB = new Int16Array(20);
const shortTableBOffsets = new Int16Array(20);
const bFields = { B: 0 };
packedOffsets[38] = 100; packedOffsets[32] = 200;
// BUG FIX (2026-09-04): these were seeded into shortTableBOffsets (c:[S] #142,
// the 5-entry section table). b.a(int,byte) offsets 83 and 150 both read
// b:[S] (#132, 570 entries) -- the port had the twin tables swapped, and this
// case's seeding hid it. shortTableBOffsets is left zeroed on purpose now: if
// the swap ever comes back, both assertions below drop to 7.
shortTableB[3] = 300; shortTableB[4] = 400;
packedBytes[100 + 6] = 3; packedBytes[200 + 6] = 4;
state[1111 + 7] = 0x73;
state[404 + 7] = 9;
state[2828 + 7] = 2;
state[300 + 7] = 8;
state[400 + 7] = 5;
let cCalls = 0;
const result = changeLegacyEntityType({ state, packedBytes, packedOffsets, shortTableB, shortTableBOffsets, entityId: 7, type: 6, fields: bFields, onC: () => { cCalls += 1; } });
// Offsets 145..171: 3838 = dense[b[t32[type]] + id] = state[400 + 7]. CORRECTED
// 2026-09-15: this used to expect 12 (the port's extra `+ id`).
assert.equal(result, 5);
assert.equal(state[404 + 7], 0);
assert.equal(state[1111 + 7], 3);
assert.equal(cCalls, 1);

packedBytes[100 + 8] = -3;
packedBytes[200 + 8] = 4;
state[2828 + 7] = 6;
changeLegacyEntityType({ state, packedBytes, packedOffsets, shortTableB, shortTableBOffsets, entityId: 7, type: 8, fields: bFields, onC: () => { cCalls += 1; } });
assert.equal(state[3838 + 7], 5);
assert.equal(deriveLegacyEntityB({ state, packedBytes, packedOffsets, shortTableB }, 7, 8), 8);
assert.equal(bFields.B, 8); // a(int,byte) offsets 67/95 store B:I

// Offset 11 jumps to 114 when the type is unchanged: 3838 is still rewritten, nothing else is.
state[400 + 7] = 9;
state[404 + 7] = 4;
changeLegacyEntityType({ state, packedBytes, packedOffsets, shortTableB, shortTableBOffsets, entityId: 7, type: 8, fields: bFields, onC: () => { cCalls += 1; } });
assert.equal(state[3838 + 7], 9);
assert.equal(state[404 + 7], 4);

// Types 83..85 never call C(), even when t38 is negative.
packedBytes[100 + 84] = -3;
const before = cCalls;
changeLegacyEntityType({ state, packedBytes, packedOffsets, shortTableB, shortTableBOffsets, entityId: 7, type: 84, fields: bFields, onC: () => { cCalls += 1; } });
assert.equal(cCalls, before);

console.log("b.a(int,byte) entity type change OK");
