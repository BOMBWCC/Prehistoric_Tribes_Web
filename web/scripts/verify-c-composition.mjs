import assert from "node:assert/strict";
import fs from "node:fs";
import ts from "typescript";
import vm from "node:vm";

const file = new URL("../src/text/LegacyCComposition.ts", import.meta.url).pathname;
const module = { exports: {} };
const output = ts.transpileModule(fs.readFileSync(file, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
vm.runInNewContext(output, { module, exports: module.exports });
const { composeLegacyC, emitLegacyCRenderRow } = module.exports;

const packedBytes = new Int8Array(400);
const packedOffsets = new Int16Array(312);
packedOffsets[281] = 0;
packedOffsets[283] = 20;
packedOffsets[284] = 30;
packedOffsets[285] = 40;
// Glyph 13 (block 0, remainder 13 < 14: a letter that advances) is 5 wide:
// t281[14] - t281[13]. Remainders >= 14 in block 0 are accents (no advance).
packedBytes[13] = 0;
packedBytes[14] = 5;
packedBytes[20] = 1;
packedBytes[30] = 2;
const byteRows = Array.from({ length: 25 }, () => new Int8Array(64));
const shortRows = Array.from({ length: 11 }, () => new Int16Array(64));
shortRows[1][0] = 0;
shortRows[1][1] = 1;
byteRows[1][0] = 13;
const state = { g: new Int16Array(64), h: new Int16Array(64), r: 0, s: 0, t: 0, q: 0, p: 0, u: 0, v: 0, w: 0, y: 0 };

composeLegacyC(state, packedBytes, packedOffsets, byteRows, shortRows, 10, 20, 10, 30, 0, 1, 0);
assert.equal(state.u, 1);
assert.equal(state.g[0], 0);
assert.equal(state.g[1], 1);
assert.equal(state.r, 24, "second argument is the base Y plus c.b's four-pixel inset");
let edges;
const commands = emitLegacyCRenderRow(state, packedBytes, packedOffsets, byteRows, undefined, 0, undefined, (...args) => { edges = args; });
assert.equal(JSON.stringify(commands), JSON.stringify([{ imageGroup: 0, imageIndex: 25, sourceX: 0, sourceY: 2, width: 5, height: 1, x: 23, y: 32, anchor: 20 }]));
assert.equal(state.h[0], 12, "centred: 11 + (8 - 5) / 2");
assert.deepEqual(edges, [true, true], "f.Q:Z / f.R:Z: at the top and at the end");

// The width sum uses the 7th argument (spacing/font), not the alignment:
// align 3 centres the same 5-pixel glyph at 12, and centres it vertically.
{
  const centred = { ...state, g: new Int16Array(64), h: new Int16Array(64), w: 0, y: 0 };
  composeLegacyC(centred, packedBytes, packedOffsets, byteRows, shortRows, 10, 20, 10, 30, 0, 3, 0);
  assert.equal(centred.h[0], 12);
  assert.equal(centred.r, 24 + Math.trunc((26 - 17) / 2));
}

// c.b() offsets 46..53 reset w (not r): a w left by a previous, later text
// must not break line 0 of this one (2026-09-29: "NOTHING TO DO HERE" ran on
// through the whole string table).
{
  const stale = { ...state, g: new Int16Array(64), h: new Int16Array(64), w: 50, y: 0 };
  composeLegacyC(stale, packedBytes, packedOffsets, byteRows, shortRows, 10, 20, 10, 30, 0, 1, 0);
  assert.equal(stale.u, 1);
  assert.equal(stale.g[1], 1, "line 0 ends at the record's own end");
}

// Overflow/hang regression (2026-09-03): when the wrap branch (bytecode
// offsets 437..541, a raw g[u]=w / h[u-1]=... store with no explicit bounds
// check) fires while `state.w` has not been advanced past the current
// `state.v` (e.g. every byte is a plain "widen q" marker, never one of the
// 42/127/70/73/78 markers that move `w` forward), `state.v = state.w - 1`
// followed by the loop's own `state.v += 1` lands `state.v` back on the
// EXACT SAME byte -- so the same marker re-triggers the same wrap forever.
// In real Java this still terminates: `u` grows by one on every spin, and
// `g[u]=w` throws ArrayIndexOutOfBoundsException the instant `u` reaches
// g's real length. Plain JS typed arrays have no such guarantee -- an
// out-of-bounds `state.g[state.u]` read used to silently return `undefined`
// (`& 0xffff` coerces that to 0, so `state.w > 0` stays true forever) and
// an out-of-bounds write was a silent no-op -- so `u` grew without bound
// and `state.v` never escaped: no exception, no console output, the exact
// "holding a direction key hangs the runtime" bug (see docs/unknowns.md's
// 2026-09-03 entry). Confirmed via `git stash` that this exact call hangs
// against the pre-fix code (run manually with a timeout, not here, since a
// genuine hang would block the whole suite).
const overflowByteRows = Array.from({ length: 25 }, () => new Int8Array(0));
overflowByteRows[1] = new Int8Array(4).fill(50); // block=1, remainder=20: hits the "widen q" arm, never resets w.
const overflowShortRows = Array.from({ length: 11 }, () => new Int16Array(0));
overflowShortRows[1] = new Int16Array(2);
overflowShortRows[1][0] = 0;
overflowShortRows[1][1] = 4; // end -- large enough that only the u-overflow guard can stop the pin.
const overflowState = { g: new Int16Array(64), h: new Int16Array(64), r: 0, s: 0, t: 0, q: 0, p: 0, u: 0, v: 0, w: 0, y: 0 };
// 2026-09-29: that spin was the port's own OR in the wrap test. Offsets
// 437..477 wrap only when the line is too wide AND a break point w past the
// line start exists (or on 127), so text with no break point stays on one
// line and the loop ends normally.
composeLegacyC(overflowState, packedBytes, packedOffsets, overflowByteRows, overflowShortRows, 0, 0, 0, 30, 0, 1, 0);
assert.ok(overflowState.u <= 1, "no break point: never wraps");

// Offsets 80..512 (oracle run 9, frame 21688): 127 skips one byte, a marker > 112 queues
// both tribes' counter as numbers (z == 24: count * 10 + rand(10)), a marker >= 90 is an icon.
{
  const rows = Array.from({ length: 25 }, () => new Int8Array(8));
  rows[1].set([127, 118, 91]); // skip, stats z = 24, icon 561
  const st = { g: new Int16Array(8), h: new Int16Array(8), r: 5, s: 0, t: 2, q: 0, p: 0, u: 1, v: 0, w: 0, y: 0 };
  st.g[0] = 0; st.g[1] = 3; st.h[0] = 40;
  const numbers = []; const icons = []; const rolls = [];
  const pools = [new Int16Array(26), new Int16Array(26)]; pools[0][24] = 3; pools[1][24] = 7;
  emitLegacyCRenderRow(st, packedBytes, packedOffsets, rows, undefined, 0, undefined, undefined, {
    onNumber: (...a) => numbers.push(a), onIcon: (...a) => icons.push(a), pools,
    random: (mask, div) => { rolls.push([mask, div]); return rolls.length; },
  });
  assert.deepEqual(numbers, [[24, 5, 0, "31", 0], [216, 5, 2, "72", 0]]);
  assert.deepEqual(rolls, [[65535, 10], [65535, 10]]);
  assert.deepEqual(icons, [[561, 40, 4]]);
}

console.log("c composition/render rows OK");
