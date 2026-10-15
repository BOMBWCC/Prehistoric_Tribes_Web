import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import vm from "node:vm";

const file = new URL("../src/j2me/LegacyZGeometryBridge.ts", import.meta.url).pathname;
const module = { exports: {} };
const output = ts.transpileModule(fs.readFileSync(file, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
vm.runInNewContext(output, { module, exports: module.exports });
const { applyLegacyZFiveIntGeometry, applyLegacyZSevenIntGeometry } = module.exports;

const calls = [];
const sink = {
  decodeRecord: (...args) => { calls.push(["record", ...args]); return 13; },
  decodeSegments: (...args) => { calls.push(["segments", ...args]); },
};
assert.equal(applyLegacyZFiveIntGeometry(sink, 20, 30, 1, 115, -1), 13);
applyLegacyZSevenIntGeometry(sink, 20, 30, 0, 115, 13, -1, -1);
assert.deepEqual(calls, [["record", 20, 30, 1, 115, -1], ["segments", 20, 30, 0, 115, 13, -1, -1]]);

console.log("c geometry callback bridge OK");
