// Integration test for LegacyRuntimeState's stepLegacyExitPreparation
// (`private void E()`, bytecode/f-javap.txt offsets 0..157). Wired as
// stepLegacyGameplayCommand's onExitPreparation target (f.W()'s iByte===3
// non-qByte===3 continuation), previously a fully inert placeholder
// ("private f.E() remains unresolved").
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

function freshRt() {
  const rt = new LegacyRuntimeState();
  rt.game.mapWidth = 200;
  rt.game.mapHeight = 200;
  rt.game.viewColumns = 0;
  rt.game.viewRows = 0;
  return rt;
}

// Middle-of-map: W = I-20+0 (no clamp), X = K-30+0 (no clamp, since 60<=200).
{
  const rt = freshRt();
  rt.game.cameraColumn = 50;
  rt.game.cameraRow = 60;
  rt["stepLegacyExitPreparation"]();
  assert.equal(rt.game.exitPrepWInt, 50 - 20);
  assert.equal(rt.game.exitPrepXInt, 60 - 30);
  assert.equal(rt.game.exitPrepALInt, 0); // untouched -- ah<=mapHeight branch taken
}

// Negative-clamp: I small enough that W would go negative -> clamps to 0.
{
  const rt = freshRt();
  rt.game.cameraColumn = 0;
  rt.game.cameraRow = 0;
  rt["stepLegacyExitPreparation"]();
  assert.equal(rt.game.exitPrepWInt, 0);
  assert.equal(rt.game.exitPrepXInt, 0);
}

// Upper-clamp: W+40 >= mapWidth -> clamps to mapWidth-40.
{
  const rt = freshRt();
  rt.game.mapWidth = 100;
  rt.game.cameraColumn = 90;
  rt["stepLegacyExitPreparation"]();
  assert.equal(rt.game.exitPrepWInt, 100 - 40);
}

// Upper-clamp (vertical): X+60 >= mapHeight -> clamps to mapHeight-60.
{
  const rt = freshRt();
  rt.game.mapHeight = 100;
  rt.game.cameraRow = 90;
  rt["stepLegacyExitPreparation"]();
  assert.equal(rt.game.exitPrepXInt, 100 - 60);
}

// ah:B(60) > mapHeight: takes the OTHER branch entirely -- computes
// exitPrepALInt instead of exitPrepXInt (mutually exclusive).
{
  const rt = freshRt();
  rt.game.mapHeight = 40; // < 60
  rt.game.exitPrepXInt = 999; // sentinel -- must stay untouched
  rt["stepLegacyExitPreparation"]();
  assert.equal(rt.game.exitPrepALInt, (60 - 40) >> 1);
  assert.equal(rt.game.exitPrepXInt, 999);
}

// --- Wiring: onExitPreparation reaches stepLegacyExitPreparation through the real dispatch ---
{
  const rt = freshRt();
  const calls = [];
  const original = rt["stepLegacyExitPreparation"].bind(rt);
  rt["stepLegacyExitPreparation"] = () => { calls.push(1); return original(); };

  rt.game.digitKey = 3;
  rt.game.mission = 0; // !== 3, so onExitPreparation fires (not onEntityActionStart)
  rt.game.loopMode = 1; // stepLegacyGameplayTick's onV gate

  rt["stepGameplayFrame"]();

  assert.deepEqual(calls, [1]);
}

console.log("f.E() viewport-window origin (stepLegacyExitPreparation, wired via onExitPreparation) OK");
