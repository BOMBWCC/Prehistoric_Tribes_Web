import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";
import { denseRequire } from "./dense-layout-require.mjs";

const path = `${new URL("../src/sim/units/LegacyEntityRecordTargetClear.ts", import.meta.url).pathname}`;
const output = ts.transpileModule(fs.readFileSync(path, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(output, { require: denseRequire, module, exports: module.exports, Int8Array });
const { clearLegacyEntityRecordTarget } = module.exports;

const state = new Int8Array(10000); state[8810 + 2] = 1; state[8749 + 2] = 10;
let reset;
clearLegacyEntityRecordTarget({ state, entityId: 1, onRecordReset: (...args) => { reset = args; } });
assert.deepEqual(reset, [2, false]); assert.equal(state[8810 + 2], 0); assert.equal(state[9298 + 2], 0);

const second = new Int8Array(10000); second[8627 + 3] = 1; second[9237 + 3] = 1;
clearLegacyEntityRecordTarget({ state: second, entityId: 1 });
assert.equal(second[9237 + 3], 0);

// type===2 && 8627!==0: bytecode offset 66 (`ifeq 98`) falls through to the
// reset at offset 69 since e[8627+record] is nonzero -- confirms the fixed
// (2026-08-18) condition, previously inverted to skip reset here instead.
const type2Nonzero = new Int8Array(10000);
type2Nonzero[8810 + 4] = 1; type2Nonzero[8749 + 4] = 2; type2Nonzero[8627 + 4] = 5;
let resetType2Nonzero;
clearLegacyEntityRecordTarget({ state: type2Nonzero, entityId: 1, onRecordReset: (...args) => { resetType2Nonzero = args; } });
assert.deepEqual(resetType2Nonzero, [4, false]);
assert.equal(type2Nonzero[8810 + 4], 0);
assert.equal(type2Nonzero[9298 + 4], 0);

// type===2 && 8627===0: bytecode jumps PAST the reset entirely (`ifeq 98`),
// falling to the association-clear tail instead -- no reset should fire.
const type2Zero = new Int8Array(10000);
type2Zero[8810 + 5] = 1; type2Zero[8749 + 5] = 2; type2Zero[8627 + 5] = 0;
let resetType2Zero = "untouched";
clearLegacyEntityRecordTarget({ state: type2Zero, entityId: 1, onRecordReset: () => { resetType2Zero = "called"; } });
assert.equal(resetType2Zero, "untouched");
assert.equal(type2Zero[8810 + 5], 1);

console.log("f.c(int) record target clear OK");
