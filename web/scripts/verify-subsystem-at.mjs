// Regression test for LegacySubsystemAt.ts (private void at()).
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

const { stepLegacySubsystemAt, stepLegacySubsystemAu } = loadModule("./LegacySubsystemAt", srcDir);

function makeGrid() {
  return Array.from({ length: 30 }, () => new Int8Array(30));
}

function makeInput(overrides = {}) {
  return {
    state: new Int8Array(10000),
    packedBytes: new Int8Array(4000),
    packedOffsets: new Int16Array(312),
    jobTable: new Int8Array(60),
    entityId: 5,
    qByte: 0,
    mByte: 10,
    aT: 0,
    gBase: 3000, // packedBytes[3000..3003] as the bounding box
    gridC: makeGrid(),
    sceneQ: 0,
    fBByte: 0,
    simulationCounter: 0,
    saveOffsets: new Int16Array(570),
    scratch: { x: 0, w: 0 },
    ...overrides,
  };
}

// Throttle: only entities matching (c&15)===(v&15) proceed past Block A.
{
  const input = makeInput({ entityId: 5, simulationCounter: 1, qByte: -1 }); // 1&15=1, 5&15=5 -> mismatch
  input.state[6565 + 5] = 9;
  let lowerOCalls = 0;
  stepLegacySubsystemAt(input, { onLowerO: () => { lowerOCalls += 1; } });
  // Block A itself (Q<0) still runs regardless of the throttle (throttle
  // gates Block B onward, not Block A) -- jobTable[0]=0 < M=10, so the
  // production branch runs, not the onLowerO branch. Assert no crash.
  assert.equal(lowerOCalls, 0);
}

// Block A, j[aT]<M: produces dense[6565+v] from the packedBytes table.
{
  const input = makeInput({ qByte: -1 });
  const v = input.entityId;
  input.jobTable[0] = 3; // < M(10)
  input.packedOffsets[221 + 0] = 100; // sceneQ=0 -> packedOffsets[221]
  input.packedBytes[100 + 10 * 3 + 3] = 7; // M*3 + j[aT] = 30+3=33, base 100 -> index133... let's just set precisely
  // x = packedBytes[ packedOffsets[221+q] + M*3 + j[aT] ]
  const idx = 100 + input.mByte * 3 + input.jobTable[0];
  input.packedBytes[idx] = 7;
  input.state[6565 + v] = 0; // different from 7, so it should be written
  stepLegacySubsystemAt(input, {});
  assert.equal(input.state[6565 + v], 7);
}

// Block A, the f.q>=4 && fBByte!==0 downgrade branch: x becomes 5 (nonzero) or 4 (zero).
// FIXED 2026-09-07: bytecode offsets 130..142 are `x = (x!==0) ? 5 : 4`, the
// opposite of what this test previously asserted (4/5 were swapped).
{
  const input = makeInput({ qByte: -1, sceneQ: 4, fBByte: 1, aT: 20 });
  const v = input.entityId;
  input.jobTable[20] = 2;
  input.packedOffsets[221 + 4] = 200;
  const idx = 200 + input.mByte * 3 + input.jobTable[20];
  input.packedBytes[idx] = 9; // nonzero raw x
  input.packedOffsets[242] = 50;
  input.packedBytes[50 + 4] = 5; // threshold: aT(20) >= 5, so guard passes (aT<threshold is false)
  stepLegacySubsystemAt(input, {});
  assert.equal(input.state[6565 + v], 5, "nonzero raw x downgrades to 5");
  assert.equal(input.scratch.x, 5, "x round-trips to the shared scratch");
}
{
  const input = makeInput({ qByte: -1, sceneQ: 4, fBByte: 1, aT: 20 });
  const v = input.entityId;
  input.jobTable[20] = 2;
  input.packedOffsets[221 + 4] = 200;
  const idx = 200 + input.mByte * 3 + input.jobTable[20];
  input.packedBytes[idx] = 0; // zero raw x
  input.packedOffsets[242] = 50;
  input.packedBytes[50 + 4] = 5;
  stepLegacySubsystemAt(input, {});
  assert.equal(input.state[6565 + v], 4, "zero raw x downgrades to 4");
}

