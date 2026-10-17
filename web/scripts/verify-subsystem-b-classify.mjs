// Direct port test for class b's final byte b(int) (#543, bytecode/
// b-javap.txt offsets 0..154), ported as classifyLegacySubsystemB.
import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";
import { denseRequire } from "./dense-layout-require.mjs";

const source = fs.readFileSync(new URL("../src/sim/tribe/LegacySubsystemBClassify.ts", import.meta.url), "utf8");
const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const module = { exports: {} };
vm.runInNewContext(output, { require: denseRequire, module, exports: module.exports });
const { classifyLegacySubsystemB } = module.exports;

// dense[1414+id] < 12 -> return 6, dense[7777+id] reset to 0.
{
  const dense = new Int8Array(20000);
  dense[1414 + 5] = 11;
  dense[7777 + 5] = 9;
  assert.equal(classifyLegacySubsystemB({ dense, id: 5 }), 6);
  assert.equal(dense[7777 + 5], 0);
}

// dense[1414+id] >= 12, (7979+id)&2 > 0, dense[7777+id]===0 -> return 5.
{
  const dense = new Int8Array(20000);
  dense[1414 + 5] = 12;
  dense[7979 + 5] = 2;
  dense[7777 + 5] = 0;
  assert.equal(classifyLegacySubsystemB({ dense, id: 5 }), 5);
  assert.equal(dense[7777 + 5], 0);
}

// Same inner gate, but via the dense[3535+id]!==0 sub-condition instead.
{
  const dense = new Int8Array(20000);
  dense[1414 + 5] = 12;
  dense[7979 + 5] = 2;
  dense[7777 + 5] = 9; // nonzero, so needs 3535!==0 or 6565===1 to still hit the inner branch
  dense[3535 + 5] = 1;
  assert.equal(classifyLegacySubsystemB({ dense, id: 5 }), 5);
  assert.equal(dense[7777 + 5], 0);
}

// (7979+id)&2 === 0 -- the inner gate is skipped entirely (its own
// condition is a strict superset of the outer tail's, so whenever the
// outer tail's 3535/6565 condition would be true, the inner gate -- if
// reached -- would already have returned 5 first; return 1 is only
// reachable via the outer tail when the (7979&2) gate itself is false).
{
  const dense = new Int8Array(20000);
  dense[1414 + 5] = 12;
  dense[7979 + 5] = 0;
  dense[3535 + 5] = 1;
  assert.equal(classifyLegacySubsystemB({ dense, id: 5 }), 1);
  assert.equal(dense[7777 + 5], 0);
}

// (7979+id)&2 === 0 (outer gate skipped entirely), 3535===0, 6565!==1,
// dense[7777+id] > 0 -> return 7, no mutation.
{
  const dense = new Int8Array(20000);
  dense[1414 + 5] = 12;
  dense[7979 + 5] = 0;
  dense[3535 + 5] = 0;
  dense[6565 + 5] = 0;
  dense[7777 + 5] = 4;
  assert.equal(classifyLegacySubsystemB({ dense, id: 5 }), 7);
  assert.equal(dense[7777 + 5], 4);
}

// Same as above but dense[7777+id]<=0 -> return 0, no mutation.
{
  const dense = new Int8Array(20000);
  dense[1414 + 5] = 12;
  dense[7979 + 5] = 0;
  dense[3535 + 5] = 0;
  dense[6565 + 5] = 0;
  dense[7777 + 5] = 0;
  assert.equal(classifyLegacySubsystemB({ dense, id: 5 }), 0);
  assert.equal(dense[7777 + 5], 0);
}

console.log("class b final byte b(int) (#543) classification OK");
