// Regression test for LegacySubsystemAf.ts (private void af()).
import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";
import path from "node:path";

const srcDir = new URL("../src/j2me/", import.meta.url).pathname;
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

const { stepLegacySubsystemAf } = loadModule("./LegacySubsystemAf", srcDir);

function makeGrid() {
  const grid = [];
  for (let i = 0; i < 30; i += 1) grid.push(new Int8Array(30));
  return grid;
}

function baseInput(overrides = {}) {
  return {
    state: new Int8Array(10000),
    packedBytes: new Int8Array(2000),
    packedOffsets: new Int16Array(320),
    gridC: makeGrid(),
    z: { value: -1 },
    slot: 3,
    frame: 0,
    sceneQ: 0,
    subsystemFByte: 0,
    jRow4: () => 999, // avoid the queue-trigger threshold by default
    randomRemainder: () => 0,
    onFootprintGate: () => false,
    neighborValue: () => 0,
    onAg: () => {},
    ...overrides,
  };
}

// Queue-action trigger: dense[9579]+1 reaches jRow4 threshold, and
// dense[9557]===37+dense[9535] -> onQueueAction8 fires with the right args,
// dense[9579] reset to 0.
{
  const input = baseInput({
    jRow4: (idx) => { assert.equal(idx, 5 & 0xff); return 1; },
  });
  input.state[9557 + 3] = 5;
  input.state[9535 + 3] = 0; // 37+0=37 !== 5 -> onQueueAction8 should NOT fire
  input.packedOffsets[1] = 100;
  let called = false;
  stepLegacySubsystemAf({ ...input, onQueueAction8: () => { called = true; } });
  assert.equal(called, false);
  assert.equal(input.state[9579 + 3], 0);
}
{
  const input = baseInput({ jRow4: () => 1 });
  input.state[9557 + 3] = 37; // 37 === 37+dense[9535]=37+0
  input.state[9535 + 3] = 0;
  input.state[9359 + 3] = 5;
  input.state[9381 + 3] = 7;
  input.state[9491 + 3] = 2;
  input.packedOffsets[1] = 100;
  input.packedBytes[100 + 2] = 10; // table(1, dense[9491]=2) = 10
  input.packedBytes[100 + 8 + 2] = 20;
  input.state[9601 + 3] = -4;
  input.packedOffsets[182] = 200;
  input.packedBytes[200 + 0] = 3; // table(182, kind=0)
  let args = null;
  stepLegacySubsystemAf({ ...input, onQueueAction8: (...a) => { args = a; } });
  assert.deepEqual(args, [5 + 10, 7 + 20, 2, 2 /* target<=0 */, 4 /* abs(-4) */, 0, Math.trunc(3 * 2 / 4), 0]);
}

// Early exit: dense[9403]!==0 -> sets dense[9557]=2+dense[9535], returns
// WITHOUT computing z or calling ag().
{
  const input = baseInput();
  input.state[9403 + 3] = 1;
  input.state[9535 + 3] = 4;
  let agCalled = false;
  stepLegacySubsystemAf({ ...input, onAg: () => { agCalled = true; } });
  assert.equal(input.state[9557 + 3], 6);
  assert.equal(agCalled, false);
  assert.equal(input.z.value, -1, "z is not recomputed on the early exit");
}

// Offset 1061..1068: z:I (the scalar, not dense[234]) is set before ag() reads it.
{
  const input = baseInput({ neighborValue: () => 42 });
  let zSeenByAg = null;
  stepLegacySubsystemAf({ ...input, onAg: () => { zSeenByAg = input.z.value; } });
  assert.equal(zSeenByAg, 42);
  assert.equal(input.state[234], 0, "dense[234] belongs to unit 32 and must not be written");
}

// dense[9447]>19 -> onFinishSlot with the target entity's own position, then always reaches the tail.
{
  const input = baseInput();
  input.state[9447 + 3] = 25; // -19 = 6 -> targetId=6
  input.state[6] = 11; // dense[0+6]
  input.state[101 + 6] = 22; // dense[101+6]
  let finishArgs = null;
  let agCalled = false;
  stepLegacySubsystemAf({
    ...input,
    onFinishSlot: (...a) => { finishArgs = a; },
    onAg: () => { agCalled = true; },
  });
  assert.deepEqual(finishArgs, [11, 22, 6, 0]);
  assert.equal(input.state[9447 + 3], 0);
  assert.equal(agCalled, true);
}

// dense[9447] in [6,19] -> onAnimReset(false), timers reset, tail still runs.
{
  const input = baseInput();
  input.state[9447 + 3] = 10;
  input.state[9535 + 3] = 2;
  let resetArg = null;
  let agCalled = false;
  stepLegacySubsystemAf({
    ...input,
    onAnimReset: (f) => { resetArg = f; },
    onAg: () => { agCalled = true; },
  });
  assert.equal(resetArg, false);
  assert.equal(input.state[9557 + 3], 12);
  assert.equal(input.state[9579 + 3], 0);
  assert.equal(input.state[9447 + 3], 0);
  assert.equal(agCalled, true);
}

// dense[9447]<=5, live positive target with matching gridC -> caches position.
{
  const input = baseInput();
  input.state[9447 + 3] = 0;
  input.state[9601 + 3] = 8; // target entity id
  input.state[1919 + 8] = 1; // alive
  input.state[8] = 4; // dense[0+8]
  input.state[101 + 8] = 5; // dense[101+8]
  input.gridC[5][4] = 8; // gridC[y][x] === target
  let agCalled = false;
  stepLegacySubsystemAf({ ...input, onAg: () => { agCalled = true; } });
  assert.equal(input.state[9645 + 3], 4);
  assert.equal(input.state[9667 + 3], 5);
  assert.equal(agCalled, true);
}

// Offsets 785..1030 (oracle run 15): following a unit resets 9689 and drops the target when
// a(x, y, 101) > 59; a building target (< 0) is only dropped once its 8505 is gone.
{
  const input = baseInput();
  input.state[9601 + 3] = 8; input.state[1919 + 8] = 1;
  input.state[8] = 4; input.state[101 + 8] = 5; input.gridC[5][4] = 8;
  input.state[9689 + 3] = 2; input.state[9359 + 3] = 6; input.state[9381 + 3] = 7;
  stepLegacySubsystemAf({ ...input, neighborValue: () => 60 });
  assert.equal(input.state[9689 + 3], 0);
  assert.equal(input.state[9601 + 3], 0);
  assert.deepEqual([input.state[9645 + 3], input.state[9667 + 3]], [6, 7]);

  const b = baseInput();
  b.state[9601 + 3] = -4; b.state[9689 + 3] = 2; b.state[8505 + 4] = 10;
  stepLegacySubsystemAf({ ...b, neighborValue: () => 60 });
  assert.equal(b.state[9601 + 3], -4);
  assert.equal(b.state[9689 + 3], 2);
  b.state[8505 + 4] = 0;
  stepLegacySubsystemAf({ ...b, neighborValue: () => 0 });
  assert.equal(b.state[9601 + 3], 0);
}

// dense[9447]<=5, target dead -> dense[9601] reset to 0, tail still runs.
{
  const input = baseInput();
  input.state[9601 + 3] = 8;
  input.state[1919 + 8] = 0; // dead
  let agCalled = false;
  stepLegacySubsystemAf({ ...input, onAg: () => { agCalled = true; } });
  assert.equal(input.state[9601 + 3], 0);
  assert.equal(agCalled, true);
}

console.log("private void af() (AI scratch tail, part 1) OK");
