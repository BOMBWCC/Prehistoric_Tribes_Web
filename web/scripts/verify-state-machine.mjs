import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";

const path = `${new URL("../src/j2me/LegacyStateMachine.ts", import.meta.url).pathname}`;
const output = ts.transpileModule(fs.readFileSync(path, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(output, { module, exports: module.exports });
const { stepLegacyAk, stepLegacyAl } = module.exports;

const events = [];
const state = { Q: 14, iFlag: false, staticL: false, jFlag: true, aR: 0, aP: 0, inputV: true, E: 1, inputUp: false, inputDown: false, staticM: false };
stepLegacyAk(state, { onAl: () => events.push("al"), onAo: () => events.push("ao"), onAd: () => events.push("ad") });
assert.deepEqual(events, ["al", "ao", "ad"]);
assert.equal(state.iFlag, false);
assert.equal(state.jFlag, false);
assert.equal(state.E, 4);
assert.equal(state.inputV, false);

const alState = { Q: 27, iFlag: false, staticL: true, inputV: true, E: 1, R: 22, S: 23, H: false, x: 69, vInt: 0, eByte: 1 };
const alEvents = [];
stepLegacyAl(alState, { onResetInput: () => alEvents.push("reset"), onAQ: () => alEvents.push("aq") });
assert.deepEqual(alEvents, ["reset", "aq"]);
assert.equal(alState.Q, 22);
assert.equal(alState.R, 23);
assert.equal(alState.H, true);
assert.equal(alState.vInt, 69);

const staticState = { ...state, Q: 14, staticM: true };
const staticEvents = [];
stepLegacyAk(staticState, { onAn: () => staticEvents.push("an"), onAd: () => staticEvents.push("ad") });
assert.deepEqual(staticEvents, ["an", "ad"]);
assert.equal(staticState.staticM, false);

const pendingState = { ...state, Q: 14, iFlag: false, staticL: false, jFlag: false, inputUp: true };
const pendingEvents = [];
stepLegacyAk(pendingState, { onAb: () => pendingEvents.push("ab"), onAd: () => pendingEvents.push("ad") });
assert.deepEqual(pendingEvents, ["ab", "ad"]);

const q32 = { ...state, Q: 32, iFlag: false, jFlag: true };
const q32Events = [];
stepLegacyAk(q32, { onAo: () => q32Events.push("ao"), onAd: () => q32Events.push("ad") });
assert.deepEqual(q32Events, []);

const q28 = { ...state, Q: 28, iFlag: true, jFlag: false };
const q28Events = [];
stepLegacyAk(q28, { onAo: () => q28Events.push("ao"), onAd: () => q28Events.push("ad") });
assert.deepEqual(q28Events, ["ad"]);
console.log("f.ak() raw state-machine orchestration OK");
