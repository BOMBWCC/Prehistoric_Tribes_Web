// End-to-end proof that keyPressed(int)'s digit tableswitch (LegacyKeyHandlers'
// onDigitLatch) is the literal mechanism that drives f.W()'s (LegacyGameplayCommand)
// i==1 viewport-reset and i==3 onEntityActionStart(20,1,0) branches. Before this
// wiring existed, LegacyRuntimeState.projectRawKeyPressed never wrote game.digitKey
// for digit keys, so stepLegacyGameplayCommand's two most important branches were
// permanently unreachable from the keyboard.
import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";

function load(relativePath) {
  const path = new URL(relativePath, import.meta.url).pathname;
  const output = ts.transpileModule(fs.readFileSync(path, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const module = { exports: {} };
  vm.runInNewContext(output, { module, exports: module.exports });
  return module.exports;
}

const { legacyKeyPressed } = load("../src/core/LegacyKeyHandlers.ts");
const { stepLegacyGameplayCommand } = load("../src/ui/LegacyGameplayCommand.ts");

// Minimal LegacyGameState-shaped object; only the fields stepLegacyGameplayCommand reads.
function freshGame() {
  return {
    staticL: false, staticM: false, barMode: 0, sByte: 0, selectionGroup: -1,
    digitKey: -1, ayByte: 0, AFlag: false, mission: 3, loopMode: 1,
    screen: 0, R: 0, Z: 0, H: false, XFlag: false,
    zByte: 0, BByte: 0, JByte: 0, selectedId: 0, cursorColumn: 0, cursorRow: 0, cameraColumn: 0, cameraRow: 0,
    tByte: 0, wFlag: false,
  };
}

// Simulates LegacyRuntimeState's onDigitLatch wiring.
function pressDigit(game, keyCode) {
  const rawState = {
    nGuard: false, oGuard: false, numericByte: -1, numericHeld: false,
    fireHeld: false, firePressed: false, repeatCount: 0, animationCounter: 4,
    fireReleased: false, pendingRelease: false,
    actionUp: false, actionDown: false, actionLeft: false, actionRight: false,
  };
  legacyKeyPressed(rawState, keyCode, {
    getGameAction: () => 666,
    onDigitLatch: (value, holdW) => {
      game.digitKey = value;
      if (holdW) game.wFlag = true;
    },
  });
}

// Digit '3' (raw keyCode 51) with qByte==3 must reach f.a(20,1,0) -> f.ap().
const entityActionGame = freshGame();
pressDigit(entityActionGame, 51);
assert.equal(entityActionGame.digitKey, 3);
assert.equal(entityActionGame.wFlag, true);
const entityActionCalls = [];
stepLegacyGameplayCommand(entityActionGame, {
  onEntityActionStart: (ap, am, an) => entityActionCalls.push([ap, am, an]),
});
assert.deepEqual(entityActionCalls, [[20, 1, 0]]);
assert.equal(entityActionGame.digitKey, -1, "f.W() must consume i back to -1");

// Digit '1' (raw keyCode 49) with ayByte==1 must reach the viewport-reset branch.
const viewportGame = freshGame();
viewportGame.ayByte = 1;
pressDigit(viewportGame, 49);
assert.equal(viewportGame.digitKey, 1);
let viewportResets = 0;
stepLegacyGameplayCommand(viewportGame, { onViewportReset: () => { viewportResets += 1; } });
assert.equal(viewportResets, 1);
assert.equal(viewportGame.AFlag, true);

console.log("digit latch -> f.W() entity-action/viewport wiring OK");
