import "./styles.css";
import { Anchor } from "./j2me/anchors";
import { LogicalCanvas } from "./j2me/Canvas";
import { ImageResource } from "./j2me/Image";
import { loadOriginalResources } from "./ResourceBootstrap";
import { FixedLoop } from "./j2me/FixedLoop";
import { attachOriginalKeyboard, KeyState } from "./j2me/Input";
import { LegacyRuntimeState } from "./j2me/LegacyRuntimeState";
import { stepLegacyPaintScreen } from "./j2me/LegacyPaintScreen";
// The Chinese strings; docs/translation-zh-CN.json is their single source.
import zhTranslation from "../../docs/translation-zh-CN.json";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("App mount point is missing");

const canvas = new LogicalCanvas(240, 320);
app.append(canvas.element);
const runtime = new LegacyRuntimeState();
const isDevelopmentHost = window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost";
if (isDevelopmentHost) {
  (window as Window & { __prehistoricRuntime?: LegacyRuntimeState }).__prehistoricRuntime = runtime;
}
let bootStatus = "created";
const debugOverlay = isDevelopmentHost ? document.createElement("pre") : undefined;
if (debugOverlay) {
  debugOverlay.setAttribute("aria-label", "Legacy runtime debug overlay");
  debugOverlay.style.cssText = "position:fixed;left:8px;top:8px;margin:0;padding:4px 6px;color:#fff;background:rgba(0,0,0,.72);font:11px/1.35 monospace;z-index:10;pointer-events:none;white-space:pre";
  document.body.append(debugOverlay);
}
function refreshDebugOverlay(): void {
  if (!debugOverlay) return;
  debugOverlay.textContent = [
    `boot=${bootStatus}`,
    `Q=${runtime.game.Q} v=${runtime.game.vByte} c=${runtime.game.c} b=${runtime.game.b} i=${runtime.game.iFlag} M=${runtime.game.staticM}`,
    `input: U=${runtime.game.inputUp} D=${runtime.game.inputDown} L=${runtime.game.inputLeft} R=${runtime.game.inputRight} T=${runtime.game.inputT} V=${runtime.game.inputV}`,
    `selector: Z=${runtime.game.Z} y=${runtime.game.frameGenCounterY} ab=${runtime.game.ab} e=${runtime.game.inputUp} f=${runtime.game.inputDown} j=${runtime.game.jFlag}`,
    `ao: n=${runtime.aoTrace.count} Q=${runtime.aoTrace.inputQ} Z=${runtime.aoTrace.inputZ} value=${runtime.aoTrace.value} -> ${runtime.aoTrace.outputQ}`,
    `layout: ar=${runtime.game.frameLayoutAR} av=${runtime.game.frameLayoutAv} au=${runtime.game.frameLayoutAU} aw=${runtime.game.frameLayoutAW} ax=${runtime.game.frameLayoutAX} as=${runtime.game.frameLayoutAS}`,
    `flags=${runtime.game.frameFlags.map((value, index) => value ? index : "-").filter((value) => value !== "-").join(",") || "-"}`,
    `map=${runtime.game.mapWidth}x${runtime.game.mapHeight}`,
    `images=${runtime.imageGroups.filter(Boolean).length} packed=${runtime.packedData ? 1 : 0}`,
    `a195=${runtime.packedOffsets[195]} c=${Array.from(runtime.game.frameImageSlots).join("")}`,
    `frames=${runtime.framePrimitives.length}/${runtime.frameHelperCalls.length}`,
    `projections=${runtime.frameProjections.length}`,
    `projectionData=${runtime.frameProjections.map(([record, x, y, extra]) => `${record}@${x},${y}+${extra}`).join(";")}`,
    `helpers=${runtime.frameHelperCalls.map((call) => call.kind === "image" ? `i${call.resourceId}` : `${call.kind}:${call.resourceId ?? call.record ?? call.row ?? ""}${call.mode === undefined ? "" : `/m${call.mode}`}${call.kind === "frame-row-command" || call.kind === "frame-unhandled" ? `/row${call.row}/rec${call.record}@${call.x},${call.y}/g${call.group ?? ""}` : ""}${call.kind === "frame-1137-draw" ? `@${call.x},${call.y}/${call.width}x${call.height}/src${call.sourceX},${call.sourceY}` : ""}`).join(",")}`,
  ].join("\n");
}
refreshDebugOverlay();
const keys = new KeyState();
const detachKeyboard = attachOriginalKeyboard(window, keys);
window.addEventListener("beforeunload", detachKeyboard, { once: true });

