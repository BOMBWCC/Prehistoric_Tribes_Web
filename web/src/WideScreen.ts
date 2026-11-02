import type { LegacyRuntimeState } from "./core/LegacyRuntimeState";
import { oldArt } from "./platform/OldArt";
import type { LogicalCanvas } from "./platform/Canvas";
import { MARGIN_TILES } from "./render/MapMargin";
import { BLD_HP, BLD_KIND, BLD_OWNER, BLD_X, BLD_Y } from "./core/DenseLayout";

/**
 * The screen the player sees (phase 3, user 2026-10-17; not in the original): a canvas filling the
 * whole window, notch included (portrait only). Menus and story screens show the original
 * 240 x 320 frame scaled to fit. On the map:
 *
 * - the map fills the screen: render/PixiMap.ts draws it with WebGL on a canvas under this one;
 * - at the top, the notch strip in the bar's colour; the resource bar itself is Hud.ts's (round 3,
 *   user 2026-10-20), BAR_CSS high;
 * - the rest of the HUD is Hud.ts's too: the original's own HUD (its bars, panels and boxes) is no
 *   longer drawn on the map (2026-10-28, docs/modernization-plan.md §4.0).
 *
 * The view (which part of the map is on screen) is separate from the game's own 11 x 18 camera:
 * dragging moves the view smoothly, in pixels, and the camera then follows into the view
 * (`cameraInView`); when the game moves its camera (keys, a jump to an alert), the view follows it.
 */

const TILE_W = 22;
const TILE_H = 16;
/** The resource bar's height in CSS pixels (Hud.ts draws it; round-3 design, 2026-10-20). */
const BAR_CSS = 44;
/** Slot 2 (record 5) is the bar strip at the bottom: a building's items (the HUD's building menu). */
const BAR_STRIP_SLOT = 2;
/** Slot 5: the command bar, a row of villagers (the original's VILLAGERS), a new chief's candidates. */
const COMMAND_BAR_SLOT = 5;
/** Slot 6 (record 7): the original's build cards (the build list in Hud.ts). */
const BUILD_CARD_SLOT = 6;
const BAR_COLOUR = "#bfb04d";

export type ScreenPoint = { x: number; y: number; on: "screen" | "top" | "map" };

export class WideScreen {
  readonly element = document.createElement("canvas");
  private readonly context: CanvasRenderingContext2D;
  private cssSize = { width: 240, height: 320 };
  /** Safe-area insets (notch, home indicator) in CSS pixels. */
  private safe = { top: 0, bottom: 0 };
  private scale = 1; // device pixels per game pixel
  private width = 240; // screen size in game pixels
  private height = 320;
  /** Map pixel at the screen's top-left corner. */
  private viewX = 0;
  private viewY = 0;
  private camera = { column: -1, row: -1 };
  private map: unknown = null; // the map the view was last put on
  /** Zoom setting: how many device pixels per game pixel below the largest that fits (0 = largest). */
  zoomOut = 0;
  /** A pinch's zoom (device pixels per game pixel, between the slider's levels); 0: the slider's. */
  pinchScale = 0;
  /** While set, the screen shows what it showed when freeze() was called (the game menu,
   *  Hud.ts: the original's pause menu, its prompts and messages stay out of sight). */
  frozen = false;
  /** The game's splash is on screen (main.ts): shown as it is, without the menu edits. */
  splash = false;
  /** The HD villager panel is up for one selected villager (Hud.ts sets it). */
  villagerSheet = false;
  /** Touch or mouse play (the last input was a pointer): the map's cursor has no hand. */
  touchPlay = true;
  private readonly still = document.createElement("canvas");

  constructor(private readonly runtime: LegacyRuntimeState, private readonly frame: LogicalCanvas) {
    const context = this.element.getContext("2d");
    if (!context) throw new Error("Canvas 2D context is unavailable");
    this.context = context;
    this.element.setAttribute("role", "img");
    // The CSS size comes from a ResizeObserver: reading it every frame would force a layout of the
    // page each time (the debug overlay changes every tick), which made a frame ~10x slower.
    // env(safe-area-inset-*) is only readable through CSS: a hidden probe carries it as padding.
    const probe = document.createElement("div");
    probe.className = "safe-probe";
    document.body.append(probe);
    const readSafe = () => {
      const style = getComputedStyle(probe);
      this.safe = { top: parseFloat(style.paddingTop) || 0, bottom: parseFloat(style.paddingBottom) || 0 };
    };
    new ResizeObserver(([entry]) => {
      if (!entry) return;
      this.cssSize = { width: entry.contentRect.width, height: entry.contentRect.height };
      readSafe();
    }).observe(this.element);
    window.addEventListener("resize", readSafe);
  }

