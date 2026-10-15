import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";

const path = new URL("../src/j2me/LegacySecondaryCellChain.ts", import.meta.url).pathname;
const output = ts.transpileModule(fs.readFileSync(path, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(output, { module, exports: module.exports, Int8Array, Int16Array });
const { stepLegacySecondaryCellChain } = module.exports;

function grid(rows, cols) {
  return Array.from({ length: rows }, () => new Int8Array(cols));
}

function freshState(overrides = {}) {
  return {
    dense: new Int8Array(20000),
    originColumn: 0,
    originRow: 0,
    hTable: grid(8, 20000),
    iTable: grid(8, 20000),
    packedBytes: new Int8Array(4000),
    packedOffsets: new Int16Array(400),
    ...overrides,
  };
}

// Single-element chain (e[6060+id]===0 -> loop runs exactly once), kind
// outside {1,2,5} -> no draw call, but the loop still terminates cleanly.
{
  const state = freshState();
  const id = 5;
  state.dense[6565 + id] = 3; // kind not in {1,2,5}
  const calls = [];
  stepLegacySecondaryCellChain(id, state, { onPackedPrimitive: (...a) => calls.push(a) });
  assert.deepEqual(calls, []);
}

// Single-element chain, kind===1 -> fires with the exact computed formula.
{
  const state = freshState({ originColumn: 2, originRow: 1 });
  const id = 5;
  state.dense[6565 + id] = 1; // kind
  state.dense[7676 + id] = 3; // local4
  state.dense[5252 + id] = 10; // column source
  state.dense[5454 + id] = 4; // X addend
  state.dense[5353 + id] = 20; // row source
  state.dense[5555 + id] = 6; // Y addend
  state.dense[5858 + id] = 2; // hIndex
  state.hTable[2][id] = 7; // height-table lookup
  state.packedOffsets[77] = 1000;
  state.packedBytes[1000 + 1] = 9; // packedBytes[packedOffsets[77]+kind]
  state.packedOffsets[190 + 9] = 500; // a2
  state.packedOffsets[193] = 2000;
  state.packedBytes[2000 + 6 + 1] = 5; // a4
  state.iTable[2][id] = 11; // v5
  const a6 = 500 + 3 * 5 + 11; // a2 + local4*a4 + v5 = 526
  state.packedBytes[a6] = 40; // record contribution 1
  state.packedBytes[2000 + 1] = 8; // record contribution 2 (packedOffsets[193]+kind)
  const calls = [];
  stepLegacySecondaryCellChain(id, state, { onPackedPrimitive: (...a) => calls.push(a) });
  const expectedX = (10 - 2) * 22 + 11 + 4; // 176+11+4=191
  const expectedY = (20 - 1) * 16 + 8 + 6 - 7 - 10; // 304+8+6-7-10=301
  const expectedRecord = 292 + 40 + 8; // 340
  assert.deepEqual(calls, [[expectedRecord, expectedX, expectedY]]);
}

// kind===2 and kind===5 also fire (not just kind===1).
{
  for (const kind of [2, 5]) {
    const state = freshState();
    const id = 5;
    state.dense[6565 + id] = kind;
    const calls = [];
    stepLegacySecondaryCellChain(id, state, { onPackedPrimitive: () => calls.push("draw") });
    assert.deepEqual(calls, ["draw"], `kind=${kind} should draw`);
  }
}

// Multi-element chain: e[6060+id] acts as a "next" pointer, walked until 0;
// the FIRST iteration uses the caller's id as-is, later iterations reassign
// id = e[6060+id] BEFORE processing that entry.
{
  const state = freshState();
  const headId = 10;
  const midId = 20;
  const tailId = 30;
  state.dense[6060 + headId] = midId; // head -> mid
  state.dense[6060 + midId] = tailId; // mid -> tail
  state.dense[6060 + tailId] = 0; // tail -> end (loop stops)
  state.dense[6565 + headId] = 1;
  state.dense[6565 + midId] = 1;
  state.dense[6565 + tailId] = 1;
  const calls = [];
  stepLegacySecondaryCellChain(headId, state, { onPackedPrimitive: (record) => calls.push(record) });
  assert.equal(calls.length, 3); // visited head, mid, tail exactly once each
}

// Two-element chain: confirms the loop runs exactly twice (head, then
// next) and terminates based on the CURRENT id's own pointer (re-read
// after reassignment on the second iteration), not the head's original
// value -- if it incorrectly kept checking the head's pointer, or looped
// forever, this count would be wrong.
{
  const state = freshState();
  const headId = 1;
  const nextId = 2;
  state.dense[6060 + headId] = nextId;
  state.dense[6060 + nextId] = 0; // chain ends here
  state.dense[6565 + headId] = 1;
  state.dense[6565 + nextId] = 1;
  const calls = [];
  stepLegacySecondaryCellChain(headId, state, { onPackedPrimitive: () => calls.push("x") });
  assert.equal(calls.length, 2);
}

console.log("f.i(int) secondary-cell chain scan OK");
