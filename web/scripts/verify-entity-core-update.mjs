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
  vm.runInNewContext(output, { require: denseRequire, module, exports: module.exports, Int8Array, Int16Array });
  return module.exports;
}

const { stepLegacyEntityCoreUpdate } = loadModule(
  new URL("../src/sim/units/LegacyEntityCoreUpdate.ts", import.meta.url).pathname,
);

const make = () => ({
  state: new Int8Array(10000), packedBytes: new Int8Array(1000), packedOffsets: new Int16Array(200),
  entityId: 3, readJ: () => 4, readTable39: () => 0, readTable138: () => 0, raw: { d: false },
});

// offsets 55..210 (b-javap.txt 10980): only types 5..9 and 92/93/106 can take
// the 2929 = 34 branch. CORRECTED 2026-09-14: this used type 10, the port's inversion.
const early = make();
early.state[5959 + 3] = 5; early.state[6565 + 3] = 1; early.state[2929 + 3] = 8;
early.state[5858 + 3] = 1; early.state[2828 + 3] = 7;
assert.equal(stepLegacyEntityCoreUpdate(early), true);
assert.equal(early.state[2929 + 3], 34);
{
  const other = make();
  other.state[5959 + 3] = 5; other.state[6565 + 3] = 1; other.state[2929 + 3] = 8;
  other.state[5858 + 3] = 1; other.state[2828 + 3] = 10; other.state[3030 + 3] = 4;
  let w = 0;
  stepLegacyEntityCoreUpdate({ ...other, onW: () => { w += 1; } });
  assert.equal(other.state[2929 + 3], 8, "type 10 does not take the 34 branch");
  assert.equal(w, 1);
}
// offset 256: action cycle not finished (3030 < f.j[4][mode]) -> y(), return;
// 3030 untouched and d stays false.
{
  const mid = make();
  mid.state[2929 + 3] = 8; mid.state[3030 + 3] = 2;
  let y = 0;
  assert.equal(stepLegacyEntityCoreUpdate({ ...mid, onY: () => { y += 1; } }), true);
  assert.equal(y, 1); assert.equal(mid.state[3030 + 3], 2); assert.equal(mid.raw.d, false);
}

const threshold = make();
threshold.state[2929 + 3] = 8; threshold.state[3030 + 3] = 4; threshold.state[4646 + 3] = -2;
let w = 0; let y = 0;
assert.equal(stepLegacyEntityCoreUpdate({ ...threshold, onW: () => { w += 1; }, onY: () => { y += 1; } }), true);
assert.equal(w, 1); assert.equal(y, 1); assert.equal(threshold.state[3030 + 3], 0);
assert.equal(threshold.state[4646 + 3], -1); assert.equal(threshold.raw.d, true);

// offsets 335..509: t39 == 2 and 1313 == -3 -> type 59 at slot 0 calls
// f.a(rec, false) when t138[156 + 8749[rec]] >= 0 or 8627[rec] != 0; then x().
{
  const run = (column6, built) => {
    const u = make();
    u.state[2828 + 3] = 59; u.state[2929 + 3] = 8; u.state[3030 + 3] = 4;
    u.state[1313 + 3] = -3; u.state[4646 + 3] = 0; u.state[4444 + 3] = 7;
    u.state[8749 + 7] = 5; u.state[8627 + 7] = built;
    u.readTable39 = () => 2;
    const seen = [];
    u.readTable138 = (index) => { seen.push(index); return column6; };
    const calls = [];
    assert.equal(stepLegacyEntityCoreUpdate({ ...u, onFilterWorkers: (r) => calls.push(["f", r]), onX: () => calls.push(["x"]) }), true);
    assert.equal(u.raw.d, false);
    return [calls, seen];
  };
  assert.deepEqual(run(0, 0), [[["f", 7], ["x"]], [161]]);
  assert.deepEqual(run(-1, 0), [[["x"]], [161]]);
  assert.deepEqual(run(-1, 1), [[["f", 7], ["x"]], [161]]);
}

console.log("b.v() entity core update OK");
