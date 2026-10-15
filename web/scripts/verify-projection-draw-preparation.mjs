import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";
const path = `${new URL("../src/j2me/LegacyProjectionDrawPreparation.ts", import.meta.url).pathname}`;
const output = ts.transpileModule(fs.readFileSync(path, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const module = { exports: {} };
vm.runInNewContext(output, { module, exports: module.exports, Int8Array, Int16Array });
const { prepareLegacyProjectionDraw } = module.exports;
const dense = new Int8Array(2000), aBytes = new Int8Array(300), aShorts = new Int16Array(200), shorts = Array.from({ length: 5 }, () => new Int16Array(256)), bytes = Array.from({ length: 9 }, () => new Int8Array(256));
dense[4] = 4; dense[5] = 2; aShorts[99] = 20; aShorts[117] = 0; shorts[3][4] = 0; shorts[2][4] = 1; shorts[4][8] = 9; bytes[4][4] = 1; bytes[7][8] = 2; bytes[8][8] = 3; aBytes[20] = 5;
let route = ""; const state = prepareLegacyProjectionDraw({ aq: 4, ar: 10, as: 20, at: 0, kind: 29, stateX: true, stateV: 0, aQ: 6, dense, aBytes, aShorts, shortTables: shorts, byteTables: bytes, onP: (s) => { route = "p"; assert.equal(JSON.stringify(s), JSON.stringify({ aq: 4, ar: 12, as: 29, at: 5, au: 57, av: 1, aw: 0, kind: 29, stateX: false })); }, onQ: () => { route = "q"; } });
assert.equal(route, "p"); assert.equal(state.au, 57);

dense[4] = 8; dense[1418] = 11; shorts[2][8] = 2; shorts[4][2] = 13; route = "";
prepareLegacyProjectionDraw({ aq: 4, ar: 10, as: 20, at: -8, kind: 29, stateX: false, stateV: 1, aQ: 6, dense, aBytes, aShorts, shortTables: shorts, byteTables: bytes, onP: () => { route = "p"; }, onQ: (s) => { route = "q"; assert.equal(s.av, 14); assert.equal(s.as, 14); assert.equal(s.au, 13); } });
assert.equal(route, "q");
console.log("private f.a(IIIIB) preparation OK");
