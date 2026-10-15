import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import vm from "node:vm";

const file = new URL("../src/j2me/LegacySpriteLayerLoop.ts", import.meta.url).pathname;
const module = { exports: {} };
const output = ts.transpileModule(fs.readFileSync(file, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
vm.runInNewContext(output, { module, exports: module.exports, Int8Array, Int16Array, Int32Array });
const { stepLegacySpriteLayerLoop } = module.exports;

function makeTables() {
  return {
    dense: new Int8Array(6000),
    byteTables: Array.from({ length: 16 }, () => new Int8Array(200)),
    shortTables: Array.from({ length: 9 }, () => new Int16Array(200)),
  };
}

function makeState(overrides) {
  const { dense, byteTables, shortTables } = makeTables();
  return {
    aA: 0, aB: 0, ao: -1, ap: -1, ax: 0, ay: 0, az: 0, an: -1,
    aq: 0, ar: 0, as: 0, au: 0, Y: 0,
    dense, byteTables, shortTables,
    ...overrides,
  };
}

function makeCallbacks(overrides) {
  const draws = [];
  const calls = { onA: 0, onB: 0 };
  const callbacks = {
    onA: () => { calls.onA += 1; return overrides.onA ?? false; },
    onB: () => { calls.onB += 1; return overrides.onB ?? false; },
    onDrawSprite: (index, x, y) => draws.push({ target: "sprite", index, x, y }),
    onDrawComposite: (index, x, y) => draws.push({ target: "composite", index, x, y }),
  };
  return { draws, calls, callbacks };
}

// --- offset 75: b[7][az] === 0 skips the layer before Y/onA is even read.
{
  const state = makeState({ byteTables: makeTables().byteTables, shortTables: makeTables().shortTables });
  state.byteTables[15][0] = 1;
  state.shortTables[7][0] = 0;
  const { draws, calls, callbacks } = makeCallbacks({ onA: true, onB: true });
  stepLegacySpriteLayerLoop(state, callbacks);
  assert.equal(draws.length, 0, "record===0 must skip the layer");
  assert.equal(calls.onA, 0, "onA must not run once the layer itself is skipped");
}

// --- Y === 29, dense[1414+aq] >= 12 branch: aq<51 leaves `an` alone, both
// draw targets fire (bit7 clear -> sprite, set -> composite), and
// b[7][az]===1 skips (offset 281) even though onB returned true.
{
  const state = makeState({ Y: 29, aq: 0 });
  state.byteTables[15][0] = 3;
  state.dense[1414 + state.aq] = 12; // exactly the >=12 boundary
  state.ar = 10; state.as = 20;
  // az=0: ordinary draw via sprite (bit7 clear).
  state.shortTables[7][0] = 100;
  state.byteTables[14][0] = 5; // bit7 = 0
  state.byteTables[12][0] = 3; state.byteTables[13][0] = 4;
  // az=1: record===1 -> must be skipped despite onB===true.
  state.shortTables[7][1] = 1;
  // az=2: draw via composite (bit7 set).
  state.shortTables[7][2] = 50;
  state.byteTables[14][2] = 0x85; // bit7 = 1
  state.byteTables[12][2] = 1; state.byteTables[13][2] = 2;
  const { draws, calls, callbacks } = makeCallbacks({ onA: true, onB: true });
  stepLegacySpriteLayerLoop(state, callbacks);
  assert.equal(calls.onA, 3);
  assert.equal(calls.onB, 3);
  assert.deepEqual(draws, [
    { target: "sprite", index: 100, x: 13, y: 24 },
    { target: "composite", index: 50, x: 11, y: 22 },
  ]);
  assert.equal(state.an, -1, "an untouched by aq<51 and reset after each draw");
}

// --- Y === 29, dense>=12, aq>=51: sets an=4 before the draw callback, then
// resets it to -1 afterward.
{
  const state = makeState({ Y: 29, aq: 60 });
  state.byteTables[15][0] = 1;
  state.dense[1414 + state.aq] = 15;
  state.shortTables[7][0] = 77;
  state.byteTables[14][0] = 0;
  const { draws, callbacks } = makeCallbacks({ onA: true, onB: true });
  let anDuringDraw;
  const wrapped = { ...callbacks, onDrawSprite: (index, x, y) => { anDuringDraw = state.an; callbacks.onDrawSprite(index, x, y); } };
  stepLegacySpriteLayerLoop(state, wrapped);
  assert.equal(anDuringDraw, 4, "an must be 4 (aq>=51) at the moment of the draw call");
  assert.equal(state.an, -1, "an is reset to -1 after the draw");
  assert.equal(draws[0].index, 77);
}

// --- Y === 29, dense>=12, onA===false / onB===false both `continue` (no draw).
{
  const state = makeState({ Y: 29, aq: 0 });
  state.byteTables[15][0] = 1;
  state.dense[1414 + state.aq] = 20;
  state.shortTables[7][0] = 9;
  const { draws, calls, callbacks } = makeCallbacks({ onA: false, onB: true });
  stepLegacySpriteLayerLoop(state, callbacks);
  assert.equal(draws.length, 0);
  assert.equal(calls.onA, 1);
  assert.equal(calls.onB, 0, "onB must not run once onA returns false");
}
{
  const state = makeState({ Y: 29, aq: 0 });
  state.byteTables[15][0] = 1;
  state.dense[1414 + state.aq] = 20;
  state.shortTables[7][0] = 9;
  const { draws, calls, callbacks } = makeCallbacks({ onA: true, onB: false });
  stepLegacySpriteLayerLoop(state, callbacks);
  assert.equal(draws.length, 0);
  assert.equal(calls.onB, 1);
}

// --- Y === 29, dense[1414+aq] < 12: ay===7 sub-branch, dense[1515+aq]===0 skips.
{
  const state = makeState({ Y: 29, aq: 0 });
  state.byteTables[15][0] = 1;
  state.dense[1414 + state.aq] = 5;
  state.dense[1515 + state.aq] = 0;
  state.shortTables[7][0] = 9;
  state.byteTables[14][0] = 7; // ay = 7
  const { draws, callbacks } = makeCallbacks({ onA: true });
  stepLegacySpriteLayerLoop(state, callbacks);
  assert.equal(draws.length, 0, "ay===7 with dense[1515+aq]===0 must skip");
}

// --- ay===7 with dense[1515+aq]!==0 falls through to the draw (ax untouched).
{
  const state = makeState({ Y: 29, aq: 0 });
  state.byteTables[15][0] = 1;
  state.dense[1414 + state.aq] = 5;
  state.dense[1515 + state.aq] = 9;
  state.shortTables[7][0] = 42;
  state.byteTables[14][0] = 7;
  const { draws, callbacks } = makeCallbacks({ onA: true });
  stepLegacySpriteLayerLoop(state, callbacks);
  assert.equal(draws.length, 1);
  assert.equal(draws[0].index, 42, "ax stays 0 for ay===7");
}

// --- ay===0, aq<51: ap=az, ax unchanged (still 0).
{
  const state = makeState({ Y: 29, aq: 0 });
  state.byteTables[15][0] = 1;
  state.dense[1414 + state.aq] = 5;
  state.shortTables[7][0] = 10;
  state.byteTables[14][0] = 0; // ay = 0
  const { draws, callbacks } = makeCallbacks({ onA: true });
  stepLegacySpriteLayerLoop(state, callbacks);
  assert.equal(state.ap, state.az);
  assert.equal(draws[0].index, 10);
}

// --- ay===0, aq>=51: ap=az AND ax bumps to 1.
{
  const state = makeState({ Y: 29, aq: 60 });
  state.byteTables[15][0] = 1;
  state.dense[1414 + state.aq] = 5;
  state.shortTables[7][0] = 20;
  state.byteTables[14][0] = 0;
  const { draws, callbacks } = makeCallbacks({ onA: true });
  stepLegacySpriteLayerLoop(state, callbacks);
  assert.equal(state.ap, state.az);
  assert.equal(draws[0].index, 21, "aq>=51 bumps ax by 1 (record 20 + ax 1)");
}

// --- ay===9: ao=az, ax = dense[5151+aq] & 1.
{
  const state = makeState({ Y: 29, aq: 0 });
  state.byteTables[15][0] = 1;
  state.dense[1414 + state.aq] = 5;
  state.dense[5151 + state.aq] = 7; // & 1 === 1
  state.shortTables[7][0] = 30;
  state.byteTables[14][0] = 9; // ay = 9
  const { draws, callbacks } = makeCallbacks({ onA: true });
  stepLegacySpriteLayerLoop(state, callbacks);
  assert.equal(state.ao, state.az);
  assert.equal(draws[0].index, 31);
}

// --- ay===5: always skipped.
{
  const state = makeState({ Y: 29, aq: 0 });
  state.byteTables[15][0] = 1;
  state.dense[1414 + state.aq] = 5;
  state.shortTables[7][0] = 40;
  state.byteTables[14][0] = 5; // ay = 5
  const { draws, callbacks } = makeCallbacks({ onA: true });
  stepLegacySpriteLayerLoop(state, callbacks);
  assert.equal(draws.length, 0);
}

// --- Y !== 29: ay===0 sets BOTH ap and ao, and (unlike the Y===29 path)
// there is no offset-281 record===1 check -- the layer still draws.
{
  const state = makeState({ Y: 0, aq: 0 });
  state.byteTables[15][0] = 1;
  state.shortTables[7][0] = 1; // record===1 -- would skip on the Y===29 path
  state.byteTables[14][0] = 0; // ay = 0
  const { draws, callbacks } = makeCallbacks({});
  stepLegacySpriteLayerLoop(state, callbacks);
  assert.equal(state.ap, state.az);
  assert.equal(state.ao, state.az);
  assert.equal(draws.length, 1, "Y!==29 has no record===1 gate");
}

// --- Y !== 29, ay!==0: ap/ao stay at their prior (-1) values; draw still happens.
{
  const state = makeState({ Y: 0, aq: 0, ap: -1, ao: -1 });
  state.byteTables[15][0] = 1;
  state.shortTables[7][0] = 15;
  state.byteTables[14][0] = 3; // ay = 3
  const { draws, callbacks } = makeCallbacks({});
  stepLegacySpriteLayerLoop(state, callbacks);
  assert.equal(state.ap, -1);
  assert.equal(state.ao, -1);
  assert.equal(draws.length, 1);
}

// --- Ground-truth sanity check (docstring from the task): four villagers on
// map 0, au=9 -> aA=87, layer count 9, az runs 87..95. Recorded independently
// via a live browser trace; used only to sanity-check the derivation above,
// not as a spec baked into the port itself.
{
  const state = makeState({ Y: 0, au: 9, aq: 0 });
  state.shortTables[8][9] = 87;
  state.byteTables[15][9] = 9;
  const ayValues = [10, 5, 3, 8, 6, 0, 2, 9, 7];
  const records = [595, 493, 877, 346, 431, 1391, 892, 711, 878];
  const bit7Values = [1, 1, 0, 1, 1, 1, 0, 0, 1];
  for (let i = 0; i < 9; i += 1) {
    const az = 87 + i;
    state.shortTables[7][az] = records[i];
    state.byteTables[14][az] = ayValues[i] | (bit7Values[i] << 7);
  }
  const { draws, callbacks } = makeCallbacks({});
  stepLegacySpriteLayerLoop(state, callbacks);
  assert.equal(draws.length, 9);
  draws.forEach((draw, i) => {
    assert.equal(draw.index, records[i], `layer ${i} record`);
    assert.equal(draw.target, bit7Values[i] ? "composite" : "sprite", `layer ${i} draw target`);
  });
  assert.equal(state.ap, 92, "ay===0 at az=92 (i=5) sets ap");
  assert.equal(state.ao, 92, "ay===0 at az=92 (i=5) sets ao");
}

console.log("f.p() sprite-layer loop OK");
