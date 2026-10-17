// e.c() offsets 6..110 -- the frame-geometry block (ported 2026-09-09).
//
// Class `e` writes these seven fields of class `f` through its `a:Lf;` back
// reference, so grepping class f alone finds ZERO putfield for O:B and only
// one for P:B (inside a(ZZZZZZZZZ)'s untranslated tail). Both therefore sat
// at their Java default of 0 for the whole life of this port, and O:B/P:B are
// the viewport size every camera path divides and clamps by.
//
// Call order confirmed from the bytecode: f.run() offset 1 -> f.f(),
// f.f() offset 17 -> `new e(this)`, e(f) offset 310 -> e.c().
import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";

const path = `${new URL("../src/render/LegacyFrameLayout.ts", import.meta.url).pathname}`;
const output = ts.transpileModule(fs.readFileSync(path, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(output, { module, exports: module.exports, Int8Array, Int16Array, Math });
const { applyLegacyFrameGeometry } = module.exports;

const state = {
  selectionAInt: 0, viewColumns: 0, viewRows: 0,
  cursorColumn: 0, cursorRow: 0, cursorTargetColumn: 0, cursorTargetRow: 0,
};
applyLegacyFrameGeometry(state);

assert.equal(state.selectionAInt, 288, "f.A:I = 288 (offsets 10..13)");
assert.equal(state.viewColumns, 11, "f.O:B = 11 (offsets 20..22)");
// (288 - 1) / 16 = 17 under Java idiv (truncating), + 1 = 18.
assert.equal(state.viewRows, 18, "f.P:B = (byte)(((A:I - 1) / 16) + 1) (offsets 29..44)");
assert.equal(state.cursorColumn, 5, "f.y:B = (byte)(O:B >> 1) (offsets 49..63)");
assert.equal(state.cursorRow, 9, "f.A:B = (byte)(P:B >> 1) (offsets 66..80)");
assert.equal(state.cursorTargetColumn, state.cursorColumn, "f.C:B = y:B (offsets 83..94)");
assert.equal(state.cursorTargetRow, state.cursorRow, "f.D:B = A:B (offsets 97..108)");

// f.g() offsets 60..75 allocate f.a:[[Z as new boolean[P:B + 3][O:B]; with the
// real geometry that is 21x11, not the [3][0] a zero viewport would give.
assert.equal(state.viewRows + 3, 21);
assert.equal(state.viewColumns, 11);

console.log("e.c() frame-geometry block OK");
