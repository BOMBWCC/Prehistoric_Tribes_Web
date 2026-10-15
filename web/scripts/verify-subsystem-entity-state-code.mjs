// Regression test for LegacySubsystemEntityStateCode.ts (final byte b(int)).
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

const { deriveLegacyEntityStateCode } = loadModule("./LegacySubsystemEntityStateCode", srcDir);

function makeState(overrides = {}) {
  const state = new Int8Array(10000);
  for (const [key, value] of Object.entries(overrides)) state[Number(key)] = value;
  return state;
}

// level < 12 -> 6, dense[7777+id] reset to 0.
{
  const state = makeState({ [1414 + 5]: 11, [7777 + 5]: 9 });
  assert.equal(deriveLegacyEntityStateCode(state, 5), 6);
  assert.equal(state[7777 + 5], 0);
}

// level>=12, bit2 clear, flag!==0 -> 1.
{
  const state = makeState({ [1414 + 5]: 12, [7979 + 5]: 0, [3535 + 5]: 1 });
  assert.equal(deriveLegacyEntityStateCode(state, 5), 1);
}

// level>=12, bit2 clear, flag===0, role===1 -> 1.
{
  const state = makeState({ [1414 + 5]: 12, [7979 + 5]: 0, [3535 + 5]: 0, [6565 + 5]: 1 });
  assert.equal(deriveLegacyEntityStateCode(state, 5), 1);
}

// level>=12, bit2 clear, flag===0, role!==1, counter>0 -> 7 (no reset).
{
  const state = makeState({ [1414 + 5]: 12, [7979 + 5]: 0, [3535 + 5]: 0, [6565 + 5]: 0, [7777 + 5]: 3 });
  assert.equal(deriveLegacyEntityStateCode(state, 5), 7);
  assert.equal(state[7777 + 5], 3);
}

// level>=12, bit2 clear, flag===0, role!==1, counter<=0 -> 0.
{
  const state = makeState({ [1414 + 5]: 12, [7979 + 5]: 0, [3535 + 5]: 0, [6565 + 5]: 0, [7777 + 5]: 0 });
  assert.equal(deriveLegacyEntityStateCode(state, 5), 0);
}

// level>=12, bit2 set, counter===0 -> 5.
{
  const state = makeState({ [1414 + 5]: 12, [7979 + 5]: 2, [7777 + 5]: 0 });
  assert.equal(deriveLegacyEntityStateCode(state, 5), 5);
}

// level>=12, bit2 set, counter!==0, flag!==0 -> 5.
{
  const state = makeState({ [1414 + 5]: 12, [7979 + 5]: 2, [7777 + 5]: 4, [3535 + 5]: 1, [6565 + 5]: 0 });
  assert.equal(deriveLegacyEntityStateCode(state, 5), 5);
}

// level>=12, bit2 set, counter!==0, flag===0, role===1 -> 5.
{
  const state = makeState({ [1414 + 5]: 12, [7979 + 5]: 2, [7777 + 5]: 4, [3535 + 5]: 0, [6565 + 5]: 1 });
  assert.equal(deriveLegacyEntityStateCode(state, 5), 5);
}

// level>=12, bit2 set, counter!==0, flag===0, role!==1 -> falls through
// (no reset in the bit2 block) to the flag/role/counter tail; counter is
// still >0 there too -> 7, and dense[7777+id] is NOT reset on this path.
{
  const state = makeState({ [1414 + 5]: 12, [7979 + 5]: 2, [7777 + 5]: 4, [3535 + 5]: 0, [6565 + 5]: 0 });
  assert.equal(deriveLegacyEntityStateCode(state, 5), 7);
  assert.equal(state[7777 + 5], 4);
}

console.log("final byte b(int) entity state-code classifier OK");
