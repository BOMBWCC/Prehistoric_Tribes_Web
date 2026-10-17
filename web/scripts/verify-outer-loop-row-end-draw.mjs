// Regression test for wiring f.u()'s per-row end-of-row marker draw
// (record 105, bytecode offset ~2094..2113) into stepGameplayOuterLoop()
// (2026-08-22). Found unwired while tracing u()'s exception scope for the
// r()/s() post-loop tail wiring -- the underlying trigger condition is
// already unit-tested in verify-gameplay-outer-loop.mjs; this checks the
// real dispatch reaches stepZSubrecordDraw.
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

const fakeGraphics = { setColor() {}, fillRect() {}, drawImage() {}, drawString() {}, drawRect() {}, drawLine() {} };

// lFlag||nFlag && rowEndMarker[1]-originRow===ai (first loop row, ai=-1) fires record 105.
{
  const rt = new LegacyRuntimeState();
  rt.packedData = { shortTables: [], byteTables: [], packedBytes: new Int8Array(1), packedOffsets: new Int16Array(1) };
  rt.game.formUpActive = true;
  rt.game.cameraColumn = 0;
  rt.game.cameraRow = 0;
  rt.game.outerLoopRowEndMarker[1] = -1;

  let spyRecord;
  const orig = rt.stepZSubrecordDraw.bind(rt);
  rt.stepZSubrecordDraw = (record, ...rest) => {
    if (record === 105) spyRecord = record;
    return orig(record, ...rest);
  };
  assert.doesNotThrow(() => rt.stepGameplayOuterLoop(fakeGraphics));
  assert.equal(spyRecord, 105);
}

// Neither lFlag nor nFlag: no draw.
{
  const rt = new LegacyRuntimeState();
  rt.packedData = { shortTables: [], byteTables: [], packedBytes: new Int8Array(1), packedOffsets: new Int16Array(1) };
  rt.game.formUpActive = false;
  rt.game.callToArmsActive = false;
  rt.game.outerLoopRowEndMarker[1] = -1;

  let fired = false;
  const orig = rt.stepZSubrecordDraw.bind(rt);
  rt.stepZSubrecordDraw = (record, ...rest) => {
    if (record === 105) fired = true;
    return orig(record, ...rest);
  };
  rt.stepGameplayOuterLoop(fakeGraphics);
  assert.equal(fired, false);
}

console.log("f.u() per-row end-of-row draw (onRowEndDraw, record 105) OK");
