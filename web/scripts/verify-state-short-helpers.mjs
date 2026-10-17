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
const {
  stepLegacyAr, stepLegacyAs, stepLegacyAt, stepLegacyAu, stepLegacyAv,
  stepLegacyAw, stepLegacyAx, stepLegacyAy, stepLegacyAz, stepLegacyAA,
} = module.exports;

const bytes = new Int8Array(17638);
const offsets = new Int16Array(312);
offsets[151] = 200; offsets[152] = 300; offsets[153] = 100;
offsets[248] = 800; offsets[249] = 900; offsets[112] = 1000;
bytes[300 + 12] = 0; bytes[200 + 0] = 2;
bytes[900 + 2 - 25] = 0; bytes[800] = 4;

const ar = { vInt: 58, Q: 1, U: 5, Z: 9, c: 0, g: 0, T: 1, q: 8, R: 0, eByte: 0, ac: false, pByte: 0, s: 0, t: 0, H: false };
stepLegacyAr({ state: ar });
assert.deepEqual(ar, { ...ar, T: 0, Q: 22, vInt: 69, R: 29 });

const as = { Z: 1, eByte: 0, lInt: 0 };
stepLegacyAs({ state: as, packedBytes: bytes, packedOffsets: offsets });
// Offsets 24..65: the MUSIC row (a[151] + a[a[152] + 12] + 1) gets 17 + e/2.
assert.equal(as.eByte, 2); assert.equal(bytes[200 + 0 + 1], 18);

const at = { Z: 6, b: 0, c: 0, q: 2, Q: 4, d: 0, r: 0, V: 8, vInt: 0, pByte: 1, s: 4, R: 0, H: false };
stepLegacyAt({ state: at });
assert.equal(at.Q, 16); assert.equal(at.b, 3); assert.equal(at.Z, 0);

const au = { Q: 4, Z: 0, q: 9, s: 0, vInt: 0, pByte: 1, T: 1, R: 0 };
stepLegacyAu({ state: au, packedBytes: bytes, packedOffsets: offsets });
assert.equal(au.q, 0); assert.equal(au.Q, 16); assert.equal(au.R, 18);

const aShort = [new Int16Array(25), new Int16Array(25)];
aShort[0][19] = 20; aShort[1][24] = 3;
const av = { Q: 0, Z: 4, vInt: 0, mByte: 0, aShort };
bytes[1000] = 5;
stepLegacyAv({ state: av, packedBytes: bytes, packedOffsets: offsets });
assert.equal(av.Q, 15); assert.equal(av.mByte, -1); assert.equal(aShort[0][24], 10); assert.equal(aShort[1][24], 3);

const aw = { q: 1, R: 0, Q: 8, W: false, Z: 0, r: 0, af: false, vInt: 0, aaInt: 0 };
stepLegacyAw(aw); assert.deepEqual(aw, { ...aw, q: 7, R: 8, Q: 21, Z: 0, vInt: 70, aaInt: 1 });

const ax = { Z: 4, Q: 4, R: 0, q: 2, s: -1, V: 8, vInt: 0, pByte: 1, aaInt: 0, r: 0 };
stepLegacyAx(ax); assert.equal(ax.Q, 16); assert.equal(ax.vInt, 60); assert.equal(ax.Z, 0);

const ay = { X: false, Q: 8, R: 0, vInt: 0, U: 5, Z: 0, c: 0, g: 0 };
stepLegacyAy({ state: ay }); assert.equal(ay.Q, 16); assert.equal(ay.vInt, 65); assert.equal(ay.R, 8);

const az = { Q: 4, R: 0, Z: 3, aaInt: 0, vInt: 0 };
stepLegacyAz({ state: az, packedBytes: bytes, packedOffsets: offsets });
assert.equal(az.Q, 15); assert.equal(az.aaInt, 3); assert.equal(bytes[100 + 145 + 15], 0); assert.equal(bytes[100 + 58 + 15], 1);

const aa = { Q: 8, R: 0, Z: 2, aaInt: 0, X: false, q: 8, t: -1, W: false, T: 0, vInt: 0 };
stepLegacyAA(aa); assert.equal(aa.X, true); assert.equal(aa.Q, 22); assert.equal(aa.T, 1); assert.equal(aa.R, 21);

console.log("f.ar/as/at/au/av/aw/ax/ay/az/aA raw branches OK");
