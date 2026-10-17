// Behaviour test for LegacyEntityEquipIssue.ts: private void L() (#248),
// bytecode/b-javap.txt line 27482, offsets 0..245.
import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";
import { denseRequire } from "./dense-layout-require.mjs";

const path = new URL("../src/sim/units/LegacyEntityEquipIssue.ts", import.meta.url).pathname;
const output = ts.transpileModule(fs.readFileSync(path, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(output, { require: denseRequire, module, exports: module.exports, Int8Array, Int16Array });
const { stepLegacyEntityEquipIssue } = module.exports;

const V = 4;

function fixture() {
  const packedBytes = new Int8Array(1000);
  const packedOffsets = new Int16Array(200);
  packedOffsets[88] = 100;   // item -> resource pool
  packedOffsets[103] = 200;  // candidate -> item
  packedOffsets[104] = 220;  // candidate -> cost
  // Six candidates: melee band 0..2, throwing band 3..5.
  [11, 12, 13, 21, 22, 23].forEach((item, i) => { packedBytes[200 + i] = item; });
  [1, 2, 3, 4, 5, 6].forEach((cost, i) => { packedBytes[220 + i] = cost; });
  [11, 12, 13, 21, 22, 23].forEach((item, i) => { packedBytes[100 + item] = 3 + i; });
  const state = new Int8Array(10000);
  state[4444 + V] = 7;
  const pools = [new Int16Array(30), new Int16Array(30)];
  const calls = [];
  const input = {
    state, packedBytes, packedOffsets, v: V, pools, team: 0,
    onRecordCompletion: (r) => calls.push(r),
  };
  return { input, state, pools, calls, packedBytes };
}

// 1717 >= 1616 (melee at least as good) starts the scan at candidate 0.
{
  const { input, state, pools, calls } = fixture();
  state[1717 + V] = 5; state[1616 + V] = 2;
  pools[0][3] = 10;   // can afford candidate 0 (item 11, pool 3, cost 1)
  stepLegacyEntityEquipIssue(input);
  assert.equal(state[6565 + V], 11, "equipped the first affordable melee item");
  assert.equal(pools[0][3], 9, "and paid for it");
  assert.deepEqual(calls, [7], "f.d(dense[4444 + v])");
}

// A better ranged skill starts at candidate 3 instead, so the melee band is
// skipped even when it is affordable.
{
  const { input, state, pools } = fixture();
  state[1717 + V] = 2; state[1616 + V] = 5;
  pools[0][3] = 10;   // candidate 0 affordable...
  pools[0][6] = 10;   // ... but candidate 3 (item 21, pool 6, cost 4) is where it starts
  stepLegacyEntityEquipIssue(input);
  assert.equal(state[6565 + V], 21);
  assert.equal(pools[0][3], 10, "the melee candidate was never considered");
  assert.equal(pools[0][6], 6);
}

// It takes the first it can AFFORD, skipping ones it cannot.
{
  const { input, state, pools } = fixture();
  state[1717 + V] = 5; state[1616 + V] = 2;
  pools[0][3] = 0;    // candidate 0 unaffordable
  pools[0][4] = 1;    // candidate 1 costs 2 -- still unaffordable
  pools[0][5] = 9;    // candidate 2 (item 13, pool 5, cost 3) is the first it can pay
  stepLegacyEntityEquipIssue(input);
  assert.equal(state[6565 + V], 13);
  assert.equal(pools[0][5], 6);
}

// Nothing affordable anywhere: no equipment, no payment, no completion.
{
  const { input, state, calls } = fixture();
  state[1717 + V] = 5; state[1616 + V] = 2;
  stepLegacyEntityEquipIssue(input);
  assert.equal(state[6565 + V], 0);
  assert.deepEqual(calls, []);
}

// The scan wraps past the end of the six candidates only as far as
// `Y < 6 + X`, so a ranged unit really does look at 3..8, not 3..5.
{
  const { input, state, pools, packedBytes } = fixture();
  state[1717 + V] = 2; state[1616 + V] = 5;
  packedBytes[200 + 6] = 31; packedBytes[220 + 6] = 1; packedBytes[100 + 31] = 9;
  pools[0][9] = 5;   // only candidate 6 is affordable
  stepLegacyEntityEquipIssue(input);
  assert.equal(state[6565 + V], 31, "candidate 6 is inside 3..8");
}

// Only the calling team's pool is touched.
{
  const { input, state, pools } = fixture();
  state[1717 + V] = 5; state[1616 + V] = 2;
  pools[0][3] = 10; pools[1][3] = 10;
  stepLegacyEntityEquipIssue(input);
  assert.equal(pools[1][3], 10);
}

console.log("L() #248 equipment issue OK");
