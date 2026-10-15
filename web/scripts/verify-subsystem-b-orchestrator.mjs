import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";

const path = `${new URL("../src/j2me/LegacySubsystemBOrchestrator.ts", import.meta.url).pathname}`;
const cache = new Map();
function load(file) {
  if (cache.has(file)) return cache.get(file).exports;
  const module = { exports: {} };
  cache.set(file, module);
  const output = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const require = (specifier) => load(`${new URL(`${specifier}.ts`, `file://${file}`).pathname}`);
  vm.runInNewContext(output, { module, exports: module.exports, require });
  return module.exports;
}
const { stepLegacySubsystemB } = load(path);

const make = () => ({
  frame: 4, id: 4, team: 0, B: () => 1, fN: false, fL: false, fQ: 0, m: () => 5,
  state: new Int8Array(10000), packedBytes: new Int8Array(1000), packedOffsets: new Int16Array(100),
});

const chain = make();
chain.state[1414 + 4] = 12;
chain.state[5050 + 4] = 0;
chain.state[808 + 4] = 1;
chain.state[707 + 4] = 2;
chain.state[4] = 8;
chain.state[101 + 4] = 9;
chain.packedOffsets[31] = 100;
chain.packedBytes[100] = 13;
chain.state[3131 + 4] = 8;
chain.state[3232 + 4] = 9;
chain.state[4444 + 4] = -1;
const events = [];
stepLegacySubsystemB({
  ...chain,
  onA: () => events.push("A"),
  onNeeds: () => events.push("n"),
  onCellValue: () => 30,
  entityAt: () => 4,
  onP: () => events.push("p"),
});
assert.deepEqual(events, ["A", "n", "p"]);

const early = make();
early.state[202 + 4] = 1;
early.state[4] = 8;
early.state[101 + 4] = 9;
const earlyEvents = [];
stepLegacySubsystemB({
  ...early,
  onN: () => earlyEvents.push("n"),
  onCellValue: () => 30,
  entityAt: () => 4,
  onP: () => earlyEvents.push("p"),
});
// Offsets 72/88/105 `goto 1477`: a unit mid-step returns before anything
// else runs. CORRECTED 2026-09-14: this used to assert ["p"], i.e. the
// replan-while-stepping bug behind the arrival step-back.
assert.deepEqual(earlyEvents, []);

// Offsets 171/209 `goto 1185`: straight to the tail. With 4444 === -1,
// PreActionGate would call n(); the tail instead dispatches an() because
// (frame & 63) === (id & 63).
const toTail = make();
toTail.state[1010 + 4] = 3; // 5050 (0) < 1010 (3) - 7777 (0)
toTail.state[808 + 4] = 1;
toTail.state[707 + 4] = 2;
toTail.state[4] = 8;
toTail.state[101 + 4] = 9;
toTail.state[4444 + 4] = -1;
toTail.state[1414 + 4] = 12; // A() needs an adult of team 0 (entry gate, 2026-10-09)
const tailEvents = [];
const tailResult = stepLegacySubsystemB({
  ...toTail,
  onA: () => tailEvents.push("A"),
  onN: () => tailEvents.push("n"),
  onAn: () => tailEvents.push("an"),
  onQ: () => tailEvents.push("q"),
  onCellValue: () => 30,
  entityAt: () => 4,
  onP: () => tailEvents.push("p"),
});
assert.equal(tailResult, false);
assert.deepEqual(tailEvents, ["A", "an", "p"]);

console.log("b() orchestrator order OK");
