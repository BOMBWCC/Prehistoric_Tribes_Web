import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";

const path = `${new URL("../src/j2me/LegacySubsystemBActionSelector.ts", import.meta.url).pathname}`;
const output = ts.transpileModule(fs.readFileSync(path, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(output, { module, exports: module.exports });
const { selectLegacySubsystemBAction } = module.exports;

const make = () => ({ state: new Int8Array(10000), id: 4 });

const linked = make();
linked.state[4444 + 4] = 9;
let calls = [];
selectLegacySubsystemBAction({ ...linked, onN: () => calls.push("n"), onAn: () => calls.push("an") });
assert.deepEqual(calls, ["n"]);

const autonomous = make();
autonomous.state[4444 + 4] = -1;
autonomous.state[2828 + 4] = 12;
autonomous.state[3636 + 4] = 1;
calls = [];
selectLegacySubsystemBAction({ ...autonomous, onN: () => calls.push("n"), onAn: () => calls.push("an") });
assert.deepEqual(calls, ["an"]);

const fallback = make();
fallback.state[4444 + 4] = -1;
fallback.state[2828 + 4] = 17;
fallback.state[3636 + 4] = 1;
calls = [];
selectLegacySubsystemBAction({ ...fallback, onN: () => calls.push("n"), onAn: () => calls.push("an") });
assert.deepEqual(calls, ["n"]);

console.log("b() action selector OK");
