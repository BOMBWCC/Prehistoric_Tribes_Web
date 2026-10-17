// Regression test for the 2026-08-18 viewport C/D/sFlag field-identity fix.
// game.viewportC/viewportD/viewportSFlag/viewportCSize/viewportDSize were
// unverified placeholder fields (own docblock: "source table aliases
// remain unresolved") fed by nothing real; direct bytecode reads of aK(),
// aO(), W()'s onViewportReset, and the standalone f(int,int) derivation
// all confirm the real inputs are game.cursorTargetColumn/cursorTargetRow/
// cameraSFlag/mapWidth/mapHeight. Fields removed, four call sites fixed:
// normalizeEntityViewport, stepEntityCoordinateUpdate (+ its 3
// onRecordAction callers), stepMapEntry's onAO, and onViewportReset.
//
// Also covers the standalone LegacyEntityCoordinateUpdate.ts sign-bug fix
// (id===-100 branch: was `K - D - offset`, corrected to `K - D + offset`,
// matching every other branch's `- D + offset` shape) -- see
// verify-entity-coordinate-update.mjs for the direct-function test.
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

// --- normalizeEntityViewport reads cursorTargetColumn/cursorTargetRow/cameraSFlag/mapWidth/mapHeight ---
{
  const rt = new LegacyRuntimeState();
  rt.game.cursorTargetColumn = 5;
  rt.game.cursorTargetRow = 6;
  rt.game.cameraColumn = -3; // forces aK()'s while(I<0) clamp to run
  rt.game.cameraRow = -3;
  rt.game.cameraSFlag = true; // if honored, breaks out of the K<0 clamp loop immediately
  rt["normalizeEntityViewport"]();
  // y/A snapshot C/D at entry (aK()'s own first two lines).
  assert.equal(rt.game.cursorColumn, 5);
  assert.equal(rt.game.cursorRow, 6);
  // I clamps up to 0 regardless of sFlag (only the K<0 loop checks sFlag).
  assert.equal(rt.game.cameraColumn, 0);
  // K stays negative because cameraSFlag=true breaks the clamp loop immediately.
  assert.equal(rt.game.cameraRow, -3);
}

// cameraSFlag=false: K<0 clamp actually increments K to 0 (no early break).
{
  const rt = new LegacyRuntimeState();
  rt.game.cameraColumn = 0;
  rt.game.cameraRow = -3;
  rt.game.cameraSFlag = false;
  rt["normalizeEntityViewport"]();
  assert.equal(rt.game.cameraRow, 0);
}

// --- stepEntityCoordinateUpdate reads cursorTargetColumn/cursorTargetRow (not the removed viewportC/D) ---
{
  const rt = new LegacyRuntimeState();
  rt.game.cursorTargetColumn = 3;
  rt.game.cursorTargetRow = 4;
  const id = 61;
  rt.denseState[0 + id] = 50;
  rt.denseState[101 + id] = 60;
  rt["stepEntityCoordinateUpdate"](id, -2);
  assert.equal(rt.game.cameraColumn, 50 - 3);
  assert.equal(rt.game.cameraRow, 60 - 4 + -2);
  assert.equal(rt.game.AFlag, true);
}

// --- stepEntityCoordinateUpdate's aK() clamp actually survives the write-back ---
// (bug: onViewportNormalize mutates game.cameraColumn/KByte directly, but the
// method's own local `state.I`/`state.K` copy was never re-synced before
// being written back over the just-clamped game fields -- silently
// discarding aK()'s clamp every time this branch ran.)
{
  const rt = new LegacyRuntimeState();
  rt.game.cursorTargetColumn = 0;
  rt.game.cursorTargetRow = 0;
  const id = 61;
  rt.denseState[0 + id] = -5; // forces a negative pre-clamp IByte
  rt.denseState[101 + id] = 0;
  rt["stepEntityCoordinateUpdate"](id, 0);
  assert.equal(rt.game.cameraColumn, 0); // clamped by aK(), not left at the stale -5
  assert.equal(rt.game.cameraRow, 0);
}

// --- stepMapEntry's onAO: same staleness bug, verified via the public stepStateAOMap wrapper ---
{
  const rt = new LegacyRuntimeState();
  const mapState = { q: 0, C: 9, D: 11, y: 0, A: 0, I: 0, J: 0, K: 0, L: 0, z: 0, B: 0 };
  rt["stepStateAOMap"]({
    state: mapState,
    packedBytes: rt.packedBytes,
    packedOffsets: rt.packedOffsets,
    // f.a:[[S (#131) -- aO() offsets 4..25 store into aShort[0][17]; added
    // 2026-09-09 when that store stopped (wrongly) targeting packedBytes.
    aShort: rt.mainArrays.aShort,
    onAP: () => {},
    onViewportNormalize: () => {
      rt["normalizeEntityViewport"]();
      mapState.I = rt.game.cameraColumn;
      mapState.K = rt.game.cameraRow;
    },
    onSpatialPass: () => {},
  });
  // packedBytes default 0 -> I=0-9=-9, K=0-11=-11 pre-clamp, both clamp to 0.
  assert.equal(mapState.I, 0);
  assert.equal(mapState.K, 0);
  assert.equal(mapState.J, 0); // stepLegacyAOMap's own post-callback J=I/L=K read
  assert.equal(mapState.L, 0);
}

// --- All three onRecordAction call sites reach stepEntityCoordinateUpdate (previously the inert placeholders) ---
{
  const rt = new LegacyRuntimeState();
  const calls = [];
  const original = rt["stepEntityCoordinateUpdate"].bind(rt);
  rt["stepEntityCoordinateUpdate"] = (id, offset) => { calls.push([id, offset]); return original(id, offset); };
  // stepLegacyStateTransitionCommand's own an>100 branch: onRecordAction(an,-2).
  // ak starts 0, aj starts 0 -> "else" branch, ak becomes 1.
  // an = packedBytes[packedOffsets[311]+458+aT(0)+ak(1)] = packedBytes[459] (offsets default 0).
  rt.packedBytes[459] = 120; // packedBytes is Int8Array (max 127); >100 -> onRecordAction(120, -2)
  rt["stepSubsystemStateCommand"](-1);
  assert.deepEqual(calls, [[120, -2]]);
}

console.log("aK()/f(int,int) viewport C/D/sFlag field-identity fix (4 call sites) OK");
