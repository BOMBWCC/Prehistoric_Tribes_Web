import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";

const path = `${new URL("../src/sim/tribe/LegacySubsystemPrepass.ts", import.meta.url).pathname}`;
const output = ts.transpileModule(fs.readFileSync(path, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(output, { module, exports: module.exports, Int8Array, Int16Array, Math });
const { runLegacySubsystemPrepass } = module.exports;

const packedBytes = new Int8Array(17638);
const packedOffsets = new Int16Array(312);
const mainShort = [new Int16Array(26), new Int16Array(26)];
// b.s() offsets 55..157 read tables 277/278 at index q (oracle 2026-10-08), not table 138.
packedOffsets[277] = 100;
packedOffsets[278] = 200;
packedBytes[100 + 1] = 2;
packedBytes[200 + 1] = 3;
const events = [];
runLegacySubsystemPrepass({
  frame: 500, q: 1, bByte: 1, fByte: 0, lFlag: true,
  packedBytes, packedOffsets, mainShort,
  onResourceTick: () => events.push("resource"),
  onSpatialPass: () => events.push("spatial"),
  onEntityGuardPass: () => events.push("guard"),
  onFReset: () => events.push("reset"),
});
assert.deepEqual(events, ["resource", "spatial"]);
assert.equal(mainShort[1][8], 5000);

runLegacySubsystemPrepass({
  frame: 426, q: 1, bByte: 2, fByte: 2, lFlag: true,
  packedBytes, packedOffsets, mainShort,
  onResourceTick: () => events.push("resource2"),
  onSpatialPass: () => events.push("spatial2"),
  onEntityGuardPass: () => events.push("guard2"),
  onFReset: () => events.push("reset2"),
});
assert.deepEqual(events.slice(-2), ["resource2", "reset2"]);
assert.equal(mainShort[1][9], 5000);
assert.equal(mainShort[1][10], 5000);
// f.b:B == 2 alone must not reset F:I (it is b.f:B that is tested).
const reset3 = [];
runLegacySubsystemPrepass({
  frame: 1, q: 1, bByte: 2, fByte: 0, lFlag: false,
  packedBytes, packedOffsets, mainShort,
  onFReset: () => reset3.push("reset3"),
});
assert.deepEqual(reset3, []);
console.log("b.s() raw subsystem prepass OK");
