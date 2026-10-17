import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";
import path from "node:path";

function loadModule(file) {
  const module = { exports: {} };
  const output = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const localRequire = (request) => loadModule(path.resolve(path.dirname(file), `${request}.ts`));
  vm.runInNewContext(output, {
    module, exports: module.exports, require: localRequire,
    Int8Array, Int16Array, Math,
  });
  return module.exports;
}

const { selectLegacyAuxiliaryCandidates, refreshLegacyAuxiliaryTag, restoreLegacyAuxiliary } = loadModule(
  new URL("../src/sim/world/LegacyAuxiliaryQueue.ts", import.meta.url).pathname,
);

// REGRESSION (2026-08-31): `queueLegacyAuxiliary` was documented as
// `private void b(int,int,int)` (#342) but is a chimera -- b(III)'s prologue
// (offsets 0..113) glued to `private void c(boolean)` (#361)'s loop body and
// epilogue. The three fields below are the discriminator: `dense[8933]`,
// `dense[6464+..]` and the 2D `auxiliaryRows` all belong to c(boolean); the
// real b(III) touches none of them and instead just fills `p[N]` with the
// ids it selects. The two call sites documented as `b.b(0,0,3)` (b.al()'s
// onSubsystemAction, b.i()'s tail) were running the wrong method's body and
// have been repointed to `selectLegacyAuxiliaryCandidates`.
{
  const p2 = new Int8Array(8);
  const dense2 = new Int8Array(10000);
  const shortRows2 = [new Int16Array(32)];
  shortRows2[0][17] = 40;
  // Two eligible entities (alive, level >= 12) at ids 5 and 6.
  for (const id of [5, 6]) { dense2[1919 + id] = 9; dense2[1414 + id] = 12; }
  const st = { O: 0, N: 0, G: 0, eFlag: false, H: 0 };
  selectLegacyAuxiliaryCandidates({ p: p2, dense: dense2, shortRows: shortRows2 }, st, 0, 0, 3);
  // b(III) fills p[N] with the selected ids, starting at N=2 (first===0).
  assert.equal(p2[2], 5, "b(III) must record the first eligible id at p[N]");
  assert.equal(p2[3], 6, "b(III) must record the second eligible id");
  // ...and must NOT touch any of c(boolean)'s state.
  assert.equal(dense2[8933], 0, "b(III) must not write dense[8933] -- that is c(boolean)'s epilogue");
  assert.equal(dense2[6464 + 5], 0, "b(III) must not write dense[6464+..] -- that is c(boolean)'s");
}

// c(boolean) (#361), derived 2026-08-31 to replace the chimera that used to
// stand in for `queueLegacyAuxiliary`'s one remaining caller.
//
// RETRACTED (2026-09-07): this was believed a CONFIRMED GUARANTEED THROW
// because its unconditional c(int,int) (#362) call was believed to throw
// (permanently-null b:[S]/#132). b:[S] is real (see LegacyAuxiliaryCopy.ts),
// so the call now completes and refreshLegacyAuxiliaryTag returns normally.
// The first two cases test the prefix (offsets 0..46: e:Z reset, H:B
// computation, then the full c(int,int) call); the ranking cases below
// test the O-loop (completed 2026-09-23). All cases pass an all-zero saveOffsets table (so c(int,int)'s internal loop
// lands on saveOffsets[0]=0 for every category) purely so the call
// completes deterministically, not to exercise c(int,int) itself, which has
// its own dedicated verify-auxiliary-copy.mjs.
function buildInertSaveOffsets() {
  return new Int16Array(570);
}

{
  const dense = new Int8Array(10000);
  const shortRows = [new Int16Array(20)];
  shortRows[0][17] = 9;
  const auxiliaryRows = Array.from({ length: 4 }, () => new Int8Array(8));
  const packedBytes = new Int8Array(400);
  const packedOffsets = new Int16Array(400);
  const saveOffsets = buildInertSaveOffsets();
  const state = { O: 0, N: 0, G: 0, eFlag: true, H: 9 };
  // dense[8994] === row17 (9) -> H becomes 1.
  dense[8994] = 9;
  refreshLegacyAuxiliaryTag(
    { dense, shortRows, auxiliaryRows, packedBytes, packedOffsets, saveOffsets },
    state,
    false,
  );
  assert.equal(state.eFlag, false, "e:Z must be reset to false, regardless of the flag argument");
  assert.equal(state.H, 1, "H:B must be set from the dense[8994]===row17 test");
  assert.equal(auxiliaryRows[0][0], 9, "c(int,int)'s eRows[0][0]=row17 side effect must land");
}
// dense[8994] !== row17 -> H becomes 0.
{
  const dense = new Int8Array(10000);
  const shortRows = [new Int16Array(20)];
  shortRows[0][17] = 9;
  dense[8994] = 3;
  const auxiliaryRows = Array.from({ length: 4 }, () => new Int8Array(8));
  const packedBytes = new Int8Array(400);
  const packedOffsets = new Int16Array(400);
  const saveOffsets = buildInertSaveOffsets();
  const state = { O: 0, N: 0, G: 0, eFlag: false, H: 9 };
  refreshLegacyAuxiliaryTag(
    { dense, shortRows, auxiliaryRows, packedBytes, packedOffsets, saveOffsets },
    state,
    true,
  );
  assert.equal(state.H, 0);
}

