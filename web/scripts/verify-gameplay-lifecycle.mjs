import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function loadModule(file) {
  const module = { exports: {} };
  const output = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(output, { module, exports: module.exports });
  return module.exports;
}

const { LegacyGameState } = loadModule(new URL("../src/j2me/LegacyGameState.ts", import.meta.url).pathname);
const { stepLegacyAj, stepLegacyAL } = loadModule(new URL("../src/j2me/LegacyStateMachine.ts", import.meta.url).pathname);

const game = new LegacyGameState();
const cleanup = { uFlag: true, F: 12, k: 4, E: 4, D: 3, C: 2, B: 1 };
stepLegacyAj(cleanup);
assert.equal(cleanup.uFlag, false);
assert.equal(cleanup.F, -1);
assert.equal(cleanup.k, 0);
assert.deepEqual([cleanup.B, cleanup.C, cleanup.D, cleanup.E], [0, 0, 0, 0]);

const scroll = { w: 1, I: 10 };
stepLegacyAL(scroll);
assert.equal(scroll.w, 0);
assert.equal(scroll.I, 0);

console.log("f.aJ()/f.aL() lifecycle writes passed");
