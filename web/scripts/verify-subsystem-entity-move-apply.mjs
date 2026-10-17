// Regression test for LegacySubsystemEntityMoveApply.ts (private void D()).
import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";
import path from "node:path";

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

const { stepLegacySubsystemEntityMoveApply } = loadModule("./sim/tribe/LegacySubsystemEntityMoveApply", srcDir);

function makeGrid() {
  const grid = [];
  for (let i = 0; i < 20; i += 1) grid.push(new Int8Array(20));
  return grid;
}

function makeTables() {
  const packedBytes = new Int8Array(2000);
  const packedOffsets = new Int16Array(320);
  packedOffsets[15] = 100;
  packedOffsets[1] = 200;
  packedOffsets[12] = 300;
  packedOffsets[5] = 400;
  packedOffsets[7] = 500;
  packedBytes[100 + 0] = 1; // cycleLen=1 -> subX/subY always 0 (x%1===0)
  packedBytes[400 + 0] = 0; // dense[202] stays 0
  packedBytes[500 + 0] = 0; // dense[303] stays 0
  return { packedBytes, packedOffsets };
}

// Mid-cycle frame (frameOffset===(cycleLen+1)>>1===1), dense[4848]!==120,
// dense[4545] in the restore range (<=-111): clears current cell, restores
// the saved marker there, resets dense[4545], applies the direction delta,
// re-places the entity at the new cell.
{
  const { packedBytes, packedOffsets } = makeTables();
  packedBytes[200 + 0] = 1; // xDelta
  packedBytes[200 + 8] = 2; // yDelta

  const state = new Int8Array(10000);
  state[606 + 3] = 0;
  state[4848 + 3] = 0;
  state[1111 + 3] = 0; // becomes 1 -> frameOffset=1 === half=1
  state[3] = 5;
  state[101 + 3] = 5;
  state[4545 + 3] = -115; // <= -111 -> restore branch
  state[1313 + 3] = 0; // !== -1 -> no onF, movement applies
  const gridC = makeGrid();
  gridC[5][5] = 3;

  let onFCalled = false;
  stepLegacySubsystemEntityMoveApply({
    state, packedBytes, packedOffsets, gridC, id: 3, onF: () => { onFCalled = true; },
  });

  assert.equal(onFCalled, false);
  assert.equal(gridC[5][5], -115); // restored marker
  assert.equal(state[4545 + 3], 0);
  assert.equal(state[3], 6); // x + xDelta
  assert.equal(state[101 + 3], 7); // y + yDelta
  assert.equal(gridC[7][6], 3); // re-placed at new cell
}

// dense[1313+id] === -1 (b.e() arrival) and 4545 < 111: the 1313 = 0 write
// is inside the `>= 111` branch (offsets 175..223), so F() runs and D()
// returns before the step. CORRECTED 2026-09-14: this case used to assert
// onF() never fires -- the port's own misplaced write, encoded as spec.
{
  const { packedBytes, packedOffsets } = makeTables();
  packedBytes[200 + 0] = 1;
  packedBytes[200 + 8] = 1;
  const state = new Int8Array(10000);
  state[3] = 5;
  state[101 + 3] = 5;
  state[4545 + 3] = -50;
  state[1313 + 3] = -1;
  const gridC = makeGrid();
  gridC[5][5] = 3;

  let onFCalled = false;
  stepLegacySubsystemEntityMoveApply({
    state, packedBytes, packedOffsets, gridC, id: 3, onF: () => { onFCalled = true; },
  });
  assert.equal(onFCalled, true);
  assert.equal(state[1313 + 3], -1);
  assert.equal(gridC[5][5], 0); // cleared at offset 49, before the check
  assert.equal(state[3], 5); // no step applied
  assert.equal(gridC[6][6], 0);
}

// 4545 >= 111: negated and 1313 zeroed together, so -1 no longer reaches F().
{
  const { packedBytes, packedOffsets } = makeTables();
  packedBytes[200 + 0] = 1;
  packedBytes[200 + 8] = 1;
  const state = new Int8Array(10000);
  state[3] = 5;
  state[101 + 3] = 5;
  state[4545 + 3] = 115;
  state[1313 + 3] = -1;
  const gridC = makeGrid();

  let onFCalled = false;
  stepLegacySubsystemEntityMoveApply({
    state, packedBytes, packedOffsets, gridC, id: 3, onF: () => { onFCalled = true; },
  });
  assert.equal(onFCalled, false);
  assert.equal(state[4545 + 3], -115);
  assert.equal(state[1313 + 3], 0);
  assert.equal(gridC[6][6], 3);
}

// Non-mid-cycle frame: movement block entirely skipped.
{
  const { packedBytes, packedOffsets } = makeTables();
  packedBytes[100 + 0] = 4; // cycleLen=4, half=(4+1)>>1=2
  const state = new Int8Array(10000);
  state[1111 + 3] = 0; // becomes 1, frameOffset=1 !== half=2
  state[3] = 5;
  state[101 + 3] = 5;
  const gridC = makeGrid();
  gridC[5][5] = 3;
  stepLegacySubsystemEntityMoveApply({ state, packedBytes, packedOffsets, gridC, id: 3, onF: () => {} });
  assert.equal(gridC[5][5], 3);
}

console.log("private void D() (movement application) OK");
