import type { LegacyRuntimeState } from "./core/LegacyRuntimeState";
import { Graphics } from "./platform/Graphics";
import { oldArt } from "./platform/OldArt";
import type { LogicalCanvas } from "./platform/Canvas";
import { renderSceneSprites, renderWideView, TOP_BAR_SLOT, type WideWindow } from "./render/WideView";
import { stepGameplayPaintHud } from "./render/RenderRuntime";
import { drawMapMargin, MARGIN_TILES } from "./render/MapMargin";
import type { LegacyOffscreenImage } from "./render/LegacyOffscreenTargets";

/**
 * The screen the player sees (phase 3, user 2026-10-17; not in the original): a canvas filling the
 * whole window, notch included (portrait only). Menus and story screens show the original
 * 240 x 320 frame scaled to fit. On the map:
 *
 * - the map fills the screen (render/WideView.ts);
 * - at the top, the notch strip in the bar's colour; the resource bar itself is Hud.ts's (round 3,
 *   user 2026-10-20), BAR_CSS high;
 * - the rest of the original's HUD (paint()'s own HUD code, drawn again on a clear layer without
 *   the resource bar and the bottom bar): its upper half -- the selected villager's panel, the
 *   build-cost box -- right under the bar, its lower half -- the build cards, command bars -- at
 *   the bottom, moved down by the height of the bottom bar it no longer shows.
 *
 * The view (which part of the map is on screen) is separate from the game's own 11 x 18 camera:
 * dragging moves the view smoothly, in pixels, and the camera then follows into the view
 * (`cameraInView`); when the game moves its camera (keys, a jump to an alert), the view follows it.
 */

const TILE_W = 22;
const TILE_H = 16;
const MARGIN = 2; // tiles drawn past each edge, so a drag between two ticks shows no black
const HALF = 160; // HUD rows above this stay at the top of the screen, the rest at the bottom
/** The resource bar's height in CSS pixels (Hud.ts draws it; round-3 design, 2026-10-20). */
const BAR_CSS = 44;
const SPEECH_BOX_ROWS = 84; // the original's dialogue box (Q 17): face, name and words, frame rows 0..83
/** A dialogue scene's middle (frame point 120, 176) sits this far down the screen, above StoryHud's box. */
const SCENE_CENTRE = 0.38;
/** The original's bottom bars (record 4, 22 high, and record 10, 38 high with its message line):
 *  replaced by the HUD buttons and the notice feed. */
const BOTTOM_BAR_SLOTS = [1, 9];
/** Slot 2 (record 5) is the bar strip at the bottom: a building's items (the HUD's building menu
 *  replaces it), and while placing (w == 3) its "place the building." line with a red cross, which
 *  the user does not want (2026-10-17; the tick and the back button replace it). */
const BAR_STRIP_SLOT = 2;
/** The original's build cards: slot 6 (record 7, the card at the bottom) and slot 8 (record 9, the
 *  cost box at the top). The build list (Hud.ts) replaces them. */
const BUILD_CARD_SLOT = 6;
const BUILD_COST_SLOT = 8;
/** Choosing a new chief: the candidate's panel at the top (slot 4, shown once a villager has been
 *  tapped -- `candidatePanel`) and the row of portraits at the bottom (slot 5, never: the map is
 *  where the player picks). */
const CANDIDATE_PANEL_SLOT = 4;
const CANDIDATE_ROW_SLOT = 5;
const BAR_COLOUR = "#bfb04d";

export type ScreenPoint = { x: number; y: number; on: "screen" | "top" | "map" | "bottom" };

