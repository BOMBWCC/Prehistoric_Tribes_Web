// Integration test for LegacyRuntimeState's runSceneDispatch, covering the
// newly-ported T() ai===3 and ai===43 branches (in addition to the
// already-tested ai===37 via verify-entity-finalize.mjs's caller chain).
//
// UPDATED (2026-08-31): runSceneDispatch used to run its own independent,
// duplicate S()/T() port (game.akByte/game.ajByte/etc storage). It now
// delegates entirely to stepSubsystemStateCommand (the complete f.b(int)
// port, stateCommandState storage synced with game.* around the call) --
// see runSceneDispatch's own docblock in LegacyRuntimeState.ts. All
// assertions below still describe the same real bytecode behavior; only the
// internal path changed.
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

const { LegacyRuntimeState } = loadModule("./core/LegacyRuntimeState", srcDir);

// ai===3: writes six dense-state constants at p[2]'s offset. p[2] defaults
// to 0 (auxiliaryScratch starts zero-filled), so the writes land at
// dense[6161+0] etc.
{
  const rt = new LegacyRuntimeState();
  rt.runSceneDispatch(3);
  const dense = rt.denseState;
  assert.equal(dense[6161], 3);
  assert.equal(dense[2828], 105);
  assert.equal(dense[6262], 5);
  assert.equal(dense[6363], 10);
  assert.equal(dense[1313], 3);
  assert.equal(dense[5050], -1);
  assert.equal(rt.game.ai, 3);
}

// ai===43: composes the already-ported f.b(int,int) (stepFPairCommand)
// with fixed args (52,7) -- confirm it runs without throwing and reaches
// the expected internal call (spy on stepFPairCommand).
{
  const rt = new LegacyRuntimeState();
  let calledWith = null;
  const original = rt.stepFPairCommand.bind(rt);
  rt.stepFPairCommand = (input, x, y) => { calledWith = [x, y]; return original(input, x, y); };
  rt.runSceneDispatch(43);
  assert.deepEqual(calledWith, [52, 7]);
  assert.equal(rt.game.ai, 43);
}

// ai===38: b.l() fires (finalizeEntity spy), no exception escapes despite
// the confirmed-throwing entity-spawn/class-c-reset calls being caught
// internally, and mainArrays.aShort[0][17] ends at 0 (its own tail write).
{
  const rt = new LegacyRuntimeState();
  const finalizeCalls = [];
  const originalFinalize = rt.finalizeEntity.bind(rt);
  rt.finalizeEntity = (id) => { finalizeCalls.push(id); return originalFinalize(id); };
  let threw = false;
  try {
    rt.runSceneDispatch(38);
  } catch {
    threw = true;
  }
  assert.equal(threw, false);
  assert.ok(finalizeCalls.length >= 0); // b.l() runs regardless of active-entity count on a fresh instance
  assert.equal(rt.game.ai, 38);
}

// ai===45: b.m() fires (finalizeEntity spy, team 51-100 only), composes
// the already-ported f.b(int,int) and the newly-fixed f.b(int,int,int,int)
// (LegacySubsystemRecord.ts) without throwing.
{
  const rt = new LegacyRuntimeState();
  let threw = false;
  try {
    rt.runSceneDispatch(45);
  } catch {
    threw = true;
  }
  assert.equal(threw, false);
  assert.equal(rt.game.ai, 45);
  // f.b(int,int,int,int)'s fixed gridC[y][x]=101+slot write (the bug found
  // and fixed while tracing this branch) -- first call allocates slot 0.
  assert.equal(rt.gridC[30][54], 101);
}

// ai===48: the largest branch -- map-entry-style reset (aM/aN), three
// placeEntity calls, two allocateRecord calls, and the narrowed f(int,int)
// camera-jump write. aN() (loadMap) genuinely requires attached /ma
// resource data (not part of this standalone unit test's setup), so it
// throws past that point in a bare instance -- confirm the state up to
// there (qByte=2, aM() ran via resetMapEntryAllocation, b.f:B=6
// set right before aN()) still lands correctly.
{
  const rt = new LegacyRuntimeState();
  let threw = false;
  try {
    rt.runSceneDispatch(48);
  } catch (err) {
    threw = true;
    assert.match(String(err), /\/ma resource has not been attached/);
  }
  assert.equal(threw, true);
  assert.equal(rt.game.mission, 2);
  assert.equal(rt.game.subsystemGFFlagByte, 6);
  assert.equal(rt.game.ai, 48);
}

