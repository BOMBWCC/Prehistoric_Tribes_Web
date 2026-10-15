import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";
const root = `${new URL("../src/j2me/", import.meta.url).pathname}`; const cache = new Map();
function load(name) {
  if (cache.has(name)) return cache.get(name).exports;
  const module = { exports: {} }; cache.set(name, module);
  const source = fs.readFileSync(`${root}${name}.ts`, "utf8");
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(output, { module, exports: module.exports, require: (request) => load(request.replace(/^\.\//, "")), Int8Array, Int16Array });
  return module.exports;
}
const { runLegacyProjectionLifecycle } = load("LegacyProjectionLifecycle");
const dense = new Int8Array(2000), aBytes = new Int8Array(128), aShorts = new Int16Array(128), shorts = Array.from({ length: 9 }, () => new Int16Array(64)), bytes = Array.from({ length: 16 }, () => new Int8Array(64));
dense[4] = 4; dense[5] = 2; aShorts[99] = 20; aShorts[117] = 0; shorts[3][4] = 0; shorts[2][4] = 1; shorts[4][8] = 9; bytes[4][4] = 1; bytes[7][8] = 2; bytes[8][8] = 3; aBytes[20] = 5; bytes[15][2] = 1; shorts[8][2] = 10; shorts[7][10] = 3; bytes[14][10] = 0;
const events = [], prep = runLegacyProjectionLifecycle({ preparation: { aq: 4, ar: 10, as: 20, at: 0, kind: 0, stateX: true, stateV: 0, aQ: 6, dense, aBytes, aShorts, shortTables: shorts, byteTables: bytes, onP: () => {}, onQ: () => {} }, makePInput: (state) => ({ aq: 4, ar: state.ar, as: state.as, au: 2, kind: 0, dense, shortTables: shorts, byteTables: bytes, onB: (...args) => events.push(["b", ...args]), onA: (...args) => events.push(["a", ...args]) }), allowA: () => true, allowB: () => true, onQ: () => events.push(["q"]) });
assert.equal(prep.stateX, false); assert.deepEqual(events, [["b", 3, 15, 29]]); console.log("projection preparation -> p() lifecycle OK");
