import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";

const path = `${new URL("../src/j2me/LegacyEntityWUpdate.ts", import.meta.url).pathname}`;
const output = ts.transpileModule(fs.readFileSync(path, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(output, { module, exports: module.exports, Int8Array, Int16Array });
const { stepLegacyEntityWUpdate } = module.exports;

const make = () => ({
  state: new Int8Array(10000), packedBytes: new Int8Array(1000), packedOffsets: new Int16Array(200),
  jRows: Array.from({ length: 7 }, () => new Int8Array(120)),
  entityId: 3, team: 0, mainShort: [new Int16Array(26), new Int16Array(26)],
});

const regular = make();
regular.state[2929 + 3] = 35; regular.state[2828 + 3] = 6; regular.state[4444 + 3] = 1;
regular.state[3] = 10; regular.state[101 + 3] = 20; regular.state[606 + 3] = 2;
regular.packedOffsets[171] = 100; regular.packedBytes[100 + 35] = 0;
regular.packedOffsets[1] = 200; regular.packedBytes[200 + 2] = 4; regular.packedBytes[200 + 10] = 5;
regular.packedOffsets[123] = 300; regular.packedBytes[300 + 1] = 77;
regular.jRows[4][35] = 2; // offsets 297..338: fires at 3030 == j[4][mode] - 1 (oracle run 5, frame 12655)
const events = [];
stepLegacyEntityWUpdate({ ...regular, onAction: (...args) => events.push(args) });
assert.equal(regular.state[3030 + 3], 1);
assert.equal(regular.state[1111 + 3], 16);
assert.deepEqual(events, [[10, 20, 0, 77]]);

const queue = make();
queue.state[2929 + 3] = 22; queue.state[2828 + 3] = 10; queue.state[3636 + 3] = 4;
queue.state[3030 + 3] = 9; queue.mainShort[0][23] = 2; queue.jRows[4][22] = 10;
let jCalls = 0;
stepLegacyEntityWUpdate({ ...queue, onJ: () => { jCalls += 1; } });
assert.equal(queue.mainShort[0][23], 6); assert.equal(jCalls, 1);

const sentinel = make();
sentinel.state[2929 + 3] = -108; sentinel.state[3030 + 3] = 5;
stepLegacyEntityWUpdate(sentinel);
assert.equal(sentinel.state[6464 + 3], 69);

console.log("b.w() entity state update prefix OK");
