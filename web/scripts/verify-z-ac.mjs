import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import vm from "node:vm";
import { denseRequire } from "./dense-layout-require.mjs";

const file = new URL("../src/ui/LegacyZAc.ts", import.meta.url).pathname;
const module = { exports: {} };
const output = ts.transpileModule(fs.readFileSync(file, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
vm.runInNewContext(output, { require: denseRequire, module, exports: module.exports, Int8Array });
const { stepLegacyZAc } = module.exports;

const e = new Int8Array(9200); const f = new Int8Array(16); const r = new Int8Array(8);
e[8627 + 7] = 0; e[8749 + 7] = 3; e[9115 + 7] = 2; f[3] = 4;
e[8505 + 7] = 1; e[8566 + 7] = 2;
const state = { e, f, r, q: 7, ar: 0 };
stepLegacyZAc(state);
assert.deepEqual(Array.from(r.slice(0, state.ar)), [16, 26, 17]);

e[8627 + 7] = 2; e[8749 + 7] = 15; e[8505 + 7] = 3; e[8566 + 7] = 1;
state.ar = 0;
stepLegacyZAc(state);
assert.deepEqual(Array.from(r.slice(0, state.ar)), [28, 17]);

e[8627 + 7] = 1; state.ar = 0;
stepLegacyZAc(state);
assert.deepEqual(Array.from(r.slice(0, state.ar)), [27, 17]);

console.log("f.ac() raw command append OK");
