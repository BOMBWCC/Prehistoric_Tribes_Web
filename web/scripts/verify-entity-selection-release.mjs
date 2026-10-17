import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { denseRequire } from "./dense-layout-require.mjs";

function loadModule(file) {
  const module = { exports: {} };
  const output = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(output, { require: denseRequire, module, exports: module.exports, Int8Array, Int16Array });
  return module.exports;
}

const { releaseLegacyEntitySelection, finalizeLegacyEntitySelection } = loadModule(new URL("../src/ui/LegacyEntitySelectionRelease.ts", import.meta.url).pathname);
const groups = Array.from({ length: 5 }, () => new Int8Array(50));
groups[0].set([7]);
const dense = new Int8Array(10000);
dense[916] = 3;
const packedBytes = new Int8Array(312);
const packedOffsets = new Int16Array(312);
packedBytes[125] = 0;
let modeReset = 0;
let fReset = 0;
assert.equal(releaseLegacyEntitySelection({ groups, dense, packedBytes, packedOffsets, id: 7, F: 3, w: 1, onModeReset: () => { modeReset += 1; }, onFReset: () => { fReset += 1; } }), true);
assert.deepEqual(Array.from(groups[0].slice(0, 3)), [0, 0, 0]);
assert.equal(dense[916], 0);
assert.equal(modeReset, 1);
assert.equal(fReset, 1);

dense[8749 + 2] = 6;
// w===2 branch (matching e[8749+q]===6): w resets, l is left UNTOUCHED by
// the real bytecode (only the w===1 branch has a putfield on l:B).
const resultW2 = finalizeLegacyEntitySelection({ id: 4, k: 4, w: 2, l: 5, q: 2, dense, onSelectionReset: () => {} });
assert.equal(resultW2.k, 0);
assert.equal(resultW2.w, 0);
assert.equal(resultW2.l, 5);

// w===1 branch: this is the ONLY branch that zeroes l.
const resultW1 = finalizeLegacyEntitySelection({ id: 4, k: 4, w: 1, l: 5, q: 2, dense, onSelectionReset: () => {} });
assert.equal(resultW1.k, 0);
assert.equal(resultW1.w, 0);
assert.equal(resultW1.l, 0);

// k===id but neither condition matches: k resets to 0, w/l untouched.
const resultNoMatch = finalizeLegacyEntitySelection({ id: 4, k: 4, w: 0, l: 5, q: 9, dense, onSelectionReset: () => {} });
assert.equal(resultNoMatch.k, 0);
assert.equal(resultNoMatch.w, 0);
assert.equal(resultNoMatch.l, 5);

// k!==id: early return, nothing touched at all.
const resultNoop = finalizeLegacyEntitySelection({ id: 4, k: 9, w: 2, l: 5, q: 2, dense, onSelectionReset: () => {} });
assert.equal(resultNoop.k, 9);
assert.equal(resultNoop.w, 2);
assert.equal(resultNoop.l, 5);

console.log("f.e(int)/f.f(int) selection-release branches passed");
