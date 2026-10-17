// private void a(byte) (#285), bytecode/b-javap.txt offsets 0..461.
// Every expectation is hand-executed off the instruction stream.
import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";
import path from "node:path";

const srcDir = new URL("../src/", import.meta.url).pathname;
const context = vm.createContext({ Int8Array, Int16Array, Int32Array, Array, console, Math });
const cache = new Map();
function loadModule(specifier, fromDir) {
  const absPath = path.resolve(fromDir, specifier) + ".ts";
  if (cache.has(absPath)) return cache.get(absPath).exports;
  const module = { exports: {} };
  cache.set(absPath, module);
  const output = ts.transpileModule(fs.readFileSync(absPath, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const fn = vm.compileFunction(output, ["module", "exports", "require"], { parsingContext: context });
  fn(module, module.exports, (spec) => loadModule(spec, path.dirname(absPath)));
  return module.exports;
}
const { stepLegacySubsystemEntityDisplace } = loadModule("./sim/tribe/LegacySubsystemEntityDisplace", srcDir);
const { deriveLegacyEntityStateCode } = loadModule("./sim/tribe/LegacySubsystemEntityStateCode", srcDir);

const grid = () => Array.from({ length: 20 }, () => new Int8Array(20));
function run({ state, gridC = grid(), mover = 3, occupant = 7, commit = false, onMove }) {
  const calls = { commit: [], move: [] };
  const scalars = { bField14: 0 };
  stepLegacySubsystemEntityDisplace({
    state, id: mover, gridC, scalars,
    onActionCommit: (who, code) => { calls.commit.push([who, code]); return commit; },
    onMoveApply: (who) => { calls.move.push(who); onMove?.(who); },
  }, occupant);
  return { calls, scalars, gridC };
}

// --- offsets 14..33 -> 448: #284 turns the swap down. ---
{
  const state = new Int8Array(10000);
  state[7] = 5; state[3] = 4;
  const before = Int8Array.from(state);
  const { calls, scalars } = run({ state, commit: true });
  assert.deepEqual(calls.commit, [[7, -1]], "arg (7) >= u (3) -> action code -1, for the occupant");
  assert.equal(scalars.bField14, 2);
  assert.deepEqual(calls.move, []);
  assert.deepEqual(state, before, "nothing else is touched on that path");
}
{
  const state = new Int8Array(10000);
  const { calls } = run({ state, mover: 3, occupant: 2, commit: true });
  assert.deepEqual(calls.commit, [[2, 0]], "arg (2) < u (3) -> action code 0");
}

// --- the swap: mover 3 at (4,6) steps into occupant 7 at (5,6). ---
{
  const state = new Int8Array(10000);
  state[3] = 4; state[101 + 3] = 6;
  state[7] = 5; state[101 + 7] = 6;
  state[808 + 7] = 9;
  state[6262 + 7] = 5; state[6363 + 7] = 6;   // occupant idle on its own destination
  state[606 + 3] = 2;
  state[1111 + 7] = 0x3f;
  let codeAtMove = null;
  const { calls, scalars, gridC } = run({
    state,
    onMove: (who) => {
      codeAtMove = [state[2929 + who], deriveLegacyEntityStateCode(state, who)];
      state[1111 + who] = 31; // observe the post-D() re-mask
    },
  });
  assert.deepEqual([state[3], state[101 + 3]], [5, 6], "mover now on the occupant's tile");
  assert.deepEqual([state[7], state[101 + 7]], [4, 6], "occupant now on the mover's tile");
  assert.equal(state[808 + 7], 0);
  assert.deepEqual([state[6262 + 7], state[6363 + 7], state[3131 + 7], state[3232 + 7]], [4, 6, 4, 6],
    "destination and target follow the occupant because it was idle on its destination");
  assert.equal(gridC[6][5], 3);
  assert.equal(gridC[6][4], 7);
  assert.equal(state[606 + 7], 6, "(2 + 4) & 7 -- the reverse heading");
  assert.equal(state[4848 + 7], 120);
  assert.equal(state[4848 + 3], 120);
  assert.deepEqual(calls.move, [7]);
  assert.equal(codeAtMove[0], codeAtMove[1], "e[2929+arg] = b(arg) is written before D()");
  assert.equal(state[1111 + 7], 16, "arg (7) > u (3): 31 & 240 after D()");
  assert.equal(scalars.bField14, 1);
}

// --- 143..189 false: an occupant headed elsewhere keeps its destination. ---
{
  const state = new Int8Array(10000);
  state[3] = 4; state[101 + 3] = 6;
  state[7] = 5; state[101 + 7] = 6;
  state[6262 + 7] = 12; state[6363 + 7] = 6;
  state[3131 + 7] = 12; state[3232 + 7] = 6;
  run({ state });
  assert.deepEqual([state[6262 + 7], state[3131 + 7]], [12, 12]);
}

// --- 415..439: arg <= u skips the second mask; the heading wraps. ---
{
  const state = new Int8Array(10000);
  state[3] = 4; state[101 + 3] = 6;
  state[2] = 5; state[101 + 2] = 6;
  state[606 + 3] = 5;
  run({ state, occupant: 2, onMove: (who) => { state[1111 + who] = 31; } });
  assert.equal(state[1111 + 2], 31);
  assert.equal(state[606 + 2], 1, "(5 + 4) & 7");
}

console.log("private void a(byte) (entity displace) OK");