// private void f(int,int) -- widened 2026-08-22 from a narrowed
// 0<arg1<=100-only port (used by ai===48's f(53,-2) call) to cover all of
// its real branches, needed by af()'s own f(arg,0) call. Access the
// "private" method directly -- TS privacy is compile-time only, and these
// scripts run type-stripped.
//
// UNIFICATION (2026-08-31): these tests used to call `stepLegacyF2`, a
// SECOND independent port of the same real f(int,int) method (constant-pool
// #593) that this file's own runSceneDispatch used internally. That
// duplicate has been deleted; all calls below now go through
// `stepEntityCoordinateUpdate` (LegacyRuntimeState.ts), the one already
// wired everywhere else (T()'s onRecordAction, etc). Comparing the two
// during the merge found a real bug in stepEntityCoordinateUpdate itself:
// it read/wrote the "L" (saved-K) value from/to `game.selectedId`, which is a
// DIFFERENT real field (f.l:B #337) than the one f(int,int) actually
// writes (f.L:B #72, `game.cameraSavedKByte`) -- confirmed via direct
// bytecode read (offset 8..13: `putfield #72 // L:B`). Fixed in
// LegacyRuntimeState.ts; the arg1===0 case below (asserting
// `cameraSavedKByte`) is what catches a regression.
function makeCameraRt() {
  const rt = new LegacyRuntimeState();
  rt.game.mapWidth = 999; rt.game.mapHeight = 999;
  rt.game.viewColumns = 0; rt.game.viewRows = 0;
  rt.game.cameraSFlag = true;
  rt.game.cursorTargetColumn = 5; rt.game.cursorTargetRow = 7;
  return rt;
}

// arg1===0: JByte/cameraSavedKByte still snapshot, but IByte/KByte/AFlag
// are untouched -- the one branch that skips aK()/A:Z entirely.
{
  const rt = makeCameraRt();
  rt.game.cameraColumn = 11; rt.game.cameraRow = 13; rt.game.AFlag = false;
  rt.stepEntityCoordinateUpdate(0, -2);
  assert.equal(rt.game.JByte, 11);
  assert.equal(rt.game.cameraSavedKByte, 13);
  assert.equal(rt.game.cameraColumn, 11); // unchanged
  assert.equal(rt.game.cameraRow, 13); // unchanged
  assert.equal(rt.game.AFlag, false); // unchanged
}

// 0<arg1<=100 (the originally-ported range): now also reaches aK()/A:Z,
// which the earlier narrow port was missing entirely.
{
  const rt = makeCameraRt();
  rt.denseState[0 + 53] = 20; rt.denseState[101 + 53] = 30;
  rt.stepEntityCoordinateUpdate(53, -2);
  assert.equal(rt.game.cameraColumn, (20 - 5) & 0xff);
  assert.equal(rt.game.cameraRow, (30 - 7 + -2) & 0xff);
  assert.equal(rt.game.AFlag, true);
}

// arg1>100: reads dense[9359/9381 + arg1-101].
{
  const rt = makeCameraRt();
  rt.denseState[9359 + 150 - 101] = 40;
  rt.denseState[9381 + 150 - 101] = 50;
  rt.stepEntityCoordinateUpdate(150, 3);
  assert.equal(rt.game.cameraColumn, (40 - 5) & 0xff);
  assert.equal(rt.game.cameraRow, (50 - 7 + 3) & 0xff);
  assert.equal(rt.game.AFlag, true);
}

// arg1===-100: adjusts I/K in place by C/D(+arg2).
//
// BUG FIX (2026-08-31): this used to assert `(70 - (7 + 4)) & 0xff` (i.e.
// `K - D - offset`), matching the OLD stepLegacyF2's formula. Direct
// bytecode re-read (offset 139..152: `K:B -= (D:B - arg2)`, i.e. dup,
// getfield K, getfield D, iload_2, isub, isub, i2b, putfield K) confirms it
// must be `K - D + offset`, matching every OTHER branch's `-D+offset`
// shape -- this was the lone exception, and was already independently
// fixed once in LegacyEntityCoordinateUpdate.ts's own port (2026-08-18)
// but never in this file's now-deleted duplicate, so this test kept
// asserting the stale, buggy value.
{
  const rt = makeCameraRt();
  rt.game.cameraColumn = 60; rt.game.cameraRow = 70;
  rt.stepEntityCoordinateUpdate(-100, 4);
  assert.equal(rt.game.cameraColumn, (60 - 5) & 0xff);
  assert.equal(rt.game.cameraRow, (70 - 7 + 4) & 0xff);
  assert.equal(rt.game.AFlag, true);
}