  /** The zoom levels this screen offers: device pixels per game pixel, largest first. */
  zoomLevels(): number[] {
    const max = this.maxScale();
    const levels: number[] = [];
    // Down to half the largest: below that the sprites get too small to tap.
    for (let s = max; s >= Math.max(1, Math.ceil(max / 2)); s -= 1) levels.push(s);
    return levels.length > 0 ? levels : [max];
  }

  /** About how many tiles the map shows at `scale` device pixels per game pixel. */
  viewTiles(scale: number): { columns: number; rows: number } {
    return {
      columns: Math.floor(this.element.width / scale / TILE_W),
      rows: Math.floor((this.element.height / scale - 60) / TILE_H),
    };
  }

  private maxScale(): number {
    const fit = Math.min(this.element.width / 240, this.element.height / 320);
    return fit >= 1 ? Math.floor(fit) : fit;
  }

  /** Matches the canvas to its CSS box in device pixels and picks the scale. */
  private resize(): void {
    const ratio = window.devicePixelRatio || 1;
    const w = Math.max(1, Math.round(this.cssSize.width * ratio));
    const h = Math.max(1, Math.round(this.cssSize.height * ratio));
    if (this.element.width !== w || this.element.height !== h) {
      this.element.width = w;
      this.element.height = h;
    }
    const levels = this.zoomLevels();
    const low = levels[levels.length - 1]!;
    const high = levels[0]!;
    this.scale = this.pinchScale > 0 ? Math.max(low, Math.min(high, this.pinchScale)) : levels[Math.min(this.zoomOut, levels.length - 1)]!;
    this.width = Math.floor(w / this.scale);
    this.height = Math.floor(h / this.scale);
  }

  /**
   * A story (Q 17, 18) or a villager speaking (Q 20): StoryHud shows the words; behind them the map
   * as it is, the camera not followed (docs/modernization-plan.md §4.4), without the HUD.
   */
  private get story(): boolean {
    const g = this.runtime.game;
    return g.loopMode !== 1 && (g.screen === 17 || g.screen === 18 || g.screen === 20);
  }

  /** The map tiles the screen shows (fractions; may reach past the map's edges): the minimap's frame. */
  viewRect(): { column: number; row: number; columns: number; rows: number } {
    return { column: this.viewX / TILE_W, row: this.viewY / TILE_H, columns: this.width / TILE_W, rows: this.height / TILE_H };
  }

  /** The view for the WebGL map: the map pixel at the screen's top-left corner, CSS pixels per game pixel. */
  viewTransform(): { x: number; y: number; cssPerGame: number } {
    return { x: this.viewX, y: this.viewY, cssPerGame: this.scale / (window.devicePixelRatio || 1) };
  }

  /** The map tile in the middle of the screen. */
  centreTile(): [number, number] {
    return [Math.floor((this.viewX + this.width / 2) / TILE_W), Math.floor((this.viewY + this.height / 2) / TILE_H)];
  }

  /** The screen shows the original's 240 x 320 frame (menus, dialogue ...), not the map view. */
  get framed(): boolean {
    return !this.onMap;
  }

  /** The map is on screen (play, or a story over it): the WebGL map draws it. */
  get onMap(): boolean {
    return (this.runtime.game.loopMode === 1 || this.story) && !!this.runtime.activeMap;
  }

  /** The frame's rows above the map (top bar, top panels) and from the bottom panel down. */
  private strips(): { top: number; panel: number } {
    const g = this.runtime.game;
    const top = Math.max(0, Math.min(320, g.selectionBb - g.selectionAx));
    const panel = Math.max(top, Math.min(320, 320 - g.selectionBa));
    return { top, panel };
  }

  /**
   * Where things sit on screen, in game pixels: the bar (`barTop`, under the notch), the map from
   * `upper` (the bar's bottom) on, and the map area the camera's window must stay in (`areaTop` ..
   * `areaBottom`).
   */
  private layout() {
    const k = (window.devicePixelRatio || 1) / this.scale;
    const barTop = Math.round(this.safe.top * k);
    const safeBottom = Math.round(this.safe.bottom * k);
    const upper = barTop + this.barRows();
    return { barTop, upper, areaTop: upper, areaBottom: this.height - safeBottom, top: this.strips().top };
  }

