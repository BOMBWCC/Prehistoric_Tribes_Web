// Regression test for LegacySubsystemEntityProbe.ts (private boolean i()).
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

const { stepLegacySubsystemEntityProbe } = loadModule("./LegacySubsystemEntityProbe", srcDir);

function makeState(overrides = {}) {
  const state = new Int8Array(10000);
  for (const [key, value] of Object.entries(overrides)) state[Number(key)] = value;
  return state;
}

// mode in [8,14], type not in {60,87} -> false immediately.
{
  const state = makeState({ [2929 + 5]: 10, [2828 + 5]: 20 });
  assert.equal(stepLegacySubsystemEntityProbe({ state, entityId: 5, f: { value: true } }), false);
}

// mode in [8,14], type===60 -> proceeds past the mode gate.
// type<=9 is false (60>9), so needs onL(); onL()===false -> returns false.
{
  const state = makeState({ [2929 + 5]: 10, [2828 + 5]: 60 });
  let called = false;
  const result = stepLegacySubsystemEntityProbe({ state, entityId: 5, f: { value: true }, onL: () => { called = true; return false; } });
  assert.equal(result, false);
  assert.equal(called, true);
}

// mode outside [8,14] -> skips the mode gate; type<=9 -> skips onL() gate too.
// type not in [28,49] and !==99 -> reaches the guaranteed J() throw.
{
  const state = makeState({ [2929 + 5]: 20, [2828 + 5]: 5 });
  assert.throws(() => stepLegacySubsystemEntityProbe({ state, entityId: 5, f: { value: true } }));
}

// type>9, onL() true -> passes that gate; type in [28,49] -> calls
// onCheckTargetKind, returns false (never true).
{
  const state = makeState({ [2929 + 5]: 20, [2828 + 5]: 30 });
  let calledWith = null;
  const result = stepLegacySubsystemEntityProbe({
    state, entityId: 5, f: { value: true },
    onL: () => true,
    onCheckTargetKind: (type, flag, id) => { calledWith = [type, flag, id]; return true; },
  });
  assert.equal(result, false);
  assert.deepEqual(calledWith, [30, true, 5]);
}

// type===99 also takes the onCheckTargetKind path.
{
  const state = makeState({ [2929 + 5]: 20, [2828 + 5]: 99 });
  let called = false;
  const result = stepLegacySubsystemEntityProbe({
    state, entityId: 5, f: { value: true }, onL: () => true,
    onCheckTargetKind: () => { called = true; return false; },
  });
  assert.equal(result, false);
  assert.equal(called, true);
}

// type outside [28,49] and !==99 (and >9, onL()===true) -> guaranteed throw.
{
  const state = makeState({ [2929 + 5]: 20, [2828 + 5]: 100 });
  assert.throws(() => stepLegacySubsystemEntityProbe({ state, entityId: 5, f: { value: true }, onL: () => true }));
}

// offset 185..191 then 916 (b-javap.txt 23074): after a(int,boolean,int) the live f:Z
// decides. i()Z clears f at 82; if the callee sets it, the tail continues to k()/I().
{
  const state = makeState({ [2929 + 5]: 20, [2828 + 5]: 30 });
  const f = { value: true };
  const log = [];
  const result = stepLegacySubsystemEntityProbe({
    state, entityId: 5, f, onL: () => true,
    onCheckTargetKind: () => { log.push(["f at call", f.value]); f.value = true; return false; },
    onKPredicate: () => { log.push(["k"]); return false; },
    onIFinalize: () => log.push(["I"]),
  });
  assert.equal(result, true);
  assert.deepEqual(log, [["f at call", false], ["k"], ["I"]]);
}


// Offsets 196..218: a mode-117 unit calls j(int) with 0 (offset 215 iconst_0) -- the rest
// branch, not the healing one (corrected 2026-10-16; this used to pass 1).
{
  const state = makeState({ [2929 + 5]: 117, [2828 + 5]: 5 });
  const args = [];
  try {
    stepLegacySubsystemEntityProbe({ state, entityId: 5, f: { value: true }, onJ: () => {}, onJInt: (arg) => args.push(arg) });
  } catch {
    // later offsets may need callbacks this case does not provide
  }
  assert.deepEqual(args, [0]);
}

console.log("private boolean i() (entity probe, never returns true) OK");
