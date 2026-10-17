// Regression test for f.ao()'s (stepDefaultAo) real call site (2026-08-31):
// wires the 15 previously-unconnected child callbacks (onB, onAq, onAs,
// onAt, onAv, onAx, onAy, onAz, onCByte, onDShortWrite, onBooleanFlag,
// onResourceByte, onA0) that were declared on LegacyAoInput but never
// invoked from stepDefaultAo -- see docs/unknowns.md 2026-08-31 entry and
// reverse-engineering/main-menu-cutscene-walkthrough.md for the ground
// truth this unblocks. Exercises stepDefaultAo() through the public
// LegacyRuntimeState surface, spying on the already-independently-tested
// helper methods (resetMapEntryAllocation, saveOriginalResourceAction,
// selectResourceSection, runSceneDispatch, startOriginalAudio) to confirm
// each callback reaches its real target with the right argument, rather
// than re-deriving their own internals here.
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

function freshRuntime() {
  const rt = new LegacyRuntimeState();
  const calls = [];
  rt.resetMapEntryAllocation = (q) => calls.push(["resetMapEntryAllocation", q]);
  rt.saveOriginalResourceAction = (slot) => { calls.push(["saveOriginalResourceAction", slot]); return true; };
  rt.selectResourceSection = (value) => calls.push(["selectResourceSection", value]);
  rt.runSceneDispatch = (value) => calls.push(["runSceneDispatch", value]);
  // stepSubsystemStateCommand is private; stub it through the instance so the
  // onB path is observable without running the whole f.b(int) chain here
  // (that chain has its own coverage in verify-state-transition-command.mjs).
  rt.stepSubsystemStateCommand = (value) => calls.push(["stepSubsystemStateCommand", value]);
  rt.startOriginalAudio = () => calls.push(["startOriginalAudio"]);
  return { rt, calls };
}

// Q===18/17 -> onB(-1) -> f.b(int). REGRESSION (2026-08-31): this used to
// assert runSceneDispatch, an INCOMPLETE second port of f.b(int) that opens
// with `if (value < 0) return;` -- so the real -1 call did nothing and Q=18
// was a dead end. It must route to the complete port instead.
{
  const { rt, calls } = freshRuntime();
  rt.game.screen = 18;
  rt.stepDefaultAo();
  assert.deepEqual(calls, [["stepSubsystemStateCommand", -1]]);
}

// Same branch for Q===17 (the dialog/tutorial text-box state, which the real
// device trace shows is reused for every dialog in the game).
{
  const { rt, calls } = freshRuntime();
  rt.game.screen = 17;
  rt.stepDefaultAo();
  assert.deepEqual(calls, [["stepSubsystemStateCommand", -1]]);
}

// Q===15 (onAq), m>0 branch: table write, onSound -> selectResourceSection(70+m).
{
  const { rt, calls } = freshRuntime();
  rt.game.screen = 15;
  rt.game.mByte = 3;
  rt.stepDefaultAo();
  assert.deepEqual(calls, [["selectResourceSection", 73]]);
  assert.equal(rt.game.vInt, 71);
  assert.equal(rt.game.mByte, 4);
}

// Q===15, m===-1, u===41, q<5: onAM fires first, then onGByte.
{
  const { rt, calls } = freshRuntime();
  rt.game.screen = 15;
  rt.game.mByte = -1;
  rt.game.uByte = 41;
  rt.game.mission = 0;
  rt.stepDefaultAo();
  assert.deepEqual(calls, [
    ["resetMapEntryAllocation", 0],
    ["saveOriginalResourceAction", 0],
  ]);
  assert.equal(rt.game.screen, 23);
  assert.equal(rt.game.mission, 1);
}

// Q===15, m===-1, u===41, q===6: onAM, then onEntitySignal -> runSceneDispatch(59).
{
  const { rt, calls } = freshRuntime();
  rt.game.screen = 15;
  rt.game.mByte = -1;
  rt.game.uByte = 41;
  rt.game.mission = 6;
  rt.game.U = 9;
  rt.stepDefaultAo();
  assert.deepEqual(calls, [
    ["resetMapEntryAllocation", 6],
    ["runSceneDispatch", 59],
  ]);
  assert.equal(rt.game.screen, 18);
  assert.equal(rt.game.mission, 7);
}

