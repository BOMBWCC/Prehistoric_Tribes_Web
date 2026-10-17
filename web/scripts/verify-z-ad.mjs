import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import vm from "node:vm";
import { denseRequire } from "./dense-layout-require.mjs";

const file = new URL("../src/ui/LegacyZAd.ts", import.meta.url).pathname;
const module = { exports: {} };
const output = ts.transpileModule(fs.readFileSync(file, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
vm.runInNewContext(output, { require: denseRequire, module, exports: module.exports, Int8Array });
const { stepLegacyZAd } = module.exports;

const normal = { F: false, qByte: 0, N: false, L: true, K: false, e: new Int8Array(2000), r: new Int8Array(16), ar: 0, aq: 1 };
stepLegacyZAd(normal);
assert.deepEqual(Array.from(normal.r.slice(0, normal.ar)), [10, 12, 14, 13, 24]);
assert.equal(normal.ar, 5);

const e = new Int8Array(2000);
e[1919 + 2] = 1; e[1414 + 2] = 12;
e[1919 + 3] = 1; e[1414 + 3] = 11;
const flagged = { F: true, qByte: 3, N: false, L: false, K: false, e, r: new Int8Array(16), ar: 0, aq: 99, aqInt: 7 };
let callback;
stepLegacyZAd(flagged, { onNineFlagReset: (...args) => { callback = args; } });
assert.deepEqual(Array.from(flagged.r.slice(0, flagged.ar)), [-2, -3]);
// The loops count with aq:I (#216); aq:B (#215) is untouched (oracle run 10, frame 27774).
assert.equal(flagged.aqInt, 51);
assert.equal(flagged.aq, 99);
assert.deepEqual(callback, [false, false, false, true, true, false, false, false, false]);

console.log("f.ad() raw command-list builder OK");
