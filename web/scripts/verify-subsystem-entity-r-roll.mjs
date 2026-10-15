// Regression test for LegacySubsystemEntityRRoll.ts (private boolean r()).
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

const { stepLegacySubsystemEntityRRoll } = loadModule("./LegacySubsystemEntityRRoll", srcDir);

function baseInput(overrides = {}) {
  return {
    state: new Int8Array(10000),
    packedBytes: new Int8Array(2000),
    packedOffsets: new Int16Array(320),
    entityId: 5,
    frame: 0,
    team: 0,
    fQByte: 0,
    // Sentinel gate so a bare `level>=12` doesn't also cross the frame
    // threshold by accident; tests that want the escalation block set
    // their own low bShort/shortTableBOffsets values.
    bShort: new Int16Array(600).fill(30000),
    shortTableBOffsets: new Int16Array(5),
    outerLoopLFlag: false,
    onS: () => true,
    ...overrides,
  };
}

// RETRACTED (2026-09-07): level>=12 no longer throws unconditionally -- the
// escalation block is additionally gated on `frame >=
// bShort[shortTableBOffsets[4]+fQByte]`, and with the default sentinel gate
// (never reached) these fall straight through to the shared tail below,
// same as any level<12 entity.
{
  const input = baseInput();
  input.state[1414 + 5] = 12;
  assert.equal(stepLegacySubsystemEntityRRoll(input), true);
}
{
  const input = baseInput();
  input.state[1414 + 5] = 20;
  assert.equal(stepLegacySubsystemEntityRRoll(input), true);
}

// level>=12 AND frame past the gate, table(41,dense[6464+id])===9 branch:
// bumps dense[2020+id] (capped at 100).
{
  const input = baseInput({ frame: 69, entityId: 5 }); // 69&63===5&63 (both 5)
  input.state[1414 + 5] = 12;
  input.bShort = new Int16Array(600);
  input.shortTableBOffsets[4] = 0;
  input.bShort[0] = 5; // gate frame, well below this tick's frame 69
  input.state[6464 + 5] = 2;
  input.packedOffsets[41] = 100;
  input.packedBytes[100 + 2] = 9; // table(41,2)===9
  input.packedBytes[0] = 127; // table(170,0)>=127 -- keeps the trailing unconditional aJ block's own modulo skipped
  input.state[2020 + 5] = 50;
  const result = stepLegacySubsystemEntityRRoll(input);
  assert.equal(result, true);
  assert.equal(input.state[2020 + 5], 51);
}

// Same branch, dense[2020+id] already at the cap -> no further increment.
{
  const input = baseInput({ frame: 69, entityId: 5 });
  input.state[1414 + 5] = 12;
  input.bShort = new Int16Array(600);
  input.shortTableBOffsets[4] = 0;
  input.bShort[0] = 5;
  input.state[6464 + 5] = 2;
  input.packedOffsets[41] = 100;
  input.packedBytes[100 + 2] = 9;
  input.packedBytes[0] = 127;
  input.state[2020 + 5] = 100;
  const result = stepLegacySubsystemEntityRRoll(input);
  assert.equal(result, true);
  assert.equal(input.state[2020 + 5], 100);
}

// level>=12, table(41,..)!==9 -> the `else` branch: table(50,type)<127 &&
// frame%(table(50,type)*(team*4+1))<=3 decrements dense[2020+id] (or calls
// onRandomAction(id,-1) once it's already <=0); once it's down to <=5 with
// outerLoopLFlag set and dense[7979+id]&64, calls onMove(14,id,id)
// (b's own `a(byte,int,int)` #274, LegacyEntityMoveTrigger.ts's target).
{
  const input = baseInput({ frame: 5, entityId: 5 });
  input.state[1414 + 5] = 12;
  input.bShort = new Int16Array(600); // gate 0 -- always past
  input.state[2828 + 5] = 0; // type
  input.packedOffsets[50] = 200;
  input.packedBytes[200 + 0] = 5; // table(50,0)=5, divisor=5*(team0*4+1)=5, frame%5=0<=3
  // table(41,0) and table(170,0) both read packedBytes[0] (both rows
  // default to offset 0): 127 keeps the first branch's own `===9` check
  // false (falls to `else`, as intended) and skips the trailing aJ block.
  input.packedBytes[0] = 127;
  input.state[2020 + 5] = 1; // decrements to 0, <=5
  input.outerLoopLFlag = true;
  input.state[7979 + 5] = 64;
  let moveArgs = null;
  const result = stepLegacySubsystemEntityRRoll({ ...input, onMove: (...a) => { moveArgs = a; } });
  assert.equal(result, true);
  assert.equal(input.state[2020 + 5], 0);
  assert.deepEqual(moveArgs, [14, 5, 5]);
}

