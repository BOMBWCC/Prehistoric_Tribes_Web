import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { denseRequire } from "./dense-layout-require.mjs";

function loadModule(file) {
  const module = { exports: {} };
  const output = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(output, { require: denseRequire, module, exports: module.exports, Int8Array, Int16Array });
  return module.exports;
}

const { finalizeLegacyEntity } = loadModule(new URL("../src/sim/world/LegacyEntityFinalize.ts", import.meta.url).pathname);

function baseInput(overrides = {}) {
  const dense = new Int8Array(10000);
  const grid = Array.from({ length: 40 }, () => new Int8Array(40));
  const calls = { release: [], finalize: [], recordClear: [], queueInsert: [], teamCounter: [] };
  const input = {
    dense,
    grid,
    packedBytes: new Int8Array(2000),
    packedOffsets: new Int16Array(2000),
    id: 5,
    q: 0,
    entityFocusFlag: false,
    entityFocusPFlag: false,
    cameraSFlag: false,
    onRelease: (id) => calls.release.push(id),
    onFinalize: (id) => calls.finalize.push(id),
    onRecordClear: (id) => calls.recordClear.push(id),
    onQueueInsert: (...args) => calls.queueInsert.push(args),
    onTeamCounter: (index) => calls.teamCounter.push(index),
    ...overrides,
  };
  return { input, calls, dense, grid };
}

// Always: e[1919+id]=-1, and the three cleanup calls fire with the id.
{
  const { input, calls, dense } = baseInput();
  const result = finalizeLegacyEntity(input);
  assert.equal(dense[1919 + 5], -1);
  assert.deepEqual(calls.release, [5]);
  assert.deepEqual(calls.finalize, [5]);
  assert.deepEqual(calls.recordClear, [5]);
  assert.equal(result.entityFocusPFlag, false);
}

// team===0 (id<=50), !cameraSFlag: queue insert fires with (3, x, y, id); team counter uses 1-0=1.
{
  const { input, calls, dense } = baseInput({ id: 5 });
  dense[5] = 12; dense[101 + 5] = 7;
  finalizeLegacyEntity(input);
  assert.deepEqual(calls.queueInsert, [[3, 12, 7, 5]]);
  assert.deepEqual(calls.teamCounter, [1]);
}

// team===1 (id>50), !cameraSFlag: queue insert does NOT fire; team counter uses 1-1=0.
{
  const { input, calls } = baseInput({ id: 55 });
  finalizeLegacyEntity(input);
  assert.deepEqual(calls.queueInsert, []);
  assert.deepEqual(calls.teamCounter, [0]);
}

// cameraSFlag===true: neither queue insert nor team counter fire, regardless of team.
{
  const { input, calls } = baseInput({ id: 5, cameraSFlag: true });
  finalizeLegacyEntity(input);
  assert.deepEqual(calls.queueInsert, []);
  assert.deepEqual(calls.teamCounter, []);
}

// entityFocusFlag===true (f.F:Z) -> entityFocusPFlag (f.P:Z) becomes true.
{
  const { input } = baseInput({ entityFocusFlag: true, entityFocusPFlag: false });
  const result = finalizeLegacyEntity(input);
  assert.equal(result.entityFocusPFlag, true);
}

// entityFocusFlag===false but id === e[8810+q] -> entityFocusPFlag becomes true.
{
  const { input, dense } = baseInput({ id: 5, q: 0, entityFocusFlag: false, entityFocusPFlag: false });
  dense[8810 + 0] = 5;
  const result = finalizeLegacyEntity(input);
  assert.equal(result.entityFocusPFlag, true);
}

// Neither condition: entityFocusPFlag passes through unchanged (both true and false).
{
  const { input: inputFalse } = baseInput({ id: 5, q: 0, entityFocusFlag: false, entityFocusPFlag: false });
  assert.equal(finalizeLegacyEntity(inputFalse).entityFocusPFlag, false);
  const { input: inputTrue } = baseInput({ id: 5, q: 0, entityFocusFlag: false, entityFocusPFlag: true });
  assert.equal(finalizeLegacyEntity(inputTrue).entityFocusPFlag, true);
}

// Footprint write: (2929&0xff)<=7, threshold gate passes, grid[y][x]===-128 -> written.
// Keep packedOffsets[1] (x/y table-1 adjustment) and packedOffsets[15] (gate
// table) pointing at non-overlapping regions of packedBytes so the two
// unrelated lookups don't collide.
{
  const { input, dense, grid } = baseInput({ id: 5 });
  input.packedOffsets[1] = 100; // x/y adjustment table base; packedBytes[100+0]/[108+0] default to 0
  input.packedOffsets[15] = 200; // gate table base
  dense[5] = 3; dense[101 + 5] = 2; // raw x,y; dense[606+id]=0 so no extra table offset added
  dense[2929 + 5] = 0; // <=7
  dense[1111 + 5] = 0; // &0xf = 0, needs to be < threshold
  input.packedBytes[200] = 3; // gate value at packedIndex 200+0+0-0 -> threshold=(3+1)/2=2
  grid[2][3] = -128;
  dense[4545 + 5] = 120; // signed byte, >=111 -> write -120
  finalizeLegacyEntity(input);
  assert.equal(grid[2][3], -120);
}

// Footprint write skipped when (2929&0xff) > 7.
{
  const { input, dense, grid } = baseInput({ id: 5 });
  dense[5] = 3; dense[101 + 5] = 2;
  dense[2929 + 5] = 8; // >7, skip whole block
  grid[2][3] = -128;
  finalizeLegacyEntity(input);
  assert.equal(grid[2][3], -128); // untouched
}

console.log("f.a(byte) entity finalize OK");
