// Regression test for LegacySubsystemBuildingEconomy.ts (final void g()), hand-derived from b-javap.txt 37692.
import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";
import path from "node:path";

const srcDir = new URL("../src/j2me/", import.meta.url).pathname;
const context = vm.createContext({ Int8Array, Int16Array, Int32Array, Array, console, Math, RangeError, Error });
const cache = new Map();
function loadModule(specifier, fromDir) {
  const absPath = path.resolve(fromDir, specifier) + ".ts";
  if (cache.has(absPath)) return cache.get(absPath).exports;
  const module = { exports: {} };
  cache.set(absPath, module);
  const output = ts.transpileModule(fs.readFileSync(absPath, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const fn = vm.compileFunction(output, ["module", "exports", "require"], { parsingContext: context });
  fn(module, module.exports, (spec) => loadModule(spec, path.dirname(absPath)));
  return module.exports;
}
const { stepLegacySubsystemBuildingEconomy } = loadModule("./LegacySubsystemBuildingEconomy", srcDir);
const { stepLegacySubsystemAx } = loadModule("./LegacySubsystemAx", srcDir);
const { stepLegacySubsystemVoidN } = loadModule("./LegacySubsystemVoidN", srcDir);

// ---- ax() and n() coverage carried over from the pre-2026-09-14 version of this test ----
function makeAxInput(overrides = {}) {
  return { dShort: new Int16Array(6).fill(-1), saveOffsets: new Int16Array(570), sectionOffsets: new Int16Array(5), gameL: 1, ...overrides };
}
const noRecords = () => ({
  state: new Int8Array(10000), packedBytes: new Int8Array(2000), packedOffsets: new Int16Array(300),
  fRows: [new Int8Array(10), new Int8Array(10)], gRows: [new Int8Array(20), new Int8Array(20), new Int8Array(20)],
  scratch: { u: 0, v: 0, z: 0, x: 0, A: 0, C: 0 },
});
const inert = { onFilterWorkers() {}, onAd() {}, onAa() {}, onAc() {}, onAllocate() {}, onEnqueueEffect() {}, onAe() {} };
const makeVoidNInput = () => ({
  dense: new Int8Array(10000), packedBytes: new Int8Array(20000), packedOffsets: new Int16Array(312), saveOffsets: new Int16Array(570),
  gridC: Array.from({ length: 96 }, () => new Int8Array(96)),
  arrays: {
    c: Array.from({ length: 5 }, () => Array.from({ length: 6 }, () => new Int8Array(6))),
    aRows: Array.from({ length: 5 }, () => new Int8Array(50)),
    resetNCube() { for (const layer of this.c) for (const row of layer) row.fill(-1); },
  },
});
{
  // ax(): gameL 1, dShort[0] = -1 skips the +1 step, then the threshold forces -1.
  const ax = makeAxInput();
  assert.doesNotThrow(() => stepLegacySubsystemAx(ax));
  assert.equal(ax.dShort[0], -1);
}
{
  // b.n() fills the bucket cube with -1 first (b-javap.txt offsets 0..52).
  const input = makeVoidNInput();
  stepLegacySubsystemVoidN(input);
  assert.equal(input.arrays.c[0][0][0], -1); assert.equal(input.arrays.c[4][5][5], -1);
}
{
  // n() fires only when f.c % 10 == 0, and a throw from it is NOT caught (it runs before offset 17).
  let nCalls = 0;
  stepLegacySubsystemBuildingEconomy({ simulationCounter: 10, ax: makeAxInput(), ...noRecords() }, { ...inert, onN: () => { nCalls += 1; } });
  stepLegacySubsystemBuildingEconomy({ simulationCounter: 7, ax: makeAxInput(), ...noRecords() }, { ...inert, onN: () => { nCalls += 1; } });
  assert.equal(nCalls, 1);
  assert.throws(() => stepLegacySubsystemBuildingEconomy({ simulationCounter: 10, ax: makeAxInput(), ...noRecords() },
    { ...inert, onN: () => { throw new Error("n() crashed"); } }), /n\(\) crashed/);
}
{
  // The real b.n() as onN, as LegacyRuntimeState wires it.
  const tenth = makeVoidNInput();
  assert.doesNotThrow(() => stepLegacySubsystemBuildingEconomy({ simulationCounter: 30, ax: makeAxInput(), ...noRecords() },
    { ...inert, onN: () => stepLegacySubsystemVoidN(tenth) }));
  assert.equal(tenth.arrays.c[0][0][0], -1);
  const other = makeVoidNInput();
  stepLegacySubsystemBuildingEconomy({ simulationCounter: 31, ax: makeAxInput(), ...noRecords() },
    { ...inert, onN: () => stepLegacySubsystemVoidN(other) });
  assert.equal(other.arrays.c[0][0][0], 0);
}
// ---- per-record loop (offsets 21..805) ----

function setup(counter) {
  const state = new Int8Array(10000); const packedBytes = new Int8Array(2000); const packedOffsets = new Int16Array(300);
  packedOffsets[138] = 500; packedBytes[500 + 182 + 4] = 40; // record 2's threshold (9237 = 4)
  const fRows = [new Int8Array(10), new Int8Array(10)];
  const gRows = [new Int8Array(20), new Int8Array(20), new Int8Array(20)];
  const scratch = { u: 0, v: 0, z: 0, x: 0, A: 9, C: 9 };
  const log = [];
  const input = {
    simulationCounter: counter,
    ax: { dShort: new Int16Array(64), saveOffsets: new Int16Array(64), sectionOffsets: new Int16Array(64), gameL: 0 },
    state, packedBytes, packedOffsets, fRows, gRows, scratch,
  };
  const callbacks = {
    onN: () => log.push(["n"]),
    onFilterWorkers: (r) => log.push(["filter", r]),
    onAd: () => log.push(["ad", scratch.v, scratch.x]),
    onAa: () => log.push(["aa", scratch.u, scratch.v, scratch.x, scratch.C]),
    onAc: () => log.push(["ac", scratch.v]),
    onAllocate: (...a) => log.push(["alloc", ...a]),
    onEnqueueEffect: (...a) => log.push(["effect", ...a]),
    onAe: () => log.push(["ae", scratch.v]),
  };
  // construction site record 2 at f[0][1]
  state[8505 + 2] = 5; state[8749 + 2] = 16; state[9237 + 2] = 4; state[8383 + 2] = 7; state[8444 + 2] = 5; fRows[0][1] = 2;
  // record 31 (team 1): type 5, unbuilt -> skipped at offset 172
  state[8505 + 31] = 1; state[8749 + 31] = 5;
  return { state, fRows, gRows, scratch, log, input, callbacks };
}

// c = 18: no n(), no 9054 mask, ac() only when (c & 255) == v; ae() when (c & 15) == (v & 15).
{
  const { log, input, callbacks } = setup(18);
  stepLegacySubsystemBuildingEconomy(input, callbacks);
  assert.deepEqual(log, [["aa", 0, 2, 1, 0], ["ae", 2]]);
}
// Site complete (8505 >= t138[182 + 9237]... threshold row 182 + 4 set) and 8932 == 0.
{
  const { state, fRows, log, input, callbacks } = setup(18);
  input.packedBytes[500 + 182 + 4] = 5;
  stepLegacySubsystemBuildingEconomy(input, callbacks);
  assert.deepEqual(log, [["aa", 0, 2, 1, 0], ["alloc", 0, 4, 7, 5, 2], ["effect", 2, 0], ["ae", 2]]);
  assert.equal(state[9237 + 2], 0); assert.equal(fRows[0][1], 0);
}
// Built record 3 at g[0][4], stage 1 with g1 >= g2 > 0: f.a(v, true) then ad(), no aa().
{
  const { state, gRows, log, input, callbacks } = setup(18);
  state[8505 + 3] = 9; state[8749 + 3] = 5; state[8627 + 3] = 1;
  gRows[0][4] = 3; gRows[1][4] = 2; gRows[2][4] = 2;
  stepLegacySubsystemBuildingEconomy(input, callbacks);
  assert.deepEqual(log, [["aa", 0, 2, 1, 0], ["ae", 2], ["filter", 3], ["ad", 3, 4]]);
}
// A built record missing from g[0]: x reaches 20 and g[1][20] throws; the handler ends g().
{
  const { state, log, input, callbacks } = setup(18);
  state[8505 + 3] = 9; state[8749 + 3] = 5; state[8627 + 3] = 2;
  state[8505 + 5] = 9; state[8749 + 5] = 16;
  stepLegacySubsystemBuildingEconomy(input, callbacks);
  assert.deepEqual(log, [["aa", 0, 2, 1, 0], ["ae", 2]], "record 5 is never reached");
}
// c = 40: n() runs first, outside the try block. c = 16: 9054 &= 127.
{
  const { log, input, callbacks } = setup(40);
  stepLegacySubsystemBuildingEconomy(input, callbacks);
  assert.deepEqual(log[0], ["n"]);
  const second = setup(16); second.state[9054 + 2] = -1;
  stepLegacySubsystemBuildingEconomy(second.input, second.callbacks);
  assert.equal(second.state[9054 + 2], 127);
}
console.log("final void g() per-record loop OK");
