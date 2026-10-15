import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import vm from "node:vm";

const file = new URL("../src/j2me/LegacySubsystemAl.ts", import.meta.url).pathname;
const output = ts.transpileModule(fs.readFileSync(file, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(output, { module, exports: module.exports, Int8Array, Int16Array });
const { stepLegacySubsystemAl } = module.exports;

function make() {
  return {
    pByte: 1, q: 0, bG: 0, bF: 0, fK: false, fF: false, fN: false,
    J: 0, cCounter: 1, aQ: 0,
    state: new Int8Array(10000),
    packedBytes: new Int8Array(400),
    packedOffsets: new Int16Array(400),
    shortRows: [new Int16Array(26), new Int16Array(26)],
  };
}

function table(state, index, value) {
  state.packedOffsets[index] = 100 + index;
  state.packedBytes[100 + index] = value;
}

const events = [];
const matched = make();
matched.onSubsystemAction = (x, y, mode) => events.push(["b", x, y, mode]);
matched.onStateCommand = (value) => events.push(["f.b", value]);
table(matched, 294, 10);
table(matched, 295, 5);
table(matched, 296, 1);
table(matched, 297, 7);
table(matched, 298, 5);
matched.state[8506] = 1;
matched.state[8750] = 7;
matched.J = 120;
stepLegacySubsystemAl(matched);
assert.deepEqual(events, [["b", 0, 0, 3], ["f.b", 5]]);

const scanned = make();
table(scanned, 294, 10);
table(scanned, 296, 1);
table(scanned, 297, 7);
table(scanned, 298, 5);
scanned.cByte = 0;
scanned.state[8506] = 1;
scanned.state[8750] = 7;
stepLegacySubsystemAl(scanned);
assert.equal(scanned.J, 116);

// Offset 154: the scan reads f.F:Z (#18), not f.K:Z -- while it is set no
// record counts and J falls back to 0 (then the c&7 tick makes it 1).
const focused = make();
table(focused, 294, 10);
table(focused, 296, 1);
table(focused, 297, 7);
table(focused, 298, 5);
focused.cByte = 0;
focused.fF = true;
focused.state[8506] = 1;
focused.state[8750] = 7;
stepLegacySubsystemAl(focused);
assert.equal(focused.J, 1);

const gated = make();
gated.pByte = 0;
gated.onSubsystemAction = () => events.push(["unexpected"]);
stepLegacySubsystemAl(gated);
assert.equal(events.some(([kind]) => kind === "unexpected"), false);

console.log("b.al() gate, type-1 scan, and action tail OK");
