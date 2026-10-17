import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";

const sources = new Map();
function load(path) {
  if (sources.has(path)) return sources.get(path).exports;
  const module = { exports: {} };
  sources.set(path, module);
  const source = fs.readFileSync(path, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(output, {
    module,
    exports: module.exports,
    require: (specifier) => load(new URL(`${specifier}.ts`, `file://${path}`).pathname), // relative to the importing module
    ...context,
  });
  return module.exports;
}

const storage = new Map();
const fakeLocalStorage = {
  getItem(key) { return storage.has(key) ? storage.get(key) : null; },
  setItem(key, value) { storage.set(key, value); },
  removeItem(key) { storage.delete(key); },
};
const fakeBase64 = {
  btoa(value) { return Buffer.from(value, "binary").toString("base64"); },
  atob(value) { return Buffer.from(value, "base64").toString("binary"); },
};
const context = { localStorage: fakeLocalStorage, ...fakeBase64, Uint8Array, DataView, ArrayBuffer, Buffer };
const recordStorePath = `${new URL("../src/platform/RecordStore.ts", import.meta.url).pathname}`;
const recordStoreModule = { exports: {} };
const recordStoreOutput = ts.transpileModule(fs.readFileSync(recordStorePath, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
vm.runInNewContext(recordStoreOutput, { module: recordStoreModule, exports: recordStoreModule.exports, ...context });
const records = recordStoreModule.exports;

const rmsPath = `${new URL("../src/save/RmsRecords.ts", import.meta.url).pathname}`;
const rmsModule = { exports: {} };
const rmsOutput = ts.transpileModule(fs.readFileSync(rmsPath, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
vm.runInNewContext(rmsOutput, { module: rmsModule, exports: rmsModule.exports, ...context });
const codec = rmsModule.exports;

const store = records.RecordStore.open("t0");
store.addRecord(codec.encodeSlot0Record({ l: 7, W: true, r: 2, s: -1, t: 3, c: 4, p: 5 }));
assert.equal(store.getNumRecords(), 1);
assert.deepEqual([...store.getRecord(1)], [...codec.encodeSlot0Record({ l: 7, W: true, r: 2, s: -1, t: 3, c: 4, p: 5 })]);
store.replaceRecord(codec.encodeSlot0Record({ l: 8, W: false, r: 4, s: 1, t: 0, c: 0, p: 0 }));
assert.equal(store.getNumRecords(), 1);
assert.equal(codec.decodeSlot0Record(store.getRecord(1)).l, 8);
console.log("J2ME record-1 replace semantics OK");

const progressPath = `${new URL("../src/save/LegacyProgressStore.ts", import.meta.url).pathname}`;
const { LegacyProgressStore } = load(progressPath);
storage.set("t1", JSON.stringify([fakeBase64.btoa("bad gameplay record")]))
const progress = new LegacyProgressStore();
assert.equal(progress.loadGameplay(1, 96, 96), undefined);
assert.equal(storage.has("t1"), false);
console.log("RMS gameplay-slot malformed-record recovery OK");
