// Regression test for LegacySubsystemAi.ts (private void ai()).
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

const { stepLegacySubsystemAi } = loadModule("./LegacySubsystemAi", srcDir);

// dense[9601]===0 -> rolls random, looks up packed table.
{
  const state = new Int8Array(10000);
  const packedBytes = new Int8Array(2000);
  const packedOffsets = new Int16Array(320);
  packedOffsets[184] = 100;
  state[9535 + 2] = 5; // kind
  packedBytes[100 + Math.trunc(120 / 50) * 3 + 5] = 42; // x=120 -> trunc(120/50)=2 -> index 100+6+5=111
  let randomArgs = null;
  const x = { value: -5 };
  stepLegacySubsystemAi({
    state, packedBytes, packedOffsets, slot: 2, sceneQ: 0, x,
    randomRemainder: (mask, divisor) => { randomArgs = [mask, divisor]; return 120; },
  });
  assert.deepEqual(randomArgs, [16777215, 100]);
  assert.equal(state[9557 + 2], 42);
  assert.equal(x.value, 120, "the roll lands in b.x:I (offset 29), not a local");
}

// dense[9601]!==0 -> fixed formula, no random call.
{
  const state = new Int8Array(10000);
  const packedBytes = new Int8Array(2000);
  const packedOffsets = new Int16Array(320);
  state[9601 + 2] = 7;
  state[9535 + 2] = 4;
  stepLegacySubsystemAi({
    state, packedBytes, packedOffsets, slot: 2, sceneQ: 0, x: { value: 0 },
    randomRemainder: () => { throw new Error("should not roll random"); },
  });
  assert.equal(state[9557 + 2], 37 + 4);
}

// q===4 && dense[9469]===2 -> bumped to 3.
{
  const state = new Int8Array(10000);
  const packedBytes = new Int8Array(2000);
  const packedOffsets = new Int16Array(320);
  state[9601 + 2] = 1;
  state[9469 + 2] = 2;
  stepLegacySubsystemAi({
    state, packedBytes, packedOffsets, slot: 2, sceneQ: 4, x: { value: 0 },
    randomRemainder: () => 0,
  });
  assert.equal(state[9469 + 2], 3);
}

// q!==4 -> dense[9469] untouched even if ===2.
{
  const state = new Int8Array(10000);
  const packedBytes = new Int8Array(2000);
  const packedOffsets = new Int16Array(320);
  state[9601 + 2] = 1;
  state[9469 + 2] = 2;
  stepLegacySubsystemAi({
    state, packedBytes, packedOffsets, slot: 2, sceneQ: 0, x: { value: 0 },
    randomRemainder: () => 0,
  });
  assert.equal(state[9469 + 2], 2);
}

console.log("private void ai() (AI scratch tail, part 4) OK");
