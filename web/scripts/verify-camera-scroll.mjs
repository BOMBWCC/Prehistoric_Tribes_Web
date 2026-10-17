import assert from "node:assert/strict";
import ts from "typescript";
import vm from "node:vm";
import fs from "node:fs";

const path = new URL("../src/render/LegacyCameraScroll.ts", import.meta.url).pathname;
const output = ts.transpileModule(fs.readFileSync(path, "utf8"), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const module = { exports: {} };
vm.runInNewContext(output, { module, exports: module.exports });
const { stepLegacyCameraScroll } = module.exports;

const viewport = { columns: 12, rows: 19 };

function freshState() {
  return {
    rowScrollDelta: 0,
    columnScrollDelta: 0,
    pixelColumnOffset: 0,
    pixelRowOffset: 0,
    scrollTargetColumn: 0,
    scrollTargetRow: 0,
    followFlag: false,
    cFlag: false,
    bFlag: false,
    dFlag: false,
    aiScratch: 0,
    sFlag: false,
  };
}

// Both deltas nonzero -> sets followFlag, which triggers the full-recenter
// branch: full redraw, deltas cleared, aj/ak stay 0 (bytecode offsets 0..34).
{
  const state = freshState();
  state.rowScrollDelta = 3;
  state.columnScrollDelta = 2;
  let redraws = 0;
  stepLegacyCameraScroll(state, viewport, 99, { onRedraw: () => { redraws += 1; } });
  assert.equal(redraws, 1);
  assert.equal(state.followFlag, false);
  assert.equal(state.cFlag, false);
  assert.equal(state.scrollTargetColumn, 11);
  assert.equal(state.scrollTargetRow, 18);
  assert.equal(state.rowScrollDelta, 0);
  assert.equal(state.columnScrollDelta, 0);
  assert.equal(state.pixelColumnOffset, 0);
  assert.equal(state.pixelRowOffset, 0);
}

// followFlag already true (independent of deltas) -> same recenter branch.
{
  const state = freshState();
  state.followFlag = true;
  const calls = [];
  stepLegacyCameraScroll(state, viewport, 5, {
    onRedraw: () => calls.push("redraw"),
    onPartialBlit: (...args) => calls.push(args),
  });
  // No offset-134 restore blit; the branch ends in `goto 405`, so the
  // redrawn layer is copied back into the clean image.
  assert.deepEqual(calls, ["redraw", [0, 0, 5, 0, 1]]);
  assert.equal(state.scrollTargetColumn, viewport.columns - 1);
  assert.equal(state.scrollTargetRow, viewport.rows - 1);
}

// columnScrollDelta only: partial blit with aj = -delta*22, then the
// column-scroll redraw branch (bytecode offsets 55..134, 176..235).
{
  const state = freshState();
  state.columnScrollDelta = 4;
  const blits = [];
  let redraws = 0;
  stepLegacyCameraScroll(state, viewport, 42, {
    onRedraw: () => { redraws += 1; },
    onPartialBlit: (x, y, h, g, i) => blits.push([x, y, h, g, i]),
  });
  assert.equal(state.aiScratch, 0);
  assert.equal(state.pixelColumnOffset, ((4 - 2) / 2 + 1) * (viewport.columns - 1));
  assert.equal(state.scrollTargetColumn, state.pixelColumnOffset);
  assert.equal(state.pixelRowOffset, 0);
  assert.equal(state.scrollTargetRow, viewport.rows - 1);
  assert.equal(state.columnScrollDelta, 0);
  assert.equal(redraws, 1);
  // First blit: pre-redraw partial (aj=-4*22=-88, ak=0), Graphics[1]/Image[0].
  assert.deepEqual(blits[0], [-88, 0, 42, 1, 0]);
  // Second blit: post-branch final partial (0,0), Graphics[0]/Image[1],
  // gated on scrollTargetRow!=-1 && !sFlag.
  assert.deepEqual(blits[1], [0, 0, 42, 0, 1]);
}

// rowScrollDelta only: mirrors the column case on the other axis.
{
  const state = freshState();
  state.rowScrollDelta = 4;
  let redraws = 0;
  stepLegacyCameraScroll(state, viewport, 0, { onRedraw: () => { redraws += 1; } });
  assert.equal(state.pixelRowOffset, ((4 - 2) / 2 + 1) * (viewport.rows - 1));
  assert.equal(state.scrollTargetRow, state.pixelRowOffset);
  assert.equal(state.pixelColumnOffset, 0);
  assert.equal(state.scrollTargetColumn, viewport.columns - 1);
  assert.equal(redraws, 1);
}

// cFlag: fixed 3-row scroll-back redraw (bytecode offsets 296..349).
{
  const state = freshState();
  state.cFlag = true;
  let redraws = 0;
  stepLegacyCameraScroll(state, viewport, 0, { onRedraw: () => { redraws += 1; } });
  assert.equal(state.cFlag, false);
  assert.equal(state.pixelColumnOffset, 0);
  assert.equal(state.scrollTargetColumn, viewport.columns - 1);
  assert.equal(state.pixelRowOffset, viewport.rows - 1 - 3);
  assert.equal(state.scrollTargetRow, viewport.rows - 1);
  assert.equal(redraws, 1);
}

// bFlag: full-window redraw with dFlag held true only during the call.
{
  const state = freshState();
  state.bFlag = true;
  let dFlagDuringRedraw;
  stepLegacyCameraScroll(state, viewport, 0, {
    onRedraw: () => { dFlagDuringRedraw = state.dFlag; },
  });
  assert.equal(state.bFlag, false);
  assert.equal(dFlagDuringRedraw, true);
  assert.equal(state.dFlag, false);
  assert.equal(state.pixelColumnOffset, 0);
  assert.equal(state.scrollTargetColumn, viewport.columns - 1);
  assert.equal(state.pixelRowOffset, 0);
  assert.equal(state.scrollTargetRow, viewport.rows - 1);
}

// No deltas/flags at all: the offset-134 blit is unconditional (fires with
// aj=ak=0 since neither delta is set), but scrollTargetRow stays at its
// reset -1 so the *trailing* offset-405 blit must NOT also fire.
{
  const state = freshState();
  const blits = [];
  stepLegacyCameraScroll(state, viewport, 7, { onPartialBlit: (...args) => blits.push(args) });
  assert.equal(state.scrollTargetRow, -1);
  assert.deepEqual(blits, [[0, 0, 7, 1, 0]]);
}

// sFlag suppresses the trailing partial blit even when scrollTargetRow!=-1.
{
  const state = freshState();
  state.columnScrollDelta = 4;
  state.sFlag = true;
  const blits = [];
  stepLegacyCameraScroll(state, viewport, 0, { onPartialBlit: (...args) => blits.push(args) });
  // Only the pre-redraw blit should fire; the trailing one is suppressed.
  assert.equal(blits.length, 1);
}

// BUG FIX (2026-09-03): LegacyRuntimeState.stepCameraScroll() (the runtime
// owner of f.n(), called every tick main.ts routes through vByte===1) reads
// `game.cameraBFlag` into `cameraScrollState.bFlag` before the call above,
// but never wrote the result back to `game.cameraBFlag` afterward -- despite
// writing back every OTHER field on cameraScrollState. `LegacyCameraFollow.ts`
// (f.Y(), the D-pad cursor driver) has `if (state.cameraBFlag) return;` as
// its very first line, so once anything set the real field true (e.g. the
// effect-rect marker `c(IIII)`'s unconditional `state.B = true`, which fires
// routinely during normal gameplay ticks), the missing write-back meant it
// could never be observed as reset by stepLegacyCameraScroll's own
// `bFlag`-branch reset (asserted directly above), permanently blocking
// direction-key cursor movement. This is an integration-level test (through
// LegacyRuntimeState, not the pure stepLegacyCameraScroll tested above)
// because the bug is in the wiring, not the ported method body.
{
  const stateMod = await import("node:vm");
  const tsMod = await import("typescript");
  const fsMod = await import("node:fs");
  const pathMod = await import("node:path");
  const srcDir = new URL("../src/", import.meta.url).pathname;
  const context = stateMod.createContext({ Int8Array, Int16Array, Int32Array, Array, console, Math });
  const cache = new Map();
  function loadModule(specifier, fromDir) {
    const absPath = pathMod.resolve(fromDir, specifier) + ".ts";
    if (cache.has(absPath)) return cache.get(absPath).exports;
    const module = { exports: {} };
    cache.set(absPath, module);
    const source = fsMod.readFileSync(absPath, "utf8");
    const output = tsMod.transpileModule(source, {
      compilerOptions: { module: tsMod.ModuleKind.CommonJS, target: tsMod.ScriptTarget.ES2022 },
    }).outputText;
    const localRequire = (spec) => loadModule(spec, pathMod.dirname(absPath));
    const fn = stateMod.compileFunction(output, ["module", "exports", "require"], { parsingContext: context });
    fn(module, module.exports, localRequire);
    return module.exports;
  }
  const { LegacyRuntimeState } = loadModule("./core/LegacyRuntimeState", srcDir);

  const rt = new LegacyRuntimeState();
  rt.game.cameraBFlag = true; // simulate an effect-rect marker having fired earlier this tick
  rt.stepCameraScroll();
  assert.equal(
    rt.game.cameraBFlag,
    false,
    "f.n()'s one-shot bFlag reset must propagate back to game.cameraBFlag, not just the throwaway cameraScrollState copy",
  );
}

console.log("f.n() camera pixel-scroll handler OK");
