import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import vm from "node:vm";

const file = new URL("../src/j2me/LegacyZDispatch.ts", import.meta.url).pathname;
const module = { exports: {} };
const output = ts.transpileModule(fs.readFileSync(file, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
vm.runInNewContext(output, { module, exports: module.exports });
const { dispatchLegacyZ } = module.exports;

const state = { aI: 12, aJ: 34, aK: 56, aG: 0, aH: 0 };
let composite; dispatchLegacyZ(state, 0, 0, { onComposite: (...args) => { composite = args; } });
assert.deepEqual(composite, [12, 34, 56]); assert.equal(state.aG, 34); assert.equal(state.aH, 56);

let command; dispatchLegacyZ(state, 1, 1119, { onCommand: (value) => { command = value; } });
assert.equal(command, 1119);

let unknown; dispatchLegacyZ(state, 4, 1201, { onUnportedBranch: (...args) => { unknown = args; } });
assert.deepEqual(unknown, [4, 1201]);

console.log("f.d(int,int) proven dispatch prefix OK");
