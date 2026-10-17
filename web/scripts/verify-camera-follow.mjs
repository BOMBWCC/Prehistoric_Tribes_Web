import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";

const path = new URL("../src/render/LegacyCameraFollow.ts", import.meta.url).pathname;
const output = ts.transpileModule(fs.readFileSync(path, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(output, { module, exports: module.exports });
const { stepLegacyCameraFollow } = module.exports;

function fresh(overrides = {}) {
  return {
    cameraBFlag: false,
    inputUp: false, inputDown: false, inputLeft: false, inputRight: false,
    cursorColumn: 0, cursorRow: 0, cursorTargetColumn: 0, cursorTargetRow: 0,
    originColumn: 5, originRow: 5,
    columnScrollDelta: 0, rowScrollDelta: 0,
    mapWidth: 96, mapHeight: 96,
    viewportColumns: 12, viewportRows: 19,
    selectionFlags: new Array(20).fill(false),
    selectionBa: 0,
    ...overrides,
  };
}

// cameraBFlag suppresses everything, no matter what direction is held.
{
  const state = fresh({ cameraBFlag: true, inputUp: true });
  const before = { ...state };
  stepLegacyCameraFollow(state);
  assert.deepEqual(state, before);
}

// No direction held -> no-op.
{
  const state = fresh();
  const before = { ...state };
  stepLegacyCameraFollow(state);
  assert.deepEqual(state, before);
}

// UP: cursorRow > cursorTargetRow -> just moves the cursor, no camera pan.
{
  const state = fresh({ inputUp: true, cursorRow: 3, cursorTargetRow: 1 });
  stepLegacyCameraFollow(state);
  assert.equal(state.cursorRow, 2);
  assert.equal(state.originRow, 5); // unchanged
  assert.equal(state.rowScrollDelta, 0);
}

// UP, cursor at its target: f.Y() offsets 206..239 pan when
// `(K > 0 && !a[4]) || (K > 1 && a[4])` (fixed 2026-10-07; the port had
// both tests inverted, so the map never scrolled up from row 1 or more).
{
  const state = fresh({ inputUp: true, cursorRow: 4, cursorTargetRow: 4, originRow: 5 });
  stepLegacyCameraFollow(state);
  assert.equal(state.originRow, 4);
  assert.equal(state.rowScrollDelta, -1);
  assert.equal(state.cursorRow, 4); // untouched
}

// UP: originRow===0 -> no pan; cursorRow===0 so nothing moves.
{
  const state = fresh({ inputUp: true, cursorRow: 0, cursorTargetRow: 0, originRow: 0 });
  stepLegacyCameraFollow(state);
  assert.equal(state.originRow, 0);
  assert.equal(state.rowScrollDelta, 0);
  assert.equal(state.cursorRow, 0);
}

// UP: originRow===1 AND selectionFlags[4] -> no pan (needs K > 1).
{
  const state = fresh({ inputUp: true, cursorRow: 0, cursorTargetRow: 0, originRow: 1 });
  state.selectionFlags[4] = true;
  stepLegacyCameraFollow(state);
  assert.equal(state.originRow, 1);
  assert.equal(state.rowScrollDelta, 0);
}

// UP: originRow===1 without selectionFlags[4] -> pans to 0.
{
  const state = fresh({ inputUp: true, cursorRow: 0, cursorTargetRow: 0, originRow: 1 });
  stepLegacyCameraFollow(state);
  assert.equal(state.originRow, 0);
  assert.equal(state.rowScrollDelta, -1);
}

// DOWN: cursorRow < cursorTargetRow -> just moves cursor.
{
  const state = fresh({ inputDown: true, cursorRow: 0, cursorTargetRow: 3 });
  stepLegacyCameraFollow(state);
  assert.equal(state.cursorRow, 1);
  assert.equal(state.originRow, 5);
}

// DOWN: at target, room to pan (originRow < mapHeight-viewportRows-1-(ba>>5)) -> pans.
{
  // mapHeight=96, viewportRows=19, ba=0 -> threshold = 96-19-1-0 = 76.
  const state = fresh({ inputDown: true, cursorRow: 0, cursorTargetRow: 0, originRow: 50 });
  stepLegacyCameraFollow(state);
  assert.equal(state.originRow, 51);
  assert.equal(state.rowScrollDelta, 1);
}

// DOWN: at the pan threshold (originRow===76, not < 76) -> no camera pan;
// falls to the cursor-catch-up branch if there's still room
// (originRow+cursorRow < mapHeight-2-(ba>>5) = 94).
{
  const state = fresh({ inputDown: true, cursorRow: 0, cursorTargetRow: 0, originRow: 76 });
  stepLegacyCameraFollow(state);
  assert.equal(state.originRow, 76); // no pan
  assert.equal(state.cursorRow, 1); // cursor catch-up instead
}

// DOWN: selectionBa shifts the threshold (>>5 division).
{
  // ba=64 -> ba>>5=2 -> threshold = 96-19-1-2=74.
  const state = fresh({ inputDown: true, cursorRow: 0, cursorTargetRow: 0, originRow: 74, selectionBa: 64 });
  stepLegacyCameraFollow(state);
  assert.equal(state.originRow, 74); // 74 is not < 74 -> no pan
  assert.equal(state.cursorRow, 1); // falls to cursor branch
}

// LEFT: cursorColumn > cursorTargetColumn -> just moves cursor.
{
  const state = fresh({ inputLeft: true, cursorColumn: 3, cursorTargetColumn: 1 });
  stepLegacyCameraFollow(state);
  assert.equal(state.cursorColumn, 2);
  assert.equal(state.originColumn, 5);
}

// LEFT: at target, originColumn>0 -> pans.
{
  const state = fresh({ inputLeft: true, cursorColumn: 0, cursorTargetColumn: 0, originColumn: 5 });
  stepLegacyCameraFollow(state);
  assert.equal(state.originColumn, 4);
  assert.equal(state.columnScrollDelta, -1);
}

// LEFT: originColumn===0 -> no pan; falls to cursor branch if cursorColumn>0.
{
  const state = fresh({ inputLeft: true, cursorColumn: 2, cursorTargetColumn: 2, originColumn: 0 });
  stepLegacyCameraFollow(state);
  assert.equal(state.originColumn, 0);
  assert.equal(state.cursorColumn, 1);
}

// RIGHT: cursorColumn < cursorTargetColumn -> just moves cursor.
{
  const state = fresh({ inputRight: true, cursorColumn: 0, cursorTargetColumn: 3 });
  stepLegacyCameraFollow(state);
  assert.equal(state.cursorColumn, 1);
  assert.equal(state.originColumn, 5);
}

// RIGHT: at target, room to pan (originColumn < mapWidth-viewportColumns=84) -> pans.
{
  const state = fresh({ inputRight: true, cursorColumn: 0, cursorTargetColumn: 0, originColumn: 50 });
  stepLegacyCameraFollow(state);
  assert.equal(state.originColumn, 51);
  assert.equal(state.columnScrollDelta, 1);
}

// RIGHT: at the pan threshold (originColumn===84) -> no pan; cursor catch-up
// if originColumn+cursorColumn < mapWidth-1=95.
{
  const state = fresh({ inputRight: true, cursorColumn: 0, cursorTargetColumn: 0, originColumn: 84 });
  stepLegacyCameraFollow(state);
  assert.equal(state.originColumn, 84);
  assert.equal(state.cursorColumn, 1);
}

// Direction priority: inputUp checked before inputDown/Left/Right when
// multiple are somehow held simultaneously (matches the if/if/if/if chain,
// not else-if -- but since UP returns unconditionally, only UP's branch runs).
{
  const state = fresh({ inputUp: true, inputDown: true, cursorRow: 3, cursorTargetRow: 1 });
  stepLegacyCameraFollow(state);
  assert.equal(state.cursorRow, 2); // UP's logic ran
}

console.log("f.Y() camera-follow state machine OK");
