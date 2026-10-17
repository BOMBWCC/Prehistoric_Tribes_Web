import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import vm from "node:vm";
import { denseRequire } from "./dense-layout-require.mjs";

const file = new URL("../src/sim/units/LegacyEntityModeValue.ts", import.meta.url).pathname;
const module = { exports: {} };
const output = ts.transpileModule(fs.readFileSync(file, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
vm.runInNewContext(output, { require: denseRequire, module, exports: module.exports, Int8Array });
const { readLegacyEntityModeValue } = module.exports;
const make = () => ({ state: new Int8Array(10000), id: 4 });

const low = make();
low.state[1414 + 4] = 11;
low.state[7777 + 4] = 3;
assert.equal(readLegacyEntityModeValue(low), 6);
assert.equal(low.state[7777 + 4], 0);

const flagged = make();
flagged.state[1414 + 4] = 12;
flagged.state[7979 + 4] = 2;
flagged.state[7777 + 4] = 1;
flagged.state[3535 + 4] = 0;
flagged.state[6565 + 4] = 0;
assert.equal(readLegacyEntityModeValue(flagged), 5);
assert.equal(flagged.state[7777 + 4], 0);

const queued = make();
queued.state[1414 + 4] = 12;
queued.state[7777 + 4] = 2;
assert.equal(readLegacyEntityModeValue(queued), 7);

const active = make();
active.state[1414 + 4] = 12;
active.state[3535 + 4] = 1;
active.state[7777 + 4] = 2;
assert.equal(readLegacyEntityModeValue(active), 1);
assert.equal(active.state[7777 + 4], 0);

console.log("b.b(int) entity mode value OK");
