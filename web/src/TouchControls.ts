import { OriginalKey, type KeyState, type OriginalKeyName } from "./platform/Input";
import type { LegacyRuntimeState } from "./core/LegacyRuntimeState";
import { T_BUILDING } from "./core/DataTables";
import { UNIT_OFFSET_X, UNIT_OFFSET_Y } from "./core/DenseLayout";
import type { WideScreen } from "./WideScreen";
import { stepGameplayZAe } from "./ui/UiRuntime";

/**
 * Touch and mouse input -- the temporary first version the user decided on 2026-10-15
 * (docs/touch-mouse-design.md, "Decided first version"). Not in the original.
 *
 * Everything becomes the phone's keys, fed through the same KeyState as the keyboard, one key
 * edge per tick, so the game sees ordinary key presses. The only direct writes are the cursor
 * jump (f.y:B/f.A:B, a position the original's own cursor takes near the map's edges) and the
 * camera move (f.I:B/f.K:B with f.A:Z set, the original's full redraw), both inside the bounds f.Y()
 * keeps.
 *
 * Since the larger view (WideScreen.ts, 2026-10-17) a drag moves the view, not the camera; the
 * camera then follows into the view, and a tap on a tile outside the camera moves the camera just
 * far enough to take it in.
 */

const DRAG_PX = 8; // CSS pixels a press may move and still count as a tap
// Box select by long press (docs/box-select-idea.md, user 2026-10-16/17): still for LONG_MS, then
// an arc above the finger fills in ARC_MS; moving more than ARC_SLOP_PX before it is full is a drag.
const LONG_MS = 700;
const ARC_MS = 450;
const ARC_SLOP_PX = 12;
const EDGE_BAND = 0.1; // share of the screen at each edge where a box drag scrolls the view
const EDGE_SPEED = 110; // CSS pixels per second at the very edge (slow, like Warcraft's)
const TILE_W = 22;
const TILE_H = 16;
const SWIPE_PX = 24; // game pixels for a card swipe

type Script = Generator<void, void, void>;

export type TouchControls = {
  /** Call once per tick, before the key edges are forwarded to the game. */
  step(): void;
  /** Drops queued taps, drags and box selects (input made before the game started). */
  cancel(): void;
  /** Centres the camera on map tile (tx, ty) and puts the cursor there (alerts, phase 3). */
  focus(tx: number, ty: number): void;
  /** Makes a DOM button hold an original key while it is pressed. */
  bindKey(button: HTMLElement, key: OriginalKeyName): void;
  /** Presses and releases `key`, held for `ticks` ticks (a tap is one; 7 / 9 held 4 or more with
   *  units selected store them as a group, f.h()'s I:B count). */
  pressKey(key: OriginalKeyName, ticks?: number): void;
  /** A box select is being dragged (started by a long press on the map). */
  readonly boxing: boolean;
  /** Drops the box being dragged without selecting anyone. */
  cancelBox(): void;
  /** Opens the original's command bar (left soft key) and confirms the item whose code
   *  (f.r:[B, mainArrays.r) is one of `codes` -- 10 build, 11 / 14 form up, 12 / 15 call to arms,
   *  13 villagers. */
  command(codes: readonly number[]): void;
  /** While placing (w == 3): the footprint's map tiles (f.T:I / f.U:I from the camera, the size
   *  from t138 104 / 130 + s); 1 x 1 for the non-building targets (s <= 3, s == 100). */
  footprint(): { column: number; row: number; columns: number; rows: number } | null;
  /** In an open bar (w == 2): moves its cursor (f.as:B) to `index` with left / right, then presses
   *  FIRE `presses` times (a row of portraits takes two: pick, then confirm; 0 only moves). */
  pickInBar(index: number, presses?: number): void;
  /** In an open bar (w == 2): moves its cursor to `index`, then changes the item's number by
   *  `delta` (UP / DOWN, the armoury's order count). Calls during a swipe add up. */
  adjustInBar(index: number, delta: number): void;
  /** Aiming at a villager (w == 3, the store's weapons and the sanctuary's spells): the cursor goes
   *  to map tile (tx, ty), FIRE, then the right soft key back to the building's bar. */
  fireAt(tx: number, ty: number): void;
  /** Selects our villager `id` as a tap on them on the map would (w == 1); from a building's bar,
   *  one inside is first brought out (get out!). */
  selectVillager(id: number): void;
  /** The map tile our villager `id` stands on (null inside a building). */
  villagerTile(id: number): [number, number] | null;
  /** A scripted key sequence is still running (the game must tick for it). */
  readonly busy: boolean;
  /** While set, a tap on the map goes here instead (with the villager tapped, or 0). */
  setMapTapHandler(handler: ((villager: number) => void) | null): void;
  /** Moves the cursor to map tile (tx, ty), panning the game's camera if needed (an order's spot). */
  aim(tx: number, ty: number): void;
  /** Closes any open bar, the build cards or a selection (right soft key until w == 0). */
  closeBars(): void;
  /** The start menu's choices (round 4) played into the original's menus from the main menu (Q 0):
   *  PLAY, then campaign / custom (Q 2), continue / new game (Q 3), yes to every question (Q 16:
   *  the lost saves, "enable tutorial?"), the difficulty (Q 13 row 1 easy, 2 hard) and the map
   *  (Q 9), as each comes, until the game or the story (Q 18) is on. */
  startGame(plan: { custom: boolean; resume: boolean; difficulty: 1 | 2; map: number }): void;
  /** Start-up (user, 2026-10-17): answers the language list (Q 14, row `language`) and the
   *  "play music?" question (Q 16: left soft key yes, right soft key no) as they come. */
  answerStartQuestions(language: number, music: boolean): void;
  /** Opens the original's pause menu (backing out of a selection or an open bar first). */
  openPause(): void;
  /**
   * Picks `item` in the original's pause menu (Q 10 with a save, Q 11 without), answers its yes /
   * no prompt (Q 16) with yes and its message (Q 21) with OK, telling `onMessage` the message's
   * text record (/t 66 no memory, 67 saved). "resume" leaves the menu.
   */
  pauseMenu(item: PauseItem, onMessage?: (record: number) => void): void;
};

