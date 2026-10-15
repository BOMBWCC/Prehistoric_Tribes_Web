// Integration test for LegacyRuntimeState's subsystemK/subsystemD/subsystemG
// (private void k(int)/d(int,int)/g(int), bytecode/b-javap.txt offsets
// 0..131 / 0..224 / 0..317). onGroupMode (stepLegacySubsystemBDecision's
// own callback, wired in stepEntityDecisionCheck) now reaches subsystemG,
// whose onD reaches subsystemD. subsystemK genuinely uses gridC (b:[[B]/
// #129, confirmed via the constructor's aliasing to f.c:[[B]) but is
// sibling c:[[B]/#143 is real (f.g() allocates it), so subsystemD really
// does call k(int). CORRECTED 2026-09-20: k(int)'s type gate is
// `if (dense[2828+id] < 109) return` (offset 36, if_icmplt 131) -- the body
// only runs for a courting unit (109/110/111) and is what puts a partner
// back to 69/87 after the hut. These cases used to encode the inverse.
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

// --- subsystemK ---

// dense[3535+id]===15 clears dense[3636+id]; type<109 -> early return, no changeEntityType.
{
  const rt = new LegacyRuntimeState();
  rt.denseState[3535 + 4] = 15;
  rt.denseState[3636 + 4] = 9;
  rt.denseState[2828 + 4] = 50;
  const calls = [];
  const original = rt.changeEntityType.bind(rt);
  rt.changeEntityType = (id, type, onC) => { calls.push([id, type]); return original(id, type, onC); };
  rt["subsystemK"](4);
  assert.equal(rt.denseState[3636 + 4], 0);
  assert.deepEqual(calls, []);
}

// type>=109, gridC match -> position sync + changeEntityType(id,69).
{
  const rt = new LegacyRuntimeState();
  rt.denseState[2828 + 4] = 111;
  rt.denseState[0 + 4] = 2; // x
  rt.denseState[101 + 4] = 3; // y
  rt.gridC[3][2] = 4; // occupant === id
  const calls = [];
  const original = rt.changeEntityType.bind(rt);
  rt.changeEntityType = (id, type, onC) => { calls.push([id, type]); return original(id, type, onC); };
  rt["subsystemK"](4);
  assert.equal(rt.denseState[3131 + 4], 2);
  assert.equal(rt.denseState[3232 + 4], 3);
  assert.deepEqual(calls, [[4, 69]]);
}

// type>=109, gridC mismatch -> dense[6161+id]=3 + changeEntityType(id,87).
{
  const rt = new LegacyRuntimeState();
  rt.denseState[2828 + 4] = 111;
  rt.denseState[0 + 4] = 2;
  rt.denseState[101 + 4] = 3;
  rt.gridC[3][2] = 99; // occupant !== id
  const calls = [];
  const original = rt.changeEntityType.bind(rt);
  rt.changeEntityType = (id, type, onC) => { calls.push([id, type]); return original(id, type, onC); };
  rt["subsystemK"](4);
  assert.equal(rt.denseState[6161 + 4], 3);
  assert.deepEqual(calls, [[4, 87]]);
}

// --- subsystemD ---
// CORRECTION (2026-08-24): used to be modeled with gridC (b:[[B]/#129,
// copied from the adjacent, genuinely-real k(int)/subsystemK without
// separately re-checking this method's OWN field reference) -- direct
// bytecode re-read of every one of this method's 7 array accesses
// confirms it actually reads c:[[B](#143), a DIFFERENT field confirmed
// permanently null. k(int)'s own 2 real callers are both inside this
// method's now-unreachable tail, so subsystemK itself is confirmed
// RETRACTED 2026-09-07: subsystemK is NOT unreachable -- subsystemD really
// does call it (twice when argument<0), now that b.d(int,int) is ported for
// real instead of throwing.

// ae<0 -> real, genuine no-op (does not throw).
{
  const rt = new LegacyRuntimeState();
  rt.denseState[8282 + 4] = 0; // (0&127)>>1 - 1 = -1 -> ae<0
  rt["subsystemD"](4, 1); // must not throw
}

// ae>=0 -> the real b.d(int,int) body runs. RETRACTED 2026-09-07: this used
// to assert a guaranteed throw on the premise that class b's own c:[[B](#143)
// is permanently null; f.g() allocates it as byte[6][10].
{
  const rt = new LegacyRuntimeState();
  rt.denseState[8282 + 4] = 4; // (4&127)>>1-1 = 1 -> ae=1
  rt.subsystemArrays.cRows[4][1] = 3; // argument>0 requires c[4][ae]===3
  rt.subsystemArrays.cRows[5][1] = 9;
  rt.denseState[9237 + 9] = 2; // < 3 -> cleared by the tail
  rt["subsystemD"](4, 1);
  assert.equal(rt.subsystemArrays.cRows[4][1], 0);
  assert.equal(rt.denseState[9237 + 9], 0);
}

// argument>0 with c[4][ae]!==3 is the offset-47 early return: nothing cleared.
{
  const rt = new LegacyRuntimeState();
  rt.denseState[8282 + 4] = 4;
  rt.subsystemArrays.cRows[4][1] = 2;
  rt["subsystemD"](4, 1);
  assert.equal(rt.subsystemArrays.cRows[4][1], 2);
}

// --- subsystemG (onGroupMode's real target) reaches subsystemD via onD when argument<3 ---
{
  const rt = new LegacyRuntimeState();
  const id = 4;
  rt.denseState[7777 + id] = 5; // currentI/fQ/fFlag all default 0 -> readEntityCell mismatch path fires onU (inert), which returns before onD... use argument<3 path explicitly instead
  const calls = [];
  const originalD = rt["subsystemD"].bind(rt);
  rt["subsystemD"] = (entityId, arg) => { calls.push([entityId, arg]); return originalD(entityId, arg); };
  // Force readEntityCell to match id so g(int) proceeds past its occupant check to the onD gate.
  rt.gridC[0][0] = id; // state[101+id]=0, state[id]=0 by default -> readEntityCell(0,0)
  // dense[8282+id] defaults to 0 -> ae<0 -> subsystemD is a real no-op here (does not throw).
  rt["subsystemG"](id, 2);
  assert.deepEqual(calls, [[id, 2]]);
}

// Same real dispatch path, but with dense[8282+id] set so subsystemD's
// now-corrected body actually throws -- g(int)'s OWN exception table
// (offsets 0..317 -> a pop;return handler) catches it locally, so
// subsystemG must NOT propagate the throw, unlike the outer
// f.j()-caught cases elsewhere this session.
{
  const rt = new LegacyRuntimeState();
  const id = 4;
  rt.gridC[0][0] = id;
  rt.denseState[8282 + id] = 4; // ae=1 -> subsystemD throws for real this time
  assert.doesNotThrow(() => { rt["subsystemG"](id, 2); });
}

// onCalculateM (b.a(int,int,boolean)) is a CONFIRMED guaranteed throw (same root cause as
// subsystemEntityTransform); g(int) has its OWN exception table catching it locally
// (offsets 0..317 -> a pop;return handler) -- so subsystemG must NOT propagate the throw,
// unlike the outer f.j()-caught cases elsewhere this session. This test's readEntityCell
// match (gridC[0][0]=id) means the same real call path reaches onCalculateM every time.
{
  const rt = new LegacyRuntimeState();
  const id = 4;
  rt.gridC[0][0] = id;
  assert.doesNotThrow(() => { rt["subsystemG"](id, 2); });
}

console.log("b.k(int)/b.d(int,int)/b.g(int) (LegacyEntityGPrefix's onD, wired via onGroupMode) OK");
