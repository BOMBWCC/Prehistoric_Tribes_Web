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
const { stepLegacyAQAudio } = module.exports;

const table = new Int8Array(20); table[4] = 7;
const state = { h: 2, e: 3, currentTrack: 1, currentPlayerReady: 0, currentPlayerTrack: 1 };
const events = [];
stepLegacyAQAudio({ state, audioTable: table, randomRemainder: () => 0, onSubsystemDecision: () => events.push("decision"), onStop: () => events.push("stop"), onCreate: (path, type) => events.push(["create", path, type]), onSetMode: (value) => events.push(["mode", value]) });
assert.deepEqual(events, ["decision", "stop", ["create", "/s7", "audio/midi"], ["mode", 3]]); assert.equal(state.currentTrack, 7);

const skip = { h: 2, e: 4, currentTrack: 7, currentPlayerReady: 101, currentPlayerTrack: 7 };
const skipped = [];
stepLegacyAQAudio({ state: skip, audioTable: table, randomRemainder: () => 0, onSubsystemDecision: () => skipped.push("decision"), onStop: () => skipped.push("stop"), onCreate: () => skipped.push("create"), onSetMode: () => skipped.push("mode") });
assert.deepEqual(skipped, ["decision"]); assert.equal(skip.currentTrack, 7);

console.log("f.aQ() raw audio selection OK");
