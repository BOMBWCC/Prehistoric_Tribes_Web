import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";

function loadModule(file) {
  const module = { exports: {} };
  const output = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(output, { module, exports: module.exports, Int8Array, Int16Array });
  return module.exports;
}

const { stepLegacySubsystemAm } = loadModule(
  new URL("../src/j2me/LegacySubsystemAm.ts", import.meta.url).pathname,
);
const state = new Int8Array(10000);
const bBytes = new Int8Array(400);
const bShorts = new Int16Array(312);
bShorts[160] = 20;
bBytes[20 + 16] = 7;
const id = 1;
state[3232 + id] = 3;
state[9783] = 3;
state[3131 + id] = 4;
state[9733] = 4;
state[2828 + id] = 16;
state[4444 + id] = 2;
state[808 + id] = 9;
state[3636 + id] = 1;
const events = [];
const fields = { u: 9, v: 9 };
stepLegacySubsystemAm({
  state, bBytes, bShorts, aM: 0, fields,
  onEntityAction: (...args) => events.push(["action", ...args, fields.v]),
  onN: (value) => events.push(["n", value]),
});
assert.equal(state[4444 + id], -1);
assert.equal(state[808 + id], 0);
// a(IB)'s C() reads the ambient v:I, so the field must hold the unit at the call.
assert.deepEqual(events, [["action", id, 7, id], ["n", id]]);
assert.deepEqual(fields, { u: 2, v: 101 });

// Offsets 56..92 (oracle run 4, frame 8936): the target is compared with node aM's position
// (9733/9783 + aM), not with slot `team`. A berry gatherer at node 2 is released when it empties.
{
  const s2 = new Int8Array(10000);
  const v = 5;
  s2[2828 + v] = 10; s2[3131 + v] = 15; s2[3232 + v] = 12; s2[4444 + v] = 2; s2[808 + v] = 4;
  s2[9733 + 2] = 15; s2[9783 + 2] = 12;
  stepLegacySubsystemAm({ state: s2, bBytes, bShorts, aM: 2, fields: { u: 0, v: 0 } });
  assert.deepEqual([s2[4444 + v], s2[808 + v]], [-1, 0]);
  const s3 = Int8Array.from(s2); s3[4444 + v] = 2;
  stepLegacySubsystemAm({ state: s3, bBytes, bShorts, aM: 0, fields: { u: 0, v: 0 } });
  assert.equal(s3[4444 + v], 2, "a different node leaves the gatherer alone");
}
console.log("b.am() raw queue scan OK");
