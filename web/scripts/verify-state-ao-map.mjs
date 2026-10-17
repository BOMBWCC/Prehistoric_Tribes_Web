import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";
import { denseRequire } from "./dense-layout-require.mjs";

const path = `${new URL("../src/ui/LegacyStateMachine.ts", import.meta.url).pathname}`;
const output = ts.transpileModule(fs.readFileSync(path, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(output, { require: denseRequire, module, exports: module.exports, Int8Array, Int16Array, Math });
const { stepLegacyAOMap } = module.exports;

const bytes = new Int8Array(17638); const offsets = new Int16Array(312); offsets[150] = 200;
bytes[200 + 6] = 20; bytes[200 + 7] = 30;
const aShort = [new Int16Array(26), new Int16Array(26)];
aShort[0][17] = 99;
const state = { q: 3, C: 2, D: 4, y: 0, A: 0, I: 0, J: 0, K: 0, L: 0, z: 0, B: 0 };
const events = [];
stepLegacyAOMap({ state, packedBytes: bytes, packedOffsets: offsets, aShort, onAP: () => events.push("aP"), onViewportNormalize: () => events.push("aK"), onSpatialPass: () => events.push("b.d") });
// Offsets 4..25 write f.a:[[S[0][17], not the /pd0 byte table. This file used
// to assert `bytes[200 + 17] === 0`, which the port never wrote and which an
// all-zero Int8Array satisfies for free -- the assertion pinned nothing while
// the port corrupted `packedBytes[packedOffsets[153] + 162]` on every call.
assert.equal(aShort[0][17], 0, "q === 3 stores 0");
assert.equal(state.y, 2); assert.equal(state.A, 4);
assert.equal(state.I, 18); assert.equal(state.J, 18); assert.equal(state.K, 26); assert.equal(state.L, 26); assert.equal(state.z, 2); assert.equal(state.B, 4);
assert.deepEqual(events, ["aP", "aK", "b.d"]);

// The other arm of the same store: any q !== 3 writes 1.
const other = { q: 0, C: 2, D: 4, y: 0, A: 0, I: 0, J: 0, K: 0, L: 0, z: 0, B: 0 };
stepLegacyAOMap({ state: other, packedBytes: bytes, packedOffsets: offsets, aShort });
assert.equal(aShort[0][17], 1, "q !== 3 stores 1");
// And nothing in aO() touches the /pd0 byte table.
assert.equal(bytes[offsets[153] + 145 + 17], 0, "aO() must not write packedBytes");

console.log("f.aO() raw map-entry wrapper OK");
