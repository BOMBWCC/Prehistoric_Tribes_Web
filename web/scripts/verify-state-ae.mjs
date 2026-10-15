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
const { stepLegacyAe } = module.exports;

const state = { F: 4, byteF: -1, uFlag: false, tFlag: true, k: 9, q: 7, y: 10, I: 2, A: 20, K: 3, G: 0, HCoord: 0 };
const events = [];
stepLegacyAe({ state, onFourFlags: (v) => events.push(v.join(",")), onAI: () => events.push("AI") });
// f.F:I (#52) and f.F:B (#50) are two DIFFERENT bytecode fields that just
// happen to share the source name "F" -- confirmed distinct constant-pool
// indices (2026-08-14). aE() writes both: F:I resets to 0 (the cooldown
// counter this same function reads/increments), F:B is set to 4 (an
// unrelated, widely-shared byte field). An earlier revision collapsed both
// into one `state.F` property and silently lost the F:I=0 write.
assert.equal(state.F, 0); assert.equal(state.byteF, 4);
assert.equal(state.uFlag, true); assert.equal(state.tFlag, false); assert.equal(state.k, 0); assert.equal(state.q, 0);
assert.equal(state.G, 12); assert.equal(state.HCoord, 23); assert.deepEqual(Array.from(events), ["true,true,false,false", "AI"]);

const noTick = { F: 3, byteF: -1, uFlag: false, tFlag: false, k: 1, q: 2, y: 0, I: 0, A: 0, K: 0, G: 0, HCoord: 0 };
stepLegacyAe({ state: noTick });
assert.equal(noTick.F, 4); assert.equal(noTick.byteF, -1); assert.equal(noTick.uFlag, false);

console.log("f.aE() raw transition step OK");
