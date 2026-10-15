// Integration test for LegacyRuntimeState's onSelectionPreset wiring
// (f.W()'s staticL branch -> the real 9-arg f.a(boolean x9), #464). This
// callback was previously a fully inert placeholder ("f.a(ZZZZZZZZZ)
// remains raw"); runSelectionFlagsRefresh was extended from 4 to 9
// exposed params (the underlying stepLegacySelectionFlags already
// supported 9, but nothing threaded fifth..ninth through until now) since
// this exact call site needs fifth=true, a value the existing 4-arg-only
// call sites could never produce.
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

// --- runSelectionFlagsRefresh with fifth=true reaches the real 9-arg branch ---
{
  const rt = new LegacyRuntimeState();
  rt["runSelectionFlagsRefresh"](true, false, false, false, true);
  assert.equal(rt.game.selectionFlags[5], true);
  assert.equal(rt.game.selectionAd, 5);
}

// --- existing 4-arg call sites still default fifth..ninth to false (no regression) ---
{
  const rt = new LegacyRuntimeState();
  rt["runSelectionFlagsRefresh"](true, false, false, false);
  assert.equal(rt.game.selectionFlags[5], false);
}

// --- onW's real onSelectionPreset dispatch reaches the fixed 9-arg call with the exact bytecode args ---
{
  const rt = new LegacyRuntimeState();
  const calls = [];
  const original = rt["runSelectionFlagsRefresh"].bind(rt);
  rt["runSelectionFlagsRefresh"] = (...args) => { calls.push(args); return original(...args); };

  rt.game.staticL = true;
  rt.game.wByte = 0; // !== 3, so onSelectionPreset fires
  // stepLegacyGameplayTick's own onV gate: vByte===1 (iByte defaults -1,
  // already !==0) and wByte not in {2,4} (0 satisfies both this and W()'s
  // own wByte!==3 gate above).
  rt.game.vByte = 1;
  rt["stepGameplayFrame"]();

  // CORRECTION (2026-09-03): the 2026-08-24 expectation of a SECOND call
  // here (from S(), reached via b.i()'s onFByte -> runSceneDispatch) was
  // itself based on a real bug in stepLegacySubsystemI that has since been
  // fixed (see LegacySubsystemTail.ts's docblock and docs/unknowns.md's
  // 2026-09-03 entry): the three `if_icmpXX ... 635` gates in b.i()'s
  // bytecode tail (offsets 487/517/548) guard the ENTIRE L-byte-advance +
  // onJ/onSubsystemB/onFByte block, not just the L-byte advance. This
  // fixture's `LegacyRuntimeState` has no packed resource attached, so
  // `packedBytes`/`packedOffsets` are all-zero -- table302[0] === table302[1]
  // === 0, an empty range for q===0, which the real bytecode (and now the
  // fixed port) skips entirely, never reaching onFByte. Only the first,
  // directly-dispatched onSelectionPreset call happens.
  assert.deepEqual(calls, [[true, false, false, false, true]]);
}

console.log("f.a(boolean x9)/#464 (onSelectionPreset, wired via runSelectionFlagsRefresh) OK");
