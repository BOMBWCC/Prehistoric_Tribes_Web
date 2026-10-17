import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";
import path from "node:path";

const srcDir = new URL("../src/", import.meta.url).pathname;
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

const { stepLegacyZAf } = loadModule("./ui/LegacyZAf", srcDir);

function base() {
  return {
    dense: new Int8Array(10000),
    r: new Int8Array(20),
    as: 0,
    entityFocusFlag: false,
    kByte: 0,
    frameLayoutAX: 0,
    frameLayoutL: 4,
    V: false,
    qCounter: 1,
    selectionFlags: new Array(20).fill(false),
    wByte: 0,
    cSInt: 0,
    pendingP: false,
    xMFlag: false,
    xOFlag: false,
    outerLoopLFlag: true,
    outerLoopNFlag: true,
    frameLayoutAq: 2,
    yByte: 1, IByte: 2, AByte: 3, KByte: 4, FByte: -1,
    aByte2d: [new Int8Array(50)],
  };
}

function baseCallbacks(overrides = {}) {
  return {
    onF2: () => {},
    onAjUpper: () => {},
    onCompleteEntityRecord: () => {},
    resourceByte: (shortOffset, add) => shortOffset + add,
    onSubsystemBC: () => {},
    onSelectionReset: () => {},
    onSelectionReset9: () => {},
    onL: () => {},
    ...overrides,
  };
}

// r===13: delegates to stepLegacyZAj (checked via its side effects).
{
  const s = base();
  s.r[0] = 13;
  s.dense[1919 + s.frameLayoutL] = 1;
  stepLegacyZAf(s, baseCallbacks());
  assert.equal(s.entityFocusFlag, true);
  assert.equal(s.kByte, 0);
  assert.equal(s.pendingP, true);
}

// r<0, entityFocusFlag && kByte===frameLayoutL -> throws.
{
  const s = base();
  s.r[0] = -1;
  s.entityFocusFlag = true;
  s.kByte = s.frameLayoutL;
  assert.throws(() => stepLegacyZAf(s, baseCallbacks()));
}

// r<0, entityFocusFlag && kByte!==frameLayoutL -> kByte=frameLayoutL, onF2 tail fires.
{
  const s = base();
  s.r[0] = -1;
  s.entityFocusFlag = true;
  s.kByte = 99;
  let f2Args;
  stepLegacyZAf(s, baseCallbacks({ onF2: (a1, a2) => f2Args = [a1, a2] }));
  assert.equal(s.kByte, s.frameLayoutL);
  assert.ok(f2Args);
}

// r<0, !entityFocusFlag, V true -> safe-path cancel call, V cleared, onF2 tail fires.
{
  const s = base();
  s.r[0] = -1;
  s.V = true;
  s.dense[8810 + s.qCounter] = 999; // safe early-return path in stepLegacyEntityRecordCancel
  let f2Called = false;
  stepLegacyZAf(s, baseCallbacks({ onF2: () => f2Called = true }));
  assert.equal(s.V, false);
  assert.equal(f2Called, true);
  // local3=true (arg3 hardcoded), flagY===0, ownerX===0 (not in {2,4,7,8}) -> 6161=2 only.
  assert.equal(s.dense[6161 + s.frameLayoutL], 2);
}

// r<0, !entityFocusFlag, V false -> V/pendingP set true, onF2 tail still fires.
{
  const s = base();
  s.r[0] = -1;
  s.V = false;
  let f2Called = false;
  stepLegacyZAf(s, baseCallbacks({ onF2: () => f2Called = true }));
  assert.equal(s.V, true);
  assert.equal(s.pendingP, true);
  assert.equal(f2Called, true);
}

// selectionFlags[6]: onAjUpper + onL(0) + resourceByte-derived cSInt.
{
  const s = base();
  s.r[0] = 5;
  s.selectionFlags[6] = true;
  let ajCalled = false, lValue;
  stepLegacyZAf(s, baseCallbacks({ onAjUpper: () => ajCalled = true, onL: (v) => lValue = v, resourceByte: (so, add) => so * 1000 + add }));
  assert.equal(ajCalled, true);
  assert.equal(lValue, 0);
  assert.equal(s.cSInt, 138 * 1000 + 416 + 5);
}

// r===17: onL(3).
{
  const s = base();
  s.r[0] = 17;
  let lValue;
  stepLegacyZAf(s, baseCallbacks({ onL: (v) => lValue = v }));
  assert.equal(lValue, 3);
}

// r===16/26: dispatches into stepLegacyZB2, a confirmed guaranteed-throw
// (CORRECTION 2026-08-22 -- see LegacyZB2.ts's own docblock). The
// onSelectionReset(true,true,false,false)/wByte=0 that would previously
// follow (bytecode offset 413..429) is confirmed unreachable dead code
// too, since the throw happens first.
{
  const s = base();
  s.r[0] = 16;
  assert.throws(() => stepLegacyZAf(s, baseCallbacks()));
}
{
  const s = base();
  s.r[0] = 26;
  assert.throws(() => stepLegacyZAf(s, baseCallbacks()));
}

// r===27: clamps dense[8505+q] against the resourceByte table lookup, sets bit0, pendingP.
{
  const s = base();
  s.r[0] = 27;
  s.qCounter = 2;
  s.dense[8505 + 2] = 100;
  s.dense[8749 + 2] = 1; // owner
  s.dense[9115 + 2] = 0; // groupTable
  stepLegacyZAf(s, baseCallbacks({ resourceByte: () => 50 }));
  assert.equal(s.dense[8566 + 2], 50);
  assert.equal(s.dense[8505 + 2], 50); // clamped down since 100 > 50
  assert.equal(s.dense[9054 + 2] & 1, 1);
  assert.equal(s.pendingP, true);
}

