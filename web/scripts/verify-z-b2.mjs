// Regression test for stepLegacyZB2 (final void b(int,boolean)),
// CORRECTED (2026-08-22): the method's own very first instruction --
// this.a.b((byte)arg1), class b's own boolean b(byte) (#546) -- is a
// confirmed guaranteed-throw (class b's own g:[[B] (#176) is always
// null). Everything previously modeled here (the dense[8993+arg1]
// linked-list cancel walk, dense[8627+arg1]/dense[8566+arg1] writes) is
// confirmed unreachable dead code, so stepLegacyZB2 now only reproduces
// the one real, observable effect: the uncaught throw.
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

const { stepLegacyZB2 } = loadModule("./ui/LegacyZB2", srcDir);

// RETRACTED 2026-09-07: this used to assert a guaranteed throw, on the premise
// that class b's g:[[B] (#176) is permanently null. f.g() allocates it as
// byte[3][20], so the whole method body is real. See LegacyZB2.ts's docblock.

const makeState = () => ({
  dense: new Int8Array(20000),
  gRows: [new Int8Array(20), new Int8Array(20), new Int8Array(20)],
  packedBytes: new Int8Array(20000),
  packedOffsets: new Int16Array(312),
});

// b.b(byte) fills the first free g slot; the dense[8993+arg1] chain is walked
// and cancelled; dense[8627+arg1] = arg2 ? 1 : 2; arg2 also writes 8566.
{
  const state = makeState();
  const { dense } = state;
  const arg1 = 5;
  dense[8993 + arg1] = 7;     // chain head
  dense[4545 + 7] = 9;        // -> 9
  dense[4545 + 9] = 0;        // -> end
  dense[8810 + arg1] = 3;     // b.b(byte) moves this into 9237
  dense[9115 + arg1] = 1;
  dense[8749 + arg1] = 4;
  state.packedOffsets[138] = 100;
  state.packedBytes[100 + (7 + 1) * 26 + 4] = 42;
  const cancels = [];
  stepLegacyZB2(state, arg1, true, { onRecordCancel: (node, owner) => cancels.push([node, owner]) });
  assert.equal(state.gRows[0][0], arg1, "b.b(byte) took the first free slot");
  assert.equal(dense[9237 + arg1], 3);
  assert.equal(dense[8810 + arg1], 0);
  assert.deepEqual(cancels, [[7, arg1], [9, arg1]], "walks the 4545 chain in order");
  assert.equal(dense[8627 + arg1], 1);
  assert.equal(dense[8566 + arg1], 42);
}

// arg2 === false: 8627 gets 2 and the 8566 write is skipped entirely.
{
  const state = makeState();
  state.dense[8566 + 5] = 77;
  stepLegacyZB2(state, 5, false);
  assert.equal(state.dense[8627 + 5], 2);
  assert.equal(state.dense[8566 + 5], 77);
}

// dense[8749+id] === 2 forwards into b's final void a(int) (#476).
{
  const state = makeState();
  state.dense[8749 + 5] = 2;
  const released = [];
  stepLegacyZB2(state, 5, false, { onReleaseTenEntity: (id) => released.push(id) });
  assert.deepEqual(released, [5]);
}

console.log("stepLegacyZB2 (final void b(int,boolean)) OK");
