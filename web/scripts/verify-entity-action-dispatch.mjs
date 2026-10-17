import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { denseRequire } from "./dense-layout-require.mjs";

function loadModule(file) {
  const module = { exports: {} };
  const output = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(output, { require: denseRequire, module, exports: module.exports, Int8Array });
  return module.exports;
}

const { dispatchLegacyEntityAction } = loadModule(
  new URL("../src/sim/units/LegacyEntityActionDispatch.ts", import.meta.url).pathname,
);
const state = new Int8Array(10000);
const id = 12;
state[id] = 4;
state[101 + id] = 2;
const calls = [];
assert.equal(dispatchLegacyEntityAction({
  state,
  id,
  action: 87,
  targetSearch: () => ({ selected: true, found: true }),
  entityAt: (row, column) => {
    calls.push(["entityAt", row, column]);
    return 9;
  },
  onAction: (value, action) => calls.push(["action", value, action]),
  onMode: (mode) => calls.push(["mode", mode]),
}), true);
assert.deepEqual(calls, [["entityAt", 2, 4], ["action", 12, 87], ["mode", 1]]);
const moveCalls = [];
assert.equal(dispatchLegacyEntityAction({
  state,
  id,
  action: 79,
  targetSearch: () => ({ selected: false, found: false }),
  onMove: (action, value, other) => moveCalls.push([action, value, other]),
}), false);
assert.deepEqual(moveCalls, [[79, 12, 12]]);
const noMoveCalls = [];
assert.equal(dispatchLegacyEntityAction({
  state,
  id,
  action: 79,
  targetSearch: () => ({ selected: false, found: true }),
  onMove: (...values) => noMoveCalls.push(values),
}), false);
assert.deepEqual(noMoveCalls, []);
console.log("b.a(int,byte) action dispatch OK");