  /** A building's bar is open (slot 2 on, f.Z() filling it from aa / ab / ac; w 2, or 4 while an
   *  item confirms): the HUD's building menu shows instead. */
  get buildingMenuOpen(): boolean {
    const g = this.runtime.game;
    // w 4: one of its items confirming (its line shows in the sheet, BUG-019).
    return g.loopMode === 1 && (g.barMode === 2 || g.barMode === 4) && !!g.selectionFlags[BAR_STRIP_SLOT] && !g.choosingChief && !this.buildCardsOpen;
  }

  /** The command bar (or the VILLAGERS row it opens) is up (w 2, slot 5): the HUD's sheet shows it. */
  get commandBarOpen(): boolean {
    const g = this.runtime.game;
    return g.loopMode === 1 && g.barMode === 2 && !!g.selectionFlags[COMMAND_BAR_SLOT] && !g.choosingChief && !this.buildCardsOpen && !this.buildingMenuOpen;
  }

  /** The original's build cards are up (the build list shows instead). */
  get buildCardsOpen(): boolean {
    const g = this.runtime.game;
    return g.loopMode === 1 && g.barMode === 2 && !!g.selectionFlags[BUILD_CARD_SLOT] && this.buildKinds().length > 0;
  }

  /** The building kinds the build cards offer, in their order: f.r:[B's first ar:B entries, when
   *  all of them are building kinds (0..11; the command bar holds codes 10.., a villager row -id). */
  buildKinds(): number[] {
    const g = this.runtime.game;
    const kinds = Array.from(this.runtime.mainArrays.r.slice(0, g.frameLayoutAR));
    return kinds.length > 0 && kinds.every((kind) => kind >= 0 && kind < 12) ? kinds : [];
  }

  /** Where the camera's 240-wide window sits on screen, in game pixels. */
  private cameraOnScreen(): { x: number; y: number } {
    const g = this.runtime.game;
    return { x: g.cameraColumn * TILE_W - this.viewX, y: g.cameraRow * TILE_H - this.viewY };
  }

  /** Keeps the view on the map; a map smaller than the screen is centred. */
  private clampView(): void {
    const g = this.runtime.game;
    const { upper } = this.layout();
    const mapW = g.mapWidth * TILE_W;
    const mapH = g.mapHeight * TILE_H;
    // The map's border (render/MapMargin.ts): the view may go that far past each edge, so the edge
    // tiles can be brought away from the screen's edge. The map may run under the panels and the
    // screen's bottom edge, never under the bar (plus the border). A map narrower than the screen
    // with its border is centred.
    const mx = MARGIN_TILES * TILE_W;
    const my = MARGIN_TILES * TILE_H;
    this.viewX = mapW + 2 * mx <= this.width ? (mapW - this.width) / 2 : Math.max(-mx, Math.min(mapW + mx - this.width, this.viewX));
    this.viewY = Math.max(-upper - my, Math.min(mapH + my - this.height, this.viewY));
  }

  /** Moves the view so the camera's window is fully on screen. */
  private moveToCamera(): void {
    const g = this.runtime.game;
    const { areaTop, areaBottom, top } = this.layout();
    const { panel } = this.strips();
    const camX = g.cameraColumn * TILE_W;
    const camY = g.cameraRow * TILE_H;
    this.viewX = Math.max(camX + 240 - this.width, Math.min(camX, this.viewX));
    this.viewY = Math.max(camY - (areaBottom - (panel - top)), Math.min(camY - areaTop, this.viewY));
  }

  /** Centres the view on our chief's hut (kind 3, 4 x 4) and puts the camera there; false: none. */
  private showChiefsHut(): boolean {
    const rt = this.runtime;
    const e = rt.denseState;
    for (let b = 0; b <= 60; b += 1) {
      if (e[BLD_KIND + b] !== 3 || e[BLD_OWNER + b] !== 0 || (e[BLD_HP + b] ?? 0) <= 0) continue;
      this.viewX = ((e[BLD_X + b] ?? 0) + 2) * TILE_W - this.width / 2;
      this.viewY = ((e[BLD_Y + b] ?? 0) + 2) * TILE_H - this.height / 2;
      this.clampView();
      this.camera = this.cameraInView();
      rt.game.cameraColumn = this.camera.column;
      rt.game.cameraRow = this.camera.row;
      rt.storyCamera = { ...this.camera, mission: rt.game.mission };
      return true;
    }
    return false;
  }

  /** Puts map tile (column, row) in the middle of the screen. */
  centerOn(column: number, row: number): void {
    this.viewX = column * TILE_W + TILE_W / 2 - this.width / 2;
    this.viewY = row * TILE_H + TILE_H / 2 - this.height / 2;
    this.clampView();
  }

