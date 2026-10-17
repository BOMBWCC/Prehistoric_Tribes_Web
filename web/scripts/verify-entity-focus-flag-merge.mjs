// Regression test for the entityFocusFlag/FFlag duplicate-field bug fix
// (2026-08-22): both properties independently tracked f.F:Z(#49) --
// confirmed via five real bytecode sites (f.h()'s kFlag-reset, f.aM()'s
// allocation reset, f.ad()'s leading guard, the record allocator's
// framePending gate, plus af()/ah()/aj() wired the same day) -- so a
// write through one silently left the other stale. Merged onto a single
// `game.entityFocusFlag`; `FFlag` removed entirely.
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

// f.h()'s kFlag-reset block (offset 596..598, `putfield #49`) must clear
// the SAME field ah()/aj()/af() write, not a separate stale duplicate.
{
  const rt = new LegacyRuntimeState();
  rt.game.entityFocusFlag = true;
  rt.game.kResetFlag = true;
  rt.game.loopMode = 1;
  rt.game.digitKey = -1;
  rt.stepGameplayFrame();
  assert.equal(rt.game.entityFocusFlag, false);
  assert.equal("FFlag" in rt.game, false);
}

// f.aM()'s allocation reset (offset 549, `putfield #49`) clears the same
// field -- resetMapEntryAllocation is private; TS privacy is compile-time
// only, so it is callable directly here like the rest of this project's
// test suite does for private runtime methods.
{
  const rt = new LegacyRuntimeState();
  rt.game.entityFocusFlag = true;
  rt.resetMapEntryAllocation(0);
  assert.equal(rt.game.entityFocusFlag, false);
}

console.log("entityFocusFlag/FFlag merge (f.F:Z #49) OK");
