import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function loadModule(file) {
  const module = { exports: {} };
  const output = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(output, { module, exports: module.exports, Int8Array, Int16Array });
  return module.exports;
}

const { stepLegacySubsystemAj } = loadModule(
  new URL("../src/j2me/LegacySubsystemAj.ts", import.meta.url).pathname,
);
const state = new Int8Array(10000);
const bBytes = new Int8Array(400);
const bShorts = new Int16Array(312);
bShorts[110] = 20;
bBytes[27] = 9;
state[9833] = 6;
state[9883] = 0;
state[9733] = 4;
state[9783] = 5;
const events = [];
stepLegacySubsystemAj({
  state, bBytes, bShorts, index: 0,
  onCellUpdate: (...args) => events.push(["cell", ...args]),
  onAm: () => events.push("am"),
});
assert.equal(state[9833], 7);
assert.equal(state[9883], 9);
assert.deepEqual(events, [["cell", 4, 5, 1, 1], "am"]);

state[9833] = 7;
state[9883] = 0;
events.length = 0;
stepLegacySubsystemAj({ state, bBytes, bShorts, index: 0, onAm: () => events.push("am") });
assert.equal(state[9833], 0);
assert.deepEqual(events, ["am"]);
console.log("b.aj() raw field-update prefix OK");
