import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import vm from "node:vm";
import { denseRequire } from "./dense-layout-require.mjs";

const file = new URL("../src/ui/LegacyStateT.ts", import.meta.url).pathname;
const module = { exports: {} };
const output = ts.transpileModule(fs.readFileSync(file, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
vm.runInNewContext(output, { require: denseRequire, module, exports: module.exports, Int8Array, Int16Array });
const { stepLegacyStateT } = module.exports;

const dense = new Int8Array(10000);
const shortRows = [new Int16Array(26), new Int16Array(26)];
const state = { ai: 3, aw: 0, q: 0, bF: 0, p: Int8Array.from([0, 0, 7]) };
const commands = [];
stepLegacyStateT({ state, dense, shortRows, onRecordCommand: (...args) => commands.push(args) });
assert.deepEqual(commands, [[5, 20, 2]]);
assert.equal(dense[6161 + 7], 3); assert.equal(dense[2828 + 7], 105);
assert.equal(dense[6262 + 7], 5); assert.equal(dense[6363 + 7], 10);

const state48 = { ai: 48, aw: 0, q: 0, bF: 0, p: new Int8Array(10) };
const events = [];
stepLegacyStateT({ state: state48, dense, shortRows,
  onMapReset: (q) => events.push(["reset", q]), onMapLoad: (q) => events.push(["load", q]),
  onPlace: (...args) => events.push(["place", ...args]), onRecordAction: (...args) => events.push(["action", ...args]),
});
assert.deepEqual(events.slice(0, 2), [["reset", 2], ["load", 2]]);
assert.equal(state48.q, 3); assert.equal(state48.bF, 6); assert.equal(dense[2982], 42);
assert.deepEqual(events.at(-1), ["action", 53, -2]);

const pairs = [];
for (const ai of [43, 45]) {
  stepLegacyStateT({ state: { ai, aw: 0, q: 0, bF: 0, p: new Int8Array(10) }, dense, shortRows,
    onFPairCommand: (...args) => pairs.push(args),
  });
}
assert.deepEqual(pairs.slice(0, 2), [[52, 7], [57, 30]]);
console.log("f.T() selector branches OK");
