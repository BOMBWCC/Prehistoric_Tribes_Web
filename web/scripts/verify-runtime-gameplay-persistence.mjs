import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import vm from "node:vm";

const sources = new Map();
const storage = new Map();
const context = {
  ArrayBuffer, DataView, Uint8Array, Uint16Array, Int8Array, Int16Array,
  Int32Array, Float32Array, Map, Set, Math, Number, String, Boolean, Object,
  Array, JSON, console, document: undefined,
  localStorage: {
    getItem(key) { return storage.has(key) ? storage.get(key) : null; },
    setItem(key, value) { storage.set(key, value); },
    removeItem(key) { storage.delete(key); },
  },
  btoa(value) { return Buffer.from(value, "binary").toString("base64"); },
  atob(value) { return Buffer.from(value, "base64").toString("binary"); },
  Buffer,
};

function load(path) {
  if (sources.has(path)) return sources.get(path).exports;
  const module = { exports: {} };
  sources.set(path, module);
  const output = ts.transpileModule(fs.readFileSync(path, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(output, {
    module,
    exports: module.exports,
    require: (specifier) => load(`${new URL(`../src/j2me/${specifier.replace("./", "")}.ts`, import.meta.url).pathname}`),
    ...context,
  });
  return module.exports;
}

const { LegacyRuntimeState } = load(`${new URL("../src/j2me/LegacyRuntimeState.ts", import.meta.url).pathname}`);
const { encodeGameplayRecord, decodeGameplayRecord } = load(`${new URL("../src/j2me/RmsGameplayRecord.ts", import.meta.url).pathname}`);
const runtime = new LegacyRuntimeState();
runtime.game.mapWidth = 4;
runtime.game.mapHeight = 3;
runtime.saveOffsets[121] = 5;
runtime.denseState.fill(9, 0, 5);
runtime.mainArrays.aByte[2][0] = 9;
runtime.gridC[0][0] = 9;
runtime.resetMapEntryAllocation(runtime.game.qByte);
assert.deepEqual([...runtime.denseState.slice(0, 5)], [0, 0, 0, 0, 0]);
assert.equal(runtime.mainArrays.aByte[2][0], 0);
assert.equal(runtime.gridC[0][0], 0);
assert.equal(runtime.subsystemArrays.bField50, 1);
assert.equal(runtime.subsystemArrays.dShort[0], -1);
assert.equal(runtime.subsystemArrays.j[49], 49);
runtime.game.c = 100;
runtime.packedOffsets[113] = 100;
runtime.packedOffsets[302] = 200;
runtime.packedOffsets[299] = 300;
runtime.packedOffsets[300] = 400;
for (let index = 0; index < 12; index += 1) runtime.packedBytes[100 + index] = index;
runtime.packedBytes[200] = 0;
runtime.packedBytes[201] = 1;
runtime.packedBytes[300] = 1;
runtime.packedBytes[400] = 0;
runtime.runSubsystemJ(0);
assert.equal(runtime.mainArrays.f[0], 1);
assert.equal(runtime.subsystemArrays.bJCursor, 1);
runtime.mainArrays.aInt[0][0][0] = 1;
runtime.mainArrays.aInt[1][0][0] = 4;
runtime.denseState[1920] = 1;
runtime.runSpatialPass({});
assert.equal(runtime.mainArrays.aInt[1][0][0], 0);
assert.equal(runtime.mainArrays.aInt[0][0][0], 1);
runtime.game.qByte = 7;
runtime.game.persistedPByte = 8;
runtime.game.persistedDByte = 9;
runtime.game.persistedQ2.set([10, -11]);
runtime.game.c = 0x10203040;
runtime.denseState[7979] = 64;
runtime.gridC[2][3] = -111;
runtime.gridC[1][0] = -122;
// Unit 1 (alive via 1920 above) standing at (2, 0) with 4646 < 0: the save
// keeps no unit ids in the grid; f.d(int) offsets 1127..1459 put it back.
runtime.denseState[1] = 2;
runtime.denseState[102] = 0;
runtime.denseState[4647] = -1;
runtime.gridC[0][2] = 1;

const record = runtime.snapshotGameplayRecord();
const roundTrip = decodeGameplayRecord(encodeGameplayRecord(record), 4, 3);
runtime.saveGameplayToStore(1);
const restored = new LegacyRuntimeState();
restored.game.mapWidth = 4;
restored.game.mapHeight = 3;
restored.game.Q = 28;
restored.game.vByte = 1;
assert.equal(restored.loadGameplayFromStore(1, 4, 3), true);
// f.d(int) never writes Q or v (am() already set Q = R = 28): a load from
// Continue must not fall back to the title screen (fixed 2026-09-27).
assert.equal(restored.game.Q, 28);
assert.equal(restored.game.vByte, 1);
// f.d(int) offset 1954 runs b.n(): the zone heads are rebuilt (-1 = empty),
// not left at the cold-boot zeros that made p()'s list walk loop forever.
assert.equal(restored.gridC[0][2], 1); // f.d(int) 988..1947 grid rebuild (2026-09-27)
assert.ok(restored.subsystemArrays.c.some((layer) => layer.some((row) => row.some((v) => v === -1))));
assert.deepEqual([...restored.snapshotGameplayRecord().denseState], [...roundTrip.denseState]);

assert.equal(restored.game.qByte, 7);
// CORRECTION (2026-08-24): game.subsystemQ (previously also asserted here)
// was a disconnected duplicate of qByte, deleted -- see qByte's own
// docblock for the full trace.
assert.equal(restored.game.qByte, 7);
assert.equal(restored.game.persistedPByte, 8);
assert.equal(restored.game.persistedDByte, 9);
assert.deepEqual([...restored.game.persistedQ2], [10, -11]);
assert.equal(restored.game.c, 0x10203040);
assert.equal(restored.denseState[7979], 64);
assert.equal(restored.gridC[2][3], -111);
assert.equal(restored.gridC[1][0], -122);
console.log("Runtime RMS snapshot/hydration preserves confirmed raw fields OK");
