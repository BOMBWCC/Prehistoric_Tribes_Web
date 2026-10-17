import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import vm from "node:vm";
import { denseRequire } from "./dense-layout-require.mjs";

// RESTORED (2026-09-07): this method used to stub every mode's "candidate
// accepted" path into a deliberate null dereference (b:[S]/c:[[B]/f.b:[[B],
// all three now known to be real, live, already-populated fields --
// saveOffsets, LegacySubsystemArrays.cRows, and LegacyRuntimeState.gridB
// respectively). These cases replace the old "guaranteed throw" assertions
// with real, hand-computed behaviour derived from the full bytecode trace
// in the source file's own docblock.
const file = new URL("../src/sim/world/LegacySpiralPlacementGate.ts", import.meta.url).pathname;
const output = ts.transpileModule(fs.readFileSync(file, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(output, { require: denseRequire, module, exports: module.exports, Int8Array, Int16Array });
const { checkLegacySpiralPlacementGate } = module.exports;

const grid = (w, h) => Array.from({ length: h }, () => new Int8Array(w));

function makeInput(overrides = {}) {
  const dense = new Int8Array(20000);
  const packedBytes = new Int8Array(2000);
  const packedOffsets = new Int16Array(400);
  const saveOffsets = new Int16Array(570);
  packedOffsets[53] = 0; // keep the dead scanLimit<24 table-53 read comfortably in range by default
  saveOffsets[31] = 3131;
  saveOffsets[32] = 3232;
  saveOffsets[112] = 11312;
  saveOffsets[113] = 11413;
  return {
    mode: 0,
    scanLimit: 2,
    originX: 5,
    originY: 5,
    dense,
    packedBytes,
    packedOffsets,
    saveOffsets,
    gridC: grid(20, 20),
    gridB: grid(20, 20),
    cRows: Array.from({ length: 6 }, () => new Int8Array(10)),
    mapWidth: 20,
    mapHeight: 20,
    id: 0,
    entityB: 0,
    ae: 0,
    bScalars: { bField232: -1 },
    ...overrides,
  };
}

// Offsets 890..1875 (ported 2026-09-23). From origin (5,5) the spiral visits
// (6,5), (6,6), then (5,6), (4,6), (4,5), (4,4). C:B comes from t53[313] = 0.
// mode 5 does nothing.
assert.equal(checkLegacySpiralPlacementGate(makeInput({ mode: 5, scanLimit: 2 })), false);

// mode 8/9: living adults of team 0 / team 1 are appended to f.p[6 + O++].
for (const [mode, expected] of [[8, [3]], [9, [60]]]) {
  const input = makeInput({ mode, scanLimit: 2, fP: new Int8Array(40), oCounter: { value: 0 }, scratchB: { value: 0 } });
  const { dense, gridC } = input;
  gridC[5][6] = 3; dense[1919 + 3] = 5; dense[1414 + 3] = 12;
  gridC[6][6] = 7; dense[1919 + 7] = 5; dense[1414 + 7] = 11; // a child
  gridC[6][4] = 60; dense[1919 + 60] = 5; dense[1414 + 60] = 20;
  assert.equal(checkLegacySpiralPlacementGate(input), false);
  assert.deepEqual(Array.from(input.fP.slice(6, 6 + input.oCounter.value)), expected);
  assert.equal(input.scratchB.value, gridC[4][4], "B:B holds the last scanned cell");
}

// mode 6 (an animal, id = slot 2): an enemy unit next to it gets the hit
// reaction and ends the scan; C > 3 skips everything.
{
  const hits = [];
  const input = makeInput({ mode: 6, scanLimit: 2, id: 2, onHitReaction: (...a) => hits.push(a) });
  input.gridC[5][6] = 60; input.dense[1919 + 60] = 5;
  assert.equal(checkLegacySpiralPlacementGate(input), true);
  assert.deepEqual(hits, [[6, 5, 60, 50]]);

  const far = makeInput({ mode: 6, scanLimit: 2, id: 2, onHitReaction: () => hits.push("far") });
  far.gridC[5][6] = 60; far.dense[1919 + 60] = 5; far.packedBytes[313] = 40; // C = 4
  assert.equal(checkLegacySpiralPlacementGate(far), false);
  assert.equal(hits.length, 1);

  // A team-0 unit only matters to an animal without a target, and does not end the scan.
  const own = makeInput({ mode: 6, scanLimit: 1, id: 2, onHitReaction: (...a) => hits.push(a) });
  own.gridC[5][6] = 3; own.dense[1919 + 3] = 5;
  assert.equal(checkLegacySpiralPlacementGate(own), false);
  assert.deepEqual(hits.at(-1), [6, 5, 3, 50]);
  own.dense[9601 + 2] = 1;
  checkLegacySpiralPlacementGate(own);
  assert.equal(hits.length, 2, "with a target, team-0 units are ignored");

  // Offset 1088 reads the field B:B after the reaction: when the fleeing animal's nested
  // a(2, 127, x, y) scan has overwritten it, the scan goes on to the next unit (oracle run 15).
  const B = { value: 0 };
  const seen = [];
  const nested = makeInput({ mode: 6, scanLimit: 2, id: 2, scratchB: B, onHitReaction: (x, y, t) => { seen.push(t); B.value = 0; } });
  nested.gridC[5][6] = 60; nested.dense[1919 + 60] = 5;
  nested.gridC[6][6] = 61; nested.dense[1919 + 61] = 5;
  assert.equal(checkLegacySpiralPlacementGate(nested), false);
  assert.deepEqual(seen, [60, 61]);
}

// mode 7 (scout v = 4, team 0), C = 2 (t53[313] = 20).
{
  const input = makeInput({ mode: 7, scanLimit: 1, id: 4, team: 0 });
  input.packedBytes[313] = 20;
  input.gridC[5][6] = 60; input.dense[1919 + 60] = 5; input.dense[7979 + 4] = 1;
  // Without 7979 bit 1: spotted iff 4949[unit] >= C.
  input.dense[4949 + 60] = 1;
  assert.equal(checkLegacySpiralPlacementGate(input), false);
  input.dense[4949 + 60] = 2;
  assert.equal(checkLegacySpiralPlacementGate(input), true);
  assert.equal(input.dense[7979 + 4], 0, "bit 0 cleared");
  // With bit 1: 1 + (10 - 7575[v]) / 3 + 7575[unit] / (7575[v] - 3) >= C.
  input.dense[7979 + 4] = 2; input.dense[7575 + 4] = 10; input.dense[7575 + 60] = 0;
  assert.equal(checkLegacySpiralPlacementGate(input), false, "1 + 0 + 0 = 1 < 2");
  input.dense[7575 + 60] = 7;
  assert.equal(checkLegacySpiralPlacementGate(input), true, "1 + 0 + 7/7 = 2");
  input.dense[7575 + 4] = 3;
  assert.throws(() => checkLegacySpiralPlacementGate(input), /by zero/, "7575 == 3 divides by zero, as in Java");
}
// mode 7: an enemy marker cell next to a skilled scout is flipped and repainted; team 0 pays R.
{
  const repaints = [];
  const input = makeInput({ mode: 7, scanLimit: 1, id: 4, team: 0, rByte: { value: 10 }, onRepaint: (...a) => repaints.push(a) });
  input.gridC[5][6] = -117; input.dense[7575 + 4] = 6;
  assert.equal(checkLegacySpiralPlacementGate(input), false);
  assert.equal(input.gridC[5][6], -114);
  assert.deepEqual(repaints, [[6, 5, 1, 1]]);
  assert.equal(input.rByte.value, 9);
}

// mode 0: occupant check never accepts -> exhausts the search, returns
// false safely. Also confirms y:B(#232) (bScalars.bField232) is reset to 0
// unconditionally on entry.
{
  const input = makeInput({ mode: 0, scanLimit: 2, onOccupantCheck: () => false });
  assert.equal(checkLegacySpiralPlacementGate(input), false);
  assert.equal(input.bScalars.bField232, 0);
}

// mode 0, id===0: accepts on the first in-bounds candidate (ring1/half0/i0:
// offset=(1,0) with the default step=1, so x=originX+1, y=originY).
// id===0 takes the early "return true" right after the target write, so
// onO/onOccupancyCheck/onGroupMode never fire.
{
  const input = makeInput({
    mode: 0, id: 0, originX: 5, originY: 5, scanLimit: 2,
    onOccupantCheck: () => true,
  });
  let onOCalls = 0;
  input.onO = () => { onOCalls += 1; };
  assert.equal(checkLegacySpiralPlacementGate(input), true);
  assert.equal(input.dense[3131 + 0], 6, "saveOffsets[31]+id = x");
  assert.equal(input.dense[3232 + 0], 5, "saveOffsets[32]+id = y");
  assert.equal(onOCalls, 0, "id===0 returns before onO");
}

// mode 1 vs mode 2: same acceptance rule (cell===0) but DIFFERENT
// saveOffsets slots (31/32 vs 112/113) -- confirms the mode-keyed index
// selection at offset 584..596/643..655.
for (const [mode, xIdx, yIdx] of [[1, 3131, 3232], [2, 11312, 11413]]) {
  const input = makeInput({ mode, id: 0, originX: 5, originY: 5, scanLimit: 2 });
  assert.equal(checkLegacySpiralPlacementGate(input), true);
  assert.equal(input.dense[xIdx + 0], 6);
  assert.equal(input.dense[yIdx + 0], 5);
}

// mode 1/2: every candidate occupied (non-zero) within scanLimit -> returns
// false safely (no accept, no throw).
for (const mode of [1, 2]) {
  const gridC = grid(20, 20);
  for (const row of gridC) row.fill(1);
  const input = makeInput({ mode, gridC, scanLimit: 2 });
  assert.equal(checkLegacySpiralPlacementGate(input), false);
}

// mode 4: terrain (gridB[y][x]) in [95,114] AND cell===0 -> accepts.
{
  const gridB = grid(20, 20);
  gridB[5][6] = 100; // first candidate (x=6,y=5)
  const input = makeInput({ mode: 4, id: 0, gridB, originX: 5, originY: 5, scanLimit: 2 });
  assert.equal(checkLegacySpiralPlacementGate(input), true);
  assert.equal(input.dense[3131 + 0], 6);
  assert.equal(input.dense[3232 + 0], 5);
}

// mode 4: terrain out of [95,114] on every reachable candidate -> exhausts, false.
{
  const gridB = grid(20, 20); // all zero -> always < 95
  const input = makeInput({ mode: 4, gridB, scanLimit: 2 });
  assert.equal(checkLegacySpiralPlacementGate(input), false);
}

// mode 3: full derivation. First candidate (ring1/half0/i0, x=6,y=5):
// origin cell (0) and adjacent cell (x+1=7, also 0) both pass; bit =
// dense[8282+id]&1 = 0, so cell becomes cRows[1][ae] = 7 (an entity id);
// dense[2828+7]===109 triggers the position write using that entity id
// (distinct from the shared-tail write, which targets `id` itself).
{
  const cRows = Array.from({ length: 6 }, () => new Int8Array(10));
  cRows[1][0] = 7;
  const input = makeInput({
    mode: 3, id: 2, ae: 0, cRows, originX: 5, originY: 5, scanLimit: 1, mapWidth: 20, mapHeight: 20,
  });
  input.dense[2828 + 7] = 109;
  assert.equal(checkLegacySpiralPlacementGate(input), true);
  assert.equal(input.dense[3131 + 7], 7, "cell=7 write: (x+1)-bit = 7-0");
  assert.equal(input.dense[3232 + 7], 5, "cell=7 write: y");
  assert.equal(input.dense[3131 + 2], 6, "shared-tail write for id=2: x + bit(=0)");
  assert.equal(input.dense[3232 + 2], 5, "shared-tail write for id=2: y");
}

// mode 3: origin cell occupied by something not matching either cRows
// entry -> rejected on every candidate -> exhausts, false.
{
  const gridC = grid(20, 20);
  for (const row of gridC) row.fill(99);
  const cRows = Array.from({ length: 6 }, () => new Int8Array(10));
  cRows[0][0] = 1;
  cRows[1][0] = 2;
  const input = makeInput({ mode: 3, ae: 0, cRows, gridC, scanLimit: 1 });
  assert.equal(checkLegacySpiralPlacementGate(input), false);
}

// mode 0, id!==0: full "accepted" tail. First candidate is accepted by
// onOccupantCheck but REJECTED by the occupancy-score check
// (score=trunc(100/10)=10 > entityB=5) -- a real "continue back to the
// spiral search", not a hard return, but the target-position write from
// before the score check still lands (offset order: writes happen at
// 634/669, the score check that can reject is later, at 754..758). The
// second candidate passes with a lower score and completes: onO fires
// again, dense[6161+id]<=0 and type!=10/13/15 so the 6262/6363 copy is
// skipped, onGroupMode(id,2) fires, returns true.
{
  const input = makeInput({ mode: 0, id: 7, originX: 5, originY: 4, scanLimit: 2, entityB: 5 });
  input.onOccupantCheck = () => true;
  let call = 0;
  const occupancyCalls = [];
  input.onOccupancyCheck = (x, y, arg3) => { occupancyCalls.push([x, y, arg3]); call += 1; return call === 1 ? 100 : 30; };
  let onOCalls = 0;
  input.onO = () => { onOCalls += 1; };
  const groupModeCalls = [];
  input.onGroupMode = (id, argument) => groupModeCalls.push([id, argument]);

  assert.equal(checkLegacySpiralPlacementGate(input), true);
  // ring1/half0/i0 = (1,0) -> x=6,y=4 (rejected); ring1/half1/i0 = (1,1) -> x=6,y=5 (accepted).
  assert.equal(input.dense[3131 + 7], 6, "last-written x (second, accepted candidate)");
  assert.equal(input.dense[3232 + 7], 5, "last-written y (second, accepted candidate) -- overwrote the first candidate's y=4");
  assert.equal(onOCalls, 2, "o() fires for both the rejected and the accepted candidate");
  assert.deepEqual(occupancyCalls, [[0, 0, 0], [0, 0, 0]], "reads THIS entity's own dense[id]/dense[101+id], not the candidate x/y");
  assert.deepEqual(groupModeCalls, [[7, 2]], "g(2) fires exactly once, only for the accepted candidate");
  assert.equal(input.dense[6262 + 7], 0, "copy branch not taken (type=0, dense[6161+id]=0)");
}

// mode 0, id!==0: the dense[6262]/[6363] copy branch (type===15) fires
// using the JUST-WRITTEN dense[3131+id]/[3232+id] values, not any older
// pre-existing ones.
{
  const input = makeInput({ mode: 0, id: 3, originX: 8, originY: 9, scanLimit: 2, entityB: 0 });
  input.onOccupantCheck = () => true;
  input.onOccupancyCheck = () => 0;
  input.dense[2828 + 3] = 15; // type
  const groupModeCalls = [];
  input.onGroupMode = (id, argument) => groupModeCalls.push([id, argument]);

  assert.equal(checkLegacySpiralPlacementGate(input), true);
  assert.equal(input.dense[3131 + 3], 9);
  assert.equal(input.dense[3232 + 3], 9);
  assert.equal(input.dense[6262 + 3], 9, "copied from the just-written dense[3131+id]");
  assert.equal(input.dense[6363 + 3], 9, "copied from the just-written dense[3232+id]");
  assert.deepEqual(groupModeCalls, [[3, 2]]);
}

// The scanLimit<24 pre-dispatch table-53 read (offsets 146..232) is real
// and unguarded by any local exception handler -- a search radius wide
// enough to push the raw (unclamped) spiral offset past the packed
// resource's actual length throws, uncaught, out of the whole function.
{
  const input = makeInput({
    mode: 1, scanLimit: 2, packedBytes: new Int8Array(5), originX: 5, originY: 5,
  });
  // ring1/half0/i0 -> offsets=(1,0) -> index = (0+12)*25+(1+12) = 313, past length 5.
  assert.throws(() => checkLegacySpiralPlacementGate(input));
}

// The SAME undersized packedBytes does NOT throw once scanLimit>=24 -- the
// dead C:B/E:B computation is skipped entirely in that case.
{
  const gridC = grid(20, 20);
  for (const row of gridC) row.fill(1); // every candidate occupied -> mode=1 always rejects, exhausts safely
  const input = makeInput({
    mode: 1, scanLimit: 24, packedBytes: new Int8Array(5), gridC,
  });
  assert.equal(checkLegacySpiralPlacementGate(input), false);
}

console.log("checkLegacySpiralPlacementGate (#270 gate) OK");
