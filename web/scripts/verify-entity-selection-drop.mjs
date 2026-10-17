// Behaviour test for LegacyEntitySelectionDrop.ts: final void f(int) (#383),
// bytecode/f-javap.txt line 28740, offsets 0..79.
import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";
import { denseRequire } from "./dense-layout-require.mjs";

const path = new URL("../src/ui/LegacyEntitySelectionDrop.ts", import.meta.url).pathname;
const output = ts.transpileModule(fs.readFileSync(path, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(output, { require: denseRequire, module, exports: module.exports, Int8Array });
const { stepLegacyEntitySelectionDrop } = module.exports;

const ID = 7;
const RECORD = 12;

function fixture(kByte, wByte, recordKind = 0) {
  const state = new Int8Array(10000);
  state[8749 + RECORD] = recordKind;
  const game = { kByte, barMode: wByte, selectedId: 5 };
  const calls = [];
  return {
    input: {
      state, qCounter: RECORD, game,
      onSelectionRefresh: (...a) => calls.push(a),
    },
    game, calls,
  };
}

// A unit that is not the one under the cursor changes nothing.
{
  const { input, game, calls } = fixture(3, 1);
  stepLegacyEntitySelectionDrop(input, ID);
  assert.deepEqual([game.kByte, game.barMode, game.selectedId], [3, 1, 5]);
  assert.deepEqual(calls, []);
}

// The unit panel (w 1) always closes, and the focus id goes with it.
{
  const { input, game, calls } = fixture(ID, 1);
  stepLegacyEntitySelectionDrop(input, ID);
  assert.deepEqual([game.kByte, game.barMode, game.selectedId], [0, 0, 0]);
  assert.deepEqual(calls, [[true, true, false, false]]);
}

// The building panel (w 2) closes only over a storehouse (kind 6).
{
  const { input, game, calls } = fixture(ID, 2, 6);
  stepLegacyEntitySelectionDrop(input, ID);
  assert.deepEqual([game.kByte, game.barMode], [0, 0]);
  assert.equal(game.selectedId, 5, "the focus id is NOT cleared on this branch");
  assert.deepEqual(calls, [[true, true, false, false]]);
}

// ... over any other kind it stays open.
{
  const { input, game, calls } = fixture(ID, 2, 4);
  stepLegacyEntitySelectionDrop(input, ID);
  assert.equal(game.kByte, 0, "the cursor is still cleared");
  assert.equal(game.barMode, 2, "but the panel stays");
  assert.deepEqual(calls, []);
}

// With no panel open the cursor is cleared and nothing else happens.
{
  const { input, game, calls } = fixture(ID, 0);
  stepLegacyEntitySelectionDrop(input, ID);
  assert.deepEqual([game.kByte, game.barMode, game.selectedId], [0, 0, 5]);
  assert.deepEqual(calls, []);
}

console.log("f.f(int) #383 selection drop OK");
