import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";

const source = fs.readFileSync(new URL("../src/j2me/LegacySubsystemBVoidO.ts", import.meta.url), "utf8");
const transpiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
const module = { exports: {} };
vm.runInNewContext(transpiled, { module, exports: module.exports });
const { stepLegacySubsystemBVoidO } = module.exports;

// Counter above 1 gets reset to 0.
{
  const state = new Int8Array(20000);
  state[4848 + 5] = 3;
  const localFlags = [false, false, false];
  stepLegacySubsystemBVoidO({ state, id: 5, localFlags });
  if (state[4848 + 5] !== 0) throw new Error("expected 4848+id counter reset to 0");
  if (localFlags[2] !== true) throw new Error("expected localFlags[2] = true");
  if (state[808 + 5] !== 0) throw new Error("expected 808+id write to be constant 0");
}

// Counter at or below 1 is left untouched.
{
  const state = new Int8Array(20000);
  state[4848 + 5] = 1;
  const localFlags = [false, false, false];
  stepLegacySubsystemBVoidO({ state, id: 5, localFlags });
  if (state[4848 + 5] !== 1) throw new Error("expected 4848+id counter left at 1");
  if (localFlags[2] !== true) throw new Error("expected localFlags[2] = true");
  if (state[808 + 5] !== 0) throw new Error("expected 808+id write to be constant 0");
}

// Existing localFlags entries at other indices are untouched.
{
  const state = new Int8Array(20000);
  const localFlags = [true, false, false];
  stepLegacySubsystemBVoidO({ state, id: 9, localFlags });
  if (localFlags[0] !== true || localFlags[1] !== false) throw new Error("expected unrelated flags untouched");
}

// The offset-100 tail is `state[808+v] = b(dense[101+v], dense[v],
// dense[3232+v], dense[3131+v])` (#332). RETRACTED 2026-09-07: it used to be
// inlined as a literal 0 on a premise rooted in "d:[[B](#154) is permanently
// null"; f.g() allocates it. It is now the onScore callback.
{
  const state = new Int8Array(10000);
  const id = 4;
  state[101 + id] = 11; state[id] = 12; state[3232 + id] = 13; state[3131 + id] = 14;
  const seen = [];
  stepLegacySubsystemBVoidO({
    state, id, localFlags: [false, false, false],
    onScore: (...a) => { seen.push(a); return 7; },
  });
  assert.deepEqual(seen, [[11, 12, 13, 14]], "args are dense[101+v], dense[v], dense[3232+v], dense[3131+v]");
  assert.equal(state[808 + id], 7, "the result lands in dense[808+v]");
}

// With onScore unwired the write is 0 -- an unported-callee boundary, not a
// claim that the original computes 0.
{
  const state = new Int8Array(10000);
  state[808 + 4] = 99;
  stepLegacySubsystemBVoidO({ state, id: 4, localFlags: [false, false, false] });
  assert.equal(state[808 + 4], 0);
}

console.log("verify-subsystem-b-void-o: ok");