// Q===15, m===-1, u!==41: real bytecode reads R=U (BUG FIX 2026-08-31 in
// stepLegacyAq -- this port previously hardcoded R=5).
{
  const { rt, calls } = freshRuntime();
  rt.game.screen = 15;
  rt.game.mByte = -1;
  rt.game.uByte = 0;
  rt.game.mission = 6;
  rt.game.U = 41;
  rt.stepDefaultAo();
  assert.deepEqual(calls, [["resetMapEntryAllocation", 5]]);
  assert.equal(rt.game.R, 41, "R must be copied from U (#105), not hardcoded to 5");
  assert.equal(rt.game.screen, 16);
  assert.equal(rt.game.vInt, 58);
}

// Q===12 (onAs), Z===1: table write, onAudio/onAudioStop unwired (documented
// gap, class-`a` MIDI player never ported), onAQ -> startOriginalAudio.
{
  const { rt, calls } = freshRuntime();
  rt.game.screen = 12;
  rt.game.Z = 1;
  rt.game.eByte = 0;
  rt.stepDefaultAo();
  assert.deepEqual(calls, [["startOriginalAudio"]]);
}

// Q===12, Z===3: lInt toggles and the preference-table byte is written --
// pure stepLegacyAs state, no callback involved.
{
  const { rt, calls } = freshRuntime();
  rt.game.screen = 12;
  rt.game.Z = 3;
  rt.stepDefaultAo();
  assert.deepEqual(calls, []);
}

// Q===13 (onAt), q>=7: Q=9, b:B #243 (levelBByte) = Z/2 and d:B #276
// (persistedDByte) = b. CORRECTED 2026-09-27: d was wired to the tick
// counter d:I (game.dByte) and b was dropped.
{
  const { rt, calls } = freshRuntime();
  rt.game.screen = 13;
  rt.game.Z = 6;
  rt.game.mission = 7;
  rt.game.dByte = 2;
  rt.stepDefaultAo();
  assert.deepEqual(calls, []);
  assert.equal(rt.game.screen, 9);
  assert.equal(rt.game.difficulty, 3);
  assert.equal(rt.game.persistedDByte, 3);
  assert.equal(rt.game.dByte, 2);
}

// Q===13, q<7, r>0: Q=V, c:B #265 (progressC) = b. The frame counter c:I
// stays -1, so f.F() keeps choosing G() and draws the mission-select panel
// (it was overwritten with b, 2026-09-27).
{
  const { rt } = freshRuntime();
  rt.game.screen = 13;
  rt.game.Z = 2;
  rt.game.mission = 0;
  rt.game.progressR = 4;
  rt.game.progressV = 8;
  rt.game.missionFrame = -1;
  rt.stepDefaultAo();
  assert.equal(rt.game.screen, 8);
  assert.equal(rt.game.difficulty, 1);
  assert.equal(rt.game.progressC, 1);
  assert.equal(rt.game.missionFrame, -1);
}

// Q===13, q<7, r===0: onGByte -> saveOriginalResourceAction(0).
{
  const { rt, calls } = freshRuntime();
  rt.game.screen = 13;
  rt.game.Z = 4;
  rt.game.mission = 0;
  rt.game.progressR = 0;
  rt.stepDefaultAo();
  assert.deepEqual(calls, [["saveOriginalResourceAction", 0]]);
  assert.equal(rt.game.screen, 16);
  assert.equal(rt.game.vInt, 60);
}

// Q===24 (onAv): Q=15, mByte=-1, onCByte -> selectResourceSection(75).
{
  const { rt, calls } = freshRuntime();
  rt.game.screen = 24;
  rt.stepDefaultAo();
  assert.deepEqual(calls, [["selectResourceSection", 75]]);
  assert.equal(rt.game.screen, 15);
  assert.equal(rt.game.mByte, -1);
  assert.equal(rt.game.vInt, 71);
}

// Q===25: onDShortWrite/onBooleanFlag write the shared game arrays.
{
  const { rt } = freshRuntime();
  rt.game.screen = 25;
  rt.game.Z = 0;
  rt.game.mByte = 0;
  rt.packedOffsets[307] = 700;
  rt.packedOffsets[305] = 500;
  rt.packedOffsets[306] = 600;
  rt.packedBytes[700] = 5;
  rt.packedBytes[501] = 3;
  rt.stepDefaultAo();
  assert.equal(rt.game.Z, 1);
  assert.equal(rt.game.zlDShorts[4], 36);
  assert.equal(rt.game.frameFlags[2], true);
}

