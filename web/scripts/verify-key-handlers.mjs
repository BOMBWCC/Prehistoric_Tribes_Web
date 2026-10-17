import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";

const path = `${new URL("../src/core/LegacyKeyHandlers.ts", import.meta.url).pathname}`;
const output = ts.transpileModule(fs.readFileSync(path, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(output, { module, exports: module.exports });
const { legacyKeyPressed, legacyKeyReleased } = module.exports;

const state = {
  nGuard: false, oGuard: false, numericByte: -1, numericHeld: false,
  fireHeld: false, firePressed: false, repeatCount: 0, animationCounter: 0,
  fireReleased: false, pendingRelease: false,
  actionUp: false, actionDown: false, actionLeft: false, actionRight: false,
};
const actions = new Map([[50, 1], [52, 2], [54, 5], [56, 6], [53, 8]]);
const hooks = { getGameAction: (keyCode) => actions.get(keyCode) ?? 666 };

legacyKeyPressed(state, 50, hooks);
assert.equal(state.oGuard, true);
assert.equal(state.actionUp, true);
legacyKeyReleased(state, 50, hooks);
assert.equal(state.pendingRelease, true);
state.oGuard = false;
legacyKeyReleased(state, 50, hooks);
assert.equal(state.actionUp, false);

const fire = { ...state, oGuard: false, animationCounter: 2, fireReleased: false };
legacyKeyPressed(fire, 53, hooks);
assert.equal(fire.repeatCount, 1);
assert.equal(fire.animationCounter, 0);
legacyKeyReleased(fire, 53, hooks);
assert.equal(fire.fireReleased, true);

let star = 0;
legacyKeyPressed({ ...state, oGuard: false }, 42, { onStar: () => { star += 1; } });
assert.equal(star, 1);

// keyPressed(int) bytecode offsets 86..257: the digit tableswitch writes raw
// field i:B from the matched case and additionally sets w:Z for every case
// except 48. keyReleased(int) offsets 21..166 clear w:Z for 49/51/55/57 only.
const digitLatches = [];
const digitCases = [[48, 0, false], [49, 1, true], [51, 3, true], [55, 7, true], [57, 9, true]];
for (const [keyCode, value, holdW] of digitCases) {
  digitLatches.length = 0;
  legacyKeyPressed({ ...state, oGuard: false }, keyCode, {
    getGameAction: () => 666,
    onDigitLatch: (v, w) => digitLatches.push([v, w]),
  });
  assert.deepEqual(digitLatches, [[value, holdW]]);
}

let digitReleases = 0;
legacyKeyReleased({ ...state, oGuard: false }, 48, { getGameAction: () => 666, onDigitRelease: () => { digitReleases += 1; } });
assert.equal(digitReleases, 0, "digit 0 release must not clear w:Z");
legacyKeyReleased({ ...state, oGuard: false }, 51, { getGameAction: () => 666, onDigitRelease: () => { digitReleases += 1; } });
assert.equal(digitReleases, 1, "digit 3 release must clear w:Z");

// f.j:B (#325) = 0 on an accepted press and on every release (keyPressed
// offset 31, keyReleased offset 18), but not while the o guard is up.
{
  let resets = 0;
  const idle = { ...hooks, onIdleReset: () => { resets += 1; } };
  const s2 = { ...state, nGuard: false, oGuard: false };
  legacyKeyPressed(s2, 53, idle);
  assert.equal(resets, 1);
  legacyKeyPressed(s2, 53, idle); // o:Z still set: returns before the reset
  assert.equal(resets, 1);
  legacyKeyReleased(s2, 53, idle);
  assert.equal(resets, 2);
}

console.log("raw keyPressed/keyReleased handlers OK");
