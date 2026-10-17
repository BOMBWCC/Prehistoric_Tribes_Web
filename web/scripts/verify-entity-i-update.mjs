import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import ts from "typescript";
import vm from "node:vm";

function loadModule(file) {
  const module = { exports: {} };
  const output = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const localRequire = (request) => loadModule(path.resolve(path.dirname(file), `${request}.ts`));
  vm.runInNewContext(output, { module, exports: module.exports, require: localRequire, Int8Array });
  return module.exports;
}

const { stepLegacyEntityIUpdate } = loadModule(
  new URL("../src/sim/units/LegacyEntityIUpdate.ts", import.meta.url).pathname,
);
const { selectLegacyAuxiliaryCandidates } = loadModule(
  new URL("../src/sim/world/LegacyAuxiliaryQueue.ts", import.meta.url).pathname,
);

const ID = 4;
const make = () => ({
  state: new Int8Array(10000),
  entityId: ID,
  argument: 13,
  readPacked: () => 0,
  readBValue: () => 2,
  qValue: 0,
  uValue: 0,
  raw: { x: 2, H: 0, y: 0, p: 0 },
});

// offset 0..7: f() returning true aborts before any side effect.
{
  const input = make();
  input.state[2828 + ID] = 69;
  let m = 0;
  assert.equal(stepLegacyEntityIUpdate({ ...input, onF: () => true, onM: () => { m += 1; } }), true);
  assert.equal(input.state[606 + ID], 0);
  assert.equal(m, 0);
}

// offset 58..106: type===69 with both guard bytes clear and x<3 rotates the
// low 3 bits of dense[606+id].
{
  const input = make();
  input.state[2828 + ID] = 69;
  let m = 0;
  assert.equal(stepLegacyEntityIUpdate({ ...input, onM: () => { m += 1; } }), false);
  assert.equal(input.state[606 + ID], 1); // (0 + 2%3 + 7) & 7
  assert.equal(m, 0);
  assert.equal(input.raw.H, 0); // type 69 is NOT eligible -> H untouched
}

// offset 109..143: 3<=x<5, argument===0 and !(dense[7979+id]&2) calls M().
{
  const input = make();
  input.state[2828 + ID] = 69;
  input.raw.x = 3;
  input.argument = 0;
  let m = 0;
  stepLegacyEntityIUpdate({ ...input, onM: () => { m += 1; } });
  assert.equal(m, 1);
  assert.equal(input.state[606 + ID], 0); // rotation branch not taken

  const blocked = make();
  blocked.state[2828 + ID] = 69;
  blocked.state[7979 + ID] = 2;
  blocked.raw.x = 3;
  blocked.argument = 0;
  let m2 = 0;
  stepLegacyEntityIUpdate({ ...blocked, onM: () => { m2 += 1; } });
  assert.equal(m2, 0);
}

// dense[202+id] (or dense[303+id]) non-zero drops out of the type===69 block
// entirely -- offsets 39/55 both jump to the type===84 test at 146.
{
  const input = make();
  input.state[2828 + ID] = 69;
  input.state[202 + ID] = 1;
  let m = 0;
  stepLegacyEntityIUpdate({ ...input, onM: () => { m += 1; } });
  assert.equal(input.state[606 + ID], 0);
  assert.equal(m, 0);
}

// A readPacked stub that makes the offset-354..403 double lookup observable:
// table163(57)=4, table161(10)=77, table161(anything else)=-1.
const nested = (row, index) => {
  if (row === 18) return 0;
  if (row === 163) return index === 57 ? 4 : 0;
  if (row === 161) return index === 10 ? 77 : -1;
  if (row === 38) return 1;
  return 0;
};

// offset 284..403: the eligible body. CORRECTED bug regression (bug 2) --
// dense[2929+id] is table161(table163(H) + y), a nested lookup. The old port
// computed table161(H)+table163(H)+H+y, which for this fixture would be
// -1 + 4 + 57 + 6 = 66 rather than 77.
{
  const input = make();
  input.state[2828 + ID] = 5; // <=9 -> passes the type half of the gate
  input.state[6565 + ID] = 57;
  input.state[1717 + ID] = 5;
  input.readPacked = nested;
  let coordinate = null;
  assert.equal(stepLegacyEntityIUpdate({
    ...input,
    onRandomRemainder: (mask, divisor) => { coordinate = [mask, divisor]; return 6; },
  }), false);
  assert.deepEqual(coordinate, [0xffffff, 7]); // table18(57)===0 -> 2 + dense[1717+id]
  assert.equal(input.state[2929 + ID], 77);
  assert.equal(input.raw.H, 57);
  assert.equal(input.raw.y, 6);
  assert.equal(input.state[606 + ID], 3); // table38(57)!==0 && H!==105 -> 13 % 10
}

