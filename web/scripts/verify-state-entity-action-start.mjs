import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";

const path = `${new URL("../src/j2me/LegacyStateMachine.ts", import.meta.url).pathname}`;
const output = ts.transpileModule(fs.readFileSync(path, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(output, { module, exports: module.exports, Int8Array, Int16Array, Math });
const { beginLegacyEntityAction } = module.exports;

const bytes = new Int8Array(17638);
const offsets = new Int16Array(312);
offsets[153] = 100;
const state = {
  ap: 0, am: 0, an: 0, w: 3, KFlag: true, Q: 28, U: 5,
  z: 7, y: 8, B: 9, A: 10, J: 11, I: 12, L: 13, K: 14,
  P: true, o: 15, m: 16, e: 17, ac: true,
};
const events = [];
beginLegacyEntityAction({
  state, ap: 14, am: 6, an: 9, selection: [true, false, true, false, true],
  packedBytes: bytes, packedOffsets: offsets,
  onTransientReset: () => events.push("reset"),
  onSelectionCopy: (values) => events.push(["copy", values]),
  onSelectionApply: (...values) => events.push(["apply", ...values]),
  onAFlag: () => events.push("A"),
});
assert.equal(state.ap, 14); assert.equal(state.am, 6); assert.equal(state.an, 9); assert.equal(state.Q, 20);
assert.equal(bytes[100 + 145 + 20], 0);
assert.equal(JSON.stringify(events), JSON.stringify(["reset", ["copy", [true, false, true, true, false, false, false, false, false]], ["apply", true, true, false, true], "A"]));
assert.equal(state.w, 3); assert.equal(state.KFlag, true); assert.equal(state.z, 7);
console.log("f.a(byte,byte,byte) entity-action prefix OK");
