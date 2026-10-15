// Integration test for LegacyRuntimeState's subsystemBVoid/subsystemU
// (private void b(boolean) #335 VOID overload, offsets 0..226; private void
// U(), offsets 0..555, bytecode/b-javap.txt). onU is stepLegacyEntityGPrefix's
// own callback (fires when readEntityCell doesn't match the current entity),
// wired via subsystemG.
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

const { LegacyRuntimeState } = loadModule("./LegacyRuntimeState", srcDir);

// --- subsystemBVoid (private void b(boolean), #335) ---

// team partition scan, arg=true forces every slot in, linked-list walk finds id -> writes + returns.
{
  const rt = new LegacyRuntimeState();
  const id = 7;
  rt.game.subsystemU = 0; // team 0 -> s in [1,30]
  rt.denseState[8932 + 5] = 1; // count gate for slot 5
  rt.denseState[8993 + 5] = 7; // linked-list head === id, immediate match
  rt.denseState[0 + id] = 11; // x
  rt.denseState[101 + id] = 13; // y
  rt["subsystemBVoid"](id, true);
  assert.equal(rt.denseState[4444 + id], 5);
  assert.equal(rt.denseState[4747 + id], -5);
  assert.equal(rt.denseState[3131 + id], 11);
  assert.equal(rt.denseState[3232 + id], 13);
}

// arg=false, no slot has type 11 -> no-op, no match.
{
  const rt = new LegacyRuntimeState();
  const id = 7;
  rt.game.subsystemU = 0;
  rt.denseState[8932 + 5] = 1;
  rt.denseState[8993 + 5] = 7;
  rt["subsystemBVoid"](id, false);
  assert.equal(rt.denseState[4444 + id], 0);
}

// --- subsystemU (private void U(), offsets 0..555) ---

// Slot-reset gate (offsets 5..171): dense[4646+id]===1, dense[8749+assoc]===8, dense[8627+assoc]===0.
{
  const rt = new LegacyRuntimeState();
  const id = 7;
  rt.game.subsystemU = 0;
  rt.denseState[4646 + id] = 1;
  rt.denseState[4444 + id] = 3; // assoc
  rt.denseState[8749 + 3] = 8;
  rt.denseState[8627 + 3] = 0;
  rt.denseState[8810 + 3] = 9; // owner
  rt["subsystemU"](id);
  assert.equal(rt.denseState[2828 + 9], 57);
  assert.equal(rt.denseState[2929 + 9], 105);
  assert.equal(rt.denseState[3030 + 9], 0);
}

// Slot-reset gate NOT met (dense[4646+id]!==1) -> owner slot untouched.
{
  const rt = new LegacyRuntimeState();
  const id = 7;
  rt.denseState[4646 + id] = 0;
  rt.denseState[4444 + id] = 3;
  rt.denseState[8749 + 3] = 8;
  rt.denseState[8627 + 3] = 0;
  rt.denseState[8810 + 3] = 9;
  rt["subsystemU"](id);
  assert.equal(rt.denseState[2828 + 9], 0);
}

// dense[2929+id] NESTED-lookup formula, table-176/177 branch: dense[1414+id]>=12,
// dense[8749+assoc]<12, dense[8627+assoc]!==0 -> useTable176.
{
  const rt = new LegacyRuntimeState();
  const id = 7;
  rt.denseState[4444 + id] = 3; // assoc
  rt.denseState[1414 + id] = 12;
  rt.denseState[8749 + 3] = 5; // <12
  rt.denseState[8627 + 3] = 1; // !==0 -> forces table176 path directly
  rt.denseState[4646 + id] = 2;
  rt.packedOffsets[177] = 100;
  rt.packedBytes[100 + 5] = 20; // packedBytes[packedOffsets[177]+dense[8749+assoc]]
  rt.packedOffsets[176] = 200;
  rt.packedBytes[200 + 20 + 2] = 77; // packedBytes[packedOffsets[176]+inner+dense[4646+id]]
  rt["subsystemU"](id);
  assert.equal(rt.denseState[2929 + id], 77);
}