// Set by debugBootWithoutSplash(): the normal boot() stops at its next await
// instead of painting the rest of the splash over the game and re-running
// initializeOriginalLoop() on the runtime the debug boot is already driving.
let debugBootTookOver = false;

const splashPaths = ["assets/l0.png", "assets/l1.png", "assets/l2.png"];
const originalKeys = [
  "UP", "DOWN", "LEFT", "RIGHT", "FIRE", "SOFT_LEFT", "SOFT_RIGHT",
  "DIGIT_0", "DIGIT_1", "DIGIT_3", "DIGIT_7", "DIGIT_9",
] as const;

async function showSplash(): Promise<void> {
  const images = await Promise.all(splashPaths.map((path) => ImageResource.create(path)));
  // Exact tribes.run()/d.a() sequence: l0 is painted twice before l1,
  // then l2 is painted immediately before f is created. There is no l3
  // splash phase in the original caller.
  const sequence = [
    { image: images[0], delay: 1000 },
    { image: images[0], delay: 2000 },
    { image: images[1], delay: 2000 },
    { image: images[2], delay: 0 },
  ];
  for (const frame of sequence) {
    if (debugBootTookOver) return;
    canvas.clear("#000000");
    canvas.graphics.drawImage(frame.image, 131, 168, Anchor.HCENTER | Anchor.VCENTER);
    if (frame.delay > 0) await new Promise((resolve) => window.setTimeout(resolve, frame.delay));
  }
}

function tick(): void {
  // Keep the original fixed-tick ordering: project DOM key edges, run the
  // bytecode-backed state machine, then dispatch the frame handler.
  for (const key of originalKeys) {
    if (keys.wasPressed(key)) runtime.input.press(key);
    if (keys.wasReleased(key)) runtime.input.release(key);
  }
  // Original run(): aS() is always the first per-tick phase, before h().
  runtime.stepOriginalWaitPhase();
  // f.run() calls h() on every loop iteration; h() itself dispatches ak()
  // when v==0 and the gameplay maintenance path when v==1.
  runtime.stepGameplayFrame();
  // f.run()'s main loop calls f.m() (no-arg) unconditionally right after
  // h(): v==1 runs n()/w()/u() plus the gameplay HUD's element scan, v==0
  // runs F() (the frame dispatch).
  runtime.stepGameplayFramePrep();
  runtime.input.endTick();
  keys.endTick();
  refreshDebugOverlay();
  if (!runtime.game.b) loop.stop();
}

function render(): void {
  paint();
  // f.run offsets 161..215: if ad:I or ae:I is set after the first paint, both
  // are cleared and the frame is painted a second time (oracle 2026-10-08).
  if (runtime.game.ad !== 0 || runtime.game.ae !== 0) {
    runtime.game.ad = 0;
    runtime.game.ae = 0;
    paint();
  }
}