// Block A, the aT<threshold && x===2 exemption: keeps x unchanged (2).
{
  const input = makeInput({ qByte: -1, sceneQ: 4, fBByte: 1, aT: 1 });
  const v = input.entityId;
  input.jobTable[1] = 2;
  input.packedOffsets[221 + 4] = 200;
  const idx = 200 + input.mByte * 3 + input.jobTable[1];
  input.packedBytes[idx] = 2; // raw x === 2
  input.packedOffsets[242] = 50;
  input.packedBytes[50 + 4] = 5; // threshold=5, aT=1 < 5 -> exemption applies
  stepLegacySubsystemAt(input, {});
  assert.equal(input.state[6565 + v], 2, "exemption keeps x===2 unchanged");
}

// Block A, j[aT]>=M: dense[6565+v]===9 triggers onLowerO.
{
  const input = makeInput({ qByte: -1 });
  const v = input.entityId;
  input.jobTable[0] = 20; // >= M(10)
  input.state[6565 + v] = 9;
  let lowerOCalls = 0;
  stepLegacySubsystemAt(input, { onLowerO: () => { lowerOCalls += 1; } });
  assert.equal(lowerOCalls, 1);
}
{
  const input = makeInput({ qByte: -1 });
  const v = input.entityId;
  input.jobTable[0] = 20;
  input.state[6565 + v] = 5; // not 9
  let lowerOCalls = 0;
  stepLegacySubsystemAt(input, { onLowerO: () => { lowerOCalls += 1; } });
  assert.equal(lowerOCalls, 0);
}

// Block A only runs when qByte<0.
{
  const input = makeInput({ qByte: 0 });
  const v = input.entityId;
  input.jobTable[0] = 20;
  input.state[6565 + v] = 9;
  let lowerOCalls = 0;
  stepLegacySubsystemAt(input, { onLowerO: () => { lowerOCalls += 1; } });
  assert.equal(lowerOCalls, 0);
}

// Block B: outside the box, eligible -> writes cached target + mode=2.
{
  const input = makeInput({ qByte: 0, entityId: 3, simulationCounter: 3 }); // 3&15===3&15, throttle passes
  const v = input.entityId;
  input.state[v] = 999; // x way outside packedBytes[gBase..gBase+3] (all zero by default) -> outside box
  input.state[101 + v] = 999;
  input.state[2828 + v] = 5; // type
  input.packedOffsets[41] = 10;
  input.packedBytes[10 + 5] = 0; // packedBytes[packedOffsets[41]+type] === 0 -> eligible
  input.state[6161 + v] = 0; // idle
  input.packedOffsets[233] = 20;
  input.packedOffsets[234] = 21;
  input.packedBytes[20 + 0] = 55; // sceneQ=0
  input.packedBytes[21 + 0] = 66;
  stepLegacySubsystemAt(input, {});
  assert.equal(input.state[3131 + v], 55);
  assert.equal(input.state[3232 + v], 66);
  assert.equal(input.state[6161 + v], 2);
}

// Block B: outside the box but NOT eligible (mode busy) -> no write.
{
  const input = makeInput({ qByte: 0, entityId: 3, simulationCounter: 3 });
  const v = input.entityId;
  input.state[v] = 999;
  input.state[101 + v] = 999;
  input.state[6161 + v] = 5; // busy
  stepLegacySubsystemAt(input, {});
  assert.equal(input.state[3131 + v], 0);
  assert.equal(input.state[6161 + v], 5, "mode untouched");
}

// Block B: startup cooldown (sceneQ===5 && c<=120) suppresses the write even when outside+eligible.
{
  const input = makeInput({ qByte: 0, entityId: 3, simulationCounter: 3, sceneQ: 5 });
  const v = input.entityId;
  input.state[v] = 999;
  input.state[101 + v] = 999;
  input.state[6161 + v] = 0;
  stepLegacySubsystemAt(input, {});
  assert.equal(input.state[6161 + v], 0, "mode stays 0, not overwritten to 2");
}

// Gate after Block B: qByte>=0 always returns before Block C/D (even inside the box).
{
  const input = makeInput({ qByte: 0, entityId: 3, simulationCounter: 3 });
  const v = input.entityId;
  // inside the box (all zero packedBytes bounds, entity at 0,0)
  input.jobTable[0] = 20; // would reach block D otherwise
  assert.doesNotThrow(() => stepLegacySubsystemAt(input, {}));
}