// Same dense[2929+id] formula, table-173/174 branch (the default/fallback path):
// dense[1414+id]<12 -> skip straight to 173/174 regardless of other fields.
{
  const rt = new LegacyRuntimeState();
  const id = 7;
  rt.denseState[4444 + id] = 3;
  rt.denseState[1414 + id] = 5; // <12 -> forces table173 path
  rt.denseState[8749 + 3] = 0;
  rt.denseState[4646 + id] = 1;
  rt.packedOffsets[174] = 300;
  rt.packedBytes[300 + 0] = 9; // packedBytes[packedOffsets[174]+dense[8749+assoc]]
  rt.packedOffsets[173] = 400;
  rt.packedBytes[400 + 9 + 1] = 55; // packedBytes[packedOffsets[173]+inner+dense[4646+id]]
  rt["subsystemU"](id);
  assert.equal(rt.denseState[2929 + id], 55);
}

// table-41 branch selector: dense[1414+id]>=12, dense[8749+assoc]<12, dense[8627+assoc]===0,
// table41===12 -> ALSO selects table176 (the third way into that branch).
{
  const rt = new LegacyRuntimeState();
  const id = 7;
  rt.denseState[4444 + id] = 3;
  rt.denseState[1414 + id] = 12;
  rt.denseState[8749 + 3] = 0;
  rt.denseState[8627 + 3] = 0;
  rt.denseState[2828 + id] = 6;
  rt.packedOffsets[41] = 500;
  rt.packedBytes[500 + 6] = 12; // table41 === 12 -> forces table176
  rt.denseState[4646 + id] = 0;
  rt.packedOffsets[177] = 100;
  rt.packedBytes[100 + 0] = 1;
  rt.packedOffsets[176] = 200;
  rt.packedBytes[200 + 1 + 0] = 33;
  rt["subsystemU"](id);
  assert.equal(rt.denseState[2929 + id], 33);
}

// Unconditional tail writes + f.d(dense[4444+id]) call + position sync.
{
  const rt = new LegacyRuntimeState();
  const id = 7;
  rt.denseState[4444 + id] = 3;
  rt.denseState[0 + id] = 41;
  rt.denseState[101 + id] = 42;
  rt.game.wByte = 2;
  rt.game.qCounter = 3; // matches f.d's id argument (dense[4444+id]=3) -> sets pendingP (f.P:Z)
  rt["subsystemU"](id);
  assert.equal(rt.denseState[3030 + id], 0);
  assert.equal(rt.denseState[1313 + id], -3);
  assert.equal(rt.game.pendingP, true);
  assert.equal(rt.denseState[3131 + id], 41);
  assert.equal(rt.denseState[3232 + id], 42);
}

// changeEntityType(id,59) gate: table39 !== 2 -> fires (offset 541 if_icmpeq 555 SKIPS on equal).
{
  const rt = new LegacyRuntimeState();
  const id = 7;
  rt.denseState[2828 + id] = 8;
  rt.packedOffsets[39] = 600;
  rt.packedBytes[600 + 8] = 3; // !== 2 -> call fires
  const calls = [];
  const original = rt.changeEntityType.bind(rt);
  rt.changeEntityType = (entityId, type, onC) => { calls.push([entityId, type]); return original(entityId, type, onC); };
  rt["subsystemU"](id);
  assert.deepEqual(calls, [[id, 59]]);
}

// changeEntityType(id,59) gate: table39 === 2 -> does NOT fire.
{
  const rt = new LegacyRuntimeState();
  const id = 7;
  rt.denseState[2828 + id] = 8;
  rt.packedOffsets[39] = 600;
  rt.packedBytes[600 + 8] = 2; // === 2 -> call suppressed
  const calls = [];
  const original = rt.changeEntityType.bind(rt);
  rt.changeEntityType = (entityId, type, onC) => { calls.push([entityId, type]); return original(entityId, type, onC); };
  rt["subsystemU"](id);
  assert.deepEqual(calls, []);
}

// --- onU wiring through subsystemG: readEntityCell mismatch -> subsystemU(id) fires ---
{
  const rt = new LegacyRuntimeState();
  const id = 4;
  rt.gridC[0][0] = 99; // !== id -> readEntityCell mismatch -> onU fires, NOT onCalculateM/onD
  const calls = [];
  const originalU = rt["subsystemU"].bind(rt);
  rt["subsystemU"] = (entityId) => { calls.push(entityId); return originalU(entityId); };
  rt["subsystemG"](id, 5); // argument>=3 so onD is also skipped, isolating onU
  assert.deepEqual(calls, [id]);
}

console.log("b.b(boolean)#335/b.U() (subsystemBVoid/subsystemU, wired via subsystemG's onU) OK");
