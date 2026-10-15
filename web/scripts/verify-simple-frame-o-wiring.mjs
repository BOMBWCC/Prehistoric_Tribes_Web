// Integration test for LegacyRuntimeState's onO wiring in the K() simple-
// frame-handler dispatch (stepLegacySimpleFrameHandler's case "K"). K()'s
// own bytecode calls n(), u(), then O() in sequence (offset 17-28,
// `invokespecial #417 // Method O:()V`) -- the SAME single private void
// O() declaration already ported/tested as stepLegacyO (S()'s own onO
// callback target). Previously left as a stale "remains unresolved"
// comment despite the target already existing in this same file.
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

// Handler "K" real dispatch (Q=20, H=true) reaches stepLegacyO for real,
// in the correct order (after onN/onU, matching the bytecode's own
// n() -> u() -> O() sequence).
{
  const rt = new LegacyRuntimeState();
  rt.game.Q = 20;
  rt.game.H = true;

  const calls = [];
  const originalO = rt["stepLegacyO"].bind(rt);
  rt["stepLegacyO"] = () => { calls.push("O"); return originalO(); };
  const originalOuterLoop = rt["stepGameplayOuterLoop"].bind(rt);
  rt["stepGameplayOuterLoop"] = (...args) => { calls.push("U"); return originalOuterLoop(...args); };

  let threw = null;
  try {
    rt.stepFrameDispatch();
  } catch (e) { threw = String(e); }

  assert.equal(threw, null);
  assert.deepEqual(calls, ["U", "O"]); // onU fires before onO, matching K()'s own n()->u()->O() order
}

console.log("f.K()'s onO (stepLegacyO, the SAME target as S()'s own onO) wiring OK");
