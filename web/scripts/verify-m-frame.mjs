import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";

const path = new URL("../src/ui/LegacyMFrame.ts", import.meta.url).pathname;
const source = fs.readFileSync(path, "utf8");
const module = { exports: {} };
vm.runInNewContext(ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, { module, exports: module.exports });
const { stepLegacyMFrame } = module.exports;

const commands = [];
const state = { H: true, I: false, m: 3, flags: [], d: [], a: new Int16Array(196), bytes: new Int8Array(10) };
state.a[195] = 4;
state.bytes[6] = 9; // a:[B[a:[S[195] + 2]] picks the f.d:[I index
state.d[9] = 271;
let oCalls = 0;
stepLegacyMFrame({ state, emit: (command) => commands.push(command), onO: () => { oCalls += 1; } });
assert.equal(state.H, false);
assert.equal(state.I, true);
assert.equal(state.flags[2], true);
assert.equal(oCalls, 1);
assert.deepEqual(JSON.parse(JSON.stringify(commands)), [
  { kind: "drawImage", graphicsIndex: 1, imageIndex: 0, x: 0, y: 0, anchor: 0 },
  { kind: "drawRegion", graphicsIndex: 0, imageIndex: 1, sx: 0, sy: 0, width: 264, height: 301, transform: 0, x: 0, y: 0, anchor: 0 },
  { kind: "primitive", index: 21, x: 0, y: 0 },
  { kind: "primitive", index: 2, x: 0, y: 271 },
  { kind: "primitive", index: 17, x: 0, y: 320 },
]);

const second = { H: true, I: true, m: 0, flags: [], d: [], a: new Int16Array(196), bytes: new Int8Array(4) };
const secondCommands = [];
stepLegacyMFrame({ state: second, emit: (command) => secondCommands.push(command), onO: () => { throw new Error("O must be skipped when I is true"); } });
assert.equal(secondCommands[0].kind, "drawRegion");
assert.equal(secondCommands.length, 4);
console.log("M frame handler verified");
