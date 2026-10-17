import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";

const path = new URL("../src/render/LegacyEffectRectMark.ts", import.meta.url).pathname;
const output = ts.transpileModule(fs.readFileSync(path, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(output, { module, exports: module.exports });
const { stepLegacyCRect } = module.exports;

function grid(rows, cols) {
  return Array.from({ length: rows }, () => new Array(cols).fill(false));
}

// Marks every (x,y) in the rectangle where isBlocked returns true; B always
// ends up true regardless of whether anything was marked.
{
  const boolGrid = grid(20, 20);
  const state = { boolGrid, originColumn: 2, originRow: 3, B: false };
  const blocked = new Set(["5,6", "6,7"]); // "x,y" pairs
  stepLegacyCRect(4, 5, 3, 3, state, {
    isBlocked: (x, y) => blocked.has(`${x},${y}`),
  });
  assert.equal(boolGrid[6 - 3][5 - 2], true);
  assert.equal(boolGrid[7 - 3][6 - 2], true);
  // Nothing else in the 3x3 rectangle [4..6]x[5..7] should be marked.
  let markedCount = 0;
  for (let row = 0; row < 20; row += 1) {
    for (let col = 0; col < 20; col += 1) {
      if (boolGrid[row][col]) markedCount += 1;
    }
  }
  assert.equal(markedCount, 2);
  assert.equal(state.B, true);
}

// A 1x1 rectangle (the f.j() sweep's call shape) checks exactly one cell.
{
  const boolGrid = grid(10, 10);
  const state = { boolGrid, originColumn: 0, originRow: 0, B: false };
  const calls = [];
  stepLegacyCRect(3, 4, 1, 1, state, {
    isBlocked: (x, y) => { calls.push([x, y]); return false; },
  });
  assert.deepEqual(calls, [[3, 4]]);
  assert.equal(state.B, true);
}

// isBlocked always false -> no marks, but B still flips true.
{
  const boolGrid = grid(10, 10);
  const state = { boolGrid, originColumn: 0, originRow: 0, B: false };
  stepLegacyCRect(0, 0, 5, 5, state, { isBlocked: () => false });
  assert.ok(boolGrid.every((row) => row.every((cell) => cell === false)));
  assert.equal(state.B, true);
}

// No isBlocked callback provided -> treated as always-false (no marks), B still flips.
{
  const boolGrid = grid(10, 10);
  const state = { boolGrid, originColumn: 0, originRow: 0, B: false };
  stepLegacyCRect(0, 0, 3, 3, state, {});
  assert.ok(boolGrid.every((row) => row.every((cell) => cell === false)));
  assert.equal(state.B, true);
}

console.log("f.c(int,int,int,int) effect-rect mark OK");
