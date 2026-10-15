import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";

const path = `${new URL("../src/j2me/LegacyStateMachine.ts", import.meta.url).pathname}`;
const output = ts.transpileModule(fs.readFileSync(path, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(output, { module, exports: module.exports, Int8Array, Int16Array, Math });
const { stepLegacyAi, stepLegacyAj } = module.exports;

const a4 = new Int8Array(50); a4[0] = 4; a4[2] = 7;
const dense = new Int8Array(10000); dense[913] = 4; dense[916] = 4;
stepLegacyAi({ a4, dense });
assert.equal(a4[0], 0); assert.equal(a4[2], 0); assert.equal(dense[913], 0); assert.equal(dense[916], 0);

const state = { uFlag: true, F: 1, k: 2, B: 3, C: 4, D: 5, E: 6 };
stepLegacyAj(state);
assert.deepEqual(state, { uFlag: false, F: -1, k: 0, B: 0, C: 0, D: 0, E: 0 });

const untouched = { uFlag: false, F: 1, k: 2, B: 3, C: 4, D: 5, E: 6 };
stepLegacyAj(untouched);
assert.deepEqual(untouched, { uFlag: false, F: 1, k: 2, B: 3, C: 4, D: 5, E: 6 });

console.log("f.aI()/f.aJ() raw cleanup OK");