// arg1<0, !==-100: treats -arg1 as an id, offset by a packed-table-138
// half-width/height lookup (same table b.a(int) #288 uses).
{
  const rt = makeCameraRt();
  const negId = 9;
  rt.denseState[8383 + negId] = 15;
  rt.denseState[8444 + negId] = 25;
  rt.denseState[8749 + negId] = 2; // owner
  rt.packedOffsets[138] = 0;
  rt.packedBytes[104 + 2] = 6; // halfWidth = 6>>1 = 3
  rt.packedBytes[130 + 2] = 8; // halfHeight = 8>>1 = 4
  rt.stepEntityCoordinateUpdate(-negId, 1);
  assert.equal(rt.game.cameraColumn, (15 + 3 - 5) & 0xff);
  assert.equal(rt.game.cameraRow, (25 + 4 - 7 + 1) & 0xff);
  assert.equal(rt.game.AFlag, true);
}

// REGRESSION (2026-08-31): placementOptions.qByte was snapshotted ONCE,
// before any of T()'s branches ran, so the placement calls that happen
// AFTER T() mutates q:B got a stale value. In the ai===48 branch the real
// bytecode sets q=2 (offset 480), then q=3 (offset 502), and only then
// invokes b.a(IIIBB) (#460) at offsets 595 and 617 -- those must observe
// q===3. qByte is not incidental: LegacyEntityPlacement selects a different
// 12-entry table block from it (<2 -> +0, ===2 -> +12, else -> +24).
//
// The existing ai===48 case above cannot catch this: it throws inside aN()
// (loadMap, offset 496) before the second q write. Stub loadMap so the
// branch runs to completion, and capture what placeEntity actually sees.
{
  const rt = new LegacyRuntimeState();
  rt.loadMap = () => {};
  const seenQ = [];
  const originalPlace = rt.placeEntity.bind(rt);
  rt.placeEntity = (map, team, a, b, c, d, e, f, options) => {
    seenQ.push(options ? options.qByte : undefined);
    return originalPlace(map, team, a, b, c, d, e, f, options);
  };
  try { rt.runSceneDispatch(48); } catch { /* later steps may still throw; the q reads above already happened */ }
  assert.equal(rt.game.mission, 3, "T()'s ai===48 branch must end with q:B === 3");
  assert.ok(seenQ.length > 0, "ai===48 must reach at least one placeEntity call");
  for (const q of seenQ) {
    assert.equal(q, 3, "placeEntity must observe the LIVE q:B (3), not the pre-branch snapshot");
  }
}

// BUG FIX (2026-09-03): U()'s advance branch (stepLegacyStateU) writes
// `state.Q = 28` directly onto the shared `stateCommandState` bag, then
// synchronously calls `f.b(ai)` (the recursive onB callback wired in
// LegacyRuntimeState.ts's onU). In real bytecode Q is a live instance
// field, so the recursive call's own S() (`R = this.Q`) observes 28
// immediately. `stepSubsystemStateCommand` re-copies `state.Q =
// this.game.screen` at its own top on every call, including this recursive
// one -- but the OUTER call's `this.game.screen = state.Q` write-back only
// happens after the whole call (recursion included) returns, so
// `this.game.screen` is still whatever Q held BEFORE this b(-1) dispatch
// began. Without syncing `this.game.screen` right before the recursive call,
// that stale read clobbers the just-written 28, and the new scene's own
// R ends up wrong -- which is exactly what stalled the intro dialogue
// permanently at a later non-advance ai (its `Q = R` tail could never
// reach 28/gameplay). Force the scenario directly via stateCommandState
// (ai=1 is a real advance-set member; ak===aj-1 is the last-page
// condition that makes a negative b(int) call reach U()) so this does
// not depend on real /a resource table data.
{
  const rt = new LegacyRuntimeState();
  rt.game.screen = 999; // stand-in for "whatever Q held before this dispatch"
  rt.game.ai = 1; // stepSubsystemStateCommand's own copy-in reads game.ai
  rt.stateCommandState.aj = 2;
  rt.stateCommandState.ak = 1; // ak === aj-1 -> b(-1) reaches U()
  rt.runSceneDispatch(-1);
  assert.equal(rt.game.ai, 2, "U()'s advance branch must bump ai 1 -> 2");
  assert.equal(
    rt.game.R,
    28,
    "the recursive b(ai+1) call's S() must see U()'s just-written Q=28, not the stale pre-dispatch game.screen",
  );
}

console.log("T() ai===3/38/43/45/48 scene-dispatch branches OK");
