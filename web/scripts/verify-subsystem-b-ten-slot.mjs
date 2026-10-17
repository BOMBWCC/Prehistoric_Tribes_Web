// Behavior test for class b's "ten-slot table" cluster.
//
// RETRACTED (2026-09-07): this file used to assert that all four methods are
// guaranteed throws, because f:[[B](#168) and c:[[B](#143) were believed
// permanently null after an exhaustive grep of bytecode/b-javap.txt. Both are
// allocated from OUTSIDE class b, by f.g(): b.f:[[B] = new byte[2][10]
// (bytecode/f-javap.txt offset 664..668) and b.c:[[B] = new byte[6][10]
// (offset 590..594). The cases below now assert the real ported behavior.
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

const {
  allocateLegacySubsystemBTenSlot,
  releaseLegacySubsystemBTenSlot,
  releaseLegacySubsystemBTenSlotEntity,
  releaseLegacySubsystemBEntitySlot,
} = loadModule("./sim/tribe/LegacySubsystemBTenSlot", srcDir);

// b.a(byte)(#475): fills the first slot whose f[0][aK] < 1, zeroes f[1][aK]
// and dense[9298+id], and returns true; returns false when all 10 are taken.
{
  const fRows = [new Int8Array(10), new Int8Array(10)];
  const dense = new Int8Array(20000);
  fRows[0][0] = 3; // occupied
  fRows[1][1] = 9; // must be cleared when slot 1 is taken
  dense[9298 + 7] = 5;
  assert.equal(allocateLegacySubsystemBTenSlot(fRows, dense, 7), true);
  assert.equal(fRows[0][1], 7, "first slot with f[0][aK] < 1 is slot 1");
  assert.equal(fRows[1][1], 0);
  assert.equal(dense[9298 + 7], 0);
  assert.equal(fRows[0][0], 3, "occupied slot untouched");
}
{
  const fRows = [Int8Array.from({ length: 10 }, () => 1), new Int8Array(10)];
  assert.equal(allocateLegacySubsystemBTenSlot(fRows, new Int8Array(20000), 7), false);
}

// b.c(int)(#563): clears EVERY matching slot -- the loop has no early exit.
{
  const fRows = [new Int8Array(10), new Int8Array(10)];
  fRows[0][2] = 7; fRows[0][5] = 7; fRows[0][6] = 8;
  releaseLegacySubsystemBTenSlot(fRows, 7);
  assert.equal(fRows[0][2], 0);
  assert.equal(fRows[0][5], 0, "second match cleared too (no break at offset 41)");
  assert.equal(fRows[0][6], 8);
}

// b.a(int)(#476): dense[9237+id]<1 is a genuine no-op.
{
  const cRows = Array.from({ length: 6 }, () => new Int8Array(10));
  const dense = new Int8Array(20000);
  const calls = [];
  releaseLegacySubsystemBTenSlotEntity(cRows, dense, 5, { onD: (...a) => calls.push(a) });
  assert.deepEqual(calls, []);
}
// b.a(int)(#476): walks to the first slot with c[4][af]!==0 && c[5][af]===id,
// calls d(c[0][af], -1), and returns immediately.
{
  const cRows = Array.from({ length: 6 }, () => new Int8Array(10));
  const dense = new Int8Array(20000);
  dense[9237 + 5] = 1;
  cRows[4][1] = 0; cRows[5][1] = 5;   // c[4]===0 -> skipped even though the id matches
  cRows[4][3] = 1; cRows[5][3] = 9;   // id mismatch -> skipped
  cRows[4][4] = 1; cRows[5][4] = 5; cRows[0][4] = 42;
  cRows[4][6] = 1; cRows[5][6] = 5;   // never reached (returns after the first hit)
  const calls = [];
  releaseLegacySubsystemBTenSlotEntity(cRows, dense, 5, { onD: (...a) => calls.push(a) });
  assert.deepEqual(calls, [[42, -1]]);
}

// b.d(int,int)(#367): ((dense[8282+id]&127)>>1)-1 < 0 is a genuine no-op.
{
  const cRows = Array.from({ length: 6 }, () => new Int8Array(10));
  const dense = new Int8Array(20000);
  dense[8282 + 6] = 1; // (1&127)>>1 - 1 = -1
  const ks = [];
  releaseLegacySubsystemBEntitySlot(cRows, dense, 6, -1, { onK: (id) => ks.push(id) });
  assert.deepEqual(ks, []);
}
// b.d(int,int)(#367): argument>0 and c[4][ae]!==3 returns before any write.
{
  const cRows = Array.from({ length: 6 }, () => new Int8Array(10));
  const dense = new Int8Array(20000);
  dense[8282 + 6] = 4; // ae = 1
  cRows[4][1] = 2;
  const ks = [];
  releaseLegacySubsystemBEntitySlot(cRows, dense, 6, 1, { onK: (id) => ks.push(id) });
  assert.deepEqual(ks, []);
  assert.equal(cRows[4][1], 2, "nothing cleared on the offset-47 early return");
}
// b.d(int,int)(#367): the full body.
{
  const cRows = Array.from({ length: 6 }, () => new Int8Array(10));
  const dense = new Int8Array(20000);
  dense[8282 + 6] = 4;               // ae = ((4&127)>>1)-1 = 1; parity = (4+1)&1 = 1
  cRows[4][1] = 3;
  cRows[0][1] = 11; cRows[1][1] = 12; cRows[5][1] = 13;
  dense[3535 + 6] = 15;              // -> clears dense[3636+6]
  dense[3636 + 6] = 7;
  dense[8282 + 11] = -1;             // & 128 -> -128
  dense[8282 + 12] = 3;              // & 128 -> 0
  dense[9237 + 13] = 2;              // < 3 -> cleared
  const ks = [];
  releaseLegacySubsystemBEntitySlot(cRows, dense, 6, -1, { onK: (id) => ks.push(id) });
  assert.equal(cRows[4][1], 0);
  assert.deepEqual(ks, [12, 6], "k(c[parity][ae]) then, because argument<0, k(entityIndex)");
  assert.equal(dense[3636 + 6], 0);
  assert.equal(dense[8282 + 11], -128);
  assert.equal(dense[8282 + 12], 0);
  assert.equal(dense[9237 + 13], 0);
}
// b.d(int,int)(#367): argument >= 0 skips the second k() call.
{
  const cRows = Array.from({ length: 6 }, () => new Int8Array(10));
  const dense = new Int8Array(20000);
  dense[8282 + 6] = 4;
  cRows[4][1] = 3; cRows[0][1] = 11; cRows[1][1] = 12; cRows[5][1] = 13;
  const ks = [];
  releaseLegacySubsystemBEntitySlot(cRows, dense, 6, 0, { onK: (id) => ks.push(id) });
  assert.deepEqual(ks, [12]);
}

console.log("class b ten-slot table cluster (f:[[B]#168 / c:[[B]#143) OK");
