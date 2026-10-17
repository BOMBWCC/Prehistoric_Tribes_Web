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
vm.runInNewContext(output, { require: denseRequire, module, exports: module.exports, Int8Array, Int16Array });
const { stepLegacyAn } = module.exports;

const bytes = new Int8Array(17638);
const offsets = new Int16Array(312);
offsets[153] = 100;
bytes[100 + 29 + 25] = 1;
const release = [];
const q25 = { Q: 25, U: 5, H: false, P: true, I: true, vInt: 0, T: 0, q: 0, V: 8, Z: 0, aaInt: 0, mByte: 0, R: 18, S: 19, ac: false, y: 3, z: 0, A: 4, B: 0, IByte: 5, J: 0, K: 6, L: 0, selection: [true, false, true, false, true, false, true, false, true] };
stepLegacyAn({ state: q25, packedBytes: bytes, packedOffsets: offsets, onRelease: (v) => release.push(v) });
assert.deepEqual(release, [-1]);
assert.equal(q25.P, false);
assert.equal(q25.I, false);
assert.equal(q25.Q, 28);
assert.equal(q25.H, true);

bytes[100 + 145 + 20] = 0;
const q20 = { ...q25, Q: 20, selection: [true, false, true, false, true, false, true, false, true] };
let synced;
stepLegacyAn({ state: q20, packedBytes: bytes, packedOffsets: offsets, onSelectionSync: (values) => { synced = values; } });
assert.deepEqual(synced, q20.selection);
assert.equal(q20.Q, 28);
// Offsets 143..170: the camera is saved before the selection is restored.
assert.deepEqual([q20.z, q20.B, q20.J, q20.L], [3, 4, 5, 6]);

// Q == 20 with t153[165] != 0 does nothing but H = true -- it must not fall
// through to the t153[58 + Q] branches (it did before 2026-09-27).
bytes[100 + 145 + 20] = 1;
bytes[100 + 58 + 20] = 7;
const q20Locked = { ...q25, Q: 20, H: false };
stepLegacyAn({ state: q20Locked, packedBytes: bytes, packedOffsets: offsets, onSelectionSync: () => { throw new Error("no sync"); } });
assert.equal(q20Locked.Q, 20);
assert.equal(q20Locked.H, true);
bytes[100 + 58 + 20] = 0;

const q32 = { ...q25, Q: 32, P: true, I: true, H: false };
stepLegacyAn({ state: q32, packedBytes: bytes, packedOffsets: offsets });
assert.equal(q32.Q, q32.U);
assert.equal(q32.H, true);

const q14 = { ...q25, Q: 14, H: false };
let destroyed = 0;
stepLegacyAn({ state: q14, packedBytes: bytes, packedOffsets: offsets, onDestroy: () => { destroyed += 1; } });
assert.equal(destroyed, 1);

bytes[100 + 29 + 25] = 0;
bytes[100 + 58 + 25] = 1;
const transition = { ...q25, Q: 25, R: 17, S: 18, P: false, I: false, H: false, ac: false };
stepLegacyAn({ state: transition, packedBytes: bytes, packedOffsets: offsets, onEZero: () => {} });
assert.equal(transition.Q, 17);
assert.equal(transition.R, 18);
assert.equal(transition.Z, transition.aaInt);
assert.equal(transition.ac, true);
console.log("f.an() raw table-driven transitions OK");
