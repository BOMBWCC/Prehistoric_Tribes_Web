import { OriginalKey, type KeyState, type OriginalKeyName } from "./j2me/Input";
import type { LegacyRuntimeState } from "./j2me/LegacyRuntimeState";

/**
 * Touch and mouse input -- the temporary first version the user decided on 2026-10-15
 * (docs/touch-mouse-design.md, "Decided first version"). Not in the original.
 *
 * Everything becomes the phone's keys, fed through the same KeyState as the keyboard, one key
 * edge per tick, so the game sees ordinary key presses. The only direct writes are the cursor
 * jump (f.y:B/f.A:B, a position the original's own cursor takes near the map's edges) and the
 * view pan (f.I:B/f.K:B with f.A:Z set, the original's full redraw), both inside the bounds f.Y()
 * keeps.
 */

const DRAG_PX = 8; // CSS pixels a press may move and still count as a tap
const TILE_W = 22;
const TILE_H = 16;
const SWIPE_PX = 24; // game pixels for a card swipe

type Script = Generator<void, void, void>;

export type TouchControls = {
  /** Call once per tick, before the key edges are forwarded to the game. */
  step(): void;
};

export function attachTouchControls(
  canvas: HTMLCanvasElement,
  bar: HTMLElement,
  runtime: LegacyRuntimeState,
  keys: KeyState,
): TouchControls {
  const game = runtime.game;
  let script: Script | null = null;
  let pan = { x: 0, y: 0 };
  let boxMode = false;
  // Box select in progress: the anchor (where the finger went down), the finger now, the ticks FIRE
  // has been held on the anchor, and whether the finger has lifted.
  let box: { ax: number; ay: number; x: number; y: number; ticks: number; lifted: boolean } | null = null;

  const toGame = (event: PointerEvent): [number, number] => {
    const rect = canvas.getBoundingClientRect();
    return [
      Math.floor(((event.clientX - rect.left) * 240) / rect.width),
      Math.floor(((event.clientY - rect.top) * 320) / rect.height),
    ];
  };

  function* tapKey(key: OriginalKeyName): Script {
    keys.press(key);
    yield;
    keys.release(key);
    yield;
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

  const run = (next: Script) => { script = next; };
  // Capture keeps the moves and the lift coming to the element that saw the press. It throws for
  // a pointer the browser no longer tracks, which must not cost the key press.
  const capture = (element: Element, id: number) => { try { element.setPointerCapture(id); } catch { /* no capture */ } };

  // ---- the map ----
  const mapTop = () => game.selectionBb - game.selectionAx;
  const panelTop = () => 320 - game.selectionBa;
  const rowLimit = () => game.mapHeight - 2 - (game.selectionBa >> 5);
  const tileAt = (x: number, y: number): [number, number] =>
    [game.IByte + Math.floor(x / TILE_W), game.KByte + Math.floor((y - mapTop()) / TILE_H)];
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
    if (game.wByte === 3) {
      // Building placement: the footprint cursor is f.T:I/f.U:I; walk it there with the keys.
      const cx = game.IByte + game.cTInt;
      const cy = game.KByte + game.cUInt;
      if (tx === cx && ty === cy) { run(tapKey(OriginalKey.FIRE)); return; }
      run((function* () {
        yield* navigate(() => game.IByte + game.cTInt, tx, OriginalKey.LEFT, OriginalKey.RIGHT, false);
        yield* navigate(() => game.KByte + game.cUInt, ty, OriginalKey.UP, OriginalKey.DOWN, false);
      })());
      return;
    }
    const cx = game.IByte + game.yByte;
    const cy = game.KByte + game.AByte;
    const hovered = game.cWByte > 0 ? tileOf(game.cWByte) : null;
    if ((tx === cx && ty === cy) || (hovered && hovered[0] === tx && hovered[1] === ty)) {
      const cell = unitAt(cx, cy);
      const target = cell >= 1 && cell <= 50 ? cell : game.cWByte;
      if (game.wByte === 1 && target > 0 && target === game.frameLayoutL) {
        // FIRE on the unit that is already selected is the original's "select everyone on
        // screen". Left out of touch input for now (user, 2026-10-15); kept for a later scheme:
        // run(tapKey(OriginalKey.FIRE));
        return;
      }
      run(tapKey(OriginalKey.FIRE));
      return;
    }
    // First tap: the cursor jumps to the tile, inside the bounds f.Y() keeps.
    const col = tx - game.IByte;
    const row = ty - game.KByte;
    if (col < 0 || col >= game.viewportO || tx >= game.mapWidth) return;
    if (row < 0 || ty >= rowLimit()) return;
    game.yByte = col;
    game.AByte = row;
  };

  const applyPan = () => {
    if (game.vByte !== 1 || game.cameraBFlag || game.columnScrollDelta !== 0 || game.rowScrollDelta !== 0) return;
    const dc = -Math.trunc(pan.x / TILE_W);
    const dr = -Math.trunc(pan.y / TILE_H);
    if (dc === 0 && dr === 0) return;
    pan = { x: pan.x + dc * TILE_W, y: pan.y + dr * TILE_H };
    const minK = game.selectionFlags[4] ? 1 : 0;
    const maxK = game.mapHeight - game.viewportP - 1 - (game.selectionBa >> 5);
    const I = Math.max(0, Math.min(game.mapWidth - game.viewportO, game.IByte + dc));
    const K = Math.max(minK, Math.min(maxK, game.KByte + dr));
    if (I === game.IByte && K === game.KByte) return;
    game.IByte = I;
    game.KByte = K;
    game.AFlag = true; // f.n() redraws the whole view
  };

  // ---- the bottom panel ----
  const tapPanel = (x: number, y: number) => {
    if (y >= 298 && x < 24) { run(tapKey(OriginalKey.SOFT_LEFT)); return; }
    if (y >= 298 && x >= 216) { run(tapKey(OriginalKey.SOFT_RIGHT)); return; }
    if (game.wByte === 2 && game.selectionBa >= 80) { run(tapKey(OriginalKey.FIRE)); return; } // a build card
    if (game.wByte === 2 && y >= 294) {
      if (x >= 192) { run(tapKey(OriginalKey.RIGHT)); return; }
      const slot = Math.floor((x - 22) / 34);
      if (slot < 0 || slot > 4) return;
      if (game.entityFocusFlag || game.kFlag) {
        // A row of portraits (villagers, a new chief): the first tap moves the highlight,
        // a second tap on it confirms.
        if (game.frameLayoutAS === slot) run(tapKey(OriginalKey.FIRE));
        else run(navigate(() => game.frameLayoutAS, slot, OriginalKey.LEFT, OriginalKey.RIGHT, false));
        return;
      }
      run(navigate(() => game.frameLayoutAS, slot, OriginalKey.LEFT, OriginalKey.RIGHT, true)); // a command icon
    }
  };

  // ---- screens other than the map: menus, dialogue, story ----
  const tapScreen = (x: number, y: number) => {
    if (y >= 298 && x < 24) { run(tapKey(OriginalKey.SOFT_LEFT)); return; }
    if (y >= 298 && x >= 216) { run(tapKey(OriginalKey.SOFT_RIGHT)); return; }
    const rows = runtime.touchMenuRows;
    if (runtime.touchMenuQ === game.Q && rows.length > 0) {
      // A vertical menu (f.c(III)): a row laid out at offscreen y draws its text 8 lower, and the
      // screen shows offscreen y - 8, so the text's middle is at row y + 6 on screen.
      const half = rows.length > 1 ? Math.abs(rows[1]! - rows[0]!) / 2 : 10;
      let best = -1;
      rows.forEach((rowY, index) => { if (Math.abs(y - (rowY + 6)) <= half && best < 0) best = index; });
      if (best >= 0) run(navigate(() => game.Z, best, OriginalKey.UP, OriginalKey.DOWN, true));
      return;
    }
    run(tapKey(OriginalKey.FIRE)); // dialogue and story pages: next
  };

  const tap = (x: number, y: number) => {
    if (game.vByte !== 1) { tapScreen(x, y); return; }
    if (y >= panelTop()) { tapPanel(x, y); return; }
    if (y >= mapTop()) tapMap(x, y);
  };

  // ---- pointer gestures on the game screen ----
  let gesture: {
    id: number; sx: number; sy: number; // CSS pixels at the press
    x0: number; y0: number; gx: number; gy: number; // game pixels: at the press, and now
    drag: boolean; on: "map" | "panel" | "screen" | "digit"; digit?: OriginalKeyName;
  } | null = null;

  const digitAt = (x: number, y: number): OriginalKeyName | undefined => {
    // The idle bottom bar's 7 / 9 / 3 icons; pressed and released with the finger, so holding 7 or 9
    // stores a group exactly like holding the key.
    if (game.vByte !== 1 || game.wByte !== 0 || y < 296 || y < panelTop()) return undefined;
    if (x >= 90 && x < 118) return OriginalKey.DIGIT_7;
    if (x >= 118 && x < 150) return OriginalKey.DIGIT_9;
    if (x >= 150 && x < 192) return OriginalKey.DIGIT_3;
    return undefined;
  };

  canvas.addEventListener("pointerdown", (event) => {
    if (event.button !== 0 || gesture) return;
    event.preventDefault();
    capture(canvas, event.pointerId);
    const [gx, gy] = toGame(event);
    const digit = digitAt(gx, gy);
    const on = digit ? "digit" : game.vByte !== 1 ? "screen" : gy >= panelTop() ? "panel" : "map";
    gesture = { id: event.pointerId, sx: event.clientX, sy: event.clientY, x0: gx, y0: gy, gx, gy, drag: false, on, digit };
    if (digit) keys.press(digit);
  });

  canvas.addEventListener("pointermove", (event) => {
    if (!gesture || event.pointerId !== gesture.id) return;
    event.preventDefault();
    const [gx, gy] = toGame(event);
    if (!gesture.drag && Math.hypot(event.clientX - gesture.sx, event.clientY - gesture.sy) > DRAG_PX) {
      gesture.drag = true;
      if (gesture.on === "map" && boxMode && !script) box = { ax: gesture.x0, ay: gesture.y0, x: gx, y: gy, ticks: 0, lifted: false };
    }
    if (gesture.drag && gesture.on === "map") {
      if (box) { box.x = gx; box.y = gy; }
      else pan = { x: pan.x + gx - gesture.gx, y: pan.y + gy - gesture.gy };
    }
    gesture.gx = gx;
    gesture.gy = gy;
  });

  const finish = (event: PointerEvent) => {
    if (!gesture || event.pointerId !== gesture.id) return;
    const g = gesture;
    gesture = null;
    if (g.digit) { keys.release(g.digit); return; }
    if (box) { box.lifted = true; return; }
    if (!g.drag) { tap(g.x0, g.y0); return; }
    if (g.on === "panel" && game.wByte === 2) {
      // A horizontal swipe on the build card (or a bar) changes the item: a swipe to the left
      // shows the next one, i.e. RIGHT.
      const dx = toGame(event)[0] - g.x0;
      if (Math.abs(dx) >= SWIPE_PX) run(tapKey(dx < 0 ? OriginalKey.RIGHT : OriginalKey.LEFT));
    }
  };
  canvas.addEventListener("pointerup", finish);
  canvas.addEventListener("pointercancel", (event) => {
    if (!gesture || event.pointerId !== gesture.id) return;
    if (gesture.digit) keys.release(gesture.digit);
    if (box) box.lifted = true;
    gesture = null;
  });
  canvas.addEventListener("contextmenu", (event) => event.preventDefault());

  // ---- the virtual button bar under the screen ----
  const boxButton = bar.querySelector<HTMLButtonElement>("[data-box]");
  const setBoxMode = (on: boolean) => {
    boxMode = on;
    boxButton?.setAttribute("aria-pressed", String(on));
  };
  boxButton?.addEventListener("click", () => setBoxMode(!boxMode));
  for (const button of Array.from(bar.querySelectorAll<HTMLButtonElement>("[data-key]"))) {
    const key = button.dataset.key as OriginalKeyName;
    const up = () => { if (button.dataset.down) { delete button.dataset.down; keys.release(key); } };
    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      capture(button, event.pointerId);
      button.dataset.down = "1";
      keys.press(key);
    });
    button.addEventListener("pointerup", up);
    button.addEventListener("pointercancel", up);
    button.addEventListener("contextmenu", (event) => event.preventDefault());
  }

  return {
    step() {
      if (box) {
        // The original's box select: FIRE held for five ticks (f.aE()) turns on u:Z with the
        // cursor's tile as one corner; after the release the cursor sets the other corner, and the
        // next FIRE press selects the units inside (f.aF()). Here: hold on the anchor, then the
        // cursor follows the finger, and the lift is that last FIRE.
        const holding = box.ticks <= 6;
        const [tx, ty] = holding ? tileAt(box.ax, box.ay) : tileAt(box.x, box.y);
        game.yByte = Math.max(0, Math.min(game.viewportO - 1, tx - game.IByte));
        game.AByte = Math.max(0, Math.min(rowLimit() - 1 - game.KByte, ty - game.KByte));
        if (box.ticks === 0) keys.press(OriginalKey.FIRE);
        else if (box.ticks === 6) {
          keys.release(OriginalKey.FIRE);
          if (!game.uFlag) { box = null; setBoxMode(false); return; } // box mode did not start
        } else if (!holding && box.lifted) {
          box = null;
          setBoxMode(false);
          run(tapKey(OriginalKey.FIRE));
          script!.next();
          return;
        }
        box.ticks += 1;
        return;
      }
      applyPan();
      if (script && script.next().done) script = null;
    },
  };
}
