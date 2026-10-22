import "./styles.css";
import { LogicalCanvas } from "./platform/Canvas";
import { loadOriginalResources } from "./ResourceBootstrap";
import { FixedLoop } from "./platform/FixedLoop";
import { attachOriginalKeyboard, KeyState } from "./platform/Input";
import { LegacyRuntimeState } from "./core/LegacyRuntimeState";
import { stepLegacyPaintScreen } from "./render/LegacyPaintScreen";
import { attachTouchControls } from "./TouchControls";
import { WideScreen } from "./WideScreen";
import { attachSettings } from "./Settings";
import { attachAlerts } from "./Alerts";
import { attachHud } from "./Hud";
import { hdArt } from "./render/HdArt";
import { attachMenuHud } from "./MenuHud";
import { attachStartMenu, savedLanguage, savedMusic } from "./StartMenu";
import { attachStoryHud } from "./StoryHud";
// The Chinese strings; docs/translation-zh-CN.json is their single source.
import zhTranslation from "../../docs/translation-zh-CN.json";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("App mount point is missing");

const canvas = new LogicalCanvas(240, 320);
const runtime = new LegacyRuntimeState();
// The original's 240x320 frame stays in the page, hidden and first, so the oracle tools'
// querySelector("canvas") still reads it; the player sees the WideScreen canvas.
canvas.element.hidden = true;
app.append(canvas.element);
const screen = new WideScreen(runtime, canvas);
screen.element.className = "screen";
app.append(screen.element);
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
    `Q=${runtime.game.screen} v=${runtime.game.loopMode} c=${runtime.game.missionFrame} b=${runtime.game.b} i=${runtime.game.iFlag} M=${runtime.game.staticM}`,
    `input: U=${runtime.game.inputUp} D=${runtime.game.inputDown} L=${runtime.game.inputLeft} R=${runtime.game.inputRight} T=${runtime.game.inputT} V=${runtime.game.inputV}`,
    `selector: Z=${runtime.game.Z} y=${runtime.game.frameGenCounterY} ab=${runtime.game.ab} e=${runtime.game.inputUp} f=${runtime.game.inputDown} j=${runtime.game.jFlag}`,
    `ao: n=${runtime.aoTrace.count} Q=${runtime.aoTrace.inputQ} Z=${runtime.aoTrace.inputZ} value=${runtime.aoTrace.value} -> ${runtime.aoTrace.outputQ}`,
    `layout: ar=${runtime.game.frameLayoutAR} av=${runtime.game.frameLayoutAv} au=${runtime.game.frameLayoutAU} aw=${runtime.game.frameLayoutAW} ax=${runtime.game.frameLayoutAX} as=${runtime.game.menuCursor}`,
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

// Touch and mouse: taps and drags on the screen (TouchControls) plus the HUD buttons over it.
const touch = attachTouchControls(screen, runtime, keys);
// Keys bring back the original's hand cursor; a tap or click takes it away again.
window.addEventListener("keydown", () => { screen.touchPlay = false; });
window.addEventListener("pointerdown", () => { screen.touchPlay = true; });
const notify = attachAlerts(app, runtime, touch);
const hud = attachHud(app, runtime, screen, touch, attachSettings(app, screen, runtime), notify);
const menuHud = attachMenuHud(app, runtime, screen, touch);
const startMenu = attachStartMenu(app, runtime, screen, touch);
const storyHud = attachStoryHud(app, runtime, screen, touch);
// Pinch and double-tap zoom on iOS Safari, which ignores the viewport's user-scalable=no.
for (const type of ["gesturestart", "gesturechange", "dblclick"]) {
  document.addEventListener(type, (event) => event.preventDefault(), { passive: false });
}

// Set by debugBootWithoutSplash(): the normal boot() stops at its next await
// instead of painting the rest of the splash over the game and re-running
// initializeOriginalLoop() on the runtime the debug boot is already driving.
let debugBootTookOver = false;