  /**
   * Pinch (user 2026-10-29): scales the view by `factor` about CSS point (x, y) of the canvas, which
   * stays over the same map pixel; the zoom stays within the slider's levels.
   */
  zoomAt(factor: number, x: number, y: number): void {
    const ratio = window.devicePixelRatio || 1;
    const before = this.scale;
    const mapX = this.viewX + (x * ratio) / before;
    const mapY = this.viewY + (y * ratio) / before;
    this.pinchScale = before * factor;
    this.resize();
    this.viewX = mapX - (x * ratio) / this.scale;
    this.viewY = mapY - (y * ratio) / this.scale;
    this.clampView();
  }

  /** Drag: moves the view by (dx, dy) game pixels. */
  panBy(dx: number, dy: number): void {
    this.viewX += dx;
    this.viewY += dy;
    this.clampView();
  }

  /** The camera position nearest the current one whose window is fully on screen. */
  cameraInView(): { column: number; row: number } {
    const g = this.runtime.game;
    const { top, panel } = this.strips();
    const { areaTop, areaBottom } = this.layout();
    const fit = (current: number, low: number, high: number) =>
      low <= high ? Math.max(low, Math.min(high, current)) : Math.round((low + high) / 2);
    return {
      column: fit(g.cameraColumn, Math.ceil(this.viewX / TILE_W), Math.floor((this.viewX + this.width - 240) / TILE_W)),
      row: fit(
        g.cameraRow,
        Math.ceil((this.viewY + areaTop) / TILE_H),
        Math.floor((this.viewY + areaBottom - (panel - top)) / TILE_H),
      ),
    };
  }

  /** After each paint: the view follows the game's camera when it moved (keys, a jump to an alert)
   *  and stays on the map. The map itself is drawn by render/PixiMap.ts under this canvas. */
  updateView(): void {
    this.resize();
    if (!this.onMap) return;
    const g = this.runtime.game;
    // A new map under its opening story (BUG-039, user 2026-11-02): there is no view before the
    // story to go back to, so the view -- and the camera the story puts back -- is our chief's hut.
    if (this.runtime.activeMap !== this.map) {
      this.map = this.runtime.activeMap;
      if (this.story && this.showChiefsHut()) return;
    }
    // A story leaves the view where it is (the map's first view still goes to the camera).
    if ((!this.story || this.camera.column < 0) && (g.cameraColumn !== this.camera.column || g.cameraRow !== this.camera.row)) {
      this.camera = { column: g.cameraColumn, row: g.cameraRow };
      this.moveToCamera();
    }
    this.clampView();
  }

  /** Every display frame: puts the pieces on screen (cheap; renderWide did the drawing). */
  /** Keeps a copy of the screen as it is now and shows it until `frozen` is cleared. */
  freeze(): void {
    this.still.width = this.element.width;
    this.still.height = this.element.height;
    this.still.getContext("2d")?.drawImage(this.element, 0, 0);
    this.frozen = true;
  }

  compose(): void {
    if (this.frozen) {
      this.context.setTransform(1, 0, 0, 1, 0, 0);
      this.context.drawImage(this.still, 0, 0);
      return;
    }
    this.resize();
    const c = this.context;
    c.setTransform(1, 0, 0, 1, 0, 0);
    c.imageSmoothingEnabled = false;
    if (!this.onMap) {
      c.fillStyle = "#000";
      c.fillRect(0, 0, this.element.width, this.element.height);
      this.drawFrameFilled();
      return;
    }
    // The map is the WebGL canvas under this one (render/PixiMap.ts): clear, but for the notch strip.
    c.clearRect(0, 0, this.element.width, this.element.height);
    c.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    const { barTop } = this.layout();
    c.fillStyle = BAR_COLOUR; // the notch strip; the bar under it is Hud.ts's
    c.fillRect(0, 0, this.width, barTop);
  }

  /** The resource bar's height in game pixels. */
  private barRows(): number {
    return Math.max(1, Math.round((BAR_CSS * (window.devicePixelRatio || 1)) / this.scale));
  }

  /** A pointer position as a point of the 240 x 320 frame (map points may lie outside it). */
  locate(clientX: number, clientY: number): ScreenPoint {
    const rect = this.element.getBoundingClientRect();
    const dx = ((clientX - rect.left) * this.element.width) / rect.width;
    const dy = ((clientY - rect.top) * this.element.height) / rect.height;
    if (!this.onMap) {
      const { x, y, s } = this.frameRect();
      return { x: Math.floor((dx - x) / s), y: Math.floor((dy - y) / s), on: "screen" };
    }
    const gx = dx / this.scale;
    const gy = dy / this.scale;
    const { upper, top } = this.layout();
    if (gy < upper) return { x: Math.floor(gx), y: Math.floor(gy - upper), on: "top" };
    const cam = this.cameraOnScreen();
    return { x: Math.floor(gx - cam.x), y: Math.floor(gy - cam.y + top), on: "map" };
  }

