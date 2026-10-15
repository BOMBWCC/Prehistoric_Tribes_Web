import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";

const path = `${new URL("../src/j2me/LegacySpecialTileAllocator.ts", import.meta.url).pathname}`;
const source = fs.readFileSync(path, "utf8");
const output = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(output, { module, exports: module.exports });
const { allocateLegacySpecialTile } = module.exports;
const state = new Int8Array(9983);
const overlay = new Int8Array(4 * 3);
const setCell = (x, y, v) => { if (x >= 0 && x < 4 && y >= 0 && y < 3) overlay[y * 4 + x] = v; };
const slot = allocateLegacySpecialTile(state, setCell, { type: 1, x: 2, y: 1, parameter: 9 });
assert.equal(slot, 0);
assert.deepEqual([state[9833], state[9733], state[9783], state[9883]], [1, 2, 1, 9]);
assert.equal(overlay[6], -61);
state[9833] = 1;
const slot2 = allocateLegacySpecialTile(state, setCell, { type: 2, x: 1, y: 0, parameter: 8 });
assert.equal(slot2, 1);
assert.equal(overlay[1], -62);

// All 50 in use: reuse the first kind 6 OR 7 slot and clear its old cell
// (offsets 44..117; the port used to skip kind 7 and leave the cell).
for (let i = 0; i < 50; i += 1) state[9833 + i] = 3;
state[9833 + 4] = 7; state[9733 + 4] = 3; state[9783 + 4] = 2; overlay[2 * 4 + 3] = -65;
state[9833 + 9] = 6;
const reused = allocateLegacySpecialTile(state, setCell, { type: 6, x: 0, y: 2, parameter: 5 });
assert.equal(reused, 4);
assert.equal(overlay[2 * 4 + 3], 0);
assert.equal(overlay[2 * 4 + 0], -65);
console.log("f.a special tile allocation OK");
