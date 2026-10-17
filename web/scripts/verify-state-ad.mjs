import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";
import { denseRequire } from "./dense-layout-require.mjs";

const path = `${new URL("../src/ui/LegacyStateMachine.ts", import.meta.url).pathname}`;
const output = ts.transpileModule(fs.readFileSync(path, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(output, { require: denseRequire, module, exports: module.exports, Int8Array, Int16Array, Math });
const { stepLegacyAd } = module.exports;

const events = [];
const state = {
  Q: 19, q: 0, s: 0, t: 0, T: 0, R: 0, vInt: 0, vByte: 0, H: false,
  b: 0, c: 0, A: 0, cFlag: true, y: 2, z: 9, B: 3, I: 4, J: 5,
  K: 6, L: 7, AFlag: false, selection: [true, false, true, false, true, false, true, false, true, false],
};
stepLegacyAd({ state, onY: () => events.push("Y"), onE: () => events.push("E") });
assert.deepEqual(events, ["Y", "E"]);
assert.equal(state.Q, 19);

state.Q = 29;
const aBeforeQ29 = state.A;
stepLegacyAd({ state, onFourFlags: (flags) => events.push(flags.join(",")) });
assert.equal(state.Q, 28); assert.equal(events.at(-1), "true,true,false,false");
// bytecode/f-javap.txt offsets 281..309: the Q==29 branch's only putfields are
// #36 (A:Z) and #90 (Q:B). This assertion used to read `state.A === true`,
// pinning an invented `A:B` write that was never in the bytecode -- the test
// encoded the bug as spec until 2026-09-09.
assert.equal(state.A, aBeforeQ29);
assert.equal(state.AFlag, true);

state.Q = 28; state.selection = [true, false, true, false, true, false, true, false, true, false];
state.A = 0; state.y = 2; state.I = 4; state.K = 6; state.AFlag = false; state.cFlag = true;
let selection;
stepLegacyAd({ state, onSelection: (values) => { selection = values; events.push(values.join(",")); }, onInputReset: () => events.push("reset") });
assert.equal(state.cFlag, false); assert.deepEqual(Array.from(selection), [true, false, true, true, false, true, false, true, false]);
assert.equal(events.at(-1), "reset");
// Offsets 189..228: the four saved-state restores plus the one-shot redraw
// trigger and the gameplay flip. `A:B = B:B` (offset 197..202) is a BYTE copy,
// not a boolean set; `A:Z` (#36) is the separate one-shot flag f.n() consumes.
assert.equal(state.y, state.z, "y:B = z:B");
assert.equal(state.A, state.B, "A:B = B:B");
assert.equal(state.I, state.J, "I:B = J:B");
assert.equal(state.K, state.L, "K:B = L:B");
assert.equal(state.AFlag, true, "A:Z = true");
assert.equal(state.vByte, 1, "v:B = 1");

console.log("f.aD() raw state transitions OK");
