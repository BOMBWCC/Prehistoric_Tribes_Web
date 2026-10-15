// Integration test for LegacyRuntimeState's onXFlag wiring (f.x:Z #383,
// LegacyMapMarkerDetail.ts's dispatch) and stepEntityAction's matching
// game.xZFlag thread-through (previously hardcoded xFlag: false).
// RETRACTED (2026-09-07): this header used to say the flag's only reader
// (stepEntityAction) is unreachable dead code because bShort is permanently
// null. bShort is NOT null -- e.f() allocates and fills f.b:[S] from /a (see
// LegacyEntityAction.ts's docblock) -- so the reader runs and the flag is
// really consumed. The cases below now assert that consumption instead of a
// round-trip.
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

// stepEntityAction reads game.xZFlag (not a hardcoded false) and writes it
// back afterward. With a real bShort the `at >= 0` branch runs and its
// `if (x) { ...; x = false; }` block (LegacyEntityAction.ts) consumes the
// flag, so a `true` going in comes back `false`.
{
  const rt = new LegacyRuntimeState();
  rt.packedData = {
    shortTables: Array.from({ length: 5 }, () => new Int16Array(200)),
    byteTables: Array.from({ length: 9 }, () => new Int8Array(200)),
  };
  rt.game.xZFlag = true;
  let threw = null;
  try {
    rt["stepEntityAction"](5, 10, 20, 3, 1);
  } catch (e) { threw = String(e); }
  assert.equal(threw, null);
  assert.equal(rt.game.xZFlag, false); // consumed: the one-shot adjustment ran
}

{
  const rt = new LegacyRuntimeState();
  rt.packedData = {
    shortTables: Array.from({ length: 5 }, () => new Int16Array(200)),
    byteTables: Array.from({ length: 9 }, () => new Int8Array(200)),
  };
  rt.game.xZFlag = false;
  rt["stepEntityAction"](5, 10, 20, 3, 1);
  assert.equal(rt.game.xZFlag, false);
}

console.log("f.x:Z (#383) onXFlag wiring + game.xZFlag thread-through OK");