function paint(): void {
  canvas.clear("#000000");
  // Exact top-level f.paint() dispatch (offset 0..5: `if (v:B != 1) goto
  // 465`): v==1 is the gameplay branch (offsets 8..462, ported as
  // renderGameplayTo/stepGameplayPaintComposite); v!=1 is every menu/
  // dialog/cutscene screen (offsets 465..605, LegacyPaintScreen).
  if (runtime.game.vByte === 1) {
    runtime.renderGameplayTo(canvas.graphics);
  } else if (runtime.offscreenTargets) {
    stepLegacyPaintScreen(
      {
        cameraSFlag: runtime.game.cameraSFlag,
        jSceneFlag: runtime.game.jSceneFlag,
        aPInt: runtime.game.aPInt,
      },
      canvas.graphics,
      runtime.offscreenTargets.images[0],
    );
  }
  const imageGroup0 = runtime.imageGroups[0];
  if (imageGroup0) runtime.geometryRenderer.renderTo(canvas.graphics, imageGroup0);
  // Offset 600..602: z:Z = false, the tail BOTH branches fall through to.
  runtime.game.paintSyncFlag = false;
}

const loop = new FixedLoop({ tickMs: 120, update: tick, render });

async function boot(): Promise<void> {
  bootStatus = "splash";
  refreshDebugOverlay();
  await showSplash();
  if (debugBootTookOver) return;
  bootStatus = "loading resources";
  refreshDebugOverlay();
  const resources = await loadOriginalResources();
  if (debugBootTookOver) return;
  runtime
    .withPackedData(resources.pd0)
    .withImageGroups(resources.pi0, resources.pi9, resources.pi8)
    .withMaResource(resources.ma)
    .withMidiResource(resources.sa)
    .withLanguageResources(resources.languageS, resources.languageT, resources.languageD0)
    .withLanguageTables(resources.languageTables)
    .withZhTranslation(zhTranslation)
    .withTableA(resources.tableA)
    .loadLanguageResource(0)
    .loadProgressFromStore()
    .loadOriginalStartupStores()
    .initializeOriginalLoop();
  bootStatus = "running";
  refreshDebugOverlay();
  loop.start();
}

/**
 * Debug-only shortcut (goal.md §24: debug capability, not release behavior)
 * that reaches a real map/gameplay session directly through the already-ported
 * f.g(byte) map-entry chain (aM reset, aN map decode, aO/aP entity placement)
 * and the same vByte=1 flip f.aD()'s Q=28 branch performs. It exists because
 * the real menu -> Q=28 input sequence from Q5 (OUTSIDE/REVENGE) is still an
 * open question (see docs/unknowns.md); this does not invent or approximate
 * any gameplay logic, it only skips having to first solve that sequence in
 * order to exercise the entity-loop/render code that is otherwise already
 * wired but never reached. Call from the browser console:
 *   window.__prehistoricDebugEnterMap(0)
 *
 * Caveat found 2026-08-18, FULLY RESOLVED same day: gameplay content
 * (fog-of-war, entities, etc.) is composited onto the screen by
 * `stepGameplayPaintComposite()` (the ported f.paint() blit), whose
 * position/height inputs (`selectionAInt`/`selectionBb`/`selectionAx`) are
 * only ever populated by `onSelectionRefresh`. The full trigger chain
 * (`f.b(int)` -> `S()`/`T()` -> `T()`'s `ai===37` branch -> `b.l()` ->
 * `finalizeEntity` for every active id) is now ported end-to-end and
 * wired into the already-live `am()` T===0 dispatch path -- see
 * docs/unknowns.md for the full trace. Trigger it directly from the
 * console with no manual field overrides at all:
 *   window.__prehistoricDebugRuntime.runSceneDispatch(37)
 *   window.__prehistoricDebugTick(1)
 * This calls `finalizeEntity` automatically for every active entity and
 * populates `selectionAInt`/`selectionBb`/`selectionAx` with genuine
 * computed values, verified live via getImageData pixel sampling. Raw
 * field overrides remain available if you specifically want to bypass
 * the real computation (e.g. `game.selectionAInt = 288`), and
 * `runtime.finalizeEntity(id)` remains available to target one specific
 * entity id directly, but `runSceneDispatch(37)` is now the faithful,
 * fully-automatic path. Note: this also exercises a real, confirmed bug
 * in the original game (class b's `b:[S]` field was believed permanently null (RETRACTED 2026-09-07 -- it is not),
 * exactly like `f.b:[S]` elsewhere in this codebase) -- the entity-spawn
 * calls inside `runSceneDispatch`'s `ai===37` branch throw partway
 * through and are safely caught, matching the original exactly, not a
 * bug in this port.
 */
