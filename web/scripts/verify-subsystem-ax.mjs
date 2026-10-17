// Regression test for LegacySubsystemAx.ts (private void ax()).
//
// RETRACTED (2026-09-07): previously a guaranteed-throw stub. Re-tracing
// the full bytecode (offsets 0..130) shows it's a plain 6-iteration loop
// over dShort, combining saveOffsets (b:[S]/#132) and sectionOffsets
// (c:[S]/#142) via the `saveOffsets[sectionOffsets[N]+q]` idiom. See the
// file's own docblock for the full derivation.
import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";

const path = new URL("../src/sim/tribe/LegacySubsystemAx.ts", import.meta.url).pathname;
const output = ts.transpileModule(fs.readFileSync(path, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(output, { module, exports: module.exports, Int16Array });
const { stepLegacySubsystemAx } = module.exports;

function buildSaveOffsets() {
  const saveOffsets = new Int16Array(570);
  for (let k = 0; k < 570; k += 1) saveOffsets[k] = 101 * k;
  return saveOffsets;
}

// gameL !== 1: every slot is unconditionally overwritten from the table,
// regardless of its previous value.
{
  const dShort = new Int16Array(6).fill(9);
  const saveOffsets = buildSaveOffsets();
  const sectionOffsets = new Int16Array(5);
  sectionOffsets[2] = 40;
  stepLegacySubsystemAx({ dShort, saveOffsets, sectionOffsets, gameL: 0 });
  for (let a = 0; a < 6; a += 1) {
    assert.equal(dShort[a], saveOffsets[40 + a], `dShort[${a}] = saveOffsets[sectionOffsets[2]+${a}] when gameL!==1`);
  }
}

// gameL === 1, dShort[a] < 0: the "+1" step is skipped (offset 62's iflt),
// but the threshold check still runs and can still force it to -1.
{
  const dShort = new Int16Array(6);
  dShort[0] = -5; // negative -> skip increment
  const saveOffsets = buildSaveOffsets();
  const sectionOffsets = new Int16Array(5);
  sectionOffsets[2] = 0;
  // saveOffsets[0+0] = 0 -- threshold is 0, dShort[0]=-5 < 0 so it stays -5.
  stepLegacySubsystemAx({ dShort, saveOffsets, sectionOffsets, gameL: 1 });
  assert.equal(dShort[0], -5, "negative dShort[a] is left untouched by the increment, and -5 < threshold 0 so no reset");
}

// gameL === 1, dShort[a] >= 0 and staying below threshold: increments by 1.
{
  const dShort = new Int16Array(6);
  dShort[1] = 3;
  const saveOffsets = buildSaveOffsets();
  const sectionOffsets = new Int16Array(5);
  sectionOffsets[2] = 1; // saveOffsets[1+1] = saveOffsets[2] = 202
  stepLegacySubsystemAx({ dShort, saveOffsets, sectionOffsets, gameL: 1 });
  assert.equal(dShort[1], 4, "0 <= dShort[a] increments by 1 when staying below the threshold");
}

// gameL === 1, incremented value reaches/exceeds the threshold: reset to -1.
{
  const dShort = new Int16Array(6);
  const saveOffsets = new Int16Array(570); // all zero -> threshold is 0 everywhere
  dShort[2] = 0; // 0 >= 0 -> increments to 1, then 1 >= threshold(0) -> reset to -1
  const sectionOffsets = new Int16Array(5);
  stepLegacySubsystemAx({ dShort, saveOffsets, sectionOffsets, gameL: 1 });
  assert.equal(dShort[2], -1, "reaching/exceeding the threshold resets the slot to -1");
}

console.log("b.ax() dShort/saveOffsets/sectionOffsets threshold table OK");