// r===28: sets bit0 and pendingP without touching the clamp fields.
{
  const s = base();
  s.r[0] = 28;
  s.qCounter = 2;
  stepLegacyZAf(s, baseCallbacks());
  assert.equal(s.dense[9054 + 2] & 1, 1);
  assert.equal(s.dense[8566 + 2], 0);
  assert.equal(s.pendingP, true);
}

// r===10: 9-arg resetSelection with positions 1 and 6 true, pendingP.
{
  const s = base();
  s.r[0] = 10;
  let reset9;
  stepLegacyZAf(s, baseCallbacks({ onSelectionReset9: (...a) => reset9 = a }));
  assert.deepEqual(reset9, [true, false, false, false, false, true, false, false, false]);
  assert.equal(s.pendingP, true);
}

// r===11: xMFlag, onL(2), cSInt=100, onAjUpper.
{
  const s = base();
  s.r[0] = 11;
  let lValue, ajCalled = false;
  stepLegacyZAf(s, baseCallbacks({ onL: (v) => lValue = v, onAjUpper: () => ajCalled = true }));
  assert.equal(s.xMFlag, true);
  assert.equal(lValue, 2);
  assert.equal(s.cSInt, 100);
  assert.equal(ajCalled, true);
}

// r===14: clears outerLoopLFlag/xMFlag, dispatches onSubsystemBC, pendingP.
{
  const s = base();
  s.r[0] = 14;
  let bcCalled = false;
  stepLegacyZAf(s, baseCallbacks({ onSubsystemBC: () => bcCalled = true }));
  assert.equal(s.outerLoopLFlag, false);
  assert.equal(s.xMFlag, false);
  assert.equal(bcCalled, true);
  assert.equal(s.pendingP, true);
}

// r===12: xOFlag, onL(2), cSInt=100, onAjUpper.
{
  const s = base();
  s.r[0] = 12;
  stepLegacyZAf(s, baseCallbacks());
  assert.equal(s.xOFlag, true);
  assert.equal(s.cSInt, 100);
}

// r===15: clears outerLoopNFlag/xOFlag, dispatches onSubsystemBC, pendingP.
{
  const s = base();
  s.r[0] = 15;
  let bcCalled = false;
  stepLegacyZAf(s, baseCallbacks({ onSubsystemBC: () => bcCalled = true }));
  assert.equal(s.outerLoopNFlag, false);
  assert.equal(s.xOFlag, false);
  assert.equal(bcCalled, true);
}

// r in [23,25]: cycles frameLayoutAq 0->1->2->0, pendingP.
{
  const s = base();
  s.r[0] = 24;
  s.frameLayoutAq = 2;
  stepLegacyZAf(s, baseCallbacks());
  assert.equal(s.frameLayoutAq, 0);
  assert.equal(s.pendingP, true);
}
{
  const s = base();
  s.r[0] = 23;
  s.frameLayoutAq = 0;
  stepLegacyZAf(s, baseCallbacks());
  assert.equal(s.frameLayoutAq, 1);
}

// r in [6,8]: onL(2), cSInt=20+r-6.
{
  const s = base();
  s.r[0] = 7;
  let lValue;
  stepLegacyZAf(s, baseCallbacks({ onL: (v) => lValue = v }));
  assert.equal(lValue, 2);
  assert.equal(s.cSInt, 21);
}

// r<6: delegates to stepLegacyZAg (checked via a real ag() side effect).
{
  const s = base();
  s.r[0] = 2;
  s.dense[8749 + s.qCounter] = 6; // ag()'s own owner gate
  s.kByte = 4;
  stepLegacyZAf(s, baseCallbacks());
  assert.equal(s.dense[2828 + 4], 44 + 2);
}

// r===29: also delegates to stepLegacyZAg.
{
  const s = base();
  s.r[0] = 29;
  s.dense[8749 + s.qCounter] = 6;
  s.kByte = 4;
  stepLegacyZAf(s, baseCallbacks());
  assert.equal(s.dense[6161 + 4], 2); // r===29 -> action=2 inside ag()
}

// r>=19, wByte!==3: onL(1) (r!==22), cSInt=r-19.
{
  const s = base();
  s.r[0] = 20;
  s.wByte = 0;
  let lValue;
  stepLegacyZAf(s, baseCallbacks({ onL: (v) => lValue = v }));
  assert.equal(lValue, 1);
  assert.equal(s.cSInt, 1);
}

// r===22: onL(2).
{
  const s = base();
  s.r[0] = 22;
  s.wByte = 0;
  let lValue;
  stepLegacyZAf(s, baseCallbacks({ onL: (v) => lValue = v }));
  assert.equal(lValue, 2);
}

// r>=19, wByte===3: no-op.
{
  const s = base();
  s.r[0] = 20;
  s.wByte = 3;
  let called = false;
  stepLegacyZAf(s, baseCallbacks({ onL: () => called = true }));
  assert.equal(called, false);
  assert.equal(s.cSInt, 0);
}

// r===9: falls through every branch, true no-op.
{
  const s = base();
  s.r[0] = 9;
  const before = JSON.stringify({ ...s, dense: null, r: null, aByte2d: null, selectionFlags: null });
  stepLegacyZAf(s, baseCallbacks());
  const after = JSON.stringify({ ...s, dense: null, r: null, aByte2d: null, selectionFlags: null });
  assert.equal(before, after);
}

console.log("stepLegacyZAf (private void af()) OK");
