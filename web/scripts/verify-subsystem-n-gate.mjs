import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";
import { denseRequire } from "./dense-layout-require.mjs";

const path = `${new URL("../src/sim/tribe/LegacySubsystemNGate.ts", import.meta.url).pathname}`;
const output = ts.transpileModule(fs.readFileSync(path, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(output, { require: denseRequire, module, exports: module.exports });
const { legacySubsystemNGate } = module.exports;

const make = () => ({ q: 0, N: false, L: false, u: 0, v: 4, state: new Int8Array(10000) });

const blockedQ = make();
blockedQ.q = 3;
assert.equal(legacySubsystemNGate(blockedQ), false);

const blockedN = make();
blockedN.N = true;
assert.equal(legacySubsystemNGate(blockedN), false);

const requiresFlagOrU = make();
requiresFlagOrU.state[7979 + requiresFlagOrU.v] = 0;
requiresFlagOrU.state[1414 + requiresFlagOrU.v] = 12;
assert.equal(legacySubsystemNGate(requiresFlagOrU), true);

const flagPath = make();
flagPath.L = true;
flagPath.state[7979 + flagPath.v] = 64;
flagPath.state[1414 + flagPath.v] = 12;
assert.equal(legacySubsystemNGate(flagPath), false);

const flagClear = make();
flagClear.L = true;
flagClear.state[7979 + flagClear.v] = 0;
flagClear.state[1414 + flagClear.v] = 12;
assert.equal(legacySubsystemNGate(flagClear), true);

const ready = make();
ready.L = true;
ready.state[7979 + ready.v] = 0;
ready.state[1414 + ready.v] = 12;
assert.equal(legacySubsystemNGate(ready), true);

const uPath = make();
uPath.u = 1;
uPath.state[7979 + uPath.v] = 0;
uPath.state[1414 + uPath.v] = 11;
assert.equal(legacySubsystemNGate(uPath), false);

console.log("b.n() deterministic gate OK");
