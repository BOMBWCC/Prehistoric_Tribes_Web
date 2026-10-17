import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";

const path = new URL("../src/ui/LegacyFrameProgressionScan.ts", import.meta.url).pathname;
const output = ts.transpileModule(fs.readFileSync(path, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(output, { module, exports: module.exports, Int8Array });
const { stepLegacyD } = module.exports;

// final void d(int) (offsets 0..21): P=true only when w===2 AND id===q.
{
  const state = { w: 2, q: 42, P: false };
  stepLegacyD(42, state);
  assert.equal(state.P, true);
}
{
  const state = { w: 2, q: 42, P: false };
  stepLegacyD(43, state); // id !== q
  assert.equal(state.P, false);
}
{
  const state = { w: 1, q: 42, P: false };
  stepLegacyD(42, state); // w !== 2
  assert.equal(state.P, false);
}

console.log("f.d(int) frame-progression scan OK");