// table18(H)!==0 selects the constant addend 1 instead (offset 347).
{
  const input = make();
  input.state[2828 + ID] = 5;
  input.state[6565 + ID] = 57;
  input.state[1717 + ID] = 5;
  input.readPacked = (row, index) => (row === 18 ? 1 : nested(row, index));
  let coordinate = null;
  stepLegacyEntityIUpdate({
    ...input,
    onRandomRemainder: (mask, divisor) => { coordinate = [mask, divisor]; return 0; },
  });
  assert.deepEqual(coordinate, [0xffffff, 1]);
}

// CORRECTED bug regression (bug 1), case A: type=10 with argument/10 <= B.
// The old inverted gate `(type>9 && ...) || argument/10<=B` made this
// ELIGIBLE; the real offsets 201..283 require type<=9|93|92|106 AND
// argument/10<=B, so this must take the offset-407 b(int) branch instead.
{
  const input = make();
  input.state[2828 + ID] = 10;
  input.state[6565 + ID] = 57;
  input.readPacked = nested;
  let random = 0;
  let bArg = null;
  assert.equal(stepLegacyEntityIUpdate({
    ...input,
    onRandomRemainder: () => { random += 1; return 6; },
    onBInt: (value) => { bArg = value; return false; },
  }), false);
  assert.equal(random, 0);
  assert.equal(bArg, 13);
  assert.equal(input.raw.H, 0); // never assigned
  assert.equal(input.state[2929 + ID], 0);
}

// CORRECTED bug regression (bug 1), case B: type=10 with argument/10 > B.
// Both the old and the new formula reject this one, but it pins the second
// half of the gate; b(int) returning true is the offset-415 early return.
{
  const input = make();
  input.state[2828 + ID] = 10;
  input.argument = 99;
  let bArg = null;
  assert.equal(stepLegacyEntityIUpdate({
    ...input,
    onBInt: (value) => { bArg = value; return true; },
  }), true);
  assert.equal(bArg, 99);
  assert.equal(input.state[606 + ID], 0); // tail never reached
}

// The other three accepted types (93, 92, 106) all reach the eligible body,
// and the argument/10<=B half still applies to each of them.
for (const type of [9, 92, 93, 106]) {
  const input = make();
  input.state[2828 + ID] = type;
  input.state[6565 + ID] = 57;
  input.readPacked = nested;
  let random = 0;
  stepLegacyEntityIUpdate({ ...input, onRandomRemainder: () => { random += 1; return 6; } });
  assert.equal(random, 1, `type ${type} should be eligible`);

  const rejected = make();
  rejected.state[2828 + ID] = type;
  rejected.state[6565 + ID] = 57;
  rejected.readPacked = nested;
  rejected.argument = 99; // 99/10 = 9 > B = 2
  let random2 = 0;
  stepLegacyEntityIUpdate({ ...rejected, onRandomRemainder: () => { random2 += 1; return 6; } });
  assert.equal(random2, 0, `type ${type} with argument/10 > B should not be eligible`);
}

// b.B:I (#8) is only read once the type half of the gate has passed
// (offsets 273..281 sit AFTER the four type comparisons).
{
  const input = make();
  input.state[2828 + ID] = 10;
  let reads = 0;
  stepLegacyEntityIUpdate({ ...input, readBValue: () => { reads += 1; return 2; } });
  assert.equal(reads, 0);

  const eligible = make();
  eligible.state[2828 + ID] = 5;
  let reads2 = 0;
  stepLegacyEntityIUpdate({ ...eligible, readBValue: () => { reads2 += 1; return 2; } });
  assert.equal(reads2, 1);
}

// CORRECTED bug regression (bug 3), first half: offset 198 is
// b.a(int,byte) (#275, the entity type change), NOT the xSlotTable writer.
// The stub writes an eligible type back so the test also pins the offset-201
// re-read of dense[2828+id] and the fact that b.B:I is sampled afterwards.
{
  const input = make();
  input.state[2828 + ID] = 84;
  input.state[3939 + ID] = 69;
  input.state[6565 + ID] = 57;
  input.readPacked = nested;
  const order = [];
  let bValue = 99; // would reject argument/10=1 ... until onChangeType lowers it
  stepLegacyEntityIUpdate({
    ...input,
    readBValue: () => { order.push("B"); return bValue; },
    onChangeType: (targetId, type) => {
      order.push(["changeType", targetId, type]);
      input.state[2828 + targetId] = 5; // stub: prove the gate re-reads it
      bValue = 2;
    },
    onLinkByte: () => { order.push("linkByte"); },
    onRandomRemainder: () => { order.push("random"); return 6; },
  });
  assert.deepEqual(order, [["changeType", ID, 85], "B", "random"]);
  assert.equal(input.state[2929 + ID], 77);
}

