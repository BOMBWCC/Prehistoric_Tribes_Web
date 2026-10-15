import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function loadModule(file) {
  const module = { exports: {} };
  const output = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(output, { module, exports: module.exports });
  return module.exports;
}

const { LegacyGameState } = loadModule(new URL("../src/j2me/LegacyGameState.ts", import.meta.url).pathname);
const { stepLegacyGameplayCommand } = loadModule(new URL("../src/j2me/LegacyGameplayCommand.ts", import.meta.url).pathname);

const game = new LegacyGameState();
game.iByte = 3;
game.qByte = 3;
const calls = [];
stepLegacyGameplayCommand(game, { onEntityActionStart: (...args) => calls.push(args) });
assert.equal(game.iByte, -1);
assert.deepEqual(calls, [[20, 1, 0]]);

game.staticM = true;
game.wByte = 0;
// F:B is 0 until a map's h() k:Z reset sets it to -1 (oracle 2026-10-08); this branch needs -1.
game.FByte = -1;
game.qByte = 7;
game.wFlag = true;
stepLegacyGameplayCommand(game);
assert.equal(game.vByte, 0);
assert.equal(game.Q, 10);
assert.equal(game.R, 28);
assert.equal(game.XFlag, false);

// iByte===3, qByte!==3 else-branch: onExitPreparation then onI (private
// void i() #610, offset 391 -- found missing entirely 2026-08-22).
game.iByte = 3;
game.qByte = 7;
let exitPrepCalled = false;
let iCalled = false;
stepLegacyGameplayCommand(game, {
  onExitPreparation: () => { exitPrepCalled = true; },
  onI: () => { iCalled = true; },
});
assert.equal(exitPrepCalled, true);
assert.equal(iCalled, true);

// staticM && wByte===3: writes cSInt=0 (s:I #364, NOT the separate sByte
// field -- a real field mix-up fixed 2026-08-18) and calls onL(-1).
game.staticM = true;
game.wByte = 3;
game.cSInt = 99;
game.sByte = 42; // untouched by this branch -- confirms the fix didn't touch the wrong field
const lCalls = [];
stepLegacyGameplayCommand(game, { onL: (value) => lCalls.push(value) });
assert.equal(game.cSInt, 0);
assert.equal(game.sByte, 42);
assert.deepEqual(lCalls, [-1]);

console.log("f.W() proven command branches passed");
