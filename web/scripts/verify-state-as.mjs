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
const { stepLegacyASAudioWait } = module.exports;

const state = { ZFlag: true, Q: 16, R: 8, ac: true, ab: false, v: 4, S: 0, z: 0, B: 0, J: 0, I: 1, L: 0, K: 2, y: 3, A: 4, YFlag: false, n: true, ad: true, e: 2, playerExists: true, playerDuration: 300 };
const events = [];
stepLegacyASAudioWait({ state, onStopWait: () => events.push("wait-stop"), onAQ: () => events.push("aq"), onSleep: (ms) => events.push(ms) });
assert.equal(state.Q, 27); assert.equal(state.R, 16); assert.equal(state.S, 8); assert.equal(state.z, 3); assert.equal(state.B, 4); assert.equal(state.ZFlag, false); assert.equal(state.ad, false); assert.deepEqual(events, [10]);

const waiting = { ...state, ZFlag: true, YFlag: true, n: true };
const waitingEvents = [];
stepLegacyASAudioWait({ state: waiting, onStopWait: () => waitingEvents.push("wait") });
assert.equal(waiting.n, false); assert.equal(waiting.ZFlag, true); assert.deepEqual(waitingEvents, ["wait"]);

console.log("f.aS() raw audio/state wait OK");
