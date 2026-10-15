// Regression test for LegacySubsystemEntityUpdateTail.ts (private void u()).
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

const { stepLegacySubsystemEntityUpdateTail } = loadModule("./LegacySubsystemEntityUpdateTail", srcDir);

function makeGrid() {
  const grid = [];
  for (let i = 0; i < 20; i += 1) grid.push(new Int8Array(20));
  return grid;
}

function makeRoute() {
  // b.a:[[[B (#70) -- f.g() allocates it as new byte[2][101][80].
  return [0, 1].map(() => Array.from({ length: 101 }, () => new Int8Array(80)));
}

function baseInput(state, overrides = {}) {
  return {
    state,
    packedBytes: new Int8Array(2000),
    packedOffsets: new Int16Array(320),
    gridC: makeGrid(),
    id: 3,
    team: 0,
    onN: () => {},
    onF: () => {},
    onMarkVisible: () => {},
    z: { value: 0 },
    bValue: 0,
    rByte: { value: -1 },
    scalars: { bField10: 0, bField12: 0, bField14: 0, bField137: false, bField232: 0 },
    route: makeRoute(),
    saveOffsets: new Int16Array(600),
    visibilityBits: [[new Int32Array(32)], [new Int32Array(32)]],
    onP: () => {},
    ...overrides,
  };
}

// Outer gate: dense[202]!==0 skips the cancel-gate check entirely -> reaches
// the main body -> c()'s own gate fails (dense[202]!==0) -> returns false ->
// state-code recompute happened but c() short-circuits before D().
{
  const state = new Int8Array(10000);
  state[202 + 3] = 5;
  state[1414 + 3] = 5; // level<12 -> stateCode=6
  let onNCalled = false;
  const input = baseInput(state, { onN: () => { onNCalled = true; } });
  stepLegacySubsystemEntityUpdateTail(input);
  assert.equal(state[2929 + 3], 6);
  assert.equal(onNCalled, false); // c()'s own gate also fails (dense[202]!==0), so onN never fires
  assert.equal(input.rByte.value, -1);
}

// Outer gate: all three cancel-gate signals clear, z/B check fails -> offset-349
// tail directly (state-code NOT recomputed).
{
  const state = new Int8Array(10000);
  state[2929 + 3] = 3; // stale value from a previous tick, &255<=7
  state[1111 + 3] = 0xff;
  const input = baseInput(state, {
    z: { value: 0 }, bValue: 0, // trunc(0/10)=0 <= 0 -> tail349
  });
  stepLegacySubsystemEntityUpdateTail(input);
  assert.equal(state[3030 + 3], 0);
  // CORRECTED 2026-09-10: offset 399 is `bipush 15; iand`, so the HIGH nibble
  // is what gets cleared. This assertion used to encode the port's `& 0xf0`.
  assert.equal(state[1111 + 3], 15);
  assert.equal(state[808 + 3], 0);
  assert.equal(input.rByte.value, -1);
}

// Outer gate passes fully (z/B ok, dense[808]>0) -> main body -> c() runs for
// real. REWRITTEN 2026-09-10: this case used to assert `onN` fired and
// `dense[808]` was zeroed, which was the retracted "c() always throws"
// premise. With a live route table nothing throws, so c() walks its normal
// path: it writes the direction byte, claims the target cell in gridC, and
// advances the step cursor.
{
  const state = new Int8Array(10000);
  state[1414 + 3] = 5; // stateCode=6, &255<=7
  state[808 + 3] = 9;
  const gridC = makeGrid();
  let onNCalled = false;
  const input = baseInput(state, {
    gridC,
    z: { value: 100 }, bValue: 0, // trunc(100/10)=10 > 0 -> passes
    onN: () => { onNCalled = true; },
  });
  stepLegacySubsystemEntityUpdateTail(input);
  assert.equal(onNCalled, false, "the route table is real, so the [49,156] handler never runs");
  assert.equal(state[808 + 3], 9, "dense[808] is only reset on c()'s catch path");
  assert.equal(state[707 + 3], 1, "c() offsets 801..818 advance the step cursor");
  assert.equal(gridC[0][0], -128, "c() offsets 755..770 claim the cell being stepped into");
  assert.equal(input.rByte.value, -1);
}

// Main body reaches the D()+position-repurpose tail: c()'s own gate fails
// (dense[1313]===-1 so c() returns false immediately without touching
// dense[808]), state code &255<=7, D() runs (trivial packed tables), the
// post-D() gate passes (dense[202]/[303]===0, dense[4545] in range),
// dense[2929] gets repurposed, and team===0 decrements qByte.
{
  const state = new Int8Array(10000);
  state[1414 + 3] = 5; // stateCode=6
  state[808 + 3] = 9;
  state[1313 + 3] = -1; // c() returns false via its own gate, no onN call
  state[4545 + 3] = -115; // in [-122,-111] after D() (D() won't touch it here: cycleLen table default 0)
  state[3] = 5;
  state[101 + 3] = 5;

  const packedBytes = new Int8Array(2000);
  const packedOffsets = new Int16Array(320);
  // D()'s own table(15, w*9+l) defaults to 0 -> cycleLen=0, half=(0+1)>>1=0.
  // dense[1111+id] starts at 0, E() increments to 1 -> frameOffset=1 !== 0 -> D()'s movement block skipped.
  // dense[4848+id]!==120 -> D()'s tail block also skipped. dense[202]/[303] stay 0 (E() writes table defaults, 0).

  let onNCalled = false;
  const input = ({
    state, packedBytes, packedOffsets, gridC: makeGrid(), id: 3, team: 0,
    onN: () => { onNCalled = true; },
    onF: () => {},
    onMarkVisible: () => {},
    onP: () => {},
    scalars: { bField10: 0, bField12: 0, bField14: 0, bField137: false, bField232: 0 },
    route: makeRoute(),
    saveOffsets: new Int16Array(600),
    visibilityBits: [[new Int32Array(32)], [new Int32Array(32)]],
    z: { value: 0 }, bValue: -1, rByte: { value: 5 }, // z/B check doesn't matter, dense[1313]===-1 skips it
  });
  stepLegacySubsystemEntityUpdateTail(input);

  assert.equal(onNCalled, false);
  const otherTeam = 0 ^ 1; // 1
  assert.equal(state[2929 + 3], -5 - otherTeam * 6 - -115);
  assert.equal(state[3030 + 3], 0);
  assert.equal(state[1313 + 3], 1);
  // CORRECTED 2026-09-10: offset 339 reads R:B (#48), not Q:B (#46).
  assert.equal(input.rByte.value, 4); // decremented for team 0
}

console.log("private void u() (entity update tail) OK");