export type PauseItem = "resume" | "load" | "save" | "options" | "help" | "quit";
/** The pause menu's rows (measured 2026-10-17): Q 10 has LOAD, Q 11 (no save yet) does not. */
const PAUSE_ROWS: Record<number, readonly PauseItem[]> = {
  10: ["resume", "load", "save", "options", "help", "quit"],
  11: ["resume", "save", "options", "help", "quit"],
};

export function attachTouchControls(
  screen: WideScreen,
  runtime: LegacyRuntimeState,
  keys: KeyState,
): TouchControls {
  const game = runtime.game;
  const canvas = screen.element;
  let script: Script | null = null;
  // Ticks counted by step(), and the tick of the last touch/mouse input: behaviour that only suits
  // touch (centring the placement footprint) must not touch keyboard play or a replayed key script.
  let tick = 0;
  let touchTick = -1000;
  const touched = () => { touchTick = tick; };
  // Set by a drag on the map: the camera moves into the view on the next ticks.
  let follow = false;
  // Box select in progress: the finger (client pixels). The anchor is the original's own f.G/f.H.
  let box: { x: number; y: number } | null = null;
  // The long-press arc: an SVG over the screen, above the finger.
  const arc = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  arc.setAttribute("class", "box-arc");
  arc.setAttribute("viewBox", "0 0 100 60");
  arc.innerHTML = '<path class="track" d="M 14 50 A 42 42 0 0 1 86 50"/><path class="fill" d="M 14 50 A 42 42 0 0 1 86 50" pathLength="100"/>';
  arc.style.display = "none";
  canvas.parentElement?.append(arc);
  const arcFill = arc.querySelector<SVGPathElement>(".fill")!;

  const toGame = (event: PointerEvent) => screen.locate(event.clientX, event.clientY);

  function* tapKey(key: OriginalKeyName): Script {
    keys.press(key);
    yield;
    keys.release(key);
    yield;
  }

  /** FIRE on its own: two FIREs less than about five ticks apart are the original's double press
   *  (f.n:I, cleared once E:B passes 4), which ae() / d(byte) treat differently. */
  function* tapFireAlone(): Script {
    for (let i = 0; i < 10 && game.nInt > 0; i += 1) yield;
    yield* tapKey(OriginalKey.FIRE);
  }

  /** Steps a selection index toward `target` one key per press, then optionally confirms. */
  function* navigate(read: () => number, target: number, down: OriginalKeyName, up: OriginalKeyName, confirm: boolean): Script {
    // A screen ignores keys for its first few ticks (f.n:Z), so a press may not move anything;
    // give up only after three presses in a row change nothing.
    // A value seen twice means the target cannot be reached (a menu's title row, a wrapping list).
    const seen = new Set([read()]);
    for (let i = 0, stalls = 0; i < 16 && stalls < 3 && read() !== target; i += 1) {
      const before = read();
      yield* tapKey(read() < target ? up : down);
      stalls = read() === before ? stalls + 1 : 0;
      if (read() !== before && seen.has(read())) return;
      seen.add(read());
    }
    if (confirm && read() === target) yield* tapKey(OriginalKey.FIRE);
  }

  /** Moves an open bar's cursor (f.as:B) to `target` at once: f.ae() with LEFT / RIGHT down, once
   *  per step, as that many key presses would (a long villager list would take seconds). */
  const jumpInBar = (target: number) => {
    for (let i = 0; i < 64 && game.barMode === 2 && game.menuCursor !== target; i += 1) {
      const before = game.menuCursor;
      const right = before < target;
      if (right) game.inputRight = true; else game.inputLeft = true;
      stepGameplayZAe(runtime);
      game.inputRight = false;
      game.inputLeft = false;
      if (game.menuCursor === before) return;
    }
  };

  const run = (next: Script) => { script = next; touched(); };
  // Capture keeps the moves and the lift coming to the element that saw the press. It throws for
  // a pointer the browser no longer tracks, which must not cost the key press.
  const capture = (element: Element, id: number) => { try { element.setPointerCapture(id); } catch { /* no capture */ } };

  // ---- the map ----
  const mapTop = () => game.selectionBb - game.selectionAx;
  const panelTop = () => 320 - game.selectionBa;
  const rowLimit = () => game.mapHeight - 2 - (game.selectionBa >> 5);
  const tileAt = (x: number, y: number): [number, number] =>
    [game.cameraColumn + Math.floor(x / TILE_W), game.cameraRow + Math.floor((y - mapTop()) / TILE_H)];
  const unitAt = (tx: number, ty: number) => runtime.gridC[ty]?.[tx] ?? 0;
  const tileOf = (id: number): [number, number] | null => {
    for (let y = 0; y < game.mapHeight; y += 1) {
      const row = runtime.gridC[y];
      if (!row) continue;
      const x = row.indexOf(id);
      if (x >= 0) return [x, y];
    }
    return null;
  };

  const tapMap = (x: number, y: number) => {
    if (game.cameraBFlag || game.columnScrollDelta !== 0 || game.rowScrollDelta !== 0) return;
    const [tx, ty] = tileAt(x, y);
    if (game.barMode === 3) {
      // Building placement: the footprint is centred on the cursor (f.T:I = y - w/2, f.U:I = A - h/2
      // each frame); a tap anywhere moves it there. It is placed with the tick next to it (Hud.ts,
      // 2026-10-17), not by a tap on it, so a small correction cannot place it by accident.
      moveCursorTo(tx, ty);
      return;
    }
    const cx = game.cameraColumn + game.cursorColumn;
    const cy = game.cameraRow + game.cursorRow;
    const hovered = game.hoverUnit > 0 ? tileOf(game.hoverUnit) : null;
    // A bar open (w 2, or 4 confirming an item): FIRE there would press its item under the cursor
    // -- a second tap on a just selected building pressed its first item, demolish (2026-10-22).
    // So no "tap again to confirm" then: the taps below close the bar first.
    const barOpen = game.barMode === 2 || game.barMode === 4;
    if (!barOpen && !script && ((tx === cx && ty === cy) || (hovered && hovered[0] === tx && hovered[1] === ty))) {
      const cell = unitAt(cx, cy);
      const target = cell >= 1 && cell <= 50 ? cell : game.hoverUnit;
      if (game.barMode === 1 && target > 0 && target === game.selectedId) {
        // FIRE on the unit that is already selected is the original's "select everyone on
        // screen". Left out of touch input for now (user, 2026-10-15); kept for a later scheme:
        // run(tapKey(OriginalKey.FIRE));
        return;
      }
      run(tapKey(OriginalKey.FIRE));
      return;
    }
    // One tap selects a villager (phase 3, 2026-10-17: there is no hand cursor to aim first):
    // the cursor jumps to them and FIRE follows. With nothing selected, anything else takes two
    // taps: the first moves the cursor there, the second confirms.
    const villager = villagerAt(x, y);
    if (villager && !(game.barMode === 1 && villager.id === game.selectedId)) {
      // From a building's bar, the villager's panel straight away (BUG-018).
      run(selectAt(villager.tx, villager.ty, 0));
      return;
    }
    // A building is selected with one tap too (user, 2026-10-21); from another building's bar, that
    // bar is closed first.
    const cell = unitAt(tx, ty);
    // With villagers selected (w 1) the same tap is the original's order: they go to the building
    // (work, build, repair) -- one tap too (user, 2026-10-23: keep the original, BUG-018).
    if (cell < 0 && cell >= -60 && (game.barMode === 0 || game.barMode === 1 || barOpen)) {
      run(selectAt(tx, ty, -cell));
      return;
    }
    // With villagers selected one tap is the order too (user, 2026-10-26: move, gather, hunt,
    // attack ... at once; the HUD flashes the action icon there).
    if (game.barMode === 1) { run(selectAt(tx, ty, 0)); return; }
    // First tap: the cursor jumps to the tile.
    moveCursorTo(tx, ty);
  };

  /** Selects what is on map tile (tx, ty) with FIRE there, as one tap does: once a FIRE sent just
   *  before has been taken (a double tap), an open bar is closed first -- FIRE into it would press
   *  its item -- unless it is `building`'s own (a building record id; 0 for a villager). */
  function* selectAt(tx: number, ty: number, building: number): Script {
    for (let i = 0; i < 10 && game.nInt > 0; i += 1) yield;
    const open = game.barMode === 2 || game.barMode === 4;
    if (open && building > 0 && game.qCounter === building) return;
    if (open) yield* backOut();
    moveCursorTo(tx, ty);
    yield* tapKey(OriginalKey.FIRE);
  }

  /** Our villager (1..50) whose figure is nearest frame point (x, y), within about a tile: the
   *  cells around the tap, each unit placed by its walking offset (e[202 + id], e[303 + id]). */
  const villagerAt = (x: number, y: number): { id: number; tx: number; ty: number } | null => {
    const [tx, ty] = tileAt(x, y);
    const px = game.cameraColumn * TILE_W + x;
    const py = game.cameraRow * TILE_H + y - mapTop();
    let best: { id: number; tx: number; ty: number } | null = null;
    let bestDistance = Infinity;
    for (let dy = -1; dy <= 1; dy += 1) {
      for (let dx = -1; dx <= 1; dx += 1) {
        const id = unitAt(tx + dx, ty + dy);
        if (id < 1 || id > 50) continue;
        const cx = (tx + dx) * TILE_W + TILE_W / 2 + (runtime.denseState[UNIT_OFFSET_X + id] ?? 0);
        const cy = (ty + dy) * TILE_H + TILE_H / 2 + (runtime.denseState[UNIT_OFFSET_Y + id] ?? 0);
        if (Math.abs(px - cx) > 16 || Math.abs(py - cy) > 18) continue;
        const distance = (px - cx) ** 2 + (py - cy) ** 2;
        if (distance < bestDistance) { bestDistance = distance; best = { id, tx: tx + dx, ty: ty + dy }; }
      }
    }
    return best;
  };

  /** The cursor jumps to map tile (tx, ty), inside the bounds f.Y() keeps; the camera moves just
   *  far enough to take the tile in. */
  const moveCursorTo = (tx: number, ty: number) => {
    if (tx < 0 || tx >= game.mapWidth || ty < 0 || ty >= rowLimit()) return;
    const rows = Math.max(1, Math.floor((panelTop() - mapTop()) / TILE_H));
    panTo(
      Math.max(tx - game.viewColumns + 1, Math.min(tx, game.cameraColumn)),
      Math.max(ty - rows + 1, Math.min(ty, game.cameraRow)),
    );
    const col = tx - game.cameraColumn;
    const row = ty - game.cameraRow;
    if (col < 0 || col >= game.viewColumns || row < 0) return;
    game.cursorColumn = col;
    game.cursorRow = row;
  };

  /** Moves the view origin (f.I:B/f.K:B) toward (column, row) inside f.Y()'s bounds; f.A:Z redraws. */
  const panTo = (column: number, row: number) => {
    const minK = game.selectionFlags[4] ? 1 : 0;
    const maxK = game.mapHeight - game.viewRows - 1 - (game.selectionBa >> 5);
    const I = Math.max(0, Math.min(game.mapWidth - game.viewColumns, column));
    const K = Math.max(minK, Math.min(maxK, row));
    if (I === game.cameraColumn && K === game.cameraRow) return;
    game.cameraColumn = I;
    game.cameraRow = K;
    game.AFlag = true; // f.n() redraws the whole view
  };

  /** After a drag: the camera moves into the view; the cursor keeps its map tile where it can. */
  const followView = () => {
    if (game.loopMode !== 1) { follow = false; return; }
    if (game.cameraBFlag || game.columnScrollDelta !== 0 || game.rowScrollDelta !== 0) return;
    const want = screen.cameraInView();
    const tx = game.cameraColumn + game.cursorColumn;
    const ty = game.cameraRow + game.cursorRow;
    panTo(want.column, want.row);
    game.cursorColumn = Math.max(0, Math.min(game.viewColumns - 1, tx - game.cameraColumn));
    game.cursorRow = Math.max(0, Math.min(rowLimit() - 1 - game.cameraRow, ty - game.cameraRow));
    if (!gesture) follow = false;
  };

  // ---- the bottom panel ----
  const tapPanel = (x: number, y: number) => {
    if (y >= 298 && x < 24) { run(tapKey(OriginalKey.SOFT_LEFT)); return; }
    if (y >= 298 && x >= 216) { run(tapKey(OriginalKey.SOFT_RIGHT)); return; }
    if (game.barMode === 2 && game.selectionBa >= 80) { run(tapKey(OriginalKey.FIRE)); return; } // a build card
    if (game.barMode === 2 && y >= 294) {
      if (x >= 192) { run(tapKey(OriginalKey.RIGHT)); return; }
      const slot = Math.floor((x - 22) / 34);
      if (slot < 0 || slot > 4) return;
      if (game.entityFocusFlag || game.choosingChief) {
        // A row of portraits (villagers, a new chief): the first tap moves the highlight,
        // a second tap on it confirms.
        if (game.menuCursor === slot) run(tapKey(OriginalKey.FIRE));
        else run(navigate(() => game.menuCursor, slot, OriginalKey.LEFT, OriginalKey.RIGHT, false));
        return;
      }
      // An item with a quantity (the selected slot draws a number, e.g. the weapon workshop): its
      // upper half is UP, its lower half DOWN. Choosing such a slot only selects it; a command icon
      // is chosen and confirmed with one tap.
      // The bar draws the selected slot's number at 63 + 34 * slot (its icon sits at 39 + 34 * slot).
      const quantity = () => Math.abs(runtime.touchBarNumberX - (63 + 34 * game.menuCursor)) <= 4;
      if (slot === game.menuCursor && quantity()) { run(tapKey(y < 306 ? OriginalKey.UP : OriginalKey.DOWN)); return; }
      if (slot === game.menuCursor) { run(tapKey(OriginalKey.FIRE)); return; }
      run((function* () {
        yield* navigate(() => game.menuCursor, slot, OriginalKey.LEFT, OriginalKey.RIGHT, false);
        yield; // let the bar draw the newly selected slot
        if (game.menuCursor === slot && !quantity()) yield* tapKey(OriginalKey.FIRE);
      })());
    }
  };

  // ---- screens other than the map: menus, dialogue, story ----
  const tapScreen = (x: number, y: number) => {
    // The soft keys' corner icons are covered (WideScreen.menuFrame); the HUD's ✓ / ✗ replace them.
    // The main menu keeps only PLAY and HELP (user, 2026-10-17).
    const rows = game.screen === 0 ? runtime.touchMenuRows.slice(0, 2) : runtime.touchMenuRows;
    if (runtime.touchMenuQ === game.screen && rows.length > 0) {
      // A vertical menu (f.c(III)): a row laid out at offscreen y draws its text 8 lower, and the
      // screen shows offscreen y - 8, so the text's middle is at row y + 6 on screen.
      const half = rows.length > 1 ? Math.abs(rows[1]! - rows[0]!) / 2 : 10;
      let best = -1;
      rows.forEach((rowY, index) => { if (Math.abs(y - (rowY + 6)) <= half && best < 0) best = index; });
      if (best >= 0) run(pickRow(best));
      return;
    }
    run(tapKey(OriginalKey.FIRE)); // dialogue and story pages: next
  };

  /** A tap on menu row `index`: the highlight (f.Z:I) goes straight there -- UP / DOWN only step it
   *  by one, wrapping at f.ab (f.aB() / f.aC()) -- and FIRE confirms, once the screen takes keys
   *  (f.n:Z). Q 12 / 13 step over rows, so they still get the presses. */
  function* pickRow(index: number): Script {
    if (game.screen === 12 || game.screen === 13 || index >= game.ab) {
      yield* navigate(() => game.Z, index, OriginalKey.UP, OriginalKey.DOWN, true);
      return;
    }
    for (let i = 0; i < 10 && game.nFlag; i += 1) yield;
    game.Z = index;
    yield* tapKey(OriginalKey.FIRE);
  }

  let mapTapHandler: ((villager: number) => void) | null = null;
  const tap = (x: number, y: number, on: Gesture["on"]) => {
    if (on === "map" && mapTapHandler) { mapTapHandler(villagerAt(x, y)?.id ?? 0); return; }
    if (on === "screen") tapScreen(x, y);
    else if (on === "panel") tapPanel(x, y);
    else if (on === "map") tapMap(x, y);
  };

  // ---- pointer gestures on the game screen ----
  type Gesture = {
    id: number; sx: number; sy: number; cx: number; cy: number; // CSS pixels: at the press, and now
    x0: number; y0: number; gx: number; gy: number; // frame pixels: at the press, and now
    drag: boolean; on: "map" | "panel" | "screen" | "top"; at: number; // performance.now() at the press
    /** Placing a building, pressed on its footprint: the drag moves it (UI design "放置建筑",
     *  2026-10-22), keeping the pressed tile's offset from the cursor. */
    grip: [number, number] | null;
  };
  let gesture: Gesture | null = null;

  canvas.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || gesture) return;
    event.preventDefault();
    capture(canvas, event.pointerId);
    const point = toGame(event);
    const gx = point.x;
    const gy = point.y;
    const on = point.on === "bottom" ? "panel" : point.on;
    let grip: [number, number] | null = null;
    const area = on === "map" && game.cSInt !== 100 ? controls.footprint() : null;
    if (area) {
      const [tx, ty] = tileAt(gx, gy);
      if (tx >= area.column && tx < area.column + area.columns && ty >= area.row && ty < area.row + area.rows) {
        grip = [tx - (game.cameraColumn + game.cursorColumn), ty - (game.cameraRow + game.cursorRow)];
      }
    }
    gesture = { id: event.pointerId, sx: event.clientX, sy: event.clientY, cx: event.clientX, cy: event.clientY, x0: gx, y0: gy, gx, gy, drag: grip !== null, on, at: performance.now(), grip };
    touched();
    if (on === "map") requestAnimationFrame(frame);
  });

  canvas.addEventListener("pointermove", (event) => {
    if (!gesture || event.pointerId !== gesture.id) return;
    event.preventDefault();
    const { x: gx, y: gy } = toGame(event);
    if (box) {
      box.x = event.clientX;
      box.y = event.clientY;
      boxCursor();
    } else if (!gesture.drag) {
      // Before the arc shows, a small move already pans; once it shows, it takes a bigger one.
      const moved = Math.hypot(event.clientX - gesture.sx, event.clientY - gesture.sy);
      const arcShown = performance.now() - gesture.at >= LONG_MS;
      if (moved > (arcShown ? ARC_SLOP_PX : DRAG_PX)) { gesture.drag = true; arc.style.display = "none"; }
    }
    if (gesture.grip) {
      const [tx, ty] = tileAt(gx, gy);
      moveCursorTo(tx - gesture.grip[0], ty - gesture.grip[1]);
    } else if (!box && gesture.drag && gesture.on === "map") {
      const k = screen.gamePixelsPerCssPixel();
      screen.panBy((gesture.cx - event.clientX) * k, (gesture.cy - event.clientY) * k);
      follow = true;
    }
    gesture.gx = gx;
    gesture.gy = gy;
    gesture.cx = event.clientX;
    gesture.cy = event.clientY;
  });

  const finish = (event: PointerEvent) => {
    if (!gesture || event.pointerId !== gesture.id) return;
    const g = gesture;
    gesture = null;
    arc.style.display = "none";
    // The lift ends the box: FIRE, and f.aF() selects our villagers inside it.
    if (box) { box = null; run(tapKey(OriginalKey.FIRE)); return; }
    // A press held past the arc's start without completing it is no tap.
    if (!g.drag && performance.now() - g.at < LONG_MS) { tap(g.x0, g.y0, g.on); return; }
    if (!g.drag) return;
    if (g.on === "panel" && game.barMode === 2) {
      // A horizontal swipe on the build card (or a bar) changes the item: a swipe to the left
      // shows the next one, i.e. RIGHT.
      const dx = toGame(event).x - g.x0;
      if (Math.abs(dx) >= SWIPE_PX) run(tapKey(dx < 0 ? OriginalKey.RIGHT : OriginalKey.LEFT));
    }
  };
  canvas.addEventListener("pointerup", finish);
  canvas.addEventListener("pointercancel", (event) => {
    if (!gesture || event.pointerId !== gesture.id) return;
    if (box) cancelBox();
    arc.style.display = "none";
    gesture = null;
  });
  canvas.addEventListener("contextmenu", (event) => event.preventDefault());

  /** Every display frame while a finger is on the map: the long-press arc, the box's start, and
   *  the slow scroll while a box is dragged near the screen's edge. */
  function frame(now: number): void {
    if (!gesture || gesture.on !== "map") return;
    if (box) {
      const rect = canvas.getBoundingClientRect();
      const push = (position: number, low: number, size: number) => {
        const band = size * EDGE_BAND;
        if (position < low + band) return -(1 - Math.max(0, position - low) / band);
        if (position > low + size - band) return 1 - Math.max(0, low + size - position) / band;
        return 0;
      };
      const dx = push(box.x, rect.left, rect.width);
      const dy = push(box.y, rect.top, rect.height);
      if (dx !== 0 || dy !== 0) {
        const step = (EDGE_SPEED / 60) * screen.gamePixelsPerCssPixel();
        screen.panBy(dx * step, dy * step);
        boxCursor();
      }
    } else if (!gesture.drag && !script && game.loopMode === 1 && game.barMode !== 3) {
      const progress = (now - gesture.at - LONG_MS) / ARC_MS;
      if (progress >= 1) startBox();
      else if (progress >= 0) {
        const rect = canvas.getBoundingClientRect();
        arc.style.left = `${gesture.sx - rect.left - 40}px`;
        arc.style.top = `${gesture.sy - rect.top - 72}px`;
        arc.style.display = "block";
        arcFill.style.strokeDasharray = `${progress * 100} 100`;
      }
    }
    requestAnimationFrame(frame);
  }

  /** The arc is full: f.aE()'s fifth tick (its timer F set to 4), so u:Z turns on with the pressed
   *  tile as the anchor -- without the FIRE press the original's own five-tick hold starts with. */
  function startBox(): void {
    if (!gesture) return;
    arc.style.display = "none";
    const [tx, ty] = tileAt(gesture.x0, gesture.y0);
    moveCursorTo(tx, ty);
    game.aeTimerF = 4;
    runtime.stepAe();
    if (!game.boxSelecting) return;
    box = { x: gesture.sx, y: gesture.sy };
    navigator.vibrate?.(30);
  }

  /** While boxing, the cursor (the box's far corner) is the tile under the finger. */
  function boxCursor(): void {
    if (!box) return;
    const point = screen.locate(box.x, box.y);
    const [tx, ty] = tileAt(point.x, point.y);
    moveCursorTo(Math.max(0, Math.min(game.mapWidth - 1, tx)), Math.max(0, Math.min(rowLimit() - 1, ty)));
  }

  function cancelBox(): void {
    box = null;
    game.boxSelecting = false;
    game.inputT = false;
  }

  /** Backs out with the right soft key until no selection or bar is open (at most four presses). */
  function* backOut(): Script {
    for (let i = 0; i < 4 && game.loopMode === 1 && game.barMode !== 0; i += 1) yield* tapKey(OriginalKey.SOFT_RIGHT);
  }

  let lastW = game.barMode;
  // adjustInBar(): the steps still to press, and whether its script is the one running.
  let pendingSteps = 0;
  let adjusting: Script | null = null;

  const controls: TouchControls = {
    bindKey(button: HTMLElement, key: OriginalKeyName) {
      const up = () => { if (button.dataset.down) { delete button.dataset.down; keys.release(key); } };
      button.addEventListener("pointerdown", (event) => {
        event.preventDefault();
        capture(button, event.pointerId);
        button.dataset.down = "1";
        keys.press(key);
        touched();
      });
      button.addEventListener("pointerup", up);
      button.addEventListener("pointercancel", up);
      button.addEventListener("contextmenu", (event) => event.preventDefault());
    },
    get boxing() { return box !== null; },
    get busy() { return script !== null; },
    pickInBar(index: number, presses = 1) {
      if (game.barMode !== 2) return;
      run((function* () {
        yield* navigate(() => game.menuCursor, index, OriginalKey.LEFT, OriginalKey.RIGHT, presses > 0);
        for (let i = 1; i < presses; i += 1) yield* tapKey(OriginalKey.FIRE);
      })());
    },
    adjustInBar(index: number, delta: number) {
      if (game.barMode !== 2) return;
      pendingSteps += delta;
      if (adjusting && script === adjusting) return;
      adjusting = (function* () {
        yield* navigate(() => game.menuCursor, index, OriginalKey.LEFT, OriginalKey.RIGHT, false);
        yield; // the bar draws the newly selected item (its count turns adjustable)
        while (pendingSteps !== 0 && game.barMode === 2 && game.menuCursor === index) {
          yield* tapKey(pendingSteps > 0 ? OriginalKey.UP : OriginalKey.DOWN);
          pendingSteps -= Math.sign(pendingSteps);
        }
        pendingSteps = 0;
      })();
      run(adjusting);
    },
    fireAt(tx: number, ty: number) {
      if (game.barMode !== 3) return;
      run((function* () {
        moveCursorTo(tx, ty);
        yield; // the cursor's target (f.R:I, f.r:Z) is worked out as the frame is drawn
        yield* tapKey(OriginalKey.FIRE);
        if (game.barMode === 3) yield* tapKey(OriginalKey.SOFT_RIGHT);
      })());
    },
    villagerTile: tileOf,
    selectVillager(id: number) {
      if (game.loopMode !== 1) return;
      run((function* () {
        if (!tileOf(id)) {
          // Inside a building: its bar's FIRE, FIRE on the portrait (get out!). The original drops
          // a selection made while they are inside as soon as they step out, so they are selected
          // once they are on the map.
          const slot = Array.from(runtime.mainArrays.r.slice(0, game.frameLayoutAR)).indexOf(-id);
          if (game.barMode !== 2 || slot < 0) return;
          jumpInBar(slot);
          yield;
          if (game.menuCursor !== slot) return;
          yield* tapFireAlone();
          yield* tapFireAlone();
          for (let i = 0; i < 40 && !tileOf(id); i += 1) yield;
        }
        yield* backOut();
        // As a tap on them: the cursor on their tile, FIRE (read again right before, they walk).
        for (let i = 0; i < 10 && game.nInt > 0; i += 1) yield;
        const tile = tileOf(id);
        if (!tile) return;
        moveCursorTo(tile[0], tile[1]);
        yield* tapKey(OriginalKey.FIRE);
      })());
    },
    setMapTapHandler(handler: ((villager: number) => void) | null) { mapTapHandler = handler; },
    closeBars() { run(backOut()); },
    aim(tx: number, ty: number) { moveCursorTo(tx, ty); },
    startGame(plan) {
      const rows: Record<number, number> = { 0: 0, 2: plan.custom ? 1 : 0, 3: plan.resume ? 0 : 1, 13: plan.difficulty, 9: plan.map };
      run((function* () {
        for (let i = 0; i < 1000 && game.loopMode !== 1 && game.screen !== 18; i += 1) {
          const at = game.screen;
          if (at === 16) {
            for (let j = 0; j < 6; j += 1) yield; // the question takes keys after its first ticks
            yield* tapKey(OriginalKey.SOFT_LEFT);
          } else if (rows[at] !== undefined && runtime.touchMenuQ === at) {
            yield* pickRow(rows[at]!);
          } else {
            yield;
            continue;
          }
          for (let j = 0; j < 100 && game.screen === at; j += 1) yield;
        }
      })());
    },
    answerStartQuestions(language: number, music: boolean) {
      run((function* () {
        // The list ignores keys for its first ticks (f.n:Z): wait for its rows, then pick.
        for (let i = 0; i < 100 && !(game.screen === 14 && runtime.touchMenuQ === 14); i += 1) yield;
        for (let i = 0; i < 6; i += 1) yield;
        yield* navigate(() => game.Z, language, OriginalKey.UP, OriginalKey.DOWN, true);
        for (let i = 0; i < 100 && game.screen !== 16; i += 1) yield;
        for (let i = 0; i < 6; i += 1) yield;
        yield* tapKey(music ? OriginalKey.SOFT_LEFT : OriginalKey.SOFT_RIGHT);
      })());
    },
    cancelBox,
    footprint() {
      if (game.loopMode !== 1 || game.barMode !== 3) return null;
      if (game.cSInt <= 3 || game.cSInt === 100) {
        return { column: game.cameraColumn + game.cursorColumn, row: game.cameraRow + game.cursorRow, columns: 1, rows: 1 };
      }
      const table = runtime.packedOffsets[T_BUILDING] ?? 0;
      return {
        column: game.cameraColumn + game.cTInt,
        row: game.cameraRow + game.cUInt,
        columns: Math.max(1, runtime.packedBytes[table + 104 + game.cSInt] ?? 1),
        rows: Math.max(1, runtime.packedBytes[table + 130 + game.cSInt] ?? 1),
      };
    },
    pressKey(key: OriginalKeyName, ticks = 1) {
      run((function* () {
        keys.press(key);
        for (let i = 0; i < ticks; i += 1) yield;
        keys.release(key);
        yield;
      })());
    },
    command(codes: readonly number[]) {
      if (game.loopMode !== 1) return;
      run((function* () {
        yield* backOut();
        yield* tapKey(OriginalKey.SOFT_LEFT);
        yield; // let the bar fill f.r
        const slot = Array.from(runtime.mainArrays.r.slice(0, 8)).findIndex((code) => codes.includes(code));
        if (game.barMode !== 2 || slot < 0) return;
        const code = runtime.mainArrays.r[slot];
        yield* navigate(() => game.menuCursor, slot, OriginalKey.LEFT, OriginalKey.RIGHT, true);
        // Dismiss (14) and back to work (15) leave the original's command bar open: close it.
        if (code === 14 || code === 15) { yield; yield* backOut(); }
      })());
    },
    openPause() {
      if (game.loopMode !== 1) return;
      run((function* () {
        yield* backOut();
        if (game.barMode === 0) yield* tapKey(OriginalKey.SOFT_RIGHT);
      })());
    },
    pauseMenu(item: PauseItem, onMessage?: (record: number) => void) {
      run((function* () {
        const rows = PAUSE_ROWS[game.screen];
        if (!rows) return;
        if (item === "resume") { yield* tapKey(OriginalKey.SOFT_RIGHT); return; }
        const index = rows.indexOf(item);
        if (index < 0) return;
        yield* navigate(() => game.Z, index, OriginalKey.UP, OriginalKey.DOWN, true);
        // The prompt and the message wait for a key; anything else ends the script.
        for (let i = 0; i < 4; i += 1) {
          yield;
          if (game.screen === 16) yield* tapKey(OriginalKey.FIRE);
          else if (game.screen === 21) { onMessage?.(game.vInt); yield* tapKey(OriginalKey.FIRE); }
          else return;
        }
      })());
    },
    focus(tx: number, ty: number) {
      if (game.loopMode !== 1) return;
      const rows = Math.max(1, Math.floor((panelTop() - mapTop()) / TILE_H));
      panTo(tx - (game.viewColumns >> 1), ty - (rows >> 1));
      moveCursorTo(tx, ty);
      screen.centerOn(tx, ty);
      touched();
    },
    cancel() {
      script = null;
      box = null;
      follow = false;
    },
    step() {
      // Entering building placement by touch: the footprint starts in the middle of the screen
      // (f.C:B/f.D:B, the cursor's home), not wherever the cursor last was.
      tick += 1;
      if (game.loopMode === 1 && game.barMode === 3 && lastW !== 3 && tick - touchTick < 16) {
        game.cursorColumn = game.cursorTargetColumn;
        game.cursorRow = game.cursorTargetRow;
      }
      lastW = game.barMode;
      stepInput();
      runtime.touchBarNumberX = -1; // the coming tick's bar draw sets it again (read above first)
    },
  };
  return controls;

  function stepInput(): void {
    if (follow && !box) followView();
    if (script && script.next().done) script = null;
  }
}