// Same `else` branch, but dense[2020+id] already <=0 -> onRandomAction(id,-1)
// instead of a decrement (and onMove skipped: outerLoopLFlag false here).
{
  const input = baseInput({ frame: 3, entityId: 9 });
  input.state[1414 + 9] = 12;
  input.bShort = new Int16Array(600);
  input.state[2828 + 9] = 0;
  input.packedOffsets[50] = 200;
  input.packedBytes[200 + 0] = 4; // divisor=4*(team0*4+1)=4, frame%4=3<=3
  input.packedBytes[0] = 127;
  input.state[2020 + 9] = 0;
  let raArgs = null;
  const result = stepLegacySubsystemEntityRRoll({ ...input, onRandomAction: (...a) => { raArgs = a; } });
  assert.equal(result, true);
  assert.deepEqual(raArgs, [9, -1]);
}

// team plumbing: divisor uses team*4+1, so team=1 changes which frames land
// in the `<=3` window for the exact same table(50,..) value.
{
  const input = baseInput({ frame: 5, entityId: 5, team: 1 });
  input.state[1414 + 5] = 12;
  input.bShort = new Int16Array(600);
  input.state[2828 + 5] = 0;
  input.packedOffsets[50] = 200;
  input.packedBytes[200 + 0] = 1; // divisor=1*(team1*4+1)=5, frame%5=0<=3
  input.packedBytes[0] = 127;
  input.state[2020 + 5] = 10;
  const result = stepLegacySubsystemEntityRRoll(input);
  assert.equal(result, true);
  assert.equal(input.state[2020 + 5], 9);
}

// The trailing, unconditional aJ block (offset 322..401, runs after EITHER
// branch above): `dense[2929+id]&255<=14` picks table(170,..), otherwise
// table(52,type); mirrors the same decrement/onRandomAction/onMove shape
// on dense[2121+id] instead of dense[2020+id], with command 15.
{
  const input = baseInput({ frame: 69, entityId: 5 }); // table(41,..)===9 branch, doesn't touch dense[2121+id]
  input.state[1414 + 5] = 12;
  input.bShort = new Int16Array(600);
  input.shortTableBOffsets[4] = 0;
  input.bShort[0] = 5;
  input.state[6464 + 5] = 2;
  input.packedOffsets[41] = 100;
  input.packedBytes[100 + 2] = 9;
  input.state[2020 + 5] = 50;
  input.state[2929 + 5] = 20; // action=20>14 -> aJ=table(52,type)
  input.state[2828 + 5] = 3; // type
  input.packedOffsets[52] = 500;
  input.packedBytes[500 + 3] = 6; // aJ=6, divisor=6*(team0*4+1)=6, frame%6=69%6=3<=3
  input.state[2121 + 5] = 1; // decrements to 0, <=5
  input.outerLoopLFlag = true;
  input.state[7979 + 5] = 64;
  let moveArgs = null;
  const result = stepLegacySubsystemEntityRRoll({ ...input, onMove: (...a) => { moveArgs = a; } });
  assert.equal(result, true);
  assert.equal(input.state[2020 + 5], 51); // first branch still bumped
  assert.equal(input.state[2121 + 5], 0);
  assert.deepEqual(moveArgs, [15, 5, 5]);
}

// offset 545..553: `if (!s()) return false` -- reached once both sub-blocks
// above are skipped (table(50,..)/table(170,..) both >=127 here).
{
  const input = baseInput({ frame: 100, entityId: 7 });
  input.state[1414 + 7] = 12;
  input.bShort = new Int16Array(600); // gate 0 -- always past
  input.packedBytes[0] = 127; // table(41,0)!=9 (falls to else); table(50,0) and table(170,0) both >=127 (both skipped)
  let sCalled = false;
  const result = stepLegacySubsystemEntityRRoll({ ...input, onS: () => { sCalled = true; return false; } });
  assert.equal(sCalled, true);
  assert.equal(result, false);
}

