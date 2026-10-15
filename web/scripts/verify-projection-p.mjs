import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";
const path = `${new URL("../src/j2me/LegacyProjectionP.ts", import.meta.url).pathname}`;
const output = ts.transpileModule(fs.readFileSync(path, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const module = { exports: {} };
vm.runInNewContext(output, { module, exports: module.exports, Int8Array, Int16Array });
const { runLegacyProjectionP } = module.exports;
const dense = new Int8Array(6000), shorts = Array.from({ length: 9 }, () => new Int16Array(64)), bytes = Array.from({ length: 16 }, () => new Int8Array(64));
shorts[8][2] = 10; bytes[15][2] = 2; shorts[7][10] = 3; shorts[7][11] = 4; bytes[14][10] = 0; bytes[14][11] = 0x80; bytes[12][10] = 1; bytes[13][10] = 2; bytes[12][11] = 3; bytes[13][11] = 4;
const calls = []; const state = runLegacyProjectionP({ aq: 4, ar: 20, as: 30, au: 2, kind: 0, dense, shortTables: shorts, byteTables: bytes, allowA: () => true, allowB: () => true, onB: (...args) => calls.push(["b", ...args]), onA: (...args) => calls.push(["a", ...args]) });
assert.deepEqual(calls, [["b", 3, 24, 32], ["a", 4, 27, 34]]); assert.deepEqual(JSON.parse(JSON.stringify(state)), { ao: 11, ap: 11, ax: 0, ay: 0, az: 11, an: -1 });

bytes[15][2] = 1; bytes[14][10] = 0; dense[1418] = 12; let bChecks = 0;
const gated = runLegacyProjectionP({ aq: 4, ar: 0, as: 0, au: 2, kind: 29, dense, shortTables: shorts, byteTables: bytes, allowA: () => true, allowB: () => { bChecks += 1; return false; }, onB: () => { throw new Error("blocked"); }, onA: () => { throw new Error("blocked"); } });
assert.equal(bChecks, 1); assert.equal(gated.an, -1); console.log("private f.p() scan OK");
