import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import vm from "node:vm";

const file = new URL("../src/ui/LegacyZAh.ts", import.meta.url).pathname;
const module = { exports: {} };
const output = ts.transpileModule(fs.readFileSync(file, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
vm.runInNewContext(output, { module, exports: module.exports });
const { stepLegacyZAh } = module.exports;

const state = { K: false, P: true, w: 1, k: 7, fByte: 3, l: 0, q: 12, entityFocusFlag: true, V: true };
let reset; let iCalls = 0;
stepLegacyZAh(state, {
  onSelectionReset: (...args) => { reset = args; },
  onI: () => { iCalls += 1; },
});
assert.deepEqual(state, { K: false, P: false, w: 1, k: 7, fByte: 3, l: 7, q: 0, entityFocusFlag: false, V: false });
assert.deepEqual(reset, [false, true, false, true]); assert.equal(iCalls, 1);

const modeFour = { K: false, P: true, w: 4, k: 1, fByte: 2, l: 9, q: 3, entityFocusFlag: true, V: true };
let lValue;
stepLegacyZAh(modeFour, { onL: (value) => { lValue = value; } });
assert.deepEqual(modeFour, { K: false, P: false, w: 4, k: 1, fByte: 2, l: 9, q: 3, entityFocusFlag: true, V: true });
assert.equal(lValue, -1);

// F:B !== -1 branch (fByte holds a real value): w=1, resetSelection(true,true,false,false).
const fByteBranch = { K: false, P: true, w: 0, k: 0, fByte: 5, l: 0, q: 8, entityFocusFlag: true, V: true };
let fReset;
stepLegacyZAh(fByteBranch, { onSelectionReset: (...args) => { fReset = args; } });
assert.equal(fByteBranch.w, 1);
assert.deepEqual(fReset, [true, true, false, false]);

// K guard: everything short-circuits.
const guarded = { K: true, P: true, w: 1, k: 7, fByte: 3, l: 0, q: 12, entityFocusFlag: true, V: true };
let calls = 0;
stepLegacyZAh(guarded, {
  onSelectionReset: () => calls += 1,
  onI: () => calls += 1,
  onL: () => calls += 1,
});
assert.equal(calls, 0);
assert.deepEqual(guarded, { K: true, P: true, w: 1, k: 7, fByte: 3, l: 0, q: 12, entityFocusFlag: true, V: true });

console.log("f.ah() transition cleanup OK");
