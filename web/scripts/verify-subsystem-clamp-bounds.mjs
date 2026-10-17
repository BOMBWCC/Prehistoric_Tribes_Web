// Regression test for LegacySubsystemClampBounds.ts (private void b(byte,byte,byte)).
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

const { stepLegacySubsystemClampBounds } = loadModule("./sim/tribe/LegacySubsystemClampBounds", srcDir);

// arg3===0 -> at===au and av===aw always (the established case in practice).
{
  const result = stepLegacySubsystemClampBounds(80, 32, 0);
  assert.equal(result.at, result.au);
  assert.equal(result.av, result.aw);
  assert.equal(result.at, Math.max(0, Math.min(5, 80 >> 4)));
  assert.equal(result.av, Math.max(0, Math.min(5, 32 >> 4)));
  assert.equal(result.an, 0, "offset 0..4: this.an is unconditionally reset to 0 every call");
}

// Values below the >>4 clamp range floor to 0.
{
  const result = stepLegacySubsystemClampBounds(0, 0, 0);
  assert.equal(result.at, 0);
  assert.equal(result.au, 0);
  assert.equal(result.av, 0);
  assert.equal(result.aw, 0);
}

// Values above the clamp range ceiling to 5.
{
  const result = stepLegacySubsystemClampBounds(1000, 1000, 0);
  assert.equal(result.at, 5);
  assert.equal(result.au, 5);
  assert.equal(result.av, 5);
  assert.equal(result.aw, 5);
}

// Nonzero arg3 spreads at/au (and av/aw) apart.
{
  const result = stepLegacySubsystemClampBounds(48, 48, 20);
  assert.ok(result.at <= result.au);
  assert.ok(result.av <= result.aw);
  assert.equal(result.at, Math.max(0, Math.min(5, (48 - 20) >> 4)));
  assert.equal(result.au, Math.max(0, Math.min(5, (48 + 20) >> 4)));
}

// A large negative arg3 can invert at>au (the real "skip the loop entirely" escape).
{
  const result = stepLegacySubsystemClampBounds(48, 48, -100);
  assert.ok(result.at > result.au, "at>au is the real bytecode's own loop-skip condition");
}

console.log("b.b(byte,byte,byte) clamp-bounds OK");
