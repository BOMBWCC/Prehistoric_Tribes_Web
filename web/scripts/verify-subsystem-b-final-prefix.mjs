import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";

const path = `${new URL("../src/j2me/LegacySubsystemBFinalPrefix.ts", import.meta.url).pathname}`;
const output = ts.transpileModule(fs.readFileSync(path, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(output, { module, exports: module.exports, Math });
const { stepLegacySubsystemBFinalPrefix } = module.exports;

// b() returns false on every path through offsets 1185..1477 (1477 is
// `iconst_0; ireturn` and every branch is a goto into it), so this range is
// checked by its side effects, not by a return value.
const make = () => ({ state: new Int8Array(10000), id: 4, frame: 0, B: () => 1 });

const run = (fields, hooks = {}) => {
  const calls = { q: 0, n: 0, an: 0, p: 0, cell: [] };
  stepLegacySubsystemBFinalPrefix({
    ...fields,
    onCellValue: (x, y, layer) => { calls.cell.push([x, y, layer]); return hooks.z ?? 30; },
    entityAt: hooks.entityAt ?? (() => 4),
    onQ: () => { calls.q += 1; },
    onN: () => { calls.n += 1; },
    onAn: () => { calls.an += 1; },
    onP: () => { calls.p += 1; },
  });
  return calls;
};

// --- offsets 1378..1476: the gate chain, all four conditions satisfied. ---
{
  const f = make();
  f.state[808 + 4] = 1;
  f.state[707 + 4] = 2;
  f.state[4] = 8;
  f.state[101 + 4] = 9;
  const c = run(f);
  assert.equal(c.p, 1, "p() runs when 5050==0, 808<=707, z/10>B and the cell holds this id");
  assert.deepEqual(c.cell, [[8, 9, 0]], "z:I comes from a(e[0+v], e[101+v], 0)");
  // standingOnOwnCell (entityAt===id) plus e[4444+4]===0 -> the >=0 arm.
  assert.equal(c.q, 1);
  assert.equal(c.n + c.an, 0);
}

// --- offset 1437: the cell must still hold this entity's own id. ---
{
  const f = make();
  f.state[4] = 8;
  f.state[101 + 4] = 9;
  const c = run(f, { entityAt: () => 5 });
  assert.equal(c.p, 0, "p() must not run when another id occupies the cell");
  assert.equal(c.q + c.n + c.an, 0, "entityAt!==id and type 0: the 1185 block is skipped");
}

// --- offset 1423: z/10 must exceed B. ---
{
  const f = make();
  f.B = () => 2;
  const c = run(f, { z: 20 });
  assert.equal(c.p, 0, "z/10 == B is not > B");
}

// --- B:I is read when the gate runs (oracle run 4, frame 9454): a type change earlier in b()
// rewrote it, and the gate must see the new value, not one captured on entry. ---
{
  let b = 1;
  const f = make();
  f.B = () => b;
  stepLegacySubsystemBFinalPrefix({
    ...f,
    onCellValue: () => { b = 3; return 30; }, // stands in for the earlier a(int,byte)
    entityAt: () => 4,
    onP: () => { throw new Error("z/10 == 3 is not > the new B"); },
  });
}

// --- REGRESSION (2026-09-10): offsets 1346..1375 run BEFORE the 1378 and
// 1394 gates. This port used to call onCellValue only after both, so z:I
// was never written for any entity that had a pending path. ---
{
  const f = make();
  f.state[5050 + 4] = 1; // 1378 gate trips
  const c = run(f);
  assert.deepEqual(c.cell, [[0, 0, 0]], "z:I is written even when the 5050 gate returns");
  assert.equal(c.p, 0);
}
{
  const f = make();
  f.state[808 + 4] = 4; // 1394 gate trips: 4 > 0
  f.state[707 + 4] = 0;
  const c = run(f);
  assert.deepEqual(c.cell, [[0, 0, 0]], "z:I is written even when the 808>707 gate returns");
  assert.equal(c.p, 0);
}

// --- offsets 1275..1342: the q()/N()/an() dispatch off e[4444+v]. ---
{
  const f = make();
  f.state[4444 + 4] = -5; // < -1 -> N()
  assert.equal(run(f).n, 1);
}
{
  const f = make();
  f.state[4444 + 4] = -1;
  f.frame = 4; // (4 & 63) === (id 4 & 63) -> an()
  assert.equal(run(f).an, 1);
}
{
  const f = make();
  f.state[4444 + 4] = -1;
  f.frame = 5; // mismatch -> nothing
  const c = run(f);
  assert.equal(c.q + c.n + c.an, 0);
}
// Types 93/92/106 enter the block even when another id occupies the cell.
for (const type of [93, 92, 106]) {
  const f = make();
  f.state[2828 + 4] = type;
  f.state[4444 + 4] = -5;
  assert.equal(run(f, { entityAt: () => 5 }).n, 1, `type ${type} enters the 1185 block regardless of the occupant`);
}
{
  const f = make();
  f.state[2828 + 4] = 91; // not one of 93/92/106
  f.state[4444 + 4] = -5;
  assert.equal(run(f, { entityAt: () => 5 }).n, 0);
}

console.log("b() final prefix (offsets 1185..1477) OK");
