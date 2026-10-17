import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import ts from "typescript";

const srcDir = new URL("../src/", import.meta.url).pathname;
const context = vm.createContext({ Int8Array, Int16Array, Int32Array, Array, console, Math });
const cache = new Map();

function loadModule(specifier, fromDir) {
  const absPath = path.resolve(fromDir, specifier) + ".ts";
  if (cache.has(absPath)) return cache.get(absPath).exports;
  const module = { exports: {} };
  cache.set(absPath, module);
  const source = fs.readFileSync(absPath, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const localRequire = (spec) => loadModule(spec, path.dirname(absPath));
  const fn = vm.compileFunction(output, ["module", "exports", "require"], { parsingContext: context });
  fn(module, module.exports, localRequire);
  return module.exports;
}

const { LegacyGameState } = loadModule("./core/LegacyGameState", srcDir);
const { stepLegacyGameplayInput } = loadModule("./ui/LegacyGameplayInput", srcDir);

const dense = new Int8Array(20000);
const map = [];

const game = new LegacyGameState();
game.boxSelecting = true;
game.iFlag = true;
game.inputI = 4;
game.barMode = 1;
const calls = [];
stepLegacyGameplayInput(game, dense, map, {
  onW: () => calls.push("W"),
  onAF: () => calls.push("aF"),
  onAG: () => calls.push("aG"),
});
assert.deepEqual(calls, ["W", "aF", "aG"]);
assert.equal(game.iFlag, false);

// wByte=2 avoids every real dispatch branch below (no onD/onE/onF/onXDispatch
// fires), isolating the inputV/aL()/tail mechanics this case is testing.
game.barMode = 2;
game.inputV = true;
stepLegacyGameplayInput(game, dense, map, { onAL: () => calls.push("aL") });
assert.equal(game.inputV, false);
assert.equal(game.E, 4); // f.E:B (#47) -- NOT reset to 1 within this method
assert.equal(game.cEFlag, true); // E:Z (#46)
assert.equal(game.animStep, 0);
assert.equal(calls.at(-1), "aL");

// The aE() branch: inputT true and wByte!==3 -> onAE fires, iFlag clears.
{
  const g = new LegacyGameState();
  g.boxSelecting = false; g.inputT = true; g.barMode = 1; g.iFlag = true;
  const c = [];
  stepLegacyGameplayInput(g, dense, map, { onAE: () => c.push("aE") });
  assert.deepEqual(c, ["aE"]);
  assert.equal(g.iFlag, false);
}

// The trailing else branch (2026-08-14 correction) is UNCONDITIONAL --
// reached whenever neither of the first two conditions match, not just
// wByte===3. Case A: inputT===false (any wByte) must still reach it.
{
  const g = new LegacyGameState();
  g.boxSelecting = false; g.inputT = false; g.barMode = 1;
  g.aeTimerF = 99;
  const c = [];
  stepLegacyGameplayInput(g, dense, map, { onAF: () => c.push("aF"), onAE: () => c.push("aE") });
  assert.deepEqual(c, []); // neither aF nor aE fires
  assert.equal(g.aeTimerF, 0); // f.F:I (#52) reset to 0, not FByte=-1
}

// Case B: inputT===true but wByte===3 also falls through to the same
// unconditional else (the aE() branch's own `wByte!==3` guard excludes it).
{
  const g = new LegacyGameState();
  g.boxSelecting = false; g.inputT = true; g.barMode = 3;
  g.aeTimerF = 42;
  const c = [];
  stepLegacyGameplayInput(g, dense, map, { onAF: () => c.push("aF"), onAE: () => c.push("aE") });
  assert.deepEqual(c, []);
  assert.equal(g.aeTimerF, 0);
}

// 2026-08-18: the movement/target dispatch (offsets 111..384), gated on
// inputV, plus the fix for a real pre-existing bug -- aL()/the Y() gate
// used to be skipped entirely whenever inputV was false. Verify they now
// fire even when inputV is false (using wByte=2, IByte/KByte at their
// zero defaults, so none of the target/cell dispatch branches match).
{
  const g = new LegacyGameState();
  g.barMode = 2;
  g.inputV = false;
  const c = [];
  stepLegacyGameplayInput(g, dense, map, { onAL: () => c.push("aL"), onY: () => c.push("Y") });
  assert.deepEqual(c, ["aL", "Y"]); // columnScrollDelta/rowScrollDelta/cameraCFlag all default to 0/0/false
}

// wByte===3 -> onXDispatch fires (stepLegacyX's real caller).
{
  const g = new LegacyGameState();
  g.barMode = 3;
  g.inputV = true;
  const c = [];
  stepLegacyGameplayInput(g, dense, map, { onXDispatch: () => c.push("X") });
  assert.deepEqual(c, ["X"]);
}

// wByte===1, cWByte in 51..100 -> onE(target) fires with y/A derived from dense.
{
  const g = new LegacyGameState();
  g.barMode = 1;
  g.inputV = true;
  g.hoverUnit = 60;
  g.cameraColumn = 3; g.cameraRow = 5;
  dense[0 + 60] = 10; // -> yByte = 10-3 = 7
  dense[101 + 60] = 20; // -> AByte = 20-5 = 15
  const c = [];
  stepLegacyGameplayInput(g, dense, map, { onE: (arg) => c.push(arg) });
  assert.deepEqual(c, [60]);
  assert.equal(g.cursorColumn, 7);
  assert.equal(g.cursorRow, 15);
  dense[0 + 60] = 0; dense[101 + 60] = 0;
}

// classify(cell)===0 (cell in 1..50) -> onD(cell) fires, using the real
// map/gridC cell lookup at [KByte+AByte][IByte+yByte].
{
  const g = new LegacyGameState();
  g.barMode = 2; // avoid the wByte===1/3/0 branches
  g.inputV = true;
  g.cameraColumn = 1; g.cursorColumn = 1; g.cameraRow = 2; g.cursorRow = 2;
  const m = [];
  m[4] = new Int8Array(4);
  m[4][2] = 25; // classifyLegacyPositiveEntity(25) === 0 (1..50 range)
  const c = [];
  stepLegacyGameplayInput(g, dense, m, { onD: (arg) => c.push(arg) });
  assert.deepEqual(c, [25]);
}

// wByte===0, classify(cell)===0 for negative ids (cell in -1..-30) -> onF(-cell).
{
  const g = new LegacyGameState();
  g.barMode = 0;
  g.inputV = true;
  g.cameraColumn = 1; g.cursorColumn = 1; g.cameraRow = 2; g.cursorRow = 2;
  const m = [];
  m[4] = new Int8Array(4);
  m[4][2] = -15; // classifyLegacyNegativeEntity(-15) === 0 (-1..-30 range)
  const c = [];
  stepLegacyGameplayInput(g, dense, m, { onF: (arg) => c.push(arg) });
  assert.deepEqual(c, [15]);
}

console.log("f.V() gameplay input prefix + movement/target dispatch checks passed");
