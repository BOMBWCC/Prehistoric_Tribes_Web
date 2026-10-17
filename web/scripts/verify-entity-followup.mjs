import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import vm from "node:vm";
import { denseRequire } from "./dense-layout-require.mjs";

function loadModule(file) {
  const module = { exports: {} };
  const output = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(output, { require: denseRequire, module, exports: module.exports, Int8Array });
  return module.exports;
}

const { stepLegacyEntityFollowup } = loadModule(
  new URL("../src/sim/units/LegacyEntityFollowup.ts", import.meta.url).pathname,
);

const make = () => ({
  state: new Int8Array(10000), entityId: 2, raw: { d: true }, z: { value: 30 }, bValue: 4,
  readPacked: (row, index) => row === 171 ? 1 : row === 37 ? 2 : 0,
  readCell: () => 0, onWorkerDispatch: () => {}, onOccupancy: () => 0, onP: () => {},
});

// gate1 true (threshold path), gate2 true (z/10<=B), onEntityProbe fires and
// returns false, and -- since raw.d was already true on entry -- the final
// tail still calls onEntityI regardless.
{
  const input = make();
  input.state[2929 + 2] = 8; // mode
  input.state[1111 + 2] = 0x20; // threshold = 2, T37 = 2 -> 2>=2 true
  let probed = 0;
  let iValue = null;
  stepLegacyEntityFollowup({
    ...input,
    onEntityProbe: () => { probed += 1; return false; },
    onEntityI: (value) => { iValue = value; },
  });
  assert.equal(input.state[1111 + 2], 0); // nibble reset
  assert.equal(probed, 1);
  assert.equal(iValue, 30);
}

// CORRECTED bug regression: record<0 must NOT independently satisfy gate2 --
// it only skips the z/10<=B check. type is neither 85 nor 80, so onEntityProbe
// must not fire at all.
{
  const input = make();
  input.state[2929 + 2] = 8;
  input.state[1111 + 2] = 0x20;
  input.state[4444 + 2] = -5; // record < 0
  input.state[2828 + 2] = 10; // type, not 85/80
  input.raw.d = false; // so the final tail doesn't mask a missed call
  let probed = 0;
  stepLegacyEntityFollowup({ ...input, onEntityProbe: () => { probed += 1; return false; } });
  assert.equal(probed, 0);
}

// record<0 but type===85: the type check still applies independently of the
// skipped z/10<=B comparison, so onEntityProbe must fire.
{
  const input = make();
  input.state[2929 + 2] = 8;
  input.state[1111 + 2] = 0x20;
  input.state[4444 + 2] = -5;
  input.state[2828 + 2] = 85;
  input.raw.d = false;
  let probed = 0;
  stepLegacyEntityFollowup({ ...input, onEntityProbe: () => { probed += 1; return false; } });
  assert.equal(probed, 1);
}

// type===84 in the qualifying selector range calls onType84Action; a truthy
// result writes dense[404+id]=100.
{
  const input = make();
  input.state[2929 + 2] = 8;
  input.state[1111 + 2] = 0x20;
  input.state[2828 + 2] = 84;
  input.state[3939 + 2] = 30; // selector in [28,49]
  input.raw.d = false;
  let args = null;
  stepLegacyEntityFollowup({
    ...input,
    onType84Action: (...a) => { args = a; return true; },
    onEntityProbe: () => false,
  });
  assert.deepEqual(args, [2, true, 2]); // selector-28=2, enabled=true, id=2
  assert.equal(input.state[404 + 2], 100);
}

// CORRECTED bug regression: gate1 false (table171!==-2, threshold<T37) must
// NOT short-circuit the whole function -- the offset-567 tail still runs and,
// since raw.d is already true on entry, still calls onEntityI even though
// neither gate ever passed and dense[1111+id] is left untouched.
{
  const input = make();
  input.state[2929 + 2] = 8;
  input.state[1111 + 2] = 0x55; // threshold = 5, T37 = 2 -> gate1 false (5>=2 is true though!)
  input.readPacked = (row) => row === 171 ? 1 : row === 37 ? 99 : 0; // force T37 high so threshold<T37
  input.raw.d = true;
  let probed = 0;
  let iValue = null;
  stepLegacyEntityFollowup({
    ...input,
    onEntityProbe: () => { probed += 1; return false; },
    onEntityI: (value) => { iValue = value; },
  });
  assert.equal(probed, 0); // gate1 never passed, so gate2/onEntityProbe never ran
  assert.equal(input.state[1111 + 2], 0x55); // untouched -- block was skipped
  assert.equal(iValue, 30); // tail still fires because raw.d was true on entry
}

// d false throughout and no gate ever passes -> onEntityI never fires.
{
  const input = make();
  input.state[2929 + 2] = 8;
  input.state[1111 + 2] = 0x55;
  input.readPacked = (row) => row === 171 ? 1 : row === 37 ? 99 : 0;
  input.raw.d = false;
  let iCalled = false;
  stepLegacyEntityFollowup({ ...input, onEntityI: () => { iCalled = true; } });
  assert.equal(iCalled, false);
}

// Offsets 327..563 after i()Z returns true (b-javap.txt 12968). RETRACTED
// 2026-09-14: this block used to be treated as unreachable.
function probed(setup) {
  const input = make();
  input.state[2929 + 2] = 8; input.state[1111 + 2] = 0x20; // gate1 via threshold
  input.state[2] = 3; input.state[101 + 2] = 9;              // at (3,9)
  input.state[3131 + 2] = 2; input.state[3232 + 2] = 10;     // target (2,10)
  input.raw.d = false;
  const log = [];
  Object.assign(input, {
    onEntityProbe: () => true,
    onEntityI: (z) => log.push(["i", z]),
    onWorkerDispatch: (arg) => log.push(["dispatch", arg]),
    onOccupancy: (x, y, layer) => { log.push(["occ", x, y, layer]); return 42; },
    onP: () => log.push(["p"]),
  });
  setup(input, log);
  stepLegacyEntityFollowup(input);
  return { input, log };
}
{
  // Moving toward the target: z = a(x,y,0), p(), 808 == 0 -> d = true, tail i(z).
  const { input, log } = probed(() => {});
  assert.deepEqual(log, [["occ", 3, 9, 0], ["p"], ["i", 42]]);
  assert.equal(input.z.value, 42); assert.equal(input.raw.d, true);
}
{
  // Type 57: v = a(v) first; 808 > 0 after p() returns before the tail.
  const { log } = probed((i, out) => { i.state[2828 + 2] = 57; i.onP = () => { out.push(["p"]); i.state[808 + 2] = 3; }; });
  assert.deepEqual(log, [["dispatch", 2], ["occ", 3, 9, 0], ["p"]]);
}
{
  // Type 69 with 6161 >= 2: nothing; d stays false so no tail.
  const { log } = probed((i) => { i.state[2828 + 2] = 69; i.state[6161 + 2] = 2; });
  assert.deepEqual(log, []);
}
{
  // Already on the target and standing on its own cell: d = true, tail.
  const { log } = probed((i) => { i.state[3131 + 2] = 3; i.state[3232 + 2] = 9; i.readCell = () => 2; });
  assert.deepEqual(log, [["i", 30]]);
}
{
  // On the target but the cell holds someone else: return before the tail, even with d true.
  const { log } = probed((i) => { i.state[3131 + 2] = 3; i.state[3232 + 2] = 9; i.readCell = () => 5; i.raw.d = true; });
  assert.deepEqual(log, []);
}

console.log("b.y() entity follow-up OK");