  /**
   * For the HUD buttons, in CSS pixels: the top and the bottom of the bar, and the home indicator's
   * height. Null off the map.
   */
  hudLayout(): { barTop: number; barBottom: number; safeBottom: number } | null {
    if ((!this.onMap && !this.frozen) || this.story) return null;
    const { barTop, upper } = this.layout();
    const k = this.scale / (window.devicePixelRatio || 1);
    return {
      barTop: barTop * k,
      barBottom: upper * k,
      safeBottom: this.safe.bottom,
    };
  }

  /**
   * Menus, story and every screen off the map (user, 2026-10-17): the 240 x 320 frame as wide as
   * the screen, standing on its bottom edge (above the home indicator); above it the colour of
   * its top-left pixel (the sky of the menus and the splash), below it that of its bottom-left.
   * Device pixels: frame position and scale.
   */
  private frameRect(): { x: number; y: number; s: number } {
    const w = this.element.width;
    const h = this.element.height;
    const bottom = Math.round(this.safe.bottom * (window.devicePixelRatio || 1));
    let s = w / 240;
    if (320 * s > h - bottom) s = (h - bottom) / 320;
    return { x: Math.round((w - 240 * s) / 2), y: Math.round(h - bottom - 320 * s), s };
  }

  /** The frame (with the menu edits of `menuFrame`) and the colour around it. */
  private drawFrameFilled(): void {
    const c = this.context;
    const { x, y, s } = this.frameRect();
    const frame = this.menuFrame();
    // Above and below, the colour of the frame's top-left / bottom-left pixel (the menus' sky and
    // grass; a row stretched upwards turns any cloud or tree in it into a stripe).
    const pixel = (py: number) => {
      const [r, g, b] = frame.getContext("2d")!.getImageData(0, py, 1, 1).data;
      return `rgb(${r},${g},${b})`;
    };
    c.fillStyle = pixel(0);
    c.fillRect(0, 0, this.element.width, y);
    c.fillStyle = pixel(319);
    c.fillRect(0, y + 320 * s, this.element.width, this.element.height - y - 320 * s);
    c.drawImage(frame, 0, 0, 240, 320, x, y, 240 * s, 320 * s);
  }

  private readonly menuCopy = document.createElement("canvas");

  /**
   * The frame with the user's menu changes (2026-10-17): the soft-key icons in its bottom corners
   * (✓ / ✗) covered with the scenery next to them -- the HUD shows its own where a screen needs
   * them -- and, on the main menu (Q 0), its rows below PLAY and HELP covered with the parchment.
   */
  private menuFrame(): HTMLCanvasElement {
    const copy = this.menuCopy;
    copy.width = 240;
    copy.height = 320;
    const c = copy.getContext("2d")!;
    c.imageSmoothingEnabled = false;
    c.drawImage(this.frame.element, 0, 0);
    if (this.splash) return copy;
    c.drawImage(copy, 24, 296, 24, 24, 0, 296, 24, 24);
    c.drawImage(copy, 192, 296, 24, 24, 216, 296, 24, 24);
    if (this.runtime.game.screen === 0) {
      const rows = this.runtime.touchMenuRows;
      if (rows.length > 2) {
        // A clean line of parchment above PLAY (x 40..200), copied over OPTIONS, ABOUT and EXIT.
        const top = rows[2]! - 2;
        const height = rows[rows.length - 1]! + 18 - top;
        c.drawImage(copy, 40, rows[0]! - 10, 160, 1, 40, top, 160, height);
      }
    }
    return copy;
  }

  /** Frame point (x, y) on the screen canvas, in CSS pixels (off the map). */
  frameToCss(x: number, y: number): { x: number; y: number } {
    const rect = this.frameRect();
    const k = 1 / (window.devicePixelRatio || 1);
    return { x: (rect.x + x * rect.s) * k, y: (rect.y + y * rect.s) * k };
  }

  /** Map tile (column, row)'s top-left corner on the screen canvas, in CSS pixels. */
  tileToCss(column: number, row: number): { x: number; y: number } {
    const k = this.scale / (window.devicePixelRatio || 1);
    return { x: (column * TILE_W - this.viewX) * k, y: (row * TILE_H - this.viewY) * k };
  }

  /** Game pixels per CSS pixel, for drags. */
  gamePixelsPerCssPixel(): number {
    return (window.devicePixelRatio || 1) / this.scale;
  }
}
