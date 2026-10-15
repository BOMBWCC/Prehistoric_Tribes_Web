import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import vm from "node:vm";

const file = new URL("../src/j2me/LegacyZTransition.ts", import.meta.url).pathname;
const module = { exports: {} };
const output = ts.transpileModule(fs.readFileSync(file, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
vm.runInNewContext(output, { module, exports: module.exports, Int8Array, Int16Array });
const { stepLegacyZTransition } = module.exports;

const flags = Array.from({ length: 21 }, () => false);
flags[6] = true;
const r = new Int8Array(8);
const packedBytes = new Int8Array(40);
const packedOffsets = new Int16Array(312);
packedOffsets[137] = 20;
packedBytes.set([4, 5, 6], 20);
const raw = { ar: 0, at: 0, as: 2, aX: 1, aW: 3, aY: 0, aZ: 0, l: 8 };
// Z() offsets 280..288 are `getfield b:[Z; getfield ad:B; iconst_1; bastore`
// -- b:[Z (#234), not a:[Z (#123). CORRECTED 2026-09-14: this test used to
// pass a single array and assert flags[ad], which was the port's own bug.
const bFlags = Array.from({ length: 21 }, () => false);
let ai = 0;
stepLegacyZTransition({
  flags, bFlags, r, packedBytes, packedOffsets, raw, qByte: 1, aiByte: 10,
  adByte: 1, aU: 4, aV: 12, pendingP: true, onAI: () => { ai += 1; },
});
assert.equal(raw.ar, 3);
assert.deepEqual(Array.from(r.slice(0, 3)), [4, 5, 6]);
assert.equal(raw.at, 99); assert.equal(raw.aW, 3);
assert.equal(raw.aZ, 36); assert.equal(raw.aY, 106);
assert.equal(raw.l, 0); assert.equal(ai, 1);
assert.equal(bFlags[1], true, "b[ad] = true lands in b:[Z");
assert.equal(flags[1], false, "a:[Z is not written by that instruction");

const untouched = Array.from({ length: 21 }, () => false);
const untouchedB = Array.from({ length: 21 }, () => false);
const second = { ar: 8, at: 0, as: 0, aX: 0, aW: 0, aY: 0, aZ: 0, l: 0 };
stepLegacyZTransition({
  flags: untouched, bFlags: untouchedB, r: new Int8Array(3), packedBytes, packedOffsets, raw: second,
  qByte: 0, aiByte: 0, adByte: 1, aU: 4, aV: 12, pendingP: false,
});
assert.equal(second.ar, 8); assert.equal(second.at, 0);
assert.equal(untouchedB.some(Boolean), false, "offsets 0..28 return before the b[ad] write");

console.log("f.Z() raw transition prefix OK");
