import type { LegacyRuntimeState } from "./core/LegacyRuntimeState";
import { legacyMapOverviewColor } from "./render/LegacyMapOverview";
import type { WideScreen } from "./WideScreen";

/**
 * The minimap (round 4, user 2026-10-22; UI design "小地图、集结与备战"): a page of its own, opened
 * from the command menu, instead of the original's overview screen (Q 19). It shows the original's
 * overview -- one colour per tile, f.e(int,int) (`legacyMapOverviewColor`; unexplored dark brown) --
 * over the whole screen but the dynamic-island strip, as tall as the screen, dragged sideways when
 * wider; a green frame is the game's view; ✕ at the bottom right goes back. The game runs on.
 */

const REFRESH_MS = 500;
const CELL_ASPECT = 5 / 4; // the original's overview cells are 5 x 4 pixels

export function attachMiniMap(app: HTMLElement, runtime: LegacyRuntimeState, screen: WideScreen): { open(): void } {
  const page = document.createElement("div");
  page.className = "minimap";
  page.hidden = true;
  const scroller = document.createElement("div");
  scroller.className = "minimap-scroll";
  const canvas = document.createElement("canvas");
  const frame = document.createElement("div");
  frame.className = "minimap-view";
  scroller.append(canvas, frame);
  const close = document.createElement("button");
  close.type = "button";
  close.className = "minimap-close";
  close.setAttribute("aria-label", "返回游戏");
  close.innerHTML = '<img src="hd/ui/btn-close.png" alt="">';
  page.append(scroller, close);
  app.append(page);

  let timer = 0;
  let cell = { w: 5, h: 4 };

  function draw(): void {
    const g = runtime.game;
    if (g.loopMode !== 1 || !runtime.activeMap) { shut(); return; }
    const columns = g.mapWidth;
    const rows = g.mapHeight;
    const height = scroller.clientHeight;
    const h = Math.max(1, height / rows);
    cell = { w: h * CELL_ASPECT, h };
    const dpr = window.devicePixelRatio || 1;
    canvas.style.width = `${columns * cell.w}px`;
    canvas.style.height = `${rows * cell.h}px`;
    canvas.width = Math.round(columns * cell.w * dpr);
    canvas.height = Math.round(rows * cell.h * dpr);
    const context = canvas.getContext("2d")!;
    const input = runtime.mapOverviewInput();
    const cw = canvas.width / columns;
    const ch = canvas.height / rows;
    for (let y = 0; y < rows; y += 1) {
      for (let x = 0; x < columns; x += 1) {
        const colour = legacyMapOverviewColor(input, x, y);
        context.fillStyle = `#${((colour < 0 ? 0 : colour) & 0xffffff).toString(16).padStart(6, "0")}`;
        context.fillRect(Math.floor(x * cw), Math.floor(y * ch), Math.ceil(cw), Math.ceil(ch));
      }
    }
    const view = screen.viewRect();
    frame.style.left = `${view.column * cell.w}px`;
    frame.style.top = `${view.row * cell.h}px`;
    frame.style.width = `${view.columns * cell.w}px`;
    frame.style.height = `${view.rows * cell.h}px`;
  }

  function shut(): void {
    page.hidden = true;
    window.clearInterval(timer);
  }
  close.addEventListener("click", shut);

  return {
    open() {
      page.hidden = false;
      draw();
      // Start with the game's view in the middle.
      const view = screen.viewRect();
      scroller.scrollLeft = (view.column + view.columns / 2) * cell.w - scroller.clientWidth / 2;
      window.clearInterval(timer);
      timer = window.setInterval(draw, REFRESH_MS);
    },
  };
}