// Offsets 99..581: the three best living adults (by max(1717, 1616)),
// excluding the chief, best first; 8933 = one past the last filled slot.
function rankingCase(flag, tag57) {
  const dense = new Int8Array(10000);
  const shortRows = [new Int16Array(20)];
  shortRows[0][17] = 9;
  const units = { 1: [10, 5, 30], 2: [3, 20, 30], 3: [50, 50, 8], 4: [90, 90, 30], 5: [15, 0, 30], 6: [1, 1, 30], 9: [99, 99, 30] };
  for (const [id, [melee, ranged, age]] of Object.entries(units)) {
    dense[1919 + Number(id)] = Number(id) === 4 ? 0 : 20;
    dense[1717 + Number(id)] = melee;
    dense[1616 + Number(id)] = ranged;
    dense[1414 + Number(id)] = age;
  }
  dense[6464 + tag57] = 57;
  const auxiliaryRows = Array.from({ length: 4 }, () => new Int8Array(8));
  auxiliaryRows[3][0] = 77; // stale, must be cleared
  const state = { O: 0, N: 0, G: 0, eFlag: false, H: 0 };
  refreshLegacyAuxiliaryTag({
    dense, shortRows, auxiliaryRows,
    packedBytes: new Int8Array(400), packedOffsets: new Int16Array(400), saveOffsets: buildInertSaveOffsets(),
  }, state, flag);
  return { picks: [1, 2, 3].map((slot) => auxiliaryRows[slot][0]), dense, state };
}
{
  const { picks, dense } = rankingCase(false, 6);
  assert.deepEqual(picks, [2, 5, 1]);
  assert.equal(dense[8933], 4);
  assert.equal(dense[6464 + 2], 0, "without the flag no 57 tag is written");
}
{
  // Unit 6 (score 1) carries last time's 57 tag: with the flag it takes slot 1.
  const { picks, dense, state } = rankingCase(true, 6);
  assert.deepEqual(picks, [6, 2, 5]);
  assert.equal(state.eFlag, true);
  assert.equal(dense[6464 + 6], 57);
}
{
  // Once the tagged unit is placed, later units only compete for slots 2..3.
  const { picks, dense } = rankingCase(true, 1);
  assert.deepEqual(picks, [1, 2, 5]);
  assert.equal(dense[6464 + 1], 57);
}

// b.f(): undo c(boolean). Two events in a row must not loop the 8994 list.
{
  const dense = new Int8Array(10000);
  const shortRows = [new Int16Array(20)];
  shortRows[0][17] = 9;
  const packedBytes = new Int8Array(400);
  const packedOffsets = new Int16Array(400);
  packedOffsets[186] = 10; packedOffsets[187] = 20; packedOffsets[188] = 30;
  packedBytes[10 + 1] = 29; // category 29 (2929, the mode) is the first saved field
  packedBytes[30 + 1] = -100;
  const saveOffsets = new Int16Array(570);
  for (let k = 0; k < 570; k += 1) saveOffsets[k] = 101 * k;
  for (const id of [2, 5, 9]) { dense[1919 + id] = 20; dense[1414 + id] = 30; dense[1717 + id] = id; dense[2929 + id] = 40 + id; }
  const auxiliaryRows = Array.from({ length: 4 }, () => new Int8Array(8));
  const state = { O: 0, N: 0, G: 0, eFlag: false, H: 0 };
  const input = { dense, shortRows, auxiliaryRows, packedBytes, packedOffsets, saveOffsets };
  for (let event = 0; event < 2; event += 1) {
    refreshLegacyAuxiliaryTag(input, state, false);
    assert.equal(dense[2929 + 5], -100, "c(int,int) overwrote the saved field");
    const chain = []; for (let c = dense[8994]; c > 0 && chain.length < 10; c = dense[4545 + c]) chain.push(c);
    assert.deepEqual(chain, [2, 5, 9], "party list: slot 2, slot 1, then the chief");
    restoreLegacyAuxiliary(input, state);
    assert.deepEqual([dense[2929 + 2], dense[2929 + 5], dense[2929 + 9]], [42, 45, 49]);
    assert.equal(dense[8994], 0);
    assert.equal(dense[8933], 0, "8933 = H");
  }
}

console.log("b.b(III)/b.c(boolean) raw auxiliary queue OK");
