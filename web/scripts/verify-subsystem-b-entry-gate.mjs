import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";
import { denseRequire } from "./dense-layout-require.mjs";

const path = `${new URL("../src/sim/tribe/LegacySubsystemBEntryGate.ts", import.meta.url).pathname}`;
const output = ts.transpileModule(fs.readFileSync(path, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(output, { require: denseRequire, module, exports: module.exports });
const { legacySubsystemBEntryGate } = module.exports;

const make = () => ({ frame: 0, id: 4, team: 0, state: new Int8Array(10000) });

// Offsets 17..52: the frame match only selects the path; team 0 and age >= 12 are checked on
// both (oracle run 5, frame 12203 -- the old case here expected true for a child).
const aligned = make();
aligned.frame = 36;
aligned.id = 4;
aligned.state[1414 + 4] = 0;
assert.equal(legacySubsystemBEntryGate(aligned), false, "child");
aligned.state[1414 + 4] = 12;
assert.equal(legacySubsystemBEntryGate(aligned), true, "adult, team 0");
assert.equal(legacySubsystemBEntryGate({ ...aligned, team: 1, id: 36 }), false, "raider");

const zeroFrame = make();
zeroFrame.frame = 0;
zeroFrame.id = 7;
zeroFrame.state[1414 + 7] = 12;
assert.equal(legacySubsystemBEntryGate(zeroFrame), true);

const zeroFrameLow = make();
zeroFrameLow.frame = 0;
zeroFrameLow.id = 7;
zeroFrameLow.state[1414 + 7] = 11;
assert.equal(legacySubsystemBEntryGate(zeroFrameLow), false);

const unaligned = make();
unaligned.frame = 1;
unaligned.id = 4;
unaligned.state[1414 + 4] = 12;
assert.equal(legacySubsystemBEntryGate(unaligned), false);

const otherTeam = make();
otherTeam.frame = 0;
otherTeam.id = 7;
otherTeam.team = 1;
otherTeam.state[1414 + 7] = 12;
assert.equal(legacySubsystemBEntryGate(otherTeam), false);

console.log("b() entry gate OK");