// Block C (j[aT]<M, inside box, qByte<0): type not ready -> no-op return.
{
  const input = makeInput({ qByte: -1, entityId: 3, simulationCounter: 3 });
  const v = input.entityId;
  input.jobTable[0] = 5; // < M(10)
  input.state[2828 + v] = 1; // type, not 69/84
  assert.doesNotThrow(() => stepLegacySubsystemAt(input, {}));
  assert.equal(input.state[6262 + v], 0);
}

// Block C: type===69, in sync already -> return without writing.
{
  const input = makeInput({ qByte: -1, entityId: 3, simulationCounter: 3, sceneQ: 0, mByte: 10, aT: 2 });
  const v = input.entityId;
  input.jobTable[2] = 4;
  input.state[2828 + v] = 69;
  input.packedOffsets[41] = 10;
  input.packedOffsets[42] = 30;
  input.state[6464 + v] = 0;
  input.packedBytes[10 + 0] = 0; // packedBytes[po41+dense[6464+v]] = 0
  input.packedBytes[30 + 0] = 0; // packedBytes[po42+0] = 0, !== 2, ok proceed
  input.state[6161 + v] = 0; // mode idle
  input.packedOffsets[221 + 0] = 500;
  const base = 500 + input.jobTable[2];
  input.packedBytes[base + input.mByte] = 77; // targetX
  input.packedBytes[base + input.mByte * 2] = 88; // targetY
  input.state[6262 + v] = 77;
  input.state[6363 + v] = 88; // already in sync
  stepLegacySubsystemAt(input, {});
  assert.equal(input.state[6464 + v], 0, "no write since already in sync");
}

// Block C: type===69, out of sync -> writes all three cached fields.
{
  const input = makeInput({ qByte: -1, entityId: 3, simulationCounter: 3, sceneQ: 0, mByte: 10, aT: 2 });
  const v = input.entityId;
  input.jobTable[2] = 4;
  input.state[2828 + v] = 69;
  input.packedOffsets[41] = 10;
  input.packedOffsets[42] = 30;
  input.state[6464 + v] = 0;
  input.packedBytes[10 + 0] = 0;
  input.packedBytes[30 + 0] = 0;
  input.state[6161 + v] = 0;
  input.packedOffsets[221 + 0] = 500;
  const base = 500 + input.jobTable[2];
  input.packedBytes[base] = 44; // type row
  input.packedBytes[base + input.mByte] = 77; // x row
  input.packedBytes[base + input.mByte * 2] = 88; // y row
  input.state[6262 + v] = 1; // out of sync
  input.state[6363 + v] = 1;
  stepLegacySubsystemAt(input, {});
  assert.equal(input.state[6262 + v], 77);
  assert.equal(input.state[6363 + v], 88);
  assert.equal(input.state[6464 + v], 44);
}

// Block E (offsets 1033..1242, RESTORED 2026-09-07): reached via Block D's
// j[aT]>=M arm when type===69 (jumps straight in, skipping the rangeVal/
// gridC checks). readyValue >= w -> calls au() and returns without ever
// reaching the boolean gate or changeEntityType.
{
  const input = makeInput({ qByte: -1, entityId: 3, simulationCounter: 3, aT: 0, sceneQ: 0, fBByte: 0 });
  const v = input.entityId;
  input.jobTable[0] = 99; // >= M(10)
  input.state[2828 + v] = 69; // ready type -> straight into Block E
  input.packedOffsets[212 + 0] = 40;
  input.packedBytes[40 + 0] = 5; // w = packedBytes[po212+fBByte(0) -> 40][+q(0)] = 5
  // x: v&3 = 3&3 = 3 !== 0, so x = (state[1717+v] < state[1616+v]) ? 1 : 0;
  // both default 0 -> 0<0 is false -> x = 0.
  input.packedOffsets[107] = 60;
  input.packedBytes[60 + 0] = 2; // saveOffsetIndex = packedBytes[po107+x(0)] = 2
  input.saveOffsets[2] = 202;
  input.state[202 + v] = 100; // readyValue = dense[saveOffsets[2]+v] = 100 >= w(5)
  let auCalls = 0;
  let gateCalls = 0;
  stepLegacySubsystemAt(input, {
    onAu: () => { auCalls += 1; },
    onCheckGate: () => { gateCalls += 1; return true; },
  });
  assert.equal(auCalls, 1, "readyValue >= w calls au() and returns");
  assert.equal(gateCalls, 0, "never reaches the boolean gate");
  assert.equal(input.scratch.w, 5, "w round-trips to the shared scratch");
  assert.equal(input.scratch.x, 0, "x round-trips to the shared scratch");
  assert.equal(input.state[6161 + v], 0, "mode untouched");
}

