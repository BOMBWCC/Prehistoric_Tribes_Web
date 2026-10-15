// private boolean c() (#356), bytecode/b-javap.txt offsets 0..820.
// Every expectation below is hand-executed off the instruction stream --
// this method had never been ported past offset 180 (the retracted
// "a:[[[B is permanently null" premise), so there was no prior behaviour
// to capture.
import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";
import path from "node:path";

const srcDir = new URL("../src/j2me/", import.meta.url).pathname;
const context = vm.createContext({ Int8Array, Int16Array, Int32Array, Array, console, Math, RangeError });
const cache = new Map();

function loadModule(specifier, fromDir) {
  const absPath = path.resolve(fromDir, specifier) + ".ts";
  if (cache.has(absPath)) return cache.get(absPath).exports;
  const module = { exports: {} };
  cache.set(absPath, module);
  const output = ts.transpileModule(fs.readFileSync(absPath, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const localRequire = (spec) => loadModule(spec, path.dirname(absPath));
  const fn = vm.compileFunction(output, ["module", "exports", "require"], { parsingContext: context });
  fn(module, module.exports, localRequire);
  return module.exports;
}

const { stepLegacySubsystemEntityPathStep } = loadModule("./LegacySubsystemEntityPathStep", srcDir);

const ID = 3;
const makeGrid = () => Array.from({ length: 96 }, () => new Int8Array(96));
// f.g() offsets 429..442: multianewarray [[[B 2, 101, 80.
const makeRoute = () => [0, 1].map(() => Array.from({ length: 101 }, () => new Int8Array(80)));
const makeScalars = () => ({ bField10: 0, bField12: 0, bField14: 0, bField137: false, bField232: 0 });

function run(overrides = {}) {
  const calls = { n: 0, p: 0, displaced: [] };
  const input = {
    state: new Int8Array(10000),
    id: ID,
    team: 0,
    route: makeRoute(),
    gridC: makeGrid(),
    packedBytes: new Int8Array(4000),
    packedOffsets: new Int16Array(320),
    saveOffsets: new Int16Array(600),
    visibilityBits: [[new Int32Array(32)], [new Int32Array(32)]],
    scalars: makeScalars(),
    onN: () => { calls.n += 1; },
    onP: () => { calls.p += 1; },
    onDisplace: (occupant) => { calls.displaced.push(occupant); },
    ...overrides,
  };
  // A route long enough for the cursor (the route-end guard below needs 808 > 707).
  if (input.state[808 + ID] === 0) input.state[808 + ID] = 50;
  const result = stepLegacySubsystemEntityPathStep(input);
  return { result, input, calls };
}

// --- offsets 0..46: three independent early-outs, none of which touch
// anything. ---
for (const [offset, value] of [[202, 5], [303, 5], [1313, -1]]) {
  const state = new Int8Array(10000);
  state[offset + ID] = value;
  const { result, calls, input } = run({ state });
  assert.equal(result, false, `dense[${offset}+id] gate returns false`);
  assert.equal(calls.n + calls.p, 0);
  assert.equal(input.state[707 + ID], 0, "the step cursor must not advance");
}

// --- offsets 49..155: the direction byte, then 801..818: the cursor. ---
{
  const state = new Int8Array(10000);
  state[ID] = 20;        // x
  state[101 + ID] = 30;  // y
  state[707 + ID] = 2;   // step cursor
  state[2929 + ID] = 6;  // &255 <= 7, so the cursor advances
  const route = makeRoute();
  route[0][ID][2] = 21;  // waypoint x -> dx = 21 - 20 + 1 = 2
  route[1][ID][2] = 30;  // waypoint y -> dy = 30 - 30 + 1 = 1
  const packedBytes = new Int8Array(4000);
  const packedOffsets = new Int16Array(320);
  packedOffsets[4] = 700;
  packedBytes[700 + 2 * 3 + 1] = 5; // po[4] + dx*3 + dy
  packedOffsets[1] = 900;
  packedBytes[900 + 5] = 1;         // x delta for direction 5
  packedBytes[900 + 8 + 5] = -1;    // y delta for direction 5

  const gridC = makeGrid();
  const { result, calls, input } = run({ state, route, packedBytes, packedOffsets, gridC });

  assert.equal(input.state[606 + ID], 5, "e[606+v] = pb[po[4] + (ax-x+1)*3 + (ay-y+1)]");
  assert.equal(calls.n, 0, "nothing throws, so the [49,156] handler never runs");
  assert.equal(result, false);
  // 614..770: the cell being stepped into is (20+1, 30-1).
  assert.equal(input.scalars.bField10, 21);
  assert.equal(input.scalars.bField12, 29);
  assert.equal(gridC[29][21], -128, "gridC[D:I][C:I] = -128");
  assert.equal(input.state[4545 + ID], 0, "the cell was empty, so no saved occupant");
  assert.equal(input.state[707 + ID], 3, "cursor advanced by one");
  assert.equal(input.state[4848 + ID], 0);
}

// --- offsets 709..754: an occupied destination is saved, negated, into
// dense[4545+v] before being overwritten. ---
{
  const state = new Int8Array(10000);
  state[2929 + ID] = 6;
  const gridC = makeGrid();
  gridC[0][0] = 111;
  run({ state, gridC });
  assert.equal(state[4545 + ID], -111);
  assert.equal(gridC[0][0], -128);
}

// --- offsets 159..179: the catch path. A step cursor past the 80-column
// route row is exactly what the original's own handler exists for. ---
{
  const state = new Int8Array(10000);
  state[707 + ID] = 80; // one past the end of byte[2][101][80]
  state[808 + ID] = 100;
  const { result, calls, input } = run({ state });
  assert.equal(result, true, "the handler returns true, which makes u() bail");
  assert.equal(calls.n, 1, "N() runs");
  assert.equal(input.state[808 + ID], 0);
  assert.equal(input.state[707 + ID], 80, "the cursor is NOT advanced on this path");
}

// --- offsets 180..402: waypoint occupied AND #272 rejects it -> p(), true.
// checkLegacyCellCompatibility's step-5 default is "accept", and its
// earlier rejects all need a nonzero grid value in specific ranges, so a
// plain occupied cell reaches the accept path. ---
{
  const state = new Int8Array(10000);
  state[2929 + ID] = 6;
  state[6161 + ID] = 1;
  state[2828 + ID] = 3;   // 0 or 3 -> bumped by one
  state[4444 + ID] = 0;   // keeps #272's step-1 lookup out of the reject range
  const route = makeRoute();
  route[0][ID][0] = 4;
  route[1][ID][0] = 6;
  const gridC = makeGrid();
  gridC[6][4] = 55;       // occupied
  const visibilityBits = [[new Int32Array(96)], [new Int32Array(96)]];
  visibilityBits[0][0][6] = 0xffffffff | 0; // step 2 needs the bit set
  const scalars = makeScalars();
  scalars.bField232 = 2;  // y:B > 1
  const { result, calls, input } = run({ state, route, gridC, visibilityBits, scalars });

  assert.equal(result, true, "occupied + incompatible returns true after p()");
  assert.equal(calls.p, 1);
  assert.equal(input.state[2828 + ID], 4, "type 3 is bumped to 4");
  assert.equal(input.state[6161 + ID], 0, "a pending order is cleared");
  assert.equal(input.state[707 + ID], 0, "this branch returns before the cursor advance");
}

// --- offsets 459..596: an occupant inside THIS team's own 50-slot id range
// is displaced instead. team 0 owns (0, 50]. ---
{
  const state = new Int8Array(10000);
  state[2929 + ID] = 6;
  const route = makeRoute();
  route[0][ID][0] = 4;
  route[1][ID][0] = 6;
  const gridC = makeGrid();
  gridC[6][4] = 41; // in (0*50, 1*50]
  state[4848 + ID] = 9;
  const { calls, input } = run({ state, route, gridC });
  assert.deepEqual(calls.displaced, [41]);
  assert.equal(input.state[4848 + ID], 9, "the displace branch does NOT clear dense[4848+v]");
}
{
  const state = new Int8Array(10000);
  state[2929 + ID] = 6;
  const route = makeRoute();
  route[0][ID][0] = 4;
  route[1][ID][0] = 6;
  const gridC = makeGrid();
  gridC[6][4] = 51; // team 1's range, not team 0's
  state[4848 + ID] = 9;
  const { calls, input } = run({ state, route, gridC, team: 0 });
  assert.deepEqual(calls.displaced, []);
  assert.equal(input.state[4848 + ID], 0);
}

// --- offsets 614..618 and 793..800: E:I gates both the cell claim and the
// cursor advance. ---
{
  const state = new Int8Array(10000);
  state[2929 + ID] = 6;
  const scalars = makeScalars();
  scalars.bField14 = 2;
  const gridC = makeGrid();
  const { input } = run({ state, gridC, scalars });
  assert.equal(gridC[0][0], 0, "E:I != 0 skips the gridC claim");
  assert.equal(input.state[707 + ID], 0, "E:I >= 2 skips the cursor advance");
}
// --- offset 771..790: a state code above 7 also blocks the advance. ---
{
  const state = new Int8Array(10000);
  state[2929 + ID] = 8;
  const { input } = run({ state });
  assert.equal(input.state[707 + ID], 0);
}

// Deliberate deviation (not in the bytecode): a finished route (707 >= 808)
// is handled like the catch -- N(), 808 = 0 -- instead of reading stale
// waypoints and stepping in a garbage direction.
{
  const state = new Int8Array(10000);
  state[ID] = 5; state[101 + ID] = 19; state[2929 + ID] = 7;
  state[707 + ID] = 1; state[808 + ID] = 1;
  const gridC = makeGrid();
  gridC[20][6] = 52; // an enemy standing next to the unit
  const { result, calls, input } = run({ state, gridC });
  assert.equal(result, true);
  assert.equal(calls.n, 1);
  assert.equal(input.state[808 + ID], 0);
  assert.equal(input.state[707 + ID], 1, "no step taken");
  assert.equal(gridC[20][6], 52, "the neighbour's cell is left alone");
}

// Deliberate deviation (not in the bytecode): no unit steps outside the play
// area, and a crawling child (type 17) also not into unexplored fog; it
// re-picks a target like the offset-159 catch (N(), 808 = 0).
{
  const packedBytes = new Int8Array(4000);
  const packedOffsets = new Int16Array(320);
  packedOffsets[1] = 100;
  packedBytes[100 + 2] = 1; // heading 2: dx = +1, dy = 0
  const route = makeRoute();
  route[0][ID][0] = 40; route[1][ID][0] = 5; // waypoint east of a unit at (39, 5)
  const make = (type, fog = 0) => {
    const state = new Int8Array(10000);
    state[ID] = 39; state[101 + ID] = 5; state[2828 + ID] = type; state[808 + ID] = 4;
    packedOffsets[4] = 200;
    packedBytes[200 + 2 * 3 + 1] = 2; // (dx+1)*3 + (dy+1) -> heading 2
    return run({ state, route, packedBytes, packedOffsets, mapWidth: 40, mapHeight: 32, fogClass: () => fog });
  };
  const child = make(17);
  assert.equal(child.result, true);
  assert.equal(child.calls.n, 1);
  assert.equal(child.input.state[808 + ID], 0);
  assert.equal(child.input.state[707 + ID], 0, "no step taken");
  const adult = make(69);
  assert.equal(adult.calls.n, 1, "adults may not leave the map either");
  assert.equal(adult.input.state[707 + ID], 0);
  const intoFog = make(69, 2);
  assert.equal(intoFog.calls.n, 1);
  route[0][ID][0] = 38; // a waypoint inside the map: heading west
  packedBytes[100 + 6] = -1; packedBytes[200 + 0 * 3 + 1] = 6;
  const inside = make(69, 2);
  assert.equal(inside.calls.n, 0, "adults may still walk into fog inside the map");
  const childFog = make(17, 2);
  assert.equal(childFog.calls.n, 1, "children may not");
}

console.log("private boolean c() (entity path step) OK");
