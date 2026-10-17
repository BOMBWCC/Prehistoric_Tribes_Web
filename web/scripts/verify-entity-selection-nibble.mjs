import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";
import { denseRequire } from "./dense-layout-require.mjs";

const path = new URL("../src/sim/units/LegacyEntitySelectionNibble.ts", import.meta.url).pathname;
const output = ts.transpileModule(fs.readFileSync(path, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(output, { require: denseRequire, module, exports: module.exports, Int8Array, Int16Array });
const { legacyEntitySelectionNibble } = module.exports;

function fresh() {
  return {
    dense: new Int8Array(20000),
    packedBytes: new Int8Array(4000),
    packedOffsets: new Int16Array(400),
  };
}

// Baseline: local2+=1 gate all false (tableVal<=-1 and dense[8627+id]===0)
// -> local2 stays as dense[8932+id]. dense[8627+id]===0 -> use the marker
// (dense[8749+id]===3 ? constant 1 : table lookup) branch for tableResult.
{
  const state = fresh();
  const id = 5;
  state.dense[8932 + id] = 10; // local2
  state.packedOffsets[138] = 1000;
  state.dense[8749 + id] = 0; // != 3, and used to index tableVal + tableResult
  state.packedBytes[1000 + 156 + 0] = -5; // tableVal <= -1
  state.dense[8627 + id] = 0; // gate stays false
  state.dense[9115 + id] = 3; // markerIndex
  // tableResult = packedBytes[1000 + (3-1)*26 + 0] = packedBytes[1052]
  state.packedBytes[1000 + 2 * 26 + 0] = 20;
  const result = legacyEntitySelectionNibble(id, state.dense, state.packedBytes, state.packedOffsets);
  // local2=10 (unchanged), tableResult=20, clamp(20-10,0,7)=clamp(10,0,7)=7
  // result = 10 + (7<<4) = 10+112=122
  assert.equal(result, 122);
}

// local2+=1 gate: tableVal>-1 alone is sufficient (OR condition), combined
// with a satisfied marker sub-gate.
{
  const state = fresh();
  const id = 5;
  state.dense[8932 + id] = 3; // local2
  state.packedOffsets[138] = 1000;
  state.dense[8749 + id] = 0;
  state.packedBytes[1000 + 156 + 0] = 0; // tableVal > -1 -> OR satisfied
  state.dense[8810 + id] = 7; // marker > 0
  state.dense[4646 + 7] = 0; // >= 0
  state.dense[4444 + 7] = id + 1; // !== id
  state.dense[9115 + id] = 1; // markerIndex
  state.packedBytes[1000 + 0 * 26 + 0] = 0; // tableResult (markerIndex-1=0)
  const result = legacyEntitySelectionNibble(id, state.dense, state.packedBytes, state.packedOffsets);
  // local2 = 3+1=4; tableResult=0; clamp(0-4,0,7)=clamp(-4,0,7)=0 (value<min)
  // result = 4 + (0<<4) = 4
  assert.equal(result, 4);
}

// Offset 88 `iflt 114`: a negative e[4646 + marker] counts even when e[4444 + marker] is this
// building (the unit inside it).
{
  const state = fresh();
  const id = 5;
  state.dense[8932 + id] = 3;
  state.packedOffsets[138] = 1000;
  state.dense[8749 + id] = 0;
  state.packedBytes[1000 + 156 + 0] = 0;
  state.dense[8810 + id] = 7;
  state.dense[4646 + 7] = -1; // < 0
  state.dense[4444 + 7] = id; // this building
  state.dense[9115 + id] = 1;
  state.packedBytes[1000 + 0 * 26 + 0] = 0;
  assert.equal(legacyEntitySelectionNibble(id, state.dense, state.packedBytes, state.packedOffsets), 4);
  state.dense[4646 + 7] = 0; // >= 0 and e[4444] === id: no count
  assert.equal(legacyEntitySelectionNibble(id, state.dense, state.packedBytes, state.packedOffsets), 3);
}

// local2+=1 gate satisfied via dense[8627+id]!=0 (the other OR branch),
// but the marker sub-gate fails (marker<=0) -> local2 stays unchanged.
{
  const state = fresh();
  const id = 5;
  state.dense[8932 + id] = 3;
  state.packedOffsets[138] = 1000;
  state.dense[8749 + id] = 0;
  state.packedBytes[1000 + 156 + 0] = -5; // tableVal<=-1
  state.dense[8627 + id] = 1; // != 0 -> OR satisfied
  state.dense[8810 + id] = 0; // marker<=0 -> inner gate fails
  // dense[8627+id]!==0 -> tableResult from the 494-offset table
  state.packedBytes[1000 + 494 + 0] = 9;
  const result = legacyEntitySelectionNibble(id, state.dense, state.packedBytes, state.packedOffsets);
  // local2=3 (unchanged); tableResult=9; clamp(9-3,0,7)=clamp(6,0,7)=6
  // result = 3 + (6<<4) = 3+96=99
  assert.equal(result, 99);
}

// dense[8749+id]===3 (and dense[8627+id]===0) -> tableResult is the
// constant 1, not a table lookup.
{
  const state = fresh();
  const id = 5;
  state.dense[8932 + id] = 20;
  state.dense[8749 + id] = 3;
  state.dense[8627 + id] = 0;
  const result = legacyEntitySelectionNibble(id, state.dense, state.packedBytes, state.packedOffsets);
  // local2=20; tableResult=1; clamp(1-20,0,7)=clamp(-19,0,7)=0
  // result = 20 + 0 = 20
  assert.equal(result, 20);
}

// Return value truncates like Java's i2b (byte overflow wraps to negative).
{
  const state = fresh();
  const id = 5;
  state.dense[8932 + id] = 100; // local2
  state.dense[8749 + id] = 3; // tableResult forced to constant 1
  state.dense[8627 + id] = 0;
  const result = legacyEntitySelectionNibble(id, state.dense, state.packedBytes, state.packedOffsets);
  // local2=100; tableResult=1; clamp(1-100,0,7)=0; raw = 100+0=100 (fits in byte, no wrap)
  assert.equal(result, 100);
}
{
  const state = fresh();
  const id = 5;
  state.dense[8932 + id] = 100;
  state.dense[8749 + id] = 0;
  state.dense[8627 + id] = 1; // OR satisfied via dense[8627+id]!=0, but inner gate needs marker>0
  state.dense[8810 + id] = 5;
  state.dense[4646 + 5] = 0;
  state.dense[4444 + 5] = id + 1; // !== id -> increments local2
  state.packedOffsets[138] = 1000;
  state.packedBytes[1000 + 156 + 0] = -5;
  state.packedBytes[1000 + 494 + 0] = 100; // tableResult
  const result = legacyEntitySelectionNibble(id, state.dense, state.packedBytes, state.packedOffsets);
  // local2 = 100+1 = 101 (toJavaByte: 101 fits, no wrap); tableResult=100
  // clamp(100-101,0,7)=clamp(-1,0,7)=0; raw = 101+0=101
  assert.equal(result, 101);
}
// Now a case that DOES overflow: local2 starts at 127.
{
  const state2 = fresh();
  const id = 5;
  state2.dense[8932 + id] = 127;
  state2.dense[8749 + id] = 0;
  state2.dense[8627 + id] = 1;
  state2.dense[8810 + id] = 5;
  state2.dense[4646 + 5] = 0;
  state2.dense[4444 + 5] = id + 1;
  state2.packedOffsets[138] = 1000;
  state2.packedBytes[1000 + 156 + 0] = -5;
  state2.packedBytes[1000 + 494 + 0] = 0;
  const result2 = legacyEntitySelectionNibble(id, state2.dense, state2.packedBytes, state2.packedOffsets);
  // local2 = toJavaByte(127+1) = toJavaByte(128) = -128 (i2b wrap)
  // tableResult=0; clamp(0-(-128),0,7)=clamp(128,0,7)=7 (value>=max)
  // raw = -128 + (7<<4) = -128+112 = -16
  assert.equal(result2, -16);
}

console.log("b.a(int):byte entity selection-indicator nibble source OK");