// Block E: readyValue < w, boolean gate (#288) returns false -> calls au().
{
  const input = makeInput({ qByte: -1, entityId: 3, simulationCounter: 3, aT: 0, sceneQ: 0, fBByte: 0 });
  const v = input.entityId;
  input.jobTable[0] = 99;
  input.state[2828 + v] = 69;
  input.packedOffsets[212 + 0] = 40;
  input.packedBytes[40 + 0] = 5; // w = 5
  input.packedOffsets[107] = 60;
  input.packedBytes[60 + 0] = 2;
  input.saveOffsets[2] = 202;
  input.state[202 + v] = 2; // readyValue = 2 < w(5) -> proceed to the gate
  input.packedOffsets[114] = 70;
  input.packedBytes[70 + 0] = 42; // scanArg = packedBytes[po114+x(0)] = 42
  let auCalls = 0;
  let gateArg;
  let changeCalls = 0;
  stepLegacySubsystemAt(input, {
    onAu: () => { auCalls += 1; },
    onCheckGate: (arg) => { gateArg = arg; return false; },
    onChangeEntityType: () => { changeCalls += 1; },
  });
  assert.equal(gateArg, 42, "gate called with packedBytes[po114+x]");
  assert.equal(auCalls, 1, "gate returning false calls au()");
  assert.equal(changeCalls, 0, "changeEntityType not reached");
  assert.equal(input.state[6161 + v], 0, "mode untouched");
}

// Block E: readyValue < w, gate returns true -> changeEntityType(v, newType)
// and mode set to 3 (moving); no au() call.
{
  const input = makeInput({ qByte: -1, entityId: 3, simulationCounter: 3, aT: 0, sceneQ: 0, fBByte: 0 });
  const v = input.entityId;
  input.jobTable[0] = 99;
  input.state[2828 + v] = 69;
  input.packedOffsets[212 + 0] = 40;
  input.packedBytes[40 + 0] = 5;
  input.packedOffsets[107] = 60;
  input.packedBytes[60 + 0] = 2;
  input.saveOffsets[2] = 202;
  input.state[202 + v] = 2;
  input.packedOffsets[114] = 70;
  input.packedBytes[70 + 0] = 42;
  input.packedBytes[70 + 3 + 0] = 77; // newType = packedBytes[po114+3+x] = 77
  let auCalls = 0;
  let changeArgs;
  stepLegacySubsystemAt(input, {
    onAu: () => { auCalls += 1; },
    onCheckGate: () => true,
    onChangeEntityType: (id, type) => { changeArgs = [id, type]; },
  });
  assert.equal(auCalls, 0, "au() not called on the success path");
  assert.deepEqual(changeArgs, [v, 77], "changeEntityType called with (v, newType)");
  assert.equal(input.state[6161 + v], 3, "mode set to 3 (moving)");
}

// Block E: entered via the type-NOT-ready arm (rangeVal in [13,15] AND
// self-occupied) rather than the type===69 shortcut, and exercises the
// x===2 branch ((v&3)===0 && sceneQ>=4).
{
  const input = makeInput({ qByte: -1, entityId: 4, simulationCounter: 4, aT: 0, sceneQ: 4, fBByte: 0 });
  const v = input.entityId; // 4 & 3 === 0
  input.jobTable[0] = 99; // >= M(10)
  input.state[2828 + v] = 1; // not the ready type (not 69/84)
  input.packedOffsets[41] = 10;
  input.packedBytes[10 + 1] = 14; // rangeVal in [13,15] -> eligible
  input.state[v] = 0;
  input.state[101 + v] = 0;
  input.gridC[0][0] = v; // self-occupied -> falls through into Block E
  input.packedOffsets[212 + 0] = 40;
  input.packedBytes[40 + 4] = 9; // w = packedBytes[po212+fBByte(0) -> 40][+q(4)] = 9
  input.packedOffsets[107] = 60;
  input.packedBytes[60 + 2] = 3; // saveOffsetIndex = packedBytes[po107+x(2)] = 3
  input.saveOffsets[3] = 303;
  input.state[303 + v] = 50; // readyValue = 50 >= w(9) -> au(), simplest terminal
  let auCalls = 0;
  stepLegacySubsystemAt(input, { onAu: () => { auCalls += 1; } });
  assert.equal(auCalls, 1);
  assert.equal(input.scratch.x, 2, "x=2 branch: (v&3)===0 && sceneQ>=4");
  assert.equal(input.scratch.w, 9);
}