export class WideScreen {
  readonly element = document.createElement("canvas");
  private readonly context: CanvasRenderingContext2D;
  /** The frame's HUD alone: paint()'s bars and panels (f.paint() offsets 89..454) and its text
   *  (c.a(Graphics)) on a clear 240 x 320 layer. */
  private readonly overlay = document.createElement("canvas");
  private readonly overlayGraphics: Graphics;
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
  private wide: { image: LegacyOffscreenImage; window: WideWindow } | null = null;
  /** A dialogue scene in HD (renderScene): the image, where its point (0, 0) goes on screen, how
   *  many screen game pixels one of its pixels takes, and whether it is the sub-records on black. */
  private scene: { image: LegacyOffscreenImage; x: number; y: number; zoom: number; sprites: boolean } | null = null;
  /** Zoom setting: how many device pixels per game pixel below the largest that fits (0 = largest). */
  zoomOut = 0;
  /** While set, the screen shows what it showed when freeze() was called (the game menu,
   *  Hud.ts: the original's pause menu, its prompts and messages stay out of sight). */
  frozen = false;
  /** The game's splash is on screen (main.ts): shown as it is, without the menu edits. */
  splash = false;
  /** Choosing a chief: a candidate has been tapped, so the original's panel shows them. */
  candidatePanel = false;
  /** Whether a touch key script is running (main.ts: TouchControls.busy): the original's bars it
   *  passes through, e.g. the command bar on the way to the build list, are not drawn (BUG-016).
   *  Asked while drawing -- a flag the HUD set after each frame let the first frame show them (BUG-021). */
  scriptRunning: () => boolean = () => false;
  /** The HD villager panel is up (Hud.ts sets it): the original's (slot 4) is not drawn (BUG-017). */
  villagerSheet = false;
  /** Touch or mouse play (the last input was a pointer): the map's cursor has no hand. */
  touchPlay = true;
  private readonly still = document.createElement("canvas");

  constructor(private readonly runtime: LegacyRuntimeState, private readonly frame: LogicalCanvas) {
    const context = this.element.getContext("2d");
    const overlay = this.overlay.getContext("2d");
    if (!context || !overlay) throw new Error("Canvas 2D context is unavailable");
    this.context = context;
    this.overlay.width = 240;
    this.overlay.height = 320;
    overlay.imageSmoothingEnabled = false;
    this.overlayGraphics = new Graphics(overlay);
    this.overlayGraphics.shown = true;
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
    this.scale = levels[Math.min(this.zoomOut, levels.length - 1)]!;
    this.width = Math.floor(w / this.scale);
    this.height = Math.floor(h / this.scale);
  }

  /** A dialogue scene (Q 17) or a villager speaking (Q 20), shown as the original's frame. */
  private get dialogue(): boolean {
    return this.runtime.game.loopMode !== 1 && (this.runtime.game.screen === 17 || this.runtime.game.screen === 20);
  }

  /** The map tiles the screen shows (fractions; may reach past the map's edges): the minimap's frame. */
  viewRect(): { column: number; row: number; columns: number; rows: number } {
    return { column: this.viewX / TILE_W, row: this.viewY / TILE_H, columns: this.width / TILE_W, rows: this.height / TILE_H };
  }

  /** The map tile in the middle of the screen. */
  centreTile(): [number, number] {
    return [Math.floor((this.viewX + this.width / 2) / TILE_W), Math.floor((this.viewY + this.height / 2) / TILE_H)];
  }

  /** The screen shows the original's 240 x 320 frame (menus, dialogue ...), not the map view. */
  get framed(): boolean {
    return !this.onMap;
  }

  private get onMap(): boolean {
    return this.runtime.game.loopMode === 1 && !!this.runtime.activeMap;
  }

  /** The frame's rows above the map (top bar, top panels) and from the bottom panel down. */
  private strips(): { top: number; panel: number } {
    const g = this.runtime.game;
    const top = Math.max(0, Math.min(320, g.selectionBb - g.selectionAx));
    const panel = Math.max(top, Math.min(320, 320 - g.selectionBa));
    return { top, panel };
  }

  /**
   * Where things sit on screen, in game pixels: the bar (`barTop`, under the notch), the frame's
   * upper HUD rows from `upper` on, its lower rows from `lower` on (frame row HALF there), and the
   * map area the camera's window must stay in (`areaTop` .. `areaBottom`).
   */
  private layout() {
    const g = this.runtime.game;
    const k = (window.devicePixelRatio || 1) / this.scale;
    const barTop = Math.round(this.safe.top * k);
    const safeBottom = Math.round(this.safe.bottom * k);
    const { top, panel } = this.strips();
    const base195 = this.runtime.packedOffsets[195] ?? 0;
    // The bottom bar on now: its frame rows (from its record's screen y down) are not drawn.
    let barRows = 0;
    for (const slot of this.bottomSlotsNotDrawn()) {
      if (!g.selectionFlags[slot]) continue;
      const record = this.runtime.packedBytes[base195 + slot] ?? 0;
      barRows = Math.max(barRows, 320 - (g.oElementRecordInts[record] ?? 320));
    }
    const upperRows = this.villagerSheet || this.buildCardsOpen || (this.choosingChief && !this.candidatePanel) ? 0 : g.selectionFlags[TOP_BAR_SLOT] ? Math.max(0, top - this.barRows()) : top;
    const lowerRows = Math.max(0, 320 - panel - barRows);
    const upper = barTop + this.barRows();
    const lower = this.height - safeBottom + barRows - (320 - HALF);
    return { barTop, upper, lower, areaTop: upper + upperRows, areaBottom: this.height - safeBottom - lowerRows, top, upperRows, lowerRows };
  }

