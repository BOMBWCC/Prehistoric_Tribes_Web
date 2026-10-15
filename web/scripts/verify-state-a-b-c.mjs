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
const { stepLegacyAB, stepLegacyAC } = module.exports;

const bytes = new Int8Array(17638);
const offsets = new Int16Array(312);
offsets[153] = 100;
const down = { Q: 12, Z: 3, y: 10, ab: 5, QFlag: false };
stepLegacyAB({ state: down, packedBytes: bytes, packedOffsets: offsets });
assert.equal(down.Z, 1); // Q=12 performs the special decrement, then the common decrement.

const wrap = { Q: 4, Z: 0, y: 10, ab: 5, QFlag: false };
stepLegacyAB({ state: wrap, packedBytes: bytes, packedOffsets: offsets });
assert.equal(wrap.Z, 4);

const up = { Q: 12, Z: 1, y: 10, ab: 5, RFlag: false };
stepLegacyAC({ state: up, packedBytes: bytes, packedOffsets: offsets });
assert.equal(up.Z, 3);

const held = { Q: 4, Z: 2, y: 10, ab: 5, RFlag: true };
stepLegacyAC({ state: held, packedBytes: bytes, packedOffsets: offsets });
assert.equal(held.Z, 3); assert.equal(held.y, 10);

console.log("f.aB()/f.aC() raw selector movement OK");
