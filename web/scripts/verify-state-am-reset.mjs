import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";

const path = `${new URL("../src/j2me/LegacyStateMachine.ts", import.meta.url).pathname}`;
const output = ts.transpileModule(fs.readFileSync(path, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(output, { module, exports: module.exports, Int8Array, Int16Array, Int32Array, Math });
const { resetLegacyAM } = module.exports;

const dense = new Int8Array(5000).fill(9);
const aRows = Array.from({ length: 5 }, () => new Int8Array(50).fill(9));
const u = new Int8Array(10).fill(9);
const c3 = [Array.from({ length: 5 }, () => new Int8Array(4).fill(9))];
const entitySlots = new Int8Array(30).fill(9);
const intLayers = Array.from({ length: 3 }, () => new Int32Array(96).fill(9));
const bytePlanes = Array.from({ length: 2 }, () => Array.from({ length: 10 }, () => new Int8Array(12).fill(9)));
const f4 = Array.from({ length: 4 }, () => new Int8Array(30).fill(9));
const bPlanes = Array.from({ length: 2 }, () => Array.from({ length: 5 }, () => new Int8Array(30).fill(9)));
const map = Array.from({ length: 96 }, () => new Int8Array(96).fill(9));
const bMap = Array.from({ length: 96 }, () => new Int8Array(96).fill(9));
map[0][0] = 0;
bMap[0][0] = 7;
const g = Array.from({ length: 8 }, () => new Int8Array(12).fill(9));
const shortRows = [new Int16Array(26).fill(9), new Int16Array(26).fill(9)];
const state = { uFlag: true, tFlag: true, F: 4, LFlag: true, NFlag: true, FFlag: true, KFlag: true, X: 8, W: 7, aL: 6, uByte: 5, ay: 4, kFlag: false, cInt: 9, h: 9 };
const events = [];
resetLegacyAM({ state, dense, denseLimit: 3, aRows, u, c3, entitySlots, intLayers, bytePlanes, f4, bPlanes, map, bMap, g, gRows: 5, gCols: 3, shortRows, sFlag: false, onT: () => events.push("t"), onBankReset: () => events.push("bank"), onInputReset: () => events.push("input") });
assert.equal(dense[0], 0); assert.equal(dense[2], 0); assert.equal(dense[4040], -100); assert.equal(dense[4242], 1); assert.equal(dense[4343], -1);
assert.equal(aRows[2][0], 0); assert.equal(u[0], 0); assert.equal(c3[0][0][2], -1); assert.equal(entitySlots[29], 0);
assert.equal(intLayers[2][95], 0); assert.equal(bytePlanes[1][9][11], 0); assert.equal(f4[3][29], 0); assert.equal(bPlanes[1][4][29], 0);
// Offsets 389..406: c[i][j] = b[i][j] = 0 -- both planes cleared, nothing copied.
assert.equal(map[0][0], 0); assert.equal(bMap[0][0], 0); assert.equal(map[95][95], 0); assert.equal(bMap[95][95], 0); assert.equal(g[4][2], 0); assert.equal(shortRows[0][16], 1); assert.equal(shortRows[0][17], 0);
assert.deepEqual(events, ["t", "bank", "input"]); assert.equal(state.kFlag, true); assert.equal(state.uFlag, false); assert.equal(state.cInt, 0); assert.equal(state.h, 0);

console.log("f.aM() raw reset OK");
