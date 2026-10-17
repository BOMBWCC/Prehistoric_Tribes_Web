import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";
import { denseRequire } from "./dense-layout-require.mjs";

const path = `${new URL("../src/sim/units/LegacyEntityMCalculation.ts", import.meta.url).pathname}`;
const output = ts.transpileModule(fs.readFileSync(path, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(output, { require: denseRequire, module, exports: module.exports, Int8Array, Int16Array });
const { calculateLegacyEntityM } = module.exports;

const state = new Int8Array(10000);
const packedBytes = new Int8Array(2000);
const packedOffsets = new Int16Array(1000);
packedOffsets[16] = 300;
packedOffsets[17] = 400;
packedOffsets[121] = 500;
packedOffsets[19] = 600;
packedOffsets[18] = 700;
packedOffsets[41] = 800;
packedOffsets[138] = 900;

// Shared table-18 tail-bump entry (dense[6565+id]===0 in every test below).
packedBytes[700] = 3;

// Test 1: k3===0, currentK not in {2,4} -- exercises the base po[16]/po[17]
// lookup and confirms currentK!==4 selects k1.
packedBytes[403] = 2; // packedBytes[po[17]+3]
packedBytes[312] = 4; // packedBytes[po[16] + 2 + k1(10)]
assert.equal(
  calculateLegacyEntityM({
    state, packedBytes, packedOffsets, entityId: 3,
    k1: 10, k2: 0, k3: 0, currentK: 3, k0: 3, flag: false, fQ: 0,
  }),
  7, // 4 (base) + 3 (tail bump)
);

// Test 2: currentK===4 must select k2, NOT k1 -- regression for the
// selector-swap bug (offsets 97..110: currentK===4 -> k[2], else -> k[1]).
packedBytes[404] = 5; // packedBytes[po[17]+4]
packedBytes[325] = 50; // packedBytes[po[16] + 5 + k2(20)]
assert.equal(
  calculateLegacyEntityM({
    state, packedBytes, packedOffsets, entityId: 4,
    k1: 999, k2: 20, k3: 0, currentK: 4, k0: 4, flag: false, fQ: 0,
  }),
  50, // if k1 were wrongly selected this would read packedBytes[300+1004], which stays 0
);

// Test 3: currentK===2, k1===6 chain fires (offsets 124..200), overwriting
// the base m with the table-121 lookup.
packedBytes[402] = 1; // packedBytes[po[17]+2]
packedBytes[510] = 8; // packedBytes[po[121] + dense[3535+id](10)]
state[3636 + 10] = 5;
state[3535 + 10] = 10;
assert.equal(
  calculateLegacyEntityM({
    state, packedBytes, packedOffsets, entityId: 10,
    k1: 6, k2: 0, k3: 0, currentK: 2, k0: 2, flag: false, fQ: 0,
  }),
  11, // 8 (table 121) + 3 (tail bump)
);

// Test 4: currentK===2, k1>=12 chain fires (offsets 203..271), forcing
// m=69 -- independent of (sequential after) the k1===6 chain above.
packedBytes[1082] = 20; // packedBytes[po[138] + 182 + dense[9237+k2](0)]
state[8505 + 5] = 25;
assert.equal(
  calculateLegacyEntityM({
    state, packedBytes, packedOffsets, entityId: 11,
    k1: 12, k2: 5, k3: 0, currentK: 2, k0: 2, flag: false, fQ: 0,
  }),
  69, // >9, so the tail bump is skipped
);

// Test 5: k3!==0, `dense[1414+k2]>=12` gate passes -- table-19 lookup with
// the flag adjustment (offsets 304..335).
packedBytes[604] = 6; // packedBytes[po[19] + currentK(5) - 1]
state[1414 + 7] = 15;
assert.equal(
  calculateLegacyEntityM({
    state, packedBytes, packedOffsets, entityId: 12,
    k1: 0, k2: 7, k3: 1, currentK: 5, k0: 5, flag: true, fQ: 0,
  }),
  10, // 6 + 1 (flag) + 3 (tail bump)
);

// Test 6: k3!==0, neither `dense[1414+k2]>=12` nor `currentK===2` -- falls
// back to the literal m=107 (offsets 341..344), which is >9 so no bump.
state[1414 + 8] = 5;
assert.equal(
  calculateLegacyEntityM({
    state, packedBytes, packedOffsets, entityId: 13,
    k1: 0, k2: 8, k3: 1, currentK: 5, k0: 5, flag: false, fQ: 0,
  }),
  107,
);

// Test 7: fQ===3 override -- table-41 lookup on the post-bump m is nonzero,
// forcing m=69 regardless of what came before (offsets 392..429).
packedBytes[303] = 5; // packedBytes[po[16] + 2 + k1(1)]
packedBytes[808] = 1; // packedBytes[po[41] + m(8)]
assert.equal(
  calculateLegacyEntityM({
    state, packedBytes, packedOffsets, entityId: 14,
    k1: 1, k2: 1, k3: 0, currentK: 3, k0: 3, flag: false, fQ: 3,
  }),
  69,
);

// k:B rewritten by a() (8) while k[0] stays 2, k3 != 0, 1414[k2] < 12: offset 295
// reads k[0], so the t19 branch is taken with index k:B - 1 = 7.
{
  const st = new Int8Array(10000); const pb = new Int8Array(2000); const po = new Int16Array(300);
  po[19] = 600; pb[600 + 7] = 5;
  assert.equal(calculateLegacyEntityM({ state: st, packedBytes: pb, packedOffsets: po, entityId: 1,
    k1: 0, k2: 3, k3: 1, currentK: 8, k0: 2, flag: false, fQ: 0 }), 5);
  assert.equal(calculateLegacyEntityM({ state: st, packedBytes: pb, packedOffsets: po, entityId: 1,
    k1: 0, k2: 3, k3: 1, currentK: 8, k0: 8, flag: false, fQ: 0 }), 107, "k[0] != 2 -> 107");
}

console.log("b.a(int,int,boolean) m calculation OK");
