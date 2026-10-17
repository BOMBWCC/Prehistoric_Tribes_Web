// Regression test for LegacyRuntimeState's completeEntityRecord wiring
// fix (2026-08-20): it used to read game.entityW/game.entityQ, fields
// only ever written by the dead, unused selectCurrentEntity/
// LegacyEntityCurrentSelection.ts -- so this real side effect (P:Z=true
// when w===2 && record===q) never actually fired in live play. Direct
// bytecode read of final void f.d(int) confirms w/q are w:B(#382)/
// q:I(#356), the SAME already-canonical game.barMode/game.qCounter fields.
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

// game.barMode/game.qCounter (the real, live fields) drive the effect.
{
  const rt = new LegacyRuntimeState();
  rt.game.barMode = 2;
  rt.game.qCounter = 12;
  rt.game.pendingP = false;
  // The dead entityW/entityQ fields are left at their defaults (0) to
  // prove they are no longer read.
  rt.completeEntityRecord(12);
  assert.equal(rt.game.pendingP, true);
}

// Non-matching record -> no effect, even with wByte===2.
{
  const rt = new LegacyRuntimeState();
  rt.game.barMode = 2;
  rt.game.qCounter = 12;
  rt.game.pendingP = false;
  rt.completeEntityRecord(13);
  assert.equal(rt.game.pendingP, false);
}

// The dead entityW/entityQ fields must NOT drive the effect anymore.
{
  const rt = new LegacyRuntimeState();
  rt.game.entityW = 2;
  rt.game.entityQ = 12;
  rt.game.barMode = 0;
  rt.game.qCounter = 0;
  rt.game.pendingP = false;
  rt.completeEntityRecord(12);
  assert.equal(rt.game.pendingP, false);
}

console.log("completeEntityRecord wiring (final void f.d(int) -> wByte/qCounter) OK");