// Block D: type NOT ready, range check fails -> returns without throwing.
{
  const input = makeInput({ qByte: -1, entityId: 3, simulationCounter: 3, aT: 0 });
  const v = input.entityId;
  input.jobTable[0] = 99;
  input.state[2828 + v] = 1; // not 69/84
  input.packedOffsets[41] = 10;
  input.packedBytes[10 + 1] = 5; // out of [13,15]
  assert.doesNotThrow(() => stepLegacySubsystemAt(input, {}));
}

// Block D: type NOT ready, range check passes, but NOT self-occupying own cell -> returns.
{
  const input = makeInput({ qByte: -1, entityId: 3, simulationCounter: 3, aT: 0 });
  const v = input.entityId;
  input.jobTable[0] = 99;
  input.state[2828 + v] = 1;
  input.packedOffsets[41] = 10;
  input.packedBytes[10 + 1] = 14; // in [13,15]
  input.state[v] = 0;
  input.state[101 + v] = 0;
  input.gridC[0][0] = 999; // someone else on this cell
  assert.doesNotThrow(() => stepLegacySubsystemAt(input, {}));
}

// Block D: type NOT ready, range check passes, self-occupying -> falls
// through into Block E, which runs safely even with no callbacks wired
// (all defaults: w=0, readyValue=0 >= w -> the "au() not wired" no-op path).
{
  const input = makeInput({ qByte: -1, entityId: 3, simulationCounter: 3, aT: 0 });
  const v = input.entityId;
  input.jobTable[0] = 99;
  input.state[2828 + v] = 1;
  input.packedOffsets[41] = 10;
  input.packedBytes[10 + 1] = 14;
  input.state[v] = 0;
  input.state[101 + v] = 0;
  input.gridC[0][0] = v;
  assert.doesNotThrow(() => stepLegacySubsystemAt(input, {}));
}

// private void au() (#328), ported 2026-09-28.
{
  const make = () => {
    const state = new Int8Array(10000);
    const packedBytes = new Int8Array(2000);
    const packedOffsets = new Int16Array(300);
    packedOffsets[233] = 1000; packedOffsets[234] = 1100;
    packedBytes[1000 + 2] = 40; packedBytes[1100 + 2] = 30;   // q = 2 rally point (40, 30)
    const gridC = Array.from({ length: 96 }, () => new Int8Array(96));
    const types = [];
    const input = { state, packedBytes, packedOffsets, gridC, v: 55, sceneQ: 2,
      scratch: { C: 0, D: 0 }, onChangeEntityType: (id, t) => types.push([id, t]) };
    return { input, state, gridC, types };
  };
  // Not on its own cell: the order is re-issued, nothing else.
  let f = make(); f.state[55] = 10; f.state[156] = 10;
  stepLegacySubsystemAu(f.input);
  assert.equal(f.state[6161 + 55], 2); assert.deepEqual(f.types, []);
  // More than 5 cells from the rally point: sent back as type 69.
  f = make(); f.state[55] = 10; f.state[156] = 30; f.gridC[30][10] = 55;
  stepLegacySubsystemAu(f.input);
  assert.deepEqual([f.input.scratch.C, f.input.scratch.D], [-30, 0]);
  assert.deepEqual([f.state[6262 + 55], f.state[6363 + 55], f.state[6464 + 55]], [40, 30, 69]);
  assert.deepEqual(f.types, [[55, 69]]);
  // Within 5 on both axes: left alone.
  f = make(); f.state[55] = 44; f.state[156] = 25; f.gridC[25][44] = 55;
  stepLegacySubsystemAu(f.input);
  assert.deepEqual(f.types, []); assert.equal(f.state[6464 + 55], 0);
}

console.log("b.at() entity target-tracking OK");
