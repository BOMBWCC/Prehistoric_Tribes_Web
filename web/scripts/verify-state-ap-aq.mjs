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
const { stepLegacyAp, stepLegacyAq } = module.exports;

const bytes = new Int8Array(17638);
const offsets = new Int16Array(312);
offsets[153] = 100; offsets[248] = 300;
bytes[100 + 145 + 20] = 0;
bytes[300 + 1] = 7;

const ap = {
  ap: 14, am: 6, an: 9, w: 0, KFlag: false, Q: 2, U: 5,
  z: 0, y: 3, B: 0, A: 4, J: 0, I: 5, L: 0, K: 6,
  P: true, o: 8, m: 0, e: 0, ac: false,
};
const events = [];
const dense = new Int8Array(10000);
stepLegacyAp({
  state: ap, dense, packedBytes: bytes, packedOffsets: offsets,
  onEntityPrepare: (id) => events.push(["prepare", id]),
  onEntityConfigure: (id) => events.push(["configure", id]),
  onSubsystemCheck: (value) => { events.push(["check", value]); return true; },
  onFinalize: () => events.push(["finalize"]),
  onSelection: (values) => events.push(["selection", values.map(Number).join("")]),
  snapshot: [true, false, true, true, false, false, false, false, true],
});
assert.deepEqual(events, [["prepare", 6], ["configure", 6], ["check", 4], ["finalize"], ["selection", "101100001"]]);
// Offsets 97..113: a successful b.a(int) sets the unit's order in the dense
// bank e[6161 + am], not in the resource table (corrected 2026-09-27).
assert.equal(dense[6161 + 6], 2);
assert.equal(bytes[6161 + 6] ?? 0, 0);

// Offset 20 -> 214: flag != 0 restores the snapshot even when w == 3.
bytes[100 + 145 + 20] = 2;
const restored = [];
stepLegacyAp({
  dense: new Int8Array(10000), state: { ...ap, w: 3 }, packedBytes: bytes, packedOffsets: offsets,
  onRelease: () => restored.push("release"),
  onSelection: (values) => restored.push(values.map(Number).join("")),
  snapshot: [false, true, false, false, false, false, false, false, false],
});
assert.deepEqual(restored, ["010000000"]);
bytes[100 + 145 + 20] = 0;
assert.equal(ap.Q, 28); assert.equal(ap.z, 3); assert.equal(ap.B, 4); assert.equal(ap.J, 5); assert.equal(ap.L, 6);

// K:Z (the chief-succession prompt): enter unit-pick mode, in bytecode order,
// without clearing K:Z.
{
  const order = [];
  const kState = { ...ap, KFlag: true, w: 0 };
  bytes[100 + 145 + 20] = 2;
  stepLegacyAp({
    state: kState, dense: new Int8Array(10000), packedBytes: bytes, packedOffsets: offsets, snapshot: new Array(9).fill(false),
    onOReset: () => order.push("o=0"),
    onFinalize: () => order.push("aJ"),
    onRelease: (v) => order.push(`l(${v})`),
    onPReset: () => order.push("P=0"),
    onSelection: (v) => order.push(v.map(Number).join("")),
    onFlag4: () => order.push(`b4 w=${kState.w}`),
    onZ: () => order.push("Z"),
    onAj: () => order.push("aj"),
  });
  bytes[100 + 145 + 20] = 0;
  assert.deepEqual(order, ["000000000", "o=0", "aJ", "l(-1)", "P=0", "100010000", "b4 w=2", "Z", "aj"]);
  assert.equal(kState.KFlag, true);
  assert.equal(kState.Q, 28);
}

const aq = {
  m: 1, Q: 15, U: 5, u: 0, q: 0, T: 0, R: 0, vInt: 0, r: 0, s: 0, V: 0,
};
const aqEvents = [];
stepLegacyAq({ state: aq, packedBytes: bytes, packedOffsets: offsets, onSound: (value) => aqEvents.push(value) });
assert.equal(aq.m, 2); assert.equal(aq.vInt, 71); assert.deepEqual(aqEvents, [71]);
assert.equal(bytes[100 + 116 + 15], 0);

console.log("f.ap()/f.aq() raw branches OK");
