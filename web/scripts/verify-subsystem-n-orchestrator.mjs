import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import vm from "node:vm";

const cache = new Map();
function load(file) {
  if (cache.has(file)) return cache.get(file).exports;
  const module = { exports: {} };
  cache.set(file, module);
  const output = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const require = (specifier) => load(`${new URL(`${specifier}.ts`, `file://${file}`).pathname}`);
  vm.runInNewContext(output, { module, exports: module.exports, require, Int8Array, Int16Array });
  return module.exports;
}

const { stepLegacySubsystemNOrchestrator } = load(
  new URL("../src/sim/tribe/LegacySubsystemNOrchestrator.ts", import.meta.url).pathname,
);
const make = () => ({
  state: new Int8Array(10000), packedBytes: new Int8Array(1000), packedOffsets: new Int16Array(100),
  q: 0, N: false, L: false, u: 0, v: 4,
  onEntityActionSearch: () => false,
});

const early = make();
early.q = 3;
assert.equal(stepLegacySubsystemNOrchestrator(early), false);

const callbacks = make();
callbacks.state[1414 + 4] = 12;
const events = [];
assert.equal(stepLegacySubsystemNOrchestrator({
  ...callbacks,
  onO: () => { events.push("O"); return false; },
  onAFalse: () => { events.push("A0"); return true; },
}), true);
assert.deepEqual(events, ["O", "A0"]);

const decision = make();
decision.state[1414 + 4] = 12;
decision.state[2828 + 4] = 10;
decision.state[2121 + 4] = 80;
decision.state[2020 + 4] = 10;
decision.state[505 + 4] = 80;
decision.state[1919 + 4] = 1; decision.state[6767 + 4] = 1;
const searched = [];
assert.equal(stepLegacySubsystemNOrchestrator({
  ...decision,
  onO: () => false,
  onAFalse: () => false,
  onEntityActionSearch: (action, parameter) => { searched.push([action, parameter]); return action === 4; },
}), true);
assert.deepEqual(searched, [[4, 0]]);

console.log("b.n() orchestrator order OK");
