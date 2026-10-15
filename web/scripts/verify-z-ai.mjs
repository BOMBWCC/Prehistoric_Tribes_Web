import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import vm from "node:vm";

const file = new URL("../src/j2me/LegacyZAi.ts", import.meta.url).pathname;
const module = { exports: {} };
const output = ts.transpileModule(fs.readFileSync(file, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
vm.runInNewContext(output, { module, exports: module.exports, Int8Array });
const { stepLegacyZAi } = module.exports;

const flags = Array.from({ length: 12 }, () => false);
flags[2] = true; flags[5] = true; flags[4] = true;
const bFlags = Array.from({ length: 12 }, () => false);
const state = { flags, bFlags, r: new Int8Array([4, 16]), ad: 0, as: 1, ar: 2, aX: 1, aW: 1, q: 0, l: 9, T: false, U: false };
let four;
stepLegacyZAi(state, { onFourFlagReset: (...args) => { four = args; } });
assert.equal(state.bFlags[2], true); assert.equal(state.T, true); assert.equal(state.U, false);
assert.deepEqual(four, [true, false, true, false]);
assert.equal(state.flags[8], true); assert.equal(state.bFlags[8], true);

const low = { flags: Array.from({ length: 12 }, () => false), bFlags: Array.from({ length: 12 }, () => false), r: new Int8Array([2]), ad: 0, as: 0, ar: 1, aX: 0, aW: 1, q: 0, l: 0, T: false, U: false };
stepLegacyZAi(low);
assert.equal(low.flags[7], true); assert.equal(low.bFlags[7], true);

// Build submenu: ad == 6. Offset 195 is `if_icmpeq 240`, which jumps INTO
// `a[8] = b[8] = true; return` -- slot 8 is the Build detail panel. The port
// used to `return` here, so slot 8 was never set and the panel (with the
// Store's "25 / 20" cost float) never drew. r[as] = 2 (hut) is chosen so the
// non-Build path would have lit slot 7 instead, which must NOT happen.
{
  const build = { flags: Array.from({ length: 12 }, () => false), bFlags: Array.from({ length: 12 }, () => false), r: new Int8Array([2, 6, 4]), ad: 6, as: 0, ar: 3, aX: 0, aW: 3, q: 0, l: 0, T: true, U: false };
  build.flags[8] = true; build.flags[7] = true; // stale values the method clears first
  stepLegacyZAi(build);
  assert.equal(build.flags[8], true, "ad == 6 lights slot 8 (offsets 190..256)");
  assert.equal(build.bFlags[8], true);
  assert.equal(build.flags[7], false, "slot 7 is cleared and not re-lit on the Build path");
  assert.equal(build.bFlags[7], false);
  // offsets 8..57, ad == 6: T = as > 0, U = as < ar - 1
  assert.equal(build.T, false); assert.equal(build.U, true);
}

console.log("f.ai() transition flags OK");
