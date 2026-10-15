// Regression test for LegacySubsystemNearestBuilding.ts (final boolean a(int)).
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

const { stepLegacySubsystemNearestBuilding } = loadModule("./LegacySubsystemNearestBuilding", srcDir);

function makeInput(overrides = {}) {
  return {
    state: new Int8Array(10000),
    packedBytes: new Int8Array(4000),
    packedOffsets: new Int16Array(400),
    team: 0,
    entityId: 5,
    kind: 3,
    ...overrides,
  };
}

// No active buildings at all -> returns false, target = own position.
{
  const input = makeInput();
  const v = 5;
  input.state[v] = 10;
  input.state[101 + v] = 20;
  const result = stepLegacySubsystemNearestBuilding(input, {});
  assert.equal(result, false);
  assert.equal(input.state[3131 + v], 10);
  assert.equal(input.state[3232 + v], 20);
}

// A single active building with the matching kind, not busy, no gates
// tripped -> found, target clamped onto its footprint.
{
  const input = makeInput({ kind: 3 });
  const v = 5;
  const z = 1; // team0 base
  input.state[v] = 0; // entity x
  input.state[101 + v] = 0; // entity y
  input.state[8505 + z] = 1; // active
  input.state[8749 + z] = 3; // kind matches
  input.state[8383 + z] = 10; // building x
  input.state[8444 + z] = 10; // building y
  input.packedOffsets[138] = 200;
  input.packedBytes[200 + 104 + 3] = 4; // width
  input.packedBytes[200 + 130 + 3] = 4; // height
  input.packedBytes[200 + 156 + 3] = -1; // keep the dense[8810+z] gate inactive
  const result = stepLegacySubsystemNearestBuilding(input, {});
  assert.equal(result, true);
  assert.equal(input.state[3131 + v], 10, "clamped to building's own min x");
  assert.equal(input.state[3232 + v], 10, "clamped to building's own min y");
}

// dense[8505+z]<=0 (inactive) excludes a building.
{
  const input = makeInput({ kind: 3 });
  const z = 1;
  input.state[8505 + z] = 0;
  input.state[8749 + z] = 3;
  const result = stepLegacySubsystemNearestBuilding(input, {});
  assert.equal(result, false);
}

// Kind mismatch with arg1!==6 (no fallback) excludes a building.
{
  const input = makeInput({ kind: 3 });
  const z = 1;
  input.state[8505 + z] = 1;
  input.state[8749 + z] = 7; // not 3
  const result = stepLegacySubsystemNearestBuilding(input, {});
  assert.equal(result, false);
}

// Fallback path: arg1===6, kind!==6 but ===16, dense[9237+z]===6, and the
// entity's own type<=25 -> still eligible.
{
  const input = makeInput({ kind: 6, entityId: 5 });
  const v = 5;
  const z = 1;
  input.state[2828 + v] = 20; // entity type <= 25
  input.state[8505 + z] = 1;
  input.state[8749 + z] = 16;
  input.state[9237 + z] = 6;
  input.packedOffsets[138] = 200;
  input.packedBytes[200 + 156 + 6] = -1; // keep the dense[8810+z] gate inactive
  const result = stepLegacySubsystemNearestBuilding(input, {});
  assert.equal(result, true, "type-16 fallback path accepted the building");
}

// Fallback path excluded when the entity's own type>25.
{
  const input = makeInput({ kind: 6, entityId: 5 });
  const v = 5;
  const z = 1;
  input.state[2828 + v] = 30; // > 25
  input.state[8505 + z] = 1;
  input.state[8749 + z] = 16;
  input.state[9237 + z] = 6;
  const result = stepLegacySubsystemNearestBuilding(input, {});
  assert.equal(result, false);
}

// Busy building excluded UNLESS arg1===6.
{
  const input = makeInput({ kind: 3 });
  const z = 1;
  input.state[8505 + z] = 1;
  input.state[8749 + z] = 3;
  input.state[8627 + z] = 1; // busy
  const result = stepLegacySubsystemNearestBuilding(input, {});
  assert.equal(result, false);
}
{
  const input = makeInput({ kind: 6 });
  const v = 5;
  const z = 1;
  input.state[2828 + v] = 10;
  input.state[8505 + z] = 1;
  input.state[8749 + z] = 6; // direct kind match, arg1===6
  input.state[8627 + z] = 1; // busy, but arg1===6 exempts it
  input.packedOffsets[138] = 200;
  input.packedBytes[200 + 156 + 6] = -1; // keep the dense[8810+z] gate inactive
  const result = stepLegacySubsystemNearestBuilding(input, {});
  assert.equal(result, true);
}

// dense[8810+z]<1 excludes a building when packedOffsets[138+156+arg1]>=0.
{
  const input = makeInput({ kind: 3 });
  const z = 1;
  input.state[8505 + z] = 1;
  input.state[8749 + z] = 3;
  input.packedOffsets[138] = 200;
  input.packedBytes[200 + 156 + 3] = 5; // >=0 -> gate active
  input.state[8810 + z] = 0; // <1 -> excluded
  const result = stepLegacySubsystemNearestBuilding(input, {});
  assert.equal(result, false);
}
{
  const input = makeInput({ kind: 3 });
  const z = 1;
  input.state[8505 + z] = 1;
  input.state[8749 + z] = 3;
  input.packedOffsets[138] = 200;
  input.packedBytes[200 + 156 + 3] = -1; // <0 -> gate inactive, no exclusion
  input.state[8810 + z] = 0;
  const result = stepLegacySubsystemNearestBuilding(input, {});
  assert.equal(result, true);
}

// dense[8932+z]>0 excludes when it meets/exceeds the packedBytes threshold, unless arg1===6.
{
  const input = makeInput({ kind: 3 });
  const z = 1;
  input.state[8505 + z] = 1;
  input.state[8749 + z] = 3;
  input.state[8932 + z] = 5;
  input.state[9115 + z] = 2;
  input.packedOffsets[138] = 200;
  input.packedBytes[200 + (2 - 1) * 26 + 3] = 5; // threshold=5, 5>=5 -> excluded
  const result = stepLegacySubsystemNearestBuilding(input, {});
  assert.equal(result, false);
}

// Nearest-of-two: picks the building with the smaller squared distance.
{
  const input = makeInput({ kind: 3 });
  const v = 5;
  input.state[v] = 0;
  input.state[101 + v] = 0;
  input.packedOffsets[138] = 200;
  input.packedBytes[200 + 104 + 3] = 0; // width=0 for simplicity
  input.packedBytes[200 + 130 + 3] = 0;
  input.packedBytes[200 + 156 + 3] = -1; // keep the dense[8810+z] gate inactive
  // building 1: far away
  input.state[8505 + 1] = 1;
  input.state[8749 + 1] = 3;
  input.state[8383 + 1] = 50;
  input.state[8444 + 1] = 50;
  // building 2: closer
  input.state[8505 + 2] = 1;
  input.state[8749 + 2] = 3;
  input.state[8383 + 2] = 5;
  input.state[8444 + 2] = 5;
  const result = stepLegacySubsystemNearestBuilding(input, {});
  assert.equal(result, true);
  assert.equal(input.state[3131 + v], 5, "clamped to the closer building (id 2)");
  assert.equal(input.state[3232 + v], 5);
}

console.log("b.a(int) nearest-building search OK");