// x>=10 blocks the offset-146 block even when both type bytes match.
{
  const input = make();
  input.state[2828 + ID] = 84;
  input.state[3939 + ID] = 69;
  input.raw.x = 10;
  let changed = 0;
  stepLegacyEntityIUpdate({ ...input, onChangeType: () => { changed += 1; } });
  assert.equal(changed, 0);
}

// CORRECTED bug regression (bug 3), second half: offset 509 is
// f.a(int,byte) (#277, the xSlotTable slot writer) called with (id, 1), and
// it must NOT share a callback with the offset-198 type change.
{
  const input = make();
  input.state[2828 + ID] = 5;
  input.state[6565 + ID] = 95; // H in [94,97]
  input.readPacked = nested;
  const linked = [];
  let changed = 0;
  stepLegacyEntityIUpdate({
    ...input,
    onRandomRemainder: () => 0,
    onChangeType: () => { changed += 1; },
    onLinkByte: (targetId, value) => { linked.push([targetId, value]); },
  });
  assert.deepEqual(linked, [[ID, 1]]);
  assert.equal(changed, 0);
  assert.equal(input.state[7979 + ID], 16);

  // Already-set bit 16 suppresses the whole block.
  const again = make();
  again.state[2828 + ID] = 5;
  again.state[6565 + ID] = 95;
  again.state[7979 + ID] = 16;
  again.readPacked = nested;
  const linked2 = [];
  stepLegacyEntityIUpdate({
    ...again,
    onRandomRemainder: () => 0,
    onLinkByte: (targetId, value) => { linked2.push([targetId, value]); },
  });
  assert.deepEqual(linked2, []);
}

// offset 543..619: dense[2929+id] in {39,104,105} writes dense[3333+id].
for (const mode of [39, 104, 105]) {
  const input = make();
  input.state[2828 + ID] = 10; // not eligible -> dense[2929+id] survives
  input.state[2929 + ID] = mode;
  input.raw.x = 7;
  stepLegacyEntityIUpdate(input);
  assert.equal(input.state[3333 + ID], 12); // 11 + (7 & 1)
}
{
  const input = make();
  input.state[2828 + ID] = 10;
  input.state[2929 + ID] = 40;
  stepLegacyEntityIUpdate(input);
  assert.equal(input.state[3333 + ID], 0);
}

// CORRECTED bug regression (bug 4): offsets 701..735 are TWO calls in
// sequence -- b(id,0,1) (#342) and only then f.b(60) (#343). The old port
// had only the second.
{
  const input = make();
  input.state[2828 + ID] = 5;
  input.state[6565 + ID] = 57;
  input.readPacked = nested;
  input.raw.p = 1; // (p & 5) === 1
  const order = [];
  assert.equal(stepLegacyEntityIUpdate({
    ...input,
    onRandomRemainder: () => 0,
    onSubsystemB: (first, second, third) => { order.push(["b", first, second, third]); },
    onFByte: (value) => { order.push(["fb", value]); },
  }), false); // the original runs off the end here, it does not return early
  assert.deepEqual(order, [["b", ID, 0, 1], ["fb", 60]]);
  assert.equal(input.raw.p, 5); // 1 | 4
}

// The (p&9)===1 alternative needs dense[9115+dense[4444+id]]===2 as well,
// and picks 62/8 instead of 60/4.
{
  const input = make();
  input.state[2828 + ID] = 5;
  input.state[6565 + ID] = 57;
  input.state[4444 + ID] = 3;
  input.state[9115 + 3] = 2;
  input.readPacked = nested;
  input.raw.p = 5; // (5 & 5) === 5, but (5 & 9) === 1
  const order = [];
  stepLegacyEntityIUpdate({
    ...input,
    onRandomRemainder: () => 0,
    onSubsystemB: (first, second, third) => { order.push(["b", first, second, third]); },
    onFByte: (value) => { order.push(["fb", value]); },
  });
  assert.deepEqual(order, [["b", ID, 0, 1], ["fb", 62]]);
  assert.equal(input.raw.p, 13); // 5 | 8

  const blocked = make();
  blocked.state[2828 + ID] = 5;
  blocked.state[6565 + ID] = 57;
  blocked.state[4444 + ID] = 3;
  blocked.state[9115 + 3] = 1; // not 2
  blocked.readPacked = nested;
  blocked.raw.p = 5;
  let calls = 0;
  stepLegacyEntityIUpdate({
    ...blocked,
    onRandomRemainder: () => 0,
    onSubsystemB: () => { calls += 1; },
    onFByte: () => { calls += 1; },
  });
  assert.equal(calls, 0);
  assert.equal(blocked.raw.p, 5);
}

