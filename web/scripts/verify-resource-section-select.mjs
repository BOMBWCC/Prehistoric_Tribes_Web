import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function loadModule(file) {
  const module = { exports: {} };
  const output = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(output, { module, exports: module.exports, Int8Array, Int16Array });
  return module.exports;
}

const { LegacyResourceTables, selectLegacyResourceSection } = loadModule(
  new URL("../src/j2me/LegacyResourceTables.ts", import.meta.url).pathname,
);

const packedBytes = new Int8Array(2000);
const packedOffsets = new Int16Array(2000);
// Threshold table: packedOffsets[308]=100 (scan base), packedOffsets[309]=103 (scan limit).
// packedBytes[100..102] = [10, 20, 30] -- ascending thresholds.
packedOffsets[308] = 100;
packedOffsets[309] = 103;
packedBytes[100] = 10;
packedBytes[101] = 20;
packedBytes[102] = 30;

const tables = new LegacyResourceTables();
let fResets = 0;
let reloads = 0;
const onFReset = () => { fResets += 1; };
const onSectionReload = () => { reloads += 1; };

// c.a(int) offsets 25..86: the section is the index of the first threshold
// GREATER than arg1 (`if_icmpge 73` moves on); with none, c stays at the
// limit unreduced. CORRECTED 2026-09-29: the old port stopped at >=.
selectLegacyResourceSection(tables, packedBytes, packedOffsets, 25, onFReset, onSectionReload);
assert.equal(fResets, 1);
assert.equal(tables.sectionArg, 25);
assert.equal(tables.currentSection, 2, "25 < 30 at index 2");
assert.equal(reloads, 1);

selectLegacyResourceSection(tables, packedBytes, packedOffsets, 5, onFReset, onSectionReload);
assert.equal(tables.currentSection, 0);
assert.equal(reloads, 2);
assert.equal(fResets, 2); // onFReset fires unconditionally on every call

selectLegacyResourceSection(tables, packedBytes, packedOffsets, 5, onFReset, onSectionReload);
assert.equal(reloads, 2, "same section: no reload");

selectLegacyResourceSection(tables, packedBytes, packedOffsets, 35, onFReset, onSectionReload);
assert.equal(tables.sectionScan, 103, "past every threshold: the limit, unreduced");
assert.equal(reloads, 3);

console.log("c.a(int) resource section select OK");
