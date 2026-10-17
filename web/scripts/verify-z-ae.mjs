import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import vm from "node:vm";

const file = new URL("../src/ui/LegacyZAe.ts", import.meta.url).pathname;
const output = ts.transpileModule(fs.readFileSync(file, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(output, { module, exports: module.exports });
const { stepLegacyZAe } = module.exports;

function base() {
  return {
    nInt: 0,
    inputLeft: false,
    inputRight: false,
    inputUp: false,
    inputDown: false,
    jByte: 0,
    as: 5,
    aX: 5,
    aW: 10,
    ar: 10,
    V: true,
    gameplaySFlag: false,
    selectionFlags: [false, false, false, false, false, false, false],
    QFlag: false,
    RFlag: false,
    y: 0,
    zlYInt: 0,
    s: new Int8Array(20),
    at: 9,
    tiles: [[new Int8Array(20)]],
    zScratchAuByte: 0,
    r: new Int8Array(20),
    iFlag: false,
    staticL: false,
    inputV: true,
    E: 0,
    wByte: 0,
    staticM: false,
  };
}

// cooldown gate: n:I > 1 resets to 0 and returns, nothing else fires.
{
  const s = base();
  s.nInt = 2;
  s.inputLeft = true;
  let aiCalls = 0;
  stepLegacyZAe(s, { onAi: () => aiCalls += 1 });
  assert.equal(s.nInt, 0);
  assert.equal(aiCalls, 0);
}

// g:Z branch (inputLeft), as===0: no self-decrement, but aX still trails since as<aX; V cleared, ai() fires.
{
  const s = base();
  s.inputLeft = true;
  s.as = 0;
  s.aX = 3;
  let aiCalls = 0;
  stepLegacyZAe(s, { onAi: () => aiCalls += 1 });
  assert.equal(s.as, 0);
  assert.equal(s.aX, 2);
  assert.equal(s.V, false);
  assert.equal(aiCalls, 1);
}

// g:Z branch, as<0: safe early return, ai() does not fire.
{
  const s = base();
  s.inputLeft = true;
  s.as = -1;
  let aiCalls = 0;
  stepLegacyZAe(s, { onAi: () => aiCalls += 1 });
  assert.equal(aiCalls, 0);
}

// g:Z branch, as>0 and as<aX: both decrement.
{
  const s = base();
  s.inputLeft = true;
  s.as = 5;
  s.aX = 6;
  stepLegacyZAe(s, { onAi: () => {} });
  assert.equal(s.as, 4);
  assert.equal(s.aX, 5);
}

// g:Z branch gated off by jByte===1.
{
  const s = base();
  s.inputLeft = true;
  s.jByte = 1;
  let aiCalls = 0;
  stepLegacyZAe(s, { onAi: () => aiCalls += 1 });
  assert.equal(aiCalls, 0);
}

// h:Z branch (inputRight): as>=ar-1 safe early return.
{
  const s = base();
  s.inputRight = true;
  s.as = 9;
  s.ar = 10;
  let aiCalls = 0;
  stepLegacyZAe(s, { onAi: () => aiCalls += 1 });
  assert.equal(aiCalls, 0);
}

// h:Z branch: as advances, aX advances only at the wrap boundary.
{
  const s = base();
  s.inputRight = true;
  s.as = 6;
  s.aX = 0;
  s.aW = 7;
  s.ar = 10;
  stepLegacyZAe(s, { onAi: () => {} });
  assert.equal(s.as, 7);
  assert.equal(s.aX, 1);
  assert.equal(s.V, false);
}

// h:Z branch: no wrap, aX untouched.
{
  const s = base();
  s.inputRight = true;
  s.as = 2;
  s.aX = 0;
  s.aW = 7;
  s.ar = 10;
  stepLegacyZAe(s, { onAi: () => {} });
  assert.equal(s.as, 3);
  assert.equal(s.aX, 0);
}

// e:Z && S:Z (inputUp && gameplaySFlag), selectionFlags[6] true: Q gates y:I (#388, lowercase) decrement.
{
  const s = base();
  s.inputUp = true;
  s.gameplaySFlag = true;
  s.selectionFlags = [false, false, false, false, false, false, true];
  s.QFlag = true;
  s.y = 5;
  stepLegacyZAe(s);
  assert.equal(s.y, 5);
}
{
  const s = base();
  s.inputUp = true;
  s.gameplaySFlag = true;
  s.selectionFlags = [false, false, false, false, false, false, true];
  s.QFlag = false;
  s.y = 5;
  stepLegacyZAe(s);
  assert.equal(s.y, 4);
}

// e:Z && S:Z, selectionFlags[6] false: s[as] increments up to `at`, mirrored into tiles.
{
  const s = base();
  s.inputUp = true;
  s.gameplaySFlag = true;
  s.as = 2;
  s.r[2] = 5;
  s.s[2] = 3;
  s.at = 9;
  stepLegacyZAe(s);
  assert.equal(s.s[2], 4);
  assert.equal(s.tiles[0][0][5], 4);
}
{
  const s = base();
  s.inputUp = true;
  s.gameplaySFlag = true;
  s.as = 2;
  s.s[2] = 9;
  s.at = 9;
  stepLegacyZAe(s);
  assert.equal(s.s[2], 9);
}

// f:Z && S:Z (inputDown && gameplaySFlag), selectionFlags[6] true: R gates y:I (#388, lowercase) increment.
{
  const s = base();
  s.inputDown = true;
  s.gameplaySFlag = true;
  s.selectionFlags = [false, false, false, false, false, false, true];
  s.RFlag = false;
  s.y = 5;
  stepLegacyZAe(s);
  assert.equal(s.y, 6);
}

// f:Z && S:Z, selectionFlags[6] false: s[as] decrements down to 0, mirrored into tiles.
{
  const s = base();
  s.inputDown = true;
  s.gameplaySFlag = true;
  s.as = 2;
  s.r[2] = 5;
  s.s[2] = 3;
  stepLegacyZAe(s);
  assert.equal(s.s[2], 2);
  assert.equal(s.tiles[0][0][5], 2);
}
{
  const s = base();
  s.inputDown = true;
  s.gameplaySFlag = true;
  s.as = 2;
  s.s[2] = 0;
  stepLegacyZAe(s);
  assert.equal(s.s[2], 0);
}

// trigger branch: wByte===4 && zlYInt===3 dispatches onL(-2) instead of af().
{
  const s = base();
  s.iFlag = true;
  s.wByte = 4;
  s.zlYInt = 3;
  let lArg = null, afCalls = 0;
  stepLegacyZAe(s, { onL: (v) => lArg = v, onAf: () => afCalls += 1 });
  assert.equal(lArg, -2);
  assert.equal(afCalls, 0);
  assert.equal(s.iFlag, false);
  assert.equal(s.staticL, false);
  assert.equal(s.inputV, false);
  assert.equal(s.E, 4);
}

// trigger branch: zlYInt===4 (and not the wByte===4 case) is a silent return.
{
  const s = base();
  s.staticL = true;
  s.zlYInt = 4;
  let lCalls = 0, afCalls = 0;
  stepLegacyZAe(s, { onL: () => lCalls += 1, onAf: () => afCalls += 1 });
  assert.equal(lCalls, 0);
  assert.equal(afCalls, 0);
}

// trigger branch: normal case dispatches onAf().
{
  const s = base();
  s.iFlag = true;
  s.wByte = 0;
  s.zlYInt = 0;
  let afCalls = 0;
  stepLegacyZAe(s, { onAf: () => afCalls += 1 });
  assert.equal(afCalls, 1);
}

// static m:Z branch dispatches onAh() and clears the flag.
{
  const s = base();
  s.staticM = true;
  let ahCalls = 0;
  stepLegacyZAe(s, { onAh: () => ahCalls += 1 });
  assert.equal(ahCalls, 1);
  assert.equal(s.staticM, false);
}

// nothing set: no callback fires.
{
  const s = base();
  let calls = 0;
  const cb = { onAi: () => calls += 1, onL: () => calls += 1, onAf: () => calls += 1, onAh: () => calls += 1 };
  stepLegacyZAe(s, cb);
  assert.equal(calls, 0);
}

console.log("stepLegacyZAe (private void ae(), lowercase) OK");