// Java `irem` semantics: table(50,type)===0 (a real, in-range table value)
// makes the divisor 0 -- reproduced as a real throw, not a silent NaN/0,
// matching this project's existing `idiv()`-by-zero convention
// (LegacyEntityOverlayDraw.ts).
{
  const input = baseInput({ frame: 10, entityId: 3 });
  input.state[1414 + 3] = 12;
  input.bShort = new Int16Array(600); // gate 0 -- always past
  // table(41,0)===0 (default, !=9) -> else branch; table(50,0)===0 (default)
  // -> maxHits=0, divisor=0*(team0*4+1)=0.
  assert.throws(() => stepLegacySubsystemEntityRRoll(input), /by zero/);
}

// level < 12, branch 1: cooldown>1 && table(41,..)===11, timing window -> onRandomAction(id,2), true.
{
  const input = baseInput({ frame: 38 });
  input.state[1414 + 5] = 5;
  input.state[7373 + 5] = 3; // cooldown
  input.state[6464 + 5] = 7;
  input.packedOffsets[41] = 100;
  input.packedBytes[100 + 7] = 11;
  // Offsets 602..629: 38 % (46 - 3*3) = 1 <= 3 -> fires (the old (38 - 9) % 46 = 29 did not)
  let args = null;
  const result = stepLegacySubsystemEntityRRoll({ ...input, onRandomAction: (...a) => { args = a; } });
  assert.equal(result, true);
  assert.deepEqual(args, [5, 2]);
}

// branch 1 condition met but outside timing window -> no call, still true.
{
  const input = baseInput({ frame: 0 });
  input.state[1414 + 5] = 5;
  input.state[7373 + 5] = 3;
  input.state[6464 + 5] = 7;
  input.packedOffsets[41] = 100;
  input.packedBytes[100 + 7] = 11;
  // Need frame % (46 - 9) > 3.
  const input2 = baseInput({ frame: 20 });
  input2.state[1414 + 5] = 5;
  input2.state[7373 + 5] = 3;
  input2.state[6464 + 5] = 7;
  input2.packedOffsets[41] = 100;
  input2.packedBytes[100 + 7] = 11;
  // 20 % 37 = 20 > 3 -> no call
  let called = false;
  const result = stepLegacySubsystemEntityRRoll({ ...input2, onRandomAction: () => { called = true; } });
  assert.equal(result, true);
  assert.equal(called, false);
}

// branch 1 condition not met (cooldown<=1) -> falls to branch 2.
{
  const input = baseInput({ frame: 15 }); // (15&127)=15, (id&15)=5 -- not equal -> falls to branch 3
  input.state[1414 + 5] = 5;
  input.state[7373 + 5] = 0; // cooldown<=1, skip branch1
  const result = stepLegacySubsystemEntityRRoll(input);
  assert.equal(result, true);
}

// branch 2: (frame&127)===(id&15) -> onRandomAction(id,1) when bit4 clear.
{
  const input = baseInput({ frame: 5 }); // (5&127)=5, (id&15)=5&15=5 -- match
  input.state[1414 + 5] = 5;
  input.state[7373 + 5] = 0;
  input.state[7979 + 5] = 0; // bit4 clear
  let args = null;
  const result = stepLegacySubsystemEntityRRoll({ ...input, onRandomAction: (...a) => { args = a; } });
  assert.equal(result, true);
  assert.deepEqual(args, [5, 1]);
}

// branch 3: dense[7979]&4>0 && (frame&31)===(id&15) -> onRandomAction(id,-1), defers to onS().
{
  const input = baseInput({ frame: 21 }); // (21&127)=21 != (id&15)=5 -- skip branch2; (21&31)=21 != (id&15)=5... need matching frame
  // Recompute: need (frame&127)!==(id&15) to skip branch2, and (frame&31)===(id&15) for branch3.
  // id&15 = 5. Choose frame=5+32=37: (37&127)=37!=5 (skip branch2); (37&31)=5===5 (branch3 match).
  const input2 = baseInput({ frame: 37 });
  input2.state[1414 + 5] = 5;
  input2.state[7373 + 5] = 0;
  input2.state[7979 + 5] = 4; // bit set
  let args = null;
  let sCalled = false;
  const result = stepLegacySubsystemEntityRRoll({
    ...input2,
    onRandomAction: (...a) => { args = a; },
    onS: () => { sCalled = true; return false; },
  });
  assert.deepEqual(args, [5, -1]);
  assert.equal(sCalled, true);
  assert.equal(result, false); // propagates onS()'s false
}

console.log("private boolean r() (regen roll) OK");