const originalKeys = [
  "UP", "DOWN", "LEFT", "RIGHT", "FIRE", "SOFT_LEFT", "SOFT_RIGHT",
  "DIGIT_0", "DIGIT_1", "DIGIT_3", "DIGIT_7", "DIGIT_9",
] as const;

/** The splash (user, 2026-10-17: no publisher logos, l0 / l1; round 4: the HD picture, StartMenu)
 *  stays while the resources load and the start-up questions are answered. */
async function showSplash(): Promise<void> {
  screen.splash = true;
  await new Promise((resolve) => window.setTimeout(resolve, 1200));
}

function tick(): void {
  // Keep the original fixed-tick ordering: project DOM key edges, run the
  // bytecode-backed state machine, then dispatch the frame handler.
  touch.step();
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

let renders = 0;
let starting = false;
function render(): void {
  paint();
  // f.run offsets 161..215: if ad:I or ae:I is set after the first paint, both
  // are cleared and the frame is painted a second time (oracle 2026-10-08).
  if (runtime.game.ad !== 0 || runtime.game.ae !== 0) {
    runtime.game.ad = 0;
    runtime.game.ae = 0;
    paint();
  }
  // The oracle runner sets __prehistoricWideEvery to draw the larger view on every Nth frame only.
  const every = (window as Window & { __prehistoricWideEvery?: number }).__prehistoricWideEvery ?? 1;
  if (renders++ % every === 0) screen.renderWide();
  screen.compose();
  hud.update();
  menuHud.update();
  startMenu.update();
  storyHud.update();
  // Start-up: the splash stays until the answered questions have led to the main menu.
  if (starting && runtime.game.screen !== 14 && runtime.game.screen !== 16) {
    starting = false;
    screen.splash = false;
    screen.frozen = false;
  }
}

function paint(): void {
  canvas.clear("#000000");
  // Exact top-level f.paint() dispatch (offset 0..5: `if (v:B != 1) goto
  // 465`): v==1 is the gameplay branch (offsets 8..462, ported as
  // renderGameplayTo/stepGameplayPaintComposite); v!=1 is every menu/
  // dialog/cutscene screen (offsets 465..605, LegacyPaintScreen).
  if (runtime.game.loopMode === 1) {
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
// Between ticks the screen is only recomposed: a drag moves the view smoothly.
const composeEveryFrame = () => { screen.compose(); hud.track(); requestAnimationFrame(composeEveryFrame); };
requestAnimationFrame(composeEveryFrame);

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
  // Keys pressed during the splash and loading never reached the original's canvas; dropping them
  // keeps a press meant to skip the logos from confirming Q14's first language (2026-10-15). The
  // same goes for a tap: the touch layer queued it as FIRE (2026-10-16, user: no Chinese option).
  keys.endTick();
  touch.cancel();
  // The language list and "play music?" are answered from the last choice behind the splash.
  screen.freeze();
  starting = true;
  touch.answerStartQuestions(savedLanguage(), savedMusic());
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
  runtime.game.mission = mapIndex;
  runtime.stepMapEntry(mapIndex);
  runtime.game.loopMode = 1;
  runtime.game.digitKey = -1;
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
    if (runtime.game.screen === 28 && runtime.game.loopMode === 1) return elapsed;
    runtime.input.press("FIRE");
    tick();
  }
  return runtime.game.screen === 28 && runtime.game.loopMode === 1 ? maxTicks : -1;
}

async function debugBootWithoutSplash(): Promise<void> {
  debugBootTookOver = true;
  screen.splash = false;
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
  touch.cancel();
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
    __prehistoricScreen: screen,
  });
}

// The HD art's list (render/HdArt.ts); the pictures themselves load as the map needs them.
void hdArt.load();
void boot().catch((error: unknown) => {
  bootStatus = `error: ${error instanceof Error ? error.message : String(error)}`;
  refreshDebugOverlay();
  console.error("Original bootstrap failed", error);
  canvas.clear("#000000");
});
