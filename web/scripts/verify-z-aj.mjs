import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import vm from "node:vm";

const file = new URL("../src/j2me/LegacyZAj.ts", import.meta.url).pathname;
const output = ts.transpileModule(fs.readFileSync(file, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(output, { module, exports: module.exports });
const { stepLegacyZAj } = module.exports;

// l already points at an in-bounds row (dense[1919+l] > 0): no scanning needed.
{
  const dense = new Int8Array(4000);
  dense[1919 + 5] = 1;
  const state = {
    entityFocusFlag: false, as: 9, frameLayoutAX: 9, kByte: 9,
    frameLayoutL: 5, pendingP: false, dense,
  };
  stepLegacyZAj(state);
  assert.equal(state.entityFocusFlag, true);
  assert.equal(state.as, 0);
  assert.equal(state.frameLayoutAX, 0);
  assert.equal(state.kByte, 0);
  assert.equal(state.frameLayoutL, 5);
  assert.equal(state.pendingP, true);
}

// l starts at a zeroed-out row: scans forward until it finds a positive one.
{
  const dense = new Int8Array(4000);
  dense[1919 + 7] = 3;
  const state = {
    entityFocusFlag: false, as: 1, frameLayoutAX: 1, kByte: 1,
    frameLayoutL: 4, pendingP: false, dense,
  };
  stepLegacyZAj(state);
  assert.equal(state.frameLayoutL, 7);
  assert.equal(state.pendingP, true);
}

console.log("stepLegacyZAj (private void aj(), lowercase) OK");

// Regression (2026-09-03, array-bounds-loop-terminator sweep): real Java's
// `l` is `f`'s own byte field (`l:B`, #337) and the loop's own increment is
// `l=(byte)(l+1)` (`i2b` right after `iadd`, bytecode offset 36..47) --
// wrapping through the FULL signed-byte cycle (0..127, -128..-1) every 256
// iterations, not an unbounded int walk. Since the read is `dense[1919+l]`
// (base offset 1919 keeps the effective index in 1791..2046, well inside
// `f.e`'s real 9983-byte length), the original never throws here -- it
// finds a positive value purely by wrapping through that 256-value cycle.
// This case starts `l` at 127 (about to wrap) with the only positive entry
// sitting at l=-128 (dense[1791]) -- reachable ONLY by wrapping negative.
// Before the fix (`git stash`, `timeout 8s`), `frameLayoutL` incremented as
// a plain unbounded number: it walked straight past 127 to 128, 129, ...
// forever (this dense array never has a real positive entry ahead of it,
// only behind, at the wrapped-negative index), reproducing the exact
// "no exception, no console output" infinite spin this sweep targets --
// confirmed via `timeout 8s node scripts/verify-z-aj.mjs` exiting 124
// against the pre-fix code. After the fix, byte-wraparound finds the
// wrapped entry in exactly 2 iterations.
{
  const dense = new Int8Array(4000);
  dense[1919 - 128] = 5; // only reachable via l wrapping to -128
  const state = {
    entityFocusFlag: false, as: 1, frameLayoutAX: 1, kByte: 1,
    frameLayoutL: 127, pendingP: false, dense,
  };
  stepLegacyZAj(state);
  assert.equal(state.frameLayoutL, -128);
  assert.equal(state.pendingP, true);
}

console.log("stepLegacyZAj byte-wraparound regression OK");
