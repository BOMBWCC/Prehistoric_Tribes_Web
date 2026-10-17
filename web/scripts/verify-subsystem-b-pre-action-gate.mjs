import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import vm from "node:vm";
import { denseRequire } from "./dense-layout-require.mjs";

function loadModule(file) {
  const module = { exports: {} };
  const output = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(output, { require: denseRequire, module, exports: module.exports, Int8Array, Int16Array });
  return module.exports;
}

const { stepLegacySubsystemBPreActionGate } = loadModule(
  new URL("../src/sim/tribe/LegacySubsystemBPreActionGate.ts", import.meta.url).pathname,
);
const make = () => ({
  state: new Int8Array(10000), packedBytes: new Int8Array(500), packedOffsets: new Int16Array(100), id: 4,
});

const an = make();
an.packedOffsets[31] = 10;
an.packedBytes[10 + 10] = 13;
an.state[2828 + 4] = 10;
an.state[4444 + 4] = -1;
an.state[3636 + 4] = 1;
let calls = [];
stepLegacySubsystemBPreActionGate({ ...an, onAn: () => calls.push("an"), onNeeds: () => calls.push("n") });
assert.deepEqual(calls, ["an"]);

const n = make();
n.packedOffsets[41] = 20;
n.packedBytes[20 + 10] = 13;
n.state[2828 + 4] = 10;
n.state[4444 + 4] = -1;
calls = [];
stepLegacySubsystemBPreActionGate({ ...n, onAn: () => calls.push("an"), onNeeds: () => calls.push("n") });
assert.deepEqual(calls, ["n"]);

const skipped = make();
skipped.packedOffsets[31] = 10;
skipped.packedBytes[10 + 10] = 13;
skipped.state[2828 + 4] = 10;
skipped.state[4444 + 4] = 2;
calls = [];
stepLegacySubsystemBPreActionGate({ ...skipped, onNeeds: () => calls.push("n") });
assert.deepEqual(calls, []);

const defaultTables = make();
defaultTables.state[2828 + 4] = 10;
defaultTables.state[4444 + 4] = -1;
calls = [];
stepLegacySubsystemBPreActionGate({ ...defaultTables, onNeeds: () => calls.push("n") });
assert.deepEqual(calls, ["n"]);

// Standing on its target (t41 13..15) with 4444 != -1 still reaches n(); a -109 mode does not.
const atTarget = make();
atTarget.packedOffsets[41] = 20;
atTarget.packedBytes[20 + 69] = 14;
atTarget.state[2828 + 4] = 69;
atTarget.state[4444 + 4] = 3;
atTarget.state[4] = 5; atTarget.state[3131 + 4] = 5;
calls = [];
stepLegacySubsystemBPreActionGate({ ...atTarget, onNeeds: () => calls.push("n") });
assert.deepEqual(calls, ["n"]);
atTarget.state[2929 + 4] = -109;
calls = [];
stepLegacySubsystemBPreActionGate({ ...atTarget, onNeeds: () => calls.push("n") });
assert.deepEqual(calls, []);

console.log("b() pre-action packed gate OK");
