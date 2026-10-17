// Regression test for LegacyEntityHousing.ts (private void V(), #258).
// Expected values derived by hand from bytecode/b-javap.txt 35743..35859.
import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";
import { denseRequire } from "./dense-layout-require.mjs";

const source = new URL("../src/sim/units/LegacyEntityHousing.ts", import.meta.url).pathname;
const output = ts.transpileModule(fs.readFileSync(source, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(output, { require: denseRequire, module, exports: module.exports, Int8Array, Int16Array, Math });
const { stepLegacyEntityHousing } = module.exports;

function make() {
  const state = new Int8Array(10000);
  const packedBytes = new Int8Array(2000);
  const packedOffsets = new Int16Array(300);
  packedOffsets[138] = 1000;
  // t138[(9115-1)*26 + 2]: level 2 huts hold 4.
  packedBytes[1000 + 1 * 26 + 2] = 4;
  const pool = [new Int16Array(26), new Int16Array(26)];
  pool[0][17] = 1;
  return { state, packedBytes, packedOffsets, pool };
}

// The chief always lives in record 1.
{
  const f = make();
  stepLegacyEntityHousing({ ...f, id: 1, team: 0 });
  assert.equal(f.state[3434 + 1], 1);
}

// First hut (kind 2, not built-flagged) with a free bed takes the villager.
{
  const f = make();
  f.state[8749 + 3] = 5;                                // not a hut
  f.state[8749 + 4] = 2; f.state[9115 + 4] = 2; f.state[8810 + 4] = 4; // full
  f.state[8749 + 6] = 2; f.state[9115 + 6] = 2; f.state[8810 + 6] = 1;
  stepLegacyEntityHousing({ ...f, id: 7, team: 0 });
  assert.equal(f.state[3434 + 7], 6);
  assert.equal(f.state[8810 + 6], 2, "one more resident");
  assert.equal(f.state[8810 + 4], 4, "the full hut is untouched");
}

// No free bed anywhere: nothing changes.
{
  const f = make();
  f.state[8749 + 4] = 2; f.state[9115 + 4] = 2; f.state[8810 + 4] = 4;
  f.state[3434 + 7] = -1;
  stepLegacyEntityHousing({ ...f, id: 7, team: 0 });
  assert.equal(f.state[3434 + 7], -1);
}

// A hut with 8627 != 0 is skipped.
{
  const f = make();
  f.state[8749 + 4] = 2; f.state[9115 + 4] = 2; f.state[8627 + 4] = 1;
  f.state[3434 + 7] = -1;
  stepLegacyEntityHousing({ ...f, id: 7, team: 0 });
  assert.equal(f.state[3434 + 7], -1);
}

console.log("private void V() #258 (housing) OK");
