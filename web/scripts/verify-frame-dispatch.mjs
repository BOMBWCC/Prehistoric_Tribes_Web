import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";

const cache = new Map();
function loadModule(path) {
  if (cache.has(path)) return cache.get(path).exports;
  const module = { exports: {} };
  cache.set(path, module);
  const source = fs.readFileSync(path, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const localRequire = (specifier) => loadModule(
    `${path.slice(0, path.lastIndexOf("/"))}/${specifier.replace("./", "")}.ts`,
  );
  vm.runInNewContext(output, { module, exports: module.exports, require: localRequire });
  return module.exports;
}

const { selectLegacyFrameHandler } = loadModule(
  `${new URL("../src/ui/LegacyFrameDispatch.ts", import.meta.url).pathname}`,
);
const { stepLegacyFrameDispatch } = loadModule(
  `${new URL("../src/ui/LegacyFrameDispatch.ts", import.meta.url).pathname}`,
);
const table = new Int8Array(220);
const offsets = new Int16Array(312);
offsets[153] = 40;
const game = { missionFrame: -1, screen: 14 };
assert.equal(selectLegacyFrameHandler(game, table, offsets, 153), "NONE");
table[40 + 14] = 1;
assert.equal(selectLegacyFrameHandler(game, table, offsets, 153), "G");
game.missionFrame = 0;
assert.equal(selectLegacyFrameHandler(game, table, offsets, 153), "H");
table[40 + 14] = 0;
for (const [q, handler] of [[23, "I"], [15, "J"], [17, "P"], [20, "K"], [19, "L"], [25, "M"], [27, "N"], [32, "Q32"]]) {
  assert.equal(selectLegacyFrameHandler({ missionFrame: 0, screen: q }, table, offsets, 153), handler);
}

const inline = {
  missionFrame: 0, screen: 18, H: true, N: 0, c1: 7,
  flags: Array.from({ length: 20 }, () => false),
};
const calls = [];
stepLegacyFrameDispatch({
  state: inline,
  packedBytes: table,
  packedOffsets: offsets,
  stateTableIndex: 153,
  onPrimitive: (...args) => calls.push(args),
});
assert.equal(inline.H, false);
assert.equal(inline.N, 7);
assert.equal(inline.flags[11], true);
assert.equal(inline.flags[13], true);
assert.deepEqual(calls, [[11, 0, 0], [17, 0, 320], [13, 0, 0]]);

const q24Calls = [];
const q24 = { ...inline, screen: 24, H: true, flags: Array.from({ length: 20 }, () => false) };
stepLegacyFrameDispatch({
  state: q24, packedBytes: table, packedOffsets: offsets, stateTableIndex: 153,
  onPrimitive: (...args) => q24Calls.push(args),
});
assert.equal(q24.flags[11], true);
assert.equal(q24.flags[16], true);
assert.deepEqual(q24Calls, [[11, 0, 0], [16, 0, 0], [17, 0, 320]]);
// f-javap.txt offsets 216..279 (Q===24 branch): the H===false path's
// `ifeq 379` (offset 229) jumps PAST all three primitive draws (11/16/17),
// not just the first two -- so a second tick with H already false must
// redraw NOTHING. Bytecode-confirmed 2026-09-04 while tracing the win/lose
// outcome-screen mechanism (this is F()'s draw side for Q=24, the "you've
// won!"/"you have lost!" screen -- see docs/unknowns.md's 2026-09-07 entry).
const q24Repeat = [];
stepLegacyFrameDispatch({
  state: q24, packedBytes: table, packedOffsets: offsets, stateTableIndex: 153,
  onPrimitive: (...args) => q24Repeat.push(args),
});
assert.deepEqual(q24Repeat, []);

const q32 = { ...inline, screen: 32, H: true, flags: Array.from({ length: 20 }, () => false) };
let l3 = 0;
const q32Calls = [];
stepLegacyFrameDispatch({
  state: q32, packedBytes: table, packedOffsets: offsets, stateTableIndex: 153,
  onL3: () => { l3 += 1; }, onPrimitive: (...args) => q32Calls.push(args),
});
assert.equal(l3, 1);
assert.equal(q32.flags[17], true);
assert.deepEqual(q32Calls, [[17, 0, 320]]);
// Same bytecode shape (f-javap.txt offsets 314..379): offset 327's
// `ifeq 379` skips flags[17]/the primitive-17 draw too when H is already
// false, so a second tick must draw nothing and must NOT call onL3 again.
const q32Repeat = [];
let l3Repeat = 0;
stepLegacyFrameDispatch({
  state: q32, packedBytes: table, packedOffsets: offsets, stateTableIndex: 153,
  onL3: () => { l3Repeat += 1; }, onPrimitive: (...args) => q32Repeat.push(args),
});
assert.equal(l3Repeat, 0);
assert.deepEqual(q32Repeat, []);
console.log("f.F raw frame dispatch OK");