// value===9 (onAy), X===false: Q=16, vInt=65, onAM NOT called.
{
  const { rt, calls } = freshRuntime();
  const Q = 50;
  rt.game.screen = Q;
  rt.game.Z = 0;
  rt.packedOffsets[151] = 200; rt.packedOffsets[152] = 300; rt.packedOffsets[153] = 100;
  rt.packedBytes[300 + Q] = 0;
  rt.packedBytes[200 + 0] = 9;
  rt.game.XFlag = false;
  rt.stepDefaultAo();
  assert.deepEqual(calls, []);
  assert.equal(rt.game.screen, 16);
  assert.equal(rt.game.vInt, 65);
}

// value===9 (onAy), X===true: onAM -> resetMapEntryAllocation(q), Q=U.
{
  const { rt, calls } = freshRuntime();
  const Q = 50;
  rt.game.screen = Q;
  rt.game.Z = 0;
  rt.packedOffsets[151] = 200; rt.packedOffsets[152] = 300; rt.packedOffsets[153] = 100;
  rt.packedBytes[300 + Q] = 0;
  rt.packedBytes[200 + 0] = 9;
  rt.game.XFlag = true;
  rt.game.U = 7;
  rt.game.mission = 2;
  rt.stepDefaultAo();
  assert.deepEqual(calls, [["resetMapEntryAllocation", 2]]);
  assert.equal(rt.game.screen, 7);
}

// value===1 (onAz + onCByte): Q=15, table write uses the NEW Q (bytecode
// reads Q *after* az() already set it to 15), onCByte -> selectResourceSection(70).
{
  const { rt, calls } = freshRuntime();
  const Q = 51;
  rt.game.screen = Q;
  rt.game.Z = 0;
  rt.packedOffsets[151] = 200; rt.packedOffsets[152] = 300; rt.packedOffsets[153] = 100;
  rt.packedBytes[300 + Q] = 0;
  rt.packedBytes[200 + 0] = 1;
  rt.stepDefaultAo();
  assert.deepEqual(calls, [["selectResourceSection", 70]]);
  assert.equal(rt.game.screen, 15);
  assert.equal(rt.game.mByte, 1);
  assert.equal(rt.packedBytes[100 + 116 + 15], 4);
}

// value===2 (onResourceByte): packedBytes written directly at the two
// stepLegacyAo-computed indices.
{
  const { rt, calls } = freshRuntime();
  const Q = 52;
  rt.game.screen = Q;
  rt.game.Z = 0;
  rt.packedOffsets[151] = 200; rt.packedOffsets[152] = 300; rt.packedOffsets[153] = 100;
  rt.packedBytes[300 + Q] = 0;
  rt.packedBytes[200 + 0] = 2;
  rt.packedBytes[300 + 12] = 0;
  rt.game.eByte = 4;
  rt.aoState.lInt = 1; // f.l:I (#334) is self-contained within aoState, never synced with game
  rt.stepDefaultAo();
  assert.deepEqual(calls, []);
  const base = 200 + 0 + 1;
  // Offsets 796..877: row base (MUSIC) gets 17 + e/2, row base + 2 (HINTS) gets 17 + l.
  assert.equal(rt.packedBytes[base], 19); // 17 + eByte/2
  assert.equal(rt.packedBytes[base + 2], 18); // 17 + lInt
}

// value===7 (onA0 -> stepLegacyAA, constant-pool #482, real name "aA()" --
// NOT a hypothetical "a0()"). Already-ported/tested as stepLegacyAA but
// never wired to a real call site until now.
{
  const { rt, calls } = freshRuntime();
  const Q = 53;
  rt.game.screen = Q;
  rt.game.Z = 0;
  rt.packedOffsets[151] = 200; rt.packedOffsets[152] = 300; rt.packedOffsets[153] = 100;
  rt.packedBytes[300 + Q] = 0;
  rt.packedBytes[200 + 0] = 7;
  rt.game.mission = 3;
  rt.game.tByte = 5;
  rt.game.actionWFlag = false;
  rt.stepDefaultAo();
  assert.deepEqual(calls, []);
  assert.equal(rt.game.screen, 16, "q<7 && t>-1 takes the Q=16/vInt=64 branch");
  assert.equal(rt.game.vInt, 64);
  assert.equal(rt.game.XFlag, true);
}

console.log("f.ao() (stepDefaultAo) real callback wiring OK");
