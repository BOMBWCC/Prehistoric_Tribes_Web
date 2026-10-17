import type { LegacyRuntimeState } from "./core/LegacyRuntimeState";
import { stepAs } from "./ui/UiRuntime";
import type { WideScreen } from "./WideScreen";

/**
 * The settings panel (phase 3, user 2026-10-17; not in the original), opened from the game menu
 * at the top right (Hud.ts) while the game is paused:
 *
 * - music and hints: the original OPTIONS screen's two switches, flipped by its own f.as()
 *   (music e:B 0 / 2, hints l:I 0 / 1), then saved like leaving that screen (e(0));
 * - head info: the original command bar's INFO switch f.aq:B -- which villagers show their health
 *   bar and skill badge (0 all, 1 the selected or pointed-at one, 2 none: the original's start
 *   value; a hurt villager's bar shows anyway);
 * - view size, which the user wanted here rather than as a pinch gesture: each step is a whole
 *   number of device pixels per game pixel, so the pixel art stays sharp.
 */

const ZOOM_KEY = "pt.zoomOut";

function readZoom(): number {
  try {
    return Math.max(0, Number(localStorage.getItem(ZOOM_KEY)) || 0);
  } catch {
    return 0;
  }
}

/** Adds the panel; returns the function that opens it. */
export function attachSettings(app: HTMLElement, screen: WideScreen, runtime: LegacyRuntimeState): () => void {
  screen.zoomOut = readZoom();
  const game = runtime.game;

  const dialog = document.createElement("dialog");
  dialog.className = "settings";
  dialog.innerHTML = `
    <form method="dialog">
      <h2>设置</h2>
      <label class="switch"><input type="checkbox" name="music"> 音乐</label>
      <label class="switch"><input type="checkbox" name="hints"> 提示</label>
      <label>头顶信息
        <select name="info">
          <option value="0">全部村民</option>
          <option value="1">选中的村民</option>
          <option value="2">不显示（受伤时显示）</option>
        </select>
      </label>
      <label>视野大小
        <input type="range" name="zoom" min="0" step="1">
      </label>
      <output name="zoomText"></output>
      <button type="submit">完成</button>
    </form>`;
  const form = dialog.querySelector("form")!;
  const slider = form.elements.namedItem("zoom") as HTMLInputElement;
  const text = form.elements.namedItem("zoomText") as HTMLOutputElement;
  const music = form.elements.namedItem("music") as HTMLInputElement;
  const hints = form.elements.namedItem("hints") as HTMLInputElement;
  const info = form.elements.namedItem("info") as HTMLSelectElement;

  /** f.as() for OPTIONS row `row` (1 music, 3 hints), with the menu cursor it reads set for it. */
  const toggle = (row: number) => {
    const cursor = game.Z;
    game.Z = row;
    stepAs(runtime);
    game.Z = cursor;
    runtime.saveOriginalResourceAction(0);
  };
  music.addEventListener("change", () => { if (music.checked !== (game.eByte !== 0)) toggle(1); });
  hints.addEventListener("change", () => { if (hints.checked !== (game.lInt !== 0)) toggle(3); });
  info.addEventListener("change", () => { game.frameLayoutAq = Number(info.value); });

  const show = () => {
    music.checked = game.eByte !== 0;
    hints.checked = game.lInt !== 0;
    info.value = String(game.frameLayoutAq);
    const levels = screen.zoomLevels();
    slider.max = String(levels.length - 1);
    slider.value = String(Math.min(screen.zoomOut, levels.length - 1));
    const view = screen.viewTiles(levels[Number(slider.value)]!);
    text.value = `可见约 ${view.columns} × ${view.rows} 格（${levels.length} 档）`;
  };
  slider.addEventListener("input", () => {
    screen.zoomOut = Number(slider.value);
    try { localStorage.setItem(ZOOM_KEY, slider.value); } catch { /* not saved */ }
    show();
  });
  // Keys pressed in the panel must not reach the game.
  dialog.addEventListener("keydown", (event) => event.stopPropagation());
  dialog.addEventListener("keyup", (event) => event.stopPropagation());

  app.append(dialog);
  return () => { show(); dialog.showModal(); };
}
