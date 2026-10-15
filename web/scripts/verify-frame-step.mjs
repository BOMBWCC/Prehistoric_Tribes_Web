import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";

const cache = new Map();
function loadModule(path) {
  if (cache.has(path)) return cache.get(path).exports;
  const module = { exports: {} };
  cache.set(path, module);
  const output = ts.transpileModule(fs.readFileSync(path, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(output, { module, exports: module.exports, Int8Array });
  return module.exports;
}

const { LegacyGameState } = loadModule(`${new URL("../src/j2me/LegacyGameState.ts", import.meta.url).pathname}`);
const { stepLegacyFrame } = loadModule(`${new URL("../src/j2me/LegacyFrameStep.ts", import.meta.url).pathname}`);
const game = new LegacyGameState();
game.c = 0;
game.tailHCounter = 100;
game.pendingP = true;
game.wByte = 2;
game.uByte = 40;
game.vByte = 1;
const map = Array.from({ length: 96 }, () => new Int8Array(96));
map[1][3] = -116;
// Regression (2026-08-20): the sweep's own kept range is -116..-114
// inclusive (bytecode offsets 100..117: skip if value > -114, skip if
// value <= -117) -- a prior version of this file used -115 as the upper
// bound instead of -114, silently never repairing -114 cells. -114 at a
// second column proves the fixed boundary is actually reached.
map[1][7] = -114;
map[1][11] = -117; // one past the excluded lower bound -- must NOT repair
const calls = [];
stepLegacyFrame({
  game,
  map,
  updateSubsystem: () => calls.push("update"),
  repairCell: (...args) => calls.push(["repair", ...args]),
  flushPending: () => calls.push("flush"),
});
assert.deepEqual(calls, [
  "update",
  ["repair", 3, 1, 1, 1],
  ["repair", 7, 1, 1, 1],
  "flush",
]);
assert.equal(map[1][11], -117);
assert.equal(game.c, 1);
assert.equal(game.tailHCounter, 101);
assert.equal(game.uByte, 41);
assert.equal(game.vByte, 0);
assert.equal(game.Q, 24);
assert.equal(game.H, true);
assert.equal(game.vInt, 57);
assert.equal(game.oByte, 10);
assert.equal(game.oInt, 0);
assert.equal(map[1][3], 0);
assert.equal(map[1][7], 0);
console.log("f.j() raw frame step OK");
