import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";
import { denseRequire } from "./dense-layout-require.mjs";

const path = `${new URL("../src/sim/world/LegacyAuxiliaryPlacement.ts", import.meta.url).pathname}`;
const output = ts.transpileModule(fs.readFileSync(path, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(output, { require: denseRequire, module, exports: module.exports, Int8Array, Int16Array });
const { placeLegacyAuxiliary } = module.exports;

const packedBytes = new Int8Array(4000);
const packedOffsets = new Int16Array(312);
const dense = new Int8Array(10000);
const shortRows = [new Int16Array(30), new Int16Array(30)];
packedOffsets[289] = 100; packedOffsets[290] = 200; packedBytes[200] = 0;
packedBytes[100] = 10; packedBytes[101] = 11; packedBytes[102] = 20; packedBytes[103] = 21;
packedOffsets[286] = 300; packedOffsets[288] = 310; packedBytes[310] = 2; packedBytes[302] = 17;
shortRows[0][17] = 4; dense[1923] = 1; dense[1418] = 12; dense[12] = 33; dense[113] = 44;
dense[7] = 3; dense[108] = 4;
const eRows = Array.from({ length: 4 }, () => new Int8Array(8));
const fP = new Int8Array(40);
const fields = { N: 0, O: 9 };
const common = { eRows, fP, fields };
const calls = [];
// CORRECTED 2026-09-21: the signature is b(first, second, x, y) -- the
// rectangle gate reads params 3 and 4 (offsets 41/54/70/85's iload_3 /
// iload 4), the entity work reads params 1 and 2. The old port had every
// argument shifted one place left.
placeLegacyAuxiliary({
  ...common, q: 0, bFByte: 0, packedBytes, packedOffsets, dense, shortRows,
  onNestedPlacement: (...args) => calls.push(["nested", ...args]),
  onFootprintCheck: (...args) => calls.push(["footprint", ...args]),
  onRecordFinalize: (value) => calls.push(["finalize", value]),
  onStepAdvance: (next) => calls.push(["advance", next]),
}, 7, 12, 13, 15);
// a(IIII) takes four separate args: (q===2?9:8, 25, dense[idx], dense[101+idx]),
// with idx = q===2 ? second : first. The literal 25 is NOT added to anything.
assert.deepEqual(calls, [["nested", 7, 12, 1], ["footprint", 8, 25, 3, 4], ["finalize", 17], ["advance", 50]]);
assert.equal(dense[3143], 33); assert.equal(dense[3244], 44);
assert.equal(fields.O, 0, "offset 300: O:I = 0 before the f.p gathering scan");
assert.equal(fields.N, 100, "offset 38: N:I = the rectangle base");

// Offsets 41..98: params 3/4 outside the rectangle stop the method.
{
  const calls3 = [];
  placeLegacyAuxiliary({
    ...common, q: 0, bFByte: 0, packedBytes, packedOffsets, dense, shortRows,
    onNestedPlacement: (...args) => calls3.push(["nested", ...args]),
    onStepAdvance: (next) => calls3.push(["advance", next]),
  }, 7, 12, 13, 5);
  assert.deepEqual(calls3, [], "y (param 4) of 5 is below the rectangle's 11");
}

// Offsets 175..253 (q == 4, f == 1). RETRACTED 2026-09-23: c(false) does
// not throw. It picks the adults, f.p[1..4] takes e[N][0] (the chief for an
// empty slot), and the method goes on to the scene and the step advance.
{
  packedBytes[104] = 0; packedBytes[105] = 0; packedBytes[106] = 20; packedBytes[107] = 20;
  packedBytes[310 + 4] = 5; packedBytes[300 + 5 + 1] = 23; // scene t286[t288[4] + 1]
  const calls2 = [];
  placeLegacyAuxiliary({
    ...common, q: 4, bFByte: 1, packedBytes, packedOffsets, dense, shortRows,
    onNestedPlacement: (...args) => calls2.push(["nested", ...args]),
    onFootprintCheck: (...args) => calls2.push(["footprint", ...args]),
    onRecordFinalize: (value) => calls2.push(["finalize", value]),
    onStepAdvance: (next) => calls2.push(["advance", next]),
    onAuxiliaryTagRefresh: (flag) => { calls2.push(["tagRefresh", flag]); eRows[0][0] = 4; eRows[1][0] = 8; },
  }, 7, 12, 13, 15);
  assert.deepEqual(calls2, [["tagRefresh", false], ["finalize", 23], ["advance", 51]]);
  assert.deepEqual(Array.from(fP.slice(1, 5)), [4, 8, 4, 4]);
}

console.log("b.b(IIII) raw auxiliary placement gates OK");
