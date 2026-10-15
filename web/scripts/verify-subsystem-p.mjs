import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import vm from "node:vm";

const srcDir = new URL("../src/j2me/", import.meta.url).pathname;
const context = vm.createContext({ Int8Array, Int16Array, Int32Array, Array, console, Math });
const cache = new Map();

function loadModule(specifier, fromDir) {
  const absPath = path.resolve(fromDir, specifier) + ".ts";
  if (cache.has(absPath)) return cache.get(absPath).exports;
  const module = { exports: {} };
  cache.set(absPath, module);
  const output = ts.transpileModule(fs.readFileSync(absPath, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const localRequire = (spec) => loadModule(spec, path.dirname(absPath));
  const fn = vm.compileFunction(output, ["module", "exports", "require"], { parsingContext: context });
  fn(module, module.exports, localRequire);
  return module.exports;
}

const { stepLegacySubsystemP } = loadModule("./LegacySubsystemP", srcDir);

// CORRECTED 2026-09-10: offset 18 is `if_icmpge 665`, so `dense[808+id] >= 1`
// goes STRAIGHT to the tail and the main body is the `<= 0` side -- this file
// used to have every main-body case set `dense[808+id] = 1`. The tail's own
// gate (offset 665) is `dense[808+id] <= 0 -> return`, so the two halves are
// cleanly disjoint: 7777 can only be written on the `>= 1` route.
//
// Also: `a(int,int,int):int`(#266) is a real call now, not a deliberate
// throw. Cases that need a predictable 0 from it keep `dense[4444+id] < -1`,
// which is #266's own offset-0..22 early return.
const base = (overrides = {}) => {
  const state = new Int8Array(20000);
  const id = 5;
  return {
    state, id, team: 0,
    packedBytes: new Int8Array(2000), packedOffsets: new Int16Array(200),
    saveOffsets: new Int16Array(600),
    localFlags: [false, false, true],
    bThreshold: 0, fNFlag: true, qByte: 0, fQByte: 0, fByte: 0,
    onNearestCandidate: () => {}, onN: () => {}, onGate: () => false,
    randomRemainder: () => 0, mapWidth: 96, mapHeight: 96,
    ...overrides,
  };
};

// dense[808+id] >= 1 -> straight to the tail, skipping #266 entirely.
// type 50 with no reset condition -> no side effect.
{
  const input = base();
  input.state[808 + input.id] = 1;
  input.state[2828 + input.id] = 50;
  input.team = 1; // team 1 with qByte 0 -> no reset
  stepLegacySubsystemP(input);
  assert.equal(input.state[7777 + input.id], 0);
}

// dense[808+id] >= 1 with a reset condition (type <= 9) -> the tail writes.
{
  const input = base();
  input.state[808 + input.id] = 1;
  input.state[2828 + input.id] = 3;
  stepLegacySubsystemP(input);
  assert.equal(input.state[7777 + input.id], 3);
}

// dense[808+id] <= 0 with avg <= bThreshold -> the "goto 665" tail, whose own
// gate then returns immediately because dense[808+id] <= 0.
{
  const input = base({ bThreshold: 5 });
  input.state[808 + input.id] = 0;
  input.state[4444 + input.id] = -2; // #266 returns 0 -> avg 0 <= 5
  input.state[2828 + input.id] = 3;
  stepLegacySubsystemP(input);
  assert.equal(input.state[7777 + input.id], 0, "the tail's own 808<=0 gate fires first");
}

// Offsets 77..86: localFlags[2] false -> return before the 7979 mask, after
// the 4848 increment.
{
  const input = base({ bThreshold: -1, localFlags: [false, false, false] });
  input.state[808 + input.id] = 0;
  input.state[4444 + input.id] = -2;
  input.state[2828 + input.id] = 50;
  input.state[7979 + input.id] = -1;
  stepLegacySubsystemP(input);
  assert.equal(input.state[4848 + input.id], 1, "the increment happens first");
  assert.equal(input.state[7979 + input.id], -1, "the 223 mask does not");
}

// Same safe path, but avg(0) > bThreshold(-1) -> enters the real body.
// type not in any special set, table39!==1, type>9 -> calls the gate.
{
  const gateCalls = [];
  const input = base({
    bThreshold: -1,
    onGate: (...a) => { gateCalls.push(a); return false; },
  });
  input.state[808 + input.id] = 0;
  input.state[4444 + input.id] = -2;
  input.state[2828 + input.id] = 50; // not in any special type set, >9
  input.state[4949 + input.id] = 4; // scanLimit = 4*2+1 = 9
  input.state[input.id] = 10; input.state[101 + input.id] = 10;
  stepLegacySubsystemP(input);
  assert.equal(input.state[4848 + input.id], 1); // incremented
  assert.equal(gateCalls.length, 1);
  assert.deepEqual(gateCalls[0], [0, 9, 7, 7]); // mode=0, scanLimit=9, x=10-3, y=10-3
}

// Real body: table39[type]===1 -> calls onNearestCandidate with the
// linked-record args. dense[4444+id] must stay < -1 to avoid the a(III):I
// throw (checked once, up front, before type is even read) while ALSO being
// read again inside the real body for the b(II):V call args -- both uses
// read the same field, so a value like -5 satisfies both.
{
  const calls = [];
  const input = base({
    bThreshold: -1,
    onNearestCandidate: (...a) => calls.push(a),
  });
  input.state[808 + input.id] = 0;
  input.state[4444 + input.id] = -5;
  input.state[2828 + input.id] = 50;
  input.packedOffsets[39] = 0;
  input.packedBytes[50] = 1; // table39[type=50] === 1
  input.state[8749 - 5] = 33; // dense[8749 + dense[4444+id]] = dense[8749-5]
  stepLegacySubsystemP(input);
  assert.deepEqual(calls, [[33, -5]]);
}

// Real body: type in {69,79,59,87} -> the type-tail write, no gate/N() call.
{
  const gateCalls = []; let nCalled = false;
  const input = base({
    bThreshold: -1,
    onGate: (...a) => { gateCalls.push(a); return false; },
    onN: () => { nCalled = true; },
  });
  input.state[808 + input.id] = 0;
  input.state[4444 + input.id] = -2;
  input.state[2828 + input.id] = 69;
  input.state[input.id] = 12; input.state[101 + input.id] = 13;
  stepLegacySubsystemP(input);
  assert.equal(input.state[3131 + input.id], 12);
  assert.equal(input.state[3232 + input.id], 13);
  assert.equal(gateCalls.length, 0);
  assert.equal(nCalled, false);
}

// Real body: type in {69,79,59,87}, the 6464===69/6262==3131/6363==3232
// preservation branch also fires -> 6262/6363 get set from id's own position first.
{
  const input = base({ bThreshold: -1 });
  input.state[808 + input.id] = 0;
  input.state[4444 + input.id] = -2;
  input.state[2828 + input.id] = 79;
  input.state[6464 + input.id] = 69;
  input.state[6262 + input.id] = 100; input.state[3131 + input.id] = 100; // equal
  input.state[6363 + input.id] = 200; input.state[3232 + input.id] = 200; // equal
  input.state[input.id] = 5; input.state[101 + input.id] = 6;
  stepLegacySubsystemP(input);
  assert.equal(input.state[6262 + input.id], 5);
  assert.equal(input.state[6363 + input.id], 6);
  assert.equal(input.state[3131 + input.id], 5);
  assert.equal(input.state[3232 + input.id], 6);
}

// Real body: type in {17,109,110,27} -> calls onN, no gate/type-tail.
{
  let nCalled = false; const gateCalls = [];
  const input = base({
    bThreshold: -1,
    onN: () => { nCalled = true; },
    onGate: (...a) => { gateCalls.push(a); return false; },
  });
  input.state[808 + input.id] = 0;
  input.state[4444 + input.id] = -2;
  input.state[2828 + input.id] = 17;
  stepLegacySubsystemP(input);
  assert.equal(nCalled, true);
  assert.equal(gateCalls.length, 0);
}

// Real body: type not special, table39[type]!==1, type<=9 -> plain return, no gate call.
{
  const gateCalls = [];
  const input = base({ bThreshold: -1, onGate: (...a) => { gateCalls.push(a); return false; } });
  input.state[808 + input.id] = 0;
  input.state[4444 + input.id] = -2;
  input.state[2828 + input.id] = 5; // <=9
  stepLegacySubsystemP(input);
  assert.equal(gateCalls.length, 0);
}

// Tail: the reset conditions. All reached through the direct
// dense[808+id] >= 1 route, which is the only one whose tail does work.
{
  const input = base();
  input.state[808 + input.id] = 1;
  input.state[2828 + input.id] = 3; // type <= 9
  stepLegacySubsystemP(input);
  assert.equal(input.state[7777 + input.id], 3);
}

// Tail: team===0 and f.N SET -> reset. Offset 749 is `getfield f.N:Z;
// ifne 786`. CORRECTED 2026-09-14: this case used to assert the inverted
// `fNFlag === false` reading.
{
  const input = base({ bThreshold: 100, team: 0, fNFlag: true });
  input.state[808 + input.id] = 1;
  input.state[2828 + input.id] = 50; // not <=9/59/87
  stepLegacySubsystemP(input);
  assert.equal(input.state[7777 + input.id], 3);
}
// ...and f.N CLEAR falls through to 752 -> 767 -> (q != 3) -> return.
{
  const input = base({ bThreshold: 100, team: 0, fNFlag: false });
  input.state[808 + input.id] = 1;
  input.state[2828 + input.id] = 50;
  stepLegacySubsystemP(input);
  assert.equal(input.state[7777 + input.id], 0);
}

// Tail: team===1 and qByte>0 -> reset.
{
  const input = base({ bThreshold: 100, team: 1, qByte: 5 });
  input.state[808 + input.id] = 1;
  input.state[2828 + input.id] = 50;
  stepLegacySubsystemP(input);
  assert.equal(input.state[7777 + input.id], 3);
}

// Tail: fQByte===3 and fByte===4 -> reset.
{
  const input = base({ bThreshold: 100, team: 1, qByte: 0, fQByte: 3, fByte: 4 });
  input.state[808 + input.id] = 1;
  input.state[2828 + input.id] = 50;
  stepLegacySubsystemP(input);
  assert.equal(input.state[7777 + input.id], 3);
}

// Tail: none of the reset conditions -> plain return, no side effect.
{
  const input = base({ bThreshold: 100, team: 1, qByte: 0, fQByte: 0, fByte: 0 });
  input.state[808 + input.id] = 1;
  input.state[2828 + input.id] = 50;
  stepLegacySubsystemP(input);
  assert.equal(input.state[7777 + input.id], 0);
}

console.log("stepLegacySubsystemP (private void p()) OK");