// u:I !== 0 or f.q:B >= 7 both close the offset-620 block.
for (const [uValue, qValue] of [[1, 0], [0, 7]]) {
  const input = make();
  input.state[2828 + ID] = 5;
  input.state[6565 + ID] = 57;
  input.readPacked = nested;
  input.raw.p = 1;
  let calls = 0;
  stepLegacyEntityIUpdate({
    ...input, uValue, qValue,
    onRandomRemainder: () => 0,
    onSubsystemB: () => { calls += 1; },
    onFByte: () => { calls += 1; },
  });
  assert.equal(calls, 0);
  assert.equal(input.raw.p, 1);
}

// H:I and f.p:B are cross-call state: a call whose eligibility gate fails
// never assigns H, so the offset-416..767 tail runs against whatever the
// PREVIOUS call left behind.
{
  const raw = { x: 2, H: 0, y: 0, p: 0 };
  const state = new Int8Array(10000);
  const shared = {
    state, entityId: ID, readPacked: nested, readBValue: () => 2,
    qValue: 0, uValue: 0, raw,
  };

  state[2828 + ID] = 5;
  state[6565 + ID] = 57;
  stepLegacyEntityIUpdate({ ...shared, argument: 13, onRandomRemainder: () => 6 });
  assert.equal(raw.H, 57);

  // Second call: type 10 -> not eligible, H is NOT reassigned, and the tail
  // still uses the persisted 57 (table38(57)!==0 -> dense[606+id]=argument%10).
  state[2828 + ID] = 10;
  state[606 + ID] = 0;
  let random = 0;
  stepLegacyEntityIUpdate({
    ...shared, argument: 27, onRandomRemainder: () => { random += 1; return 0; },
  });
  assert.equal(random, 0);
  assert.equal(raw.H, 57);
  assert.equal(state[606 + ID], 7);

  // Third call: the offset-620 block fires off that same persisted H, and
  // the p update it leaves behind is visible to the next call.
  raw.p = 1;
  const order = [];
  stepLegacyEntityIUpdate({
    ...shared, argument: 27,
    onSubsystemB: (first, second, third) => { order.push(["b", first, second, third]); },
    onFByte: (value) => { order.push(["fb", value]); },
  });
  assert.deepEqual(order, [["b", ID, 0, 1], ["fb", 60]]);
  assert.equal(raw.p, 5);
}

// H===105 suppresses the dense[606+id] write even when table38 is non-zero.
{
  const input = make();
  input.state[2828 + ID] = 5;
  input.state[6565 + ID] = 105;
  input.readPacked = (row) => (row === 38 ? 1 : row === 18 ? 1 : 0);
  stepLegacyEntityIUpdate({ ...input, onRandomRemainder: () => 0 });
  assert.equal(input.raw.H, 105);
  assert.equal(input.state[606 + ID], 0);
}

// The faithful b.b(int,int,int) (#342) derived alongside this method.
{
  const p = new Int8Array(6);
  const dense = new Int8Array(10000);
  const shortRows = [Int16Array.from({ length: 20 }, (_, i) => (i === 17 ? 9 : 0))];
  const state = { O: 0, N: 0, G: 0, eFlag: false };
  for (const o of [2, 3, 9, 12]) { dense[1919 + o] = 1; dense[1414 + o] = 12; }
  selectLegacyAuxiliaryCandidates({ p, dense, shortRows }, state, 3, 7, 1);
  // Prologue: p[1]=p[2]=row17, p[5]=second, then first!==0 overwrites
  // p[0]=p[2]=p[3]=p[4]=first.
  assert.equal(p[0], 3);
  assert.equal(p[1], 9);
  assert.equal(p[5], 7);
  // first=3 !== row17 and !== 0 -> N seeds at 3; O===first and O===row17 are
  // both skipped, so only candidates 2 and 12 land, and N stops at 5.
  assert.equal(p[2], 3);
  assert.equal(p[3], 2);
  assert.equal(p[4], 12);
  assert.equal(state.N, 5);

  // first===0 seeds N at 2 (offset 104's `ifeq 112`), the case the older
  // queueLegacyAuxiliary port gets wrong.
  const p2 = new Int8Array(6);
  const state2 = { O: 0, N: 0, G: 0, eFlag: false };
  selectLegacyAuxiliaryCandidates({ p: p2, dense, shortRows }, state2, 0, 0, 1);
  assert.equal(p2[2], 2);
  assert.equal(p2[3], 3);
  assert.equal(p2[4], 12);
  assert.equal(state2.N, 5);
}

console.log("b.i(int) entity update OK");
