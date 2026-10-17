import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import vm from "node:vm";
import { denseRequire } from "./dense-layout-require.mjs";

const file = new URL("../src/ui/LegacyZAg.ts", import.meta.url).pathname;
const output = ts.transpileModule(fs.readFileSync(file, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(output, { require: denseRequire, module, exports: module.exports });
const { stepLegacyZAg } = module.exports;

function base() {
  const dense = new Int8Array(10000);
  return {
    dense, qCounter: 1, r: new Int8Array(20), as: 0, kByte: 0,
    yByte: 10, IByte: 1, AByte: 20, KByte: 2, FByte: -1,
    aByte2d: [new Int8Array(50), new Int8Array(50)],
    wByte: 5, cSInt: 0, frameLayoutL: 3,
  };
}

// owner !== 6: no-op guard.
{
  const s = base();
  s.dense[8749 + s.qCounter] = 5;
  let calls = 0;
  stepLegacyZAg(s, { onL: () => calls += 1, onSelectionReset: () => calls += 1 });
  assert.equal(calls, 0);
  assert.equal(s.frameLayoutL, 3);
}

// owner === 6, kByte > 0: marks that single cell, resetSelection(false,true,false,true), w=1.
{
  const s = base();
  s.dense[8749 + s.qCounter] = 6;
  s.kByte = 4;
  s.r[0] = 29;
  let reset;
  stepLegacyZAg(s, { onSelectionReset: (...a) => reset = a });
  assert.equal(s.dense[3131 + 4], s.yByte + s.IByte);
  assert.equal(s.dense[3232 + 4], s.AByte + s.KByte);
  assert.equal(s.dense[2828 + 4], 44 + 29);
  assert.equal(s.dense[6161 + 4], 2); // r[as]===29 -> action=2
  assert.deepEqual(reset, [false, true, false, true]);
  assert.equal(s.wByte, 1);
  assert.equal(s.frameLayoutL, s.kByte);
}

// owner === 6, kByte <= 0, FByte !== -1: marks every id in aByte2d[FByte] row until a <=0 entry.
{
  const s = base();
  s.dense[8749 + s.qCounter] = 6;
  s.kByte = 0;
  s.FByte = 1;
  s.aByte2d[1][0] = 7;
  s.aByte2d[1][1] = 9;
  s.aByte2d[1][2] = 0;
  let reset;
  stepLegacyZAg(s, { onSelectionReset: (...a) => reset = a });
  assert.equal(s.dense[2828 + 7], 44 + 0);
  assert.equal(s.dense[2828 + 9], 44 + 0);
  assert.deepEqual(reset, [true, true, false, false]);
  assert.equal(s.wByte, 1);
}

// owner === 6, kByte <= 0, FByte === -1: l(1), cSInt = -r[as]-1.
{
  const s = base();
  s.dense[8749 + s.qCounter] = 6;
  s.kByte = 0;
  s.FByte = -1;
  s.r[0] = 5;
  let lValue;
  stepLegacyZAg(s, { onL: (v) => lValue = v });
  assert.equal(lValue, 1);
  assert.equal(s.cSInt, -5 - 1);
}

console.log("stepLegacyZAg (private void ag(), lowercase) OK");
