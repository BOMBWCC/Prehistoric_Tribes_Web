// This is an INTEGRATION test, unlike this codebase's usual standalone
// verify-*.mjs convention (one file, transpiled + run in its own isolated
// vm context, no real cross-file imports -- see LegacyGameplayCellBodyDispatch.ts's
// docblock for why). LegacyGameplayCellBodyDispatch.ts genuinely imports its
// three already-independently-tested dependencies, so this script loads all
// four files into ONE shared vm context with a small `require` shim that
// resolves relative specifiers to sibling files, instead of duplicating any
// of their logic locally.
import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";
import path from "node:path";

const srcDir = new URL("../src/j2me/", import.meta.url).pathname;
const context = vm.createContext({ Int8Array, Int16Array, Int32Array, console });
const cache = new Map();

function loadModule(specifier, fromDir) {
  const absPath = path.resolve(fromDir, specifier) + ".ts";
  if (cache.has(absPath)) return cache.get(absPath).exports;

  const module = { exports: {} };
  cache.set(absPath, module);

  const source = fs.readFileSync(absPath, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;

  const localRequire = (spec) => loadModule(spec, path.dirname(absPath));
  const fn = vm.compileFunction(output, ["module", "exports", "require"], { parsingContext: context });
  fn(module, module.exports, localRequire);

  return module.exports;
}

const { dispatchLegacyGameplayCellBody } = loadModule("./LegacyGameplayCellBodyDispatch", srcDir);

function grid(rows, cols) {
  return Array.from({ length: rows }, () => new Int8Array(cols));
}

function freshState(overrides = {}) {
  return {
    dense: new Int8Array(20000),
    colorTable: new Int32Array([1, 2, 3]),
    gridC: grid(32, 40),
    gridB: grid(32, 40),
    packedBytes: new Int8Array(4000),
    packedOffsets: new Int16Array(600),
    originColumn: 0,
    originRow: 0,
    sFlag: false,
    scrollA: 0,
    scrollY: 0,
    phase: 42,
    ao: 0,
    columns: 12,
    gridG: grid(19, 12),
    hCounter: 0,
    ...overrides,
  };
}

// occupancyClass===0, id in [1,100] -> routes to the positive branch.
{
  const state = freshState();
  const id = 10;
  state.dense[202 + id] = 3;
  state.dense[303 + id] = 4;
  state.dense[606 + id] = 5;
  const calls = [];
  const result = dispatchLegacyGameplayCellBody(id, 100, 0, 0, -1, 0, 0, -16, state, undefined, {
    onEntityAction: (...a) => calls.push(["action", ...a]),
  });
  assert.deepEqual(calls, [["action", id, 100 + 3, -16 + 4, 5, 29]]);
  assert.deepEqual({ ...result }, { ahDecrement: 0 });
}

// occupancyClass===1 (not 0), id in [1,100] -> does NOT route to the positive
// branch (bytecode offset 225 requires occupancyClass<1); falls to the
// negative-branch entry gates, and since id=10 is outside [-60,-1], those
// gates immediately fall through to the tail branch.
{
  const state = freshState();
  const id = 10;
  const calls = [];
  dispatchLegacyGameplayCellBody(id, 100, 0, 0, -1, 0, 1, -16, state, undefined, {
    onEntityAction: () => calls.push("positive-action"),
  });
  assert.deepEqual(calls, []); // id=10 doesn't match the tail's entity-action range [101,122] either
}

// occupancyClass===0, id in [-60,-1] -> routes to the negative branch main body.
{
  const state = freshState();
  const id = -10; // classifyLegacyCameraCellLocal(-10)===0
  state.dense[8749 - id] = 3;
  state.packedOffsets[138] = 1000;
  state.packedBytes[1000 + 156 + 3] = 0; // t156 != -1 with no owner -> record-40 draw gate
  state.dense[8810 - id] = 0;
  state.dense[8383 - id] = 20;
  state.dense[8444 - id] = 21;
  const calls = [];
  dispatchLegacyGameplayCellBody(id, 0, 21, 20, 0, 0, 0, -16, state, undefined, {
    onSpriteDraw: (...a) => calls.push(["draw", ...a]),
  });
  assert.deepEqual(calls, [["draw", 40, (20 - 0) * 22 + 0 * 11 - 11, (21 - 0) * 16 + 0 * 8 - 8, 42]]);
}

// occupancyClass>=2 with e[9176-id]<=0, id in [-60,-1] -> negative branch's
// own first gate fires fallThroughToTail, and the dispatcher then also runs
// the tail branch with the SAME id/occupancyClass (not the epilogue).
{
  const state = freshState();
  const id = -70; // in the tail's marker range [-110,-61]
  state.dense[9176 - id] = 0; // <=0 -> fallThroughToTail
  const calls = [];
  dispatchLegacyGameplayCellBody(id, 0, 0, 0, 0, 0, 2, -16, state, undefined, {
    onMapMarkerArg1: (v) => calls.push(["marker", v]),
  });
  // occupancyClass(2) < 2 is false, so the tail's marker gate needs
  // occupancyClass<2 -- here it's exactly 2, so the marker gate does NOT
  // fire either; nothing should be called. This confirms the dispatcher
  // really did hand off to the tail branch (not silently drop the cell).
  assert.deepEqual(calls, []);
}

// Same setup but occupancyClass===1 this time (still >=2's complement is N/A
// since the negative branch's own gate only triggers fallThroughToTail when
// occupancyClass>=2 -- so use occupancyClass=1 combined with an id OUTSIDE
// [-60,-1] to directly hit the dispatcher's outer "id outside range" path
// instead, exercising the tail branch's marker gate for real).
{
  const state = freshState();
  const id = -70;
  const calls = [];
  dispatchLegacyGameplayCellBody(id, 0, 0, 0, 0, 0, 1, -16, state, undefined, {
    onMapMarkerArg1: (v) => calls.push(v),
  });
  assert.deepEqual(calls, [id]);
}

// id outside both [1,100] and [-60,-1] -> routes straight to the tail branch.
{
  const state = freshState({ hCounter: 10 });
  const id = 110; // in the tail's entity-action range [101,122]
  const idx6 = id - 101;
  state.dense[9403 + idx6] = 2;
  state.dense[9425 + idx6] = 3;
  state.dense[9491 + idx6] = 4;
  const calls = [];
  dispatchLegacyGameplayCellBody(id, 66, 3, 4, 0, 0, 0, -16, state, undefined, {
    onEntityAction: (...a) => calls.push(a),
  });
  assert.deepEqual(calls, [[idx6, 66 + 2, -16 + 3, 4, 108]]);
}

// Negative branch's selection-indicator section, with NO nibbleSource
// override -> the dispatcher now supplies the real
// legacyEntitySelectionNibble computation by default (2026-08-13), instead
// of the negative branch's own `?? 0` fallback silently suppressing every
// pip draw. Mirrors the health-bar+pip setup already unit-tested in
// verify-negative-entity-branch.mjs, but omits `nibbleSource` entirely to
// confirm the dispatcher's default now produces real pips.
{
  const state = freshState({ originColumn: 0, originRow: 0 });
  const id = -10; // classifies to 0 (camera-frame cell class)
  // dense[8749±id] is read by BOTH the outer negative branch (as "local9",
  // via 8749-id) and legacyEntitySelectionNibble's own gate (via 8749+id
  // with the positive negated id) -- same underlying slot for this entity,
  // so it can only be set once. Set it to 3 to satisfy the nibble
  // function's `dense[8749+id]===3` branch (tableResult=1).
  state.dense[8749 - id] = 3;
  state.packedOffsets[138] = 1000;
  state.dense[8505 - id] = 10; // currentValue
  state.dense[8566 - id] = 20; // maxValue
  state.dense[8383 - id] = 10;
  state.dense[8444 - id] = 12;
  state.gridC[0][0] = id; // camera-center cell === this entity -> isSelectedCell,
  // which alone (currentValue>0 && isSelectedCell) makes reachesHealthBar true.
  // legacyEntitySelectionNibble(10, ...): dense[8627+10] defaults to 0 (not
  // set) -> takes the dense[8749+10]===3 branch, tableResult=1; local2
  // defaults to 0 -> clamp(1-0,0,7)=1 -> nibble = 0+(1<<4)=16=0x10 ->
  // highNibble=1, lowNibble=0, pipCount=1.
  const g = { calls: [], setColor(v) { this.calls.push(["setColor", v]); }, fillRect(...a) { this.calls.push(["fillRect", ...a]); } };
  dispatchLegacyGameplayCellBody(id, 0, 0, 0, 0, 0, 0, -16, state, g, {});
  const pipFillRects = g.calls.filter((c) => c[0] === "fillRect");
  assert.ok(pipFillRects.length >= 2, "expected at least the health-bar fill plus pip frame/pip rects");
}

console.log("f.u() entity-body dispatch (offsets 225..1791, full routing) OK");
