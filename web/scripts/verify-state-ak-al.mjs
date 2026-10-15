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
const { stepLegacyAKViewport, stepLegacyAL } = module.exports;

const state = { C: 4, D: 5, y: 0, A: 0, I: -2, K: -3, sFlag: false, O: 2, c: 6, P: 1, d: 7 };
stepLegacyAKViewport(state);
assert.equal(state.y, 4); assert.equal(state.A, 5); assert.equal(state.I, 0); assert.equal(state.K, 0);

const held = { C: 1, D: 2, y: 0, A: 0, I: 0, K: -3, sFlag: true, O: 0, c: 10, P: 0, d: 10 };
stepLegacyAKViewport(held);
assert.equal(held.K, -3);

const scroll = { w: 1, I: 10 };
stepLegacyAL(scroll); assert.deepEqual(scroll, { w: 0, I: 0 });
const noScroll = { w: 0, I: 4 };
stepLegacyAL(noScroll); assert.deepEqual(noScroll, { w: 0, I: 4 });

console.log("f.aK()/f.aL() raw viewport transitions OK");
