// Regression test for LegacySubsystemAb.ts (private void ab() + d(boolean)), hand-derived from b-javap.txt 38477 / 39878.
import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";
import path from "node:path";

const srcDir = new URL("../src/", import.meta.url).pathname;
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
const grid = () => Array.from({ length: 20 }, () => new Int8Array(20));
const { stepLegacySubsystemAb } = loadModule("./sim/tribe/LegacySubsystemAb", srcDir);

function setup() {
  const state = new Int8Array(10000); const packedBytes = new Int8Array(3000); const packedOffsets = new Int16Array(300);
  for (const [row, base] of [[57, 1000], [58, 1100], [59, 1200], [60, 1300], [80, 1400], [81, 1500], [82, 1600], [83, 1700], [84, 1800], [174, 1900], [177, 2000]]) packedOffsets[row] = base;
  packedBytes[1400 + 0] = 2;   // t80[9237 0]
  packedBytes[1500 + 0] = 55;  // t81[t82[0] + f1 0]
  packedBytes[1700 + 0] = 10;  // t83[t84[0] + 0]
  packedBytes[1100 + 1] = 44;  // t58[t174[16] + slot 1]
  packedBytes[1000 + 1] = 33;  // t57[...]
  const fRows = [new Int8Array(10), new Int8Array(10)];
  const gRows = [new Int8Array(20), new Int8Array(20), new Int8Array(20)];
  const shortRows = [new Int16Array(30), new Int16Array(30)];
  const cycleLengths = new Int8Array(256); cycleLengths[116] = 5; cycleLengths[113] = 5;
  state[8749 + 2] = 16; state[8505 + 2] = 5;
  const scratch = { u: 0, v: 2, z: 16, x: 0, A: 0, C: 0 };
  const log = [];
  let check = false;
  const input = {
    state, packedBytes, packedOffsets, cycleLengths, fRows, gRows, shortRows, scratch,
    onChangeType: (id, type) => log.push([id, type]),
    onActionCheck: (type, flag, id) => { log.push(["check", type, flag, id]); return check; },
  };
  return { state, fRows, gRows, scratch, log, input, setCheck: (value) => { check = value; } };
}

// Site, slot 0, stage 0 < t80: 6161 = 3 and the builder waits as t81[t82[9237] + f1].
{
  const { state, log, input } = setup();
  stepLegacySubsystemAb(input, 5);
  assert.deepEqual(log, [[5, 55]]); assert.equal(state[6161 + 5], 3);
}
// Stage reached t80: no change for a site.
{
  const { state, fRows, log, input } = setup();
  fRows[1][0] = 2;
  stepLegacySubsystemAb(input, 5);
  assert.deepEqual(log, []); assert.equal(state[6161 + 5], 0);
}
// 6161 == 2 returns before anything.
{
  const { state, log, input } = setup();
  state[6161 + 5] = 2;
  stepLegacySubsystemAb(input, 5);
  assert.deepEqual(log, []);
}
// Slot 1 at an unbuilt site below the stage target: t58; at the target: t57.
{
  const { state, log, input } = setup();
  state[4646 + 5] = 1;
  stepLegacySubsystemAb(input, 5);
  state[8505 + 2] = 10;
  stepLegacySubsystemAb(input, 5);
  assert.deepEqual(log, [[5, 44], [5, 33]]);
}
// Built record, slot 0: g1 >= g2 clears both, then g2 == 0 -> a(w, 99), 6161 3.
{
  const { state, gRows, log, input } = setup();
  state[8627 + 2] = 1; gRows[1][0] = 3; gRows[2][0] = 3;
  stepLegacySubsystemAb(input, 5);
  assert.deepEqual([gRows[1][0], gRows[2][0]], [0, 0]);
  assert.deepEqual(log, [[5, 99]]); assert.equal(state[6161 + 5], 3);
}
// Unbuilt carrier at a small record (z 5): 3636 > 0 and 3535 in {1,5,6,7} -> a(w, 54), 6161 0; otherwise a(w, 37).
{
  const { state, scratch, log, input } = setup();
  scratch.z = 5; state[8749 + 2] = 5;
  state[2828 + 5] = 66; // not the z == 4 path; only the z >= 12 test decides entry
  stepLegacySubsystemAb(input, 5);
  assert.deepEqual(log, [], "z < 12 and not z == 4: no entry");
}
// Record type 6: 6161 != 3 -> d(false): mode 115 -> 116, 3030 -1.
{
  const { state, scratch, log, input } = setup();
  scratch.z = 6; state[8749 + 2] = 6; state[2929 + 5] = 115; state[3030 + 5] = 4;
  stepLegacySubsystemAb(input, 5);
  assert.deepEqual(log, []); assert.deepEqual([state[2929 + 5], state[3030 + 5]], [116, -1]);
}
// Record type 6, 6161 3 (set by the site path? no: z 6) -> preset 6161 3; check false -> d(8749 == 6 = true):
// a(w, 78), mode -> 115, 3030 -1, 1313 1.
{
  const { state, scratch, log, input } = setup();
  scratch.z = 6; state[8749 + 2] = 6; state[6161 + 5] = 3; state[2828 + 5] = 40;
  stepLegacySubsystemAb(input, 5);
  assert.deepEqual(log, [["check", 40, false, 5], [5, 78]]);
  assert.deepEqual([state[6161 + 5], state[2929 + 5], state[3030 + 5], state[1313 + 5]], [0, 115, -1, 1]);
}
// Type-16 site building a type-6 record: site path sets 6161 3 (f1 0 < t80[6]); check true -> f[1][x]++, d(false).
{
  const { state, fRows, log, input, setCheck } = setup();
  state[9237 + 2] = 6; input.packedBytes[1400 + 6] = 1; input.packedBytes[1600 + 6] = 7; input.packedBytes[1500 + 7] = 66;
  state[2929 + 5] = 113;
  setCheck(true);
  stepLegacySubsystemAb(input, 5);
  assert.deepEqual(log, [[5, 66], ["check", 0, false, 5]]);
  assert.equal(fRows[1][0], 1);
  assert.deepEqual([state[6161 + 5], state[2929 + 5]], [0, 116]);
}
console.log("private void ab() + d(boolean) OK");