function debugEnterMap(mapIndex = 0): void {
  runtime.game.qByte = mapIndex;
  runtime.stepMapEntry(mapIndex);
  runtime.game.vByte = 1;
  runtime.game.iByte = -1;
}

/**
 * Debug-only resource load that skips showSplash()'s window.setTimeout waits.
 * Some automated/off-screen browser panes report document.hidden=true for the
 * whole session, which the spec allows browsers to use to fully suspend
 * background timers -- not just throttle them -- so the real boot() can never
 * naturally finish there. This performs the exact same resource-attachment
 * chain boot() runs, just without the cosmetic splash delays, so the runtime
 * can still be exercised in those environments.
 */
/**
 * Debug-only: drive the REAL menu chain to the first playable frame by
 * pressing FIRE, exactly as a player would, instead of jumping in through
 * debugEnterMap's raw `vByte = 1`.
 *
 * Added 2026-09-09 after the debug entry produced two misleading conclusions in
 * a row -- it skips f.aD()'s Q=28 branch (so the camera never restored) and it
 * skips every menu screen (so nothing that composes into offscreen 0 had run).
 * Prefer this for any question about what the game actually does; keep
 * debugEnterMap for exercising map code in isolation.
 *
 * Measured chain: Q 14 -> 16 -> 0 -> 2 -> 13 -> 16 -> 22 -> 18 -> 17 (the
 * MUMBO dialogue, ao 27 -> 1 -> 16 -> 7) -> 28 with vByte 1, in 47 ticks.
 * Returns the tick count, or -1 if it did not arrive within the cap.
 */
function debugEnterMapViaMenu(maxTicks = 200): number {
  for (let elapsed = 0; elapsed < maxTicks; elapsed += 1) {
    if (runtime.game.Q === 28 && runtime.game.vByte === 1) return elapsed;
    runtime.input.press("FIRE");
    tick();
  }
  return runtime.game.Q === 28 && runtime.game.vByte === 1 ? maxTicks : -1;
}

async function debugBootWithoutSplash(): Promise<void> {
  debugBootTookOver = true;
  loop.stop();
  bootStatus = "debug: loading resources";
  refreshDebugOverlay();
  const resources = await loadOriginalResources();
  runtime
    .withPackedData(resources.pd0)
    .withImageGroups(resources.pi0, resources.pi9, resources.pi8)
    .withMaResource(resources.ma)
    .withMidiResource(resources.sa)
    .withLanguageResources(resources.languageS, resources.languageT, resources.languageD0)
    .withLanguageTables(resources.languageTables)
    .withZhTranslation(zhTranslation)
    .withTableA(resources.tableA)
    .loadLanguageResource(0)
    .loadProgressFromStore()
    .loadOriginalStartupStores()
    .initializeOriginalLoop();
  bootStatus = "debug: running (no rAF loop; use __prehistoricDebugTick/__prehistoricDebugRender)";
  refreshDebugOverlay();
}

if (isDevelopmentHost) {
  Object.assign(window as unknown as Record<string, unknown>, {
    __prehistoricDebugEnterMap: debugEnterMap,
    __prehistoricDebugEnterMapViaMenu: (maxTicks = 200) => debugEnterMapViaMenu(maxTicks),
    __prehistoricDebugTick: (count = 1) => { for (let i = 0; i < count; i += 1) tick(); },
    __prehistoricDebugRender: () => { render(); },
    __prehistoricDebugBootWithoutSplash: () => debugBootWithoutSplash(),
    __prehistoricDebugRuntime: runtime,
  });
}

void boot().catch((error: unknown) => {
  bootStatus = `error: ${error instanceof Error ? error.message : String(error)}`;
  refreshDebugOverlay();
  console.error("Original bootstrap failed", error);
  canvas.clear("#000000");
});
