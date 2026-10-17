// Regression test for LegacySubsystemNearbyMarkerLookup.ts
// (private void a(byte,byte,byte,byte), confirmed guaranteed-throw).
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

const { stepLegacySubsystemNearbyMarkerLookup } = loadModule("./sim/tribe/LegacySubsystemNearbyMarkerLookup", srcDir);

// RETRACTED 2026-09-07: these cases used to assert a guaranteed throw on the
// premise that class b's own c:[[[B] (#151) is permanently null. f.g() (see
// bytecode/f-javap.txt offset 460..473) allocates it as byte[5][6][6], and
// b.n() fills it with -1 -- the terminator for the `ak = a[layer][ak]` bucket
// walk in b.a(byte,byte,byte,byte) (offsets 40..58 / 856..869). The cases
// below drive the real method.

function makeArrays(fill = -1) {
  return {
    c: Array.from({ length: 5 }, () => Array.from({ length: 6 }, () => Int8Array.from({ length: 6 }, () => fill))),
    aRows: Array.from({ length: 5 }, () => new Int8Array(50)),
    bField232: 0, bField115: 0, bField235: 0, bField6: 0, bField17: 0,
  };
}

function makeInput(overrides = {}) {
  return {
    dense: new Int8Array(10000),
    packedBytes: new Int8Array(20000),
    packedOffsets: new Int16Array(312),
    saveOffsets: new Int16Array(570),
    gridC: Array.from({ length: 96 }, () => new Int8Array(96)),
    arrays: makeArrays(),
    bounds: { at: 2, au: 2, av: 3, aw: 3 },
    layer: 0, entityId: 5, refX: 0, refY: 0, mode: 0, threshold: 0,
    ...overrides,
  };
}

// Every bucket at -1 (the post-b.n() steady state with nothing registered):
// the walk never enters, and no best-candidate field is written.
{
  const input = makeInput();
  stepLegacySubsystemNearbyMarkerLookup(input);
  assert.equal(input.arrays.bField232, 0);
  assert.equal(input.arrays.bField17, 0);
}

// A wider range with empty buckets is likewise a no-op.
{
  const input = makeInput({ bounds: { at: 0, au: 5, av: 0, aw: 5 } });
  stepLegacySubsystemNearbyMarkerLookup(input);
  assert.equal(input.arrays.bField232, 0);
}

// One seeded bucket whose list terminates: the walk runs its body once and
// returns without spinning.
{
  const input = makeInput();
  input.arrays.c[0][3][2] = 0;   // bounds are ah in [2,2], ai in [3,3]
  input.arrays.aRows[0][0] = -1; // terminator
  stepLegacySubsystemNearbyMarkerLookup(input);
}

// mode !== 0 takes the second branch, which never touches the bestNN fields.
{
  const input = makeInput({ mode: 3 });
  input.arrays.c[0][3][2] = 0;
  input.arrays.aRows[0][0] = -1;
  stepLegacySubsystemNearbyMarkerLookup(input);
  assert.equal(input.arrays.bField232, 0);
}

console.log("b.a(byte,byte,byte,byte) nearby-marker bucket walk OK");