  private bottomSlotsNotDrawn(): number[] {
    const g = this.runtime.game;
    if (g.barMode === 3 || this.buildingMenuOpen) return [...BOTTOM_BAR_SLOTS, BAR_STRIP_SLOT];
    if (this.buildCardsOpen) return [...BOTTOM_BAR_SLOTS, BUILD_CARD_SLOT];
    if (this.choosingChief) return [...BOTTOM_BAR_SLOTS, CANDIDATE_ROW_SLOT];
    return BOTTOM_BAR_SLOTS;
  }

  /** The original's chief succession is waiting for a pick (K:Z with its row open). */
  get choosingChief(): boolean {
    const g = this.runtime.game;
    return g.loopMode === 1 && g.choosingChief && g.barMode === 2;
  }

  /** A building's bar is open (slot 2 on, f.Z() filling it from aa / ab / ac; w 2, or 4 while an
   *  item confirms): the HUD's building menu shows instead. */
  get buildingMenuOpen(): boolean {
    const g = this.runtime.game;
    // w 4: one of its items confirming (its line shows in the sheet, BUG-019).
    return g.loopMode === 1 && (g.barMode === 2 || g.barMode === 4) && !!g.selectionFlags[BAR_STRIP_SLOT] && !g.choosingChief && !this.buildCardsOpen;
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
  private followCamera(): void {
    const g = this.runtime.game;
    const { areaTop, areaBottom, top } = this.layout();
    const { panel } = this.strips();
    const camX = g.cameraColumn * TILE_W;
    const camY = g.cameraRow * TILE_H;
    this.viewX = Math.max(camX + 240 - this.width, Math.min(camX, this.viewX));
    this.viewY = Math.max(camY - (areaBottom - (panel - top)), Math.min(camY - areaTop, this.viewY));
  }

  /** Puts map tile (column, row) in the middle of the screen. */
  centerOn(column: number, row: number): void {
    this.viewX = column * TILE_W + TILE_W / 2 - this.width / 2;
    this.viewY = row * TILE_H + TILE_H / 2 - this.height / 2;
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

  /** After each paint: draws the larger map window for the current view. */
  renderWide(): void {
    this.resize();
    if (!this.onMap) { this.wide = null; this.renderScene(); return; }
    this.scene = null;
    const g = this.runtime.game;
    if (g.cameraColumn !== this.camera.column || g.cameraRow !== this.camera.row) {
      this.camera = { column: g.cameraColumn, row: g.cameraRow };
      this.followCamera();
    }
    this.clampView();
    const window: WideWindow = {
      column: Math.floor(this.viewX / TILE_W) - MARGIN,
      row: Math.floor(this.viewY / TILE_H) - MARGIN,
      columns: Math.ceil(this.width / TILE_W) + MARGIN * 2 + 1,
      rows: Math.ceil(this.height / TILE_H) + MARGIN * 2 + 1,
    };
    const before = oldArt.where;
    oldArt.where = "地图";
    const image = renderWideView(this.runtime, window, this.touchPlay);
    if (image) drawMapMargin(image, window, g.mapWidth, g.mapHeight, image.scale, this.fog);
    // Placing a building (w 3, a site's f.s, as WideView): where it may stand.
    if (image && g.barMode === 3 && g.cSInt > 3 && g.cSInt !== 100) this.drawPlaceable(image, window);
    oldArt.where = "HUD";
    this.wide = image ? { image, window } : null;
    // The HUD again, onto a clear layer, without the bars: both draws only read the game state.
    const overlay = this.overlay.getContext("2d")!;
    overlay.clearRect(0, 0, 240, 320);
    const hidden = new Set([TOP_BAR_SLOT, ...this.bottomSlotsNotDrawn()]);
    if (this.buildCardsOpen) hidden.add(BUILD_COST_SLOT);
    if (this.choosingChief && !this.candidatePanel) hidden.add(CANDIDATE_PANEL_SLOT);
    if (this.scripting) g.selectionFlags.forEach((_, slot) => hidden.add(slot));
    if (this.villagerSheet) hidden.add(CANDIDATE_PANEL_SLOT);
    stepGameplayPaintHud(this.runtime, this.overlayGraphics, hidden);
    const group0 = this.runtime.imageGroups[0];
    if (group0 && !this.scripting) this.runtime.geometryRenderer.renderTo(this.overlayGraphics, group0);
    oldArt.where = before;
  }

  /**
   * A dialogue scene (Q 17) in HD, filling the screen (round-4 design, 2026-10-22: the scene plays on
   * in HD art, StoryHud's box over its bottom). What f.P() draws in the original's 128-row band
   * depends on t155[aS]: 1, two sub-records on black (the opening cave: eyes, the fire); 2, the
   * map at the camera (f.R(), also when t155[ao] is 2); otherwise the band stays as it was, and so
   * does this. The band's middle (frame point 120, 176) goes to SCENE_CENTRE. The cave is drawn as
   * wide as the screen (its eyes are a few pixels); the map at the map view's size.
   */
  private renderScene(): void {
    const rt = this.runtime;
    const g = rt.game;
    if (g.screen !== 17) { this.scene = null; return; }
    const kind = (n: number) => rt.packedBytes[(rt.packedOffsets[155] ?? 0) + n] ?? 0;
    const dx = Math.round(this.width / 2) - 120;
    const dy = Math.round(this.height * SCENE_CENTRE) - 176;
    const before = oldArt.where;
    oldArt.where = "对话场景";
    if (kind(g.aS) === 1) {
      const calls = rt.frameHelperCalls.filter((c) => c.kind === "p-sprite")
        .map((c) => ({ record: Number(c.record), x: Number(c.x), y: Number(c.y), phase: Number(c.mode) }));
      if (calls.length > 0 || !this.scene?.sprites) {
        const zoom = this.width / 240;
        const height = Math.ceil(this.height / zoom);
        // The calls draw on the offscreen: frame point + (11, 8).
        const image = renderSceneSprites(rt, calls, 240, height, -11, Math.round(height * SCENE_CENTRE) - 176 - 8);
        this.scene = image && { image, x: 0, y: 0, zoom, sprites: true };
      }
    } else if (kind(g.aS) >= 2 || kind(g.ao) >= 2) {
      // Screen point (x, y) shows map pixel (x + left, y + top).
      const left = g.cameraColumn * TILE_W - dx;
      const top = g.cameraRow * TILE_H - dy;
      const window: WideWindow = {
        column: Math.floor(left / TILE_W) - MARGIN,
        row: Math.floor(top / TILE_H) - MARGIN,
        columns: Math.ceil(this.width / TILE_W) + MARGIN * 2 + 1,
        rows: Math.ceil(this.height / TILE_H) + MARGIN * 2 + 1,
      };
      const image = renderWideView(rt, window, false, true);
      if (image) drawMapMargin(image, window, g.mapWidth, g.mapHeight, image.scale, this.fog);
      // Scene 24 shakes: f.R() copies the band aQ (0..7) rows lower.
      const shake = g.aS === 24 ? g.aQ : 0;
      this.scene = image && { image, x: window.column * TILE_W - left - 11, y: window.row * TILE_H - top - 8 + shake, zoom: 1, sprites: false };
    }
    oldArt.where = before;
  }

  /**
   * While placing a building, a light green wash on every tile a building may cover (UI design
   * "放置建筑", 2026-10-27): free (map grid 0) and in sight (fog class 0) -- f.a(int,int,int,boolean)'s
   * test for each tile of the footprint. It fits where its whole footprint is green.
   */
  private drawPlaceable(image: LegacyOffscreenImage, window: WideWindow): void {
    const context = image.element.getContext("2d");
    if (!context) return;
    const g = this.runtime.game;
    context.save();
    context.fillStyle = "rgba(150, 255, 110, 0.28)";
    context.strokeStyle = "rgba(220, 255, 200, 0.35)";
    context.lineWidth = 0.5;
    for (let row = Math.max(0, window.row); row < Math.min(g.mapHeight, window.row + window.rows); row += 1) {
      for (let column = Math.max(0, window.column); column < Math.min(g.mapWidth, window.column + window.columns); column += 1) {
        if (this.runtime.gridC[row]?.[column] !== 0 || this.runtime.occupancyClass(column, row) !== 0) continue;
        const x = 11 + (column - window.column) * TILE_W;
        const y = 8 + (row - window.row) * TILE_H;
        context.fillRect(x + 0.5, y + 0.5, TILE_W - 1, TILE_H - 1);
        context.strokeRect(x + 0.75, y + 0.75, TILE_W - 1.5, TILE_H - 1.5);
      }
    }
    context.restore();
  }

  /** A map tile's fog class (f.a(int,int)): 0 in sight, 1 explored, 2 unexplored. */
  private readonly fog = (x: number, y: number) => this.runtime.occupancyClass(x, y);

  private get scripting(): boolean {
    return this.scriptRunning() && this.runtime.game.loopMode === 1;
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
    c.fillStyle = "#000";
    c.fillRect(0, 0, this.element.width, this.element.height);
    if (this.scene && !this.onMap) {
      const { image, x, y, zoom } = this.scene;
      c.setTransform(this.scale, 0, 0, this.scale, 0, 0);
      c.imageSmoothingEnabled = image.scale > this.scale * zoom;
      c.imageSmoothingQuality = "high";
      c.drawImage(image.element, x, y, image.width * zoom, image.height * zoom);
      return;
    }
    if (!this.onMap || !this.wide) {
      this.drawFrameFilled();
      return;
    }
    c.setTransform(this.scale, 0, 0, this.scale, 0, 0);
    const { image, window } = this.wide;
    // The HD wide view (image.scale > 1) is larger than the screen shows it: smooth when shrinking.
    c.imageSmoothingEnabled = image.scale > this.scale;
    c.imageSmoothingQuality = "high";
    c.drawImage(image.element, Math.round(window.column * TILE_W - this.viewX - 11), Math.round(window.row * TILE_H - this.viewY - 8), image.width, image.height);
    c.imageSmoothingEnabled = false;
    const { barTop, upper, lower } = this.layout();
    c.drawImage(this.overlay, 0, 0, 240, HALF, 0, upper, 240, HALF);
    c.drawImage(this.overlay, 0, HALF, 240, 320 - HALF, 0, lower, 240, 320 - HALF);
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
    if (!this.onMap || !this.wide) {
      const { x, y, s } = this.frameRect();
      return { x: Math.floor((dx - x) / s), y: Math.floor((dy - y) / s), on: "screen" };
    }
    const gx = dx / this.scale;
    const gy = dy / this.scale;
    const { upper, upperRows, lower, lowerRows, areaBottom, top } = this.layout();
    // The bar, and the panels (beside them, the map shows through).
    if (gy < upper || (gx < 240 && gy < upper + upperRows)) return { x: Math.floor(gx), y: Math.floor(gy - upper), on: "top" };
    if (gx < 240 && lowerRows > 0 && gy >= areaBottom) return { x: Math.floor(gx), y: Math.floor(gy - lower + HALF), on: "bottom" };
    const cam = this.cameraOnScreen();
    return { x: Math.floor(gx - cam.x), y: Math.floor(gy - cam.y + top), on: "map" };
  }

  /**
   * For the HUD buttons, in CSS pixels: the bottom of the bar and of the panels under it, the
   * height of the panels at the bottom (above the home indicator), and the menu icon's area at the
   * bar's right end. Null off the map.
   */
  hudLayout(): { barTop: number; barBottom: number; panelsBottom: number; bottomPanels: number; safeBottom: number } | null {
    if ((!this.onMap && !this.frozen) || !this.wide) return null;
    const { barTop, upper, areaTop, lowerRows } = this.layout();
    const k = this.scale / (window.devicePixelRatio || 1);
    return {
      barTop: barTop * k,
      barBottom: upper * k,
      panelsBottom: areaTop * k,
      bottomPanels: lowerRows * k,
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
    // A dialogue (Q 17; round 4): the frame at the top, StoryHud's box at the bottom under it.
    const top = Math.round(this.safe.top * (window.devicePixelRatio || 1));
    if (this.dialogue) return { x: Math.round((w - 240 * s) / 2), y: Math.min(top, Math.round(h - bottom - 320 * s)), s };
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
    c.fillStyle = this.dialogue ? "#000" : pixel(319);
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
    // While a dialogue shows its words (StoryHud), the original's speech box (rows 0..83) is not.
    const g = this.runtime.game;
    if (this.dialogue && g.resourceSectionW === g.vInt) {
      c.fillStyle = "#000";
      c.fillRect(0, 0, 240, SPEECH_BOX_ROWS);
    }
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
