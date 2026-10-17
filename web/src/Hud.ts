import type { LegacyRuntimeState } from "./core/LegacyRuntimeState";
import { OriginalKey } from "./platform/Input";
import { originalIcon, originalItemIcon } from "./OriginalIcons";
import { capitalise, originalText } from "./OriginalText";
import { T_BUILDING } from "./core/DataTables";
import { BLD_KIND, UNIT_NAME } from "./core/DenseLayout";
import { renderBuildingPicture, renderPortrait } from "./render/WideView";
import type { PauseItem, TouchControls } from "./TouchControls";
import type { WideScreen } from "./WideScreen";

/**
 * The touch HUD (phase 3, approved by the user 2026-10-17; not in the original), replacing the row
 * of virtual buttons under the screen:
 *
 * - top right, at the resource bar's right end: the game menu. Opening it pauses the game -- it
 *   enters the original's pause menu, while the screen keeps the map -- and drops down Save, Load,
 *   Settings, Help, Quit; each runs the original's own menu item (its yes / no prompts become a
 *   confirmation box with the original's text, its "game saved." a notice). Tapping elsewhere or
 *   the icon again closes it and the game goes on (the original's RESUME);
 * - bottom right: the round function button; its menu rises from it as loosely placed icons
 *   (bottom to top: build, map, call to arms, squad 1, squad 2, form up, villagers -- the original's
 *   own pictures where it has one, a short text until art exists; a long press shows the name).
 *   Build / form up / call to arms / villagers open the original's command bar on that item. The
 *   squads are the original's 7 / 9 groups;
 * - left of it, only when they apply: cancel (the right soft key until nothing is open: cancels the
 *   selection, closes a bar or the build cards), left / right while a bar is open;
 * - the build list: while the original's build cards are up, their buildings stand in a column
 *   left of the function button (pictures from the placement preview, the level-1 price, red when
 *   the stock is short; no names yet -- the user has not decided whether to show them); a tap
 *   picks that card (left / right to it, FIRE) and placing starts;
 * - placing a building: the function button turns into "back" (right soft key), and a tick at the
 *   footprint's corner places it (FIRE) -- shown only where the original allows the building;
 * - a building's bar (a double tap on it) as the building menu above the function button, which
 *   turns into ✓ (with ✗ left of it); a weapon or spell for a villager is aimed by tapping one.
 * Every control only presses the original's keys, so the keyboard and the game logic are unchanged.
 */

export function attachHud(
  app: HTMLElement,
  runtime: LegacyRuntimeState,
  screen: WideScreen,
  touch: TouchControls,
  openSettings: () => void,
  notify: (text: string) => void,
): { update(): void; track(): void } {
  const game = runtime.game;
  const hud = document.createElement("div");
  hud.className = "hud";
  app.append(hud);

  const button = (className: string, text: string, label?: string) => {
    const element = document.createElement("button");
    element.type = "button";
    element.className = className;
    element.textContent = text;
    if (label) element.setAttribute("aria-label", label);
    return element;
  };

  // ---- top right: the game menu, which pauses the game ----
  const menuButton = button("hud-menu-button", "", "游戏菜单");
  const menuList = document.createElement("div");
  menuList.className = "hud-popup hud-menu";
  menuList.hidden = true;
  hud.append(menuButton, menuList);
  /** The pause menu's screens (Q 10 with a save, 11 without). */
  const inPauseMenu = () => game.screen === 10 || game.screen === 11;
  let paused = false;
  /** Help: "asked" until the original's help screen is up, "shown" until it is left again. */
  let help: "no" | "asked" | "shown" = "no";
  /** The still screen is the game menu's own (the start-up has one too, main.ts). */
  let stillIsMine = false;
  const pause = () => {
    paused = true;
    stillIsMine = true;
    screen.freeze();
    touch.openPause();
  };
  const resume = () => {
    paused = false;
    menuList.hidden = true;
    if (inPauseMenu()) touch.pauseMenu("resume");
  };
  menuButton.addEventListener("click", () => (paused ? resume() : pause()));
  document.addEventListener("pointerdown", (event) => {
    const target = event.target as Node;
    if (paused && !menuList.hidden && !menuList.contains(target) && target !== menuButton && !confirmBox.open && !document.querySelector("dialog[open]")) resume();
  });

  // A yes / no box for the original's prompts (/t 63 load, 64 overwrite a save, 65 quit).
  const confirmBox = document.createElement("dialog");
  confirmBox.className = "settings confirm";
  confirmBox.innerHTML = '<form method="dialog"><p></p><div class="confirm-buttons"><button value="no">取消</button><button value="yes">确定</button></div></form>';
  confirmBox.addEventListener("keydown", (event) => event.stopPropagation());
  app.append(confirmBox);
  const ask = (text: string, then: () => void) => {
    confirmBox.querySelector("p")!.textContent = text;
    confirmBox.returnValue = "no";
    confirmBox.onclose = () => { if (confirmBox.returnValue === "yes") then(); };
    confirmBox.showModal();
  };
  const run = (item: PauseItem) => touch.pauseMenu(item, (record) => notify(originalText(runtime, "t", record)));
  const message = (record: number) => originalText(runtime, "t", record);
  const menuItems: { label: string; act: () => void; enabled?: () => boolean }[] = [
    { label: "保存", act: () => (game.screen === 10 ? ask(message(64), () => run("save")) : run("save")) },
    { label: "读取", enabled: () => game.screen === 10, act: () => ask(message(63), () => { paused = false; menuList.hidden = true; run("load"); }) },
    { label: "设置", act: openSettings },
    // Help shows the original's help pages (to be rewritten); back from them, the menu returns.
    { label: "帮助", act: () => { help = "asked"; screen.frozen = false; run("help"); } },
    { label: "退出", act: () => ask(message(65), () => { paused = false; menuList.hidden = true; run("quit"); }) },
  ];
  const menuEntries = menuItems.map((item) => {
    const entry = button("hud-popup-item", item.label);
    entry.addEventListener("click", item.act);
    menuList.append(entry);
    return { entry, item };
  });

  // ---- bottom right: the function button and its icon menu ----
  const fab = button("hud-fab", "功能", "功能菜单");
  const fabMenu = document.createElement("div");
  fabMenu.className = "hud-fab-menu";
  fabMenu.hidden = true;
  hud.append(fabMenu, fab);
  fab.addEventListener("click", () => {
    if (choosing) { confirmChief(); return; }
    if (picking) { confirmPick(); return; }
    if (screen.buildingMenuOpen) { selectChosen(); return; }
    // While placing a building it is the way back (the right soft key: back to the build cards).
    if (game.barMode === 3) { touch.pressKey(OriginalKey.SOFT_RIGHT); return; }
    fabMenu.hidden = !fabMenu.hidden;
    if (!fabMenu.hidden) drawFnButtons();
  });
  document.addEventListener("pointerdown", (event) => {
    const target = event.target as Node;
    if (!fabMenu.hidden && !fabMenu.contains(target) && target !== fab) fabMenu.hidden = true;
  });

  /** One icon of the menu: an original sub-record picture or, until art exists, a short text. */
  type FnItem = {
    name: () => string;
    icon?: () => number;
    text?: string;
    /** Tap; return false to keep the menu open. */
    act: () => void | boolean;
    /** Long press; return true when it did something (otherwise the name is shown). */
    hold?: () => boolean;
    badge?: () => string;
    active?: () => boolean;
    enabled?: () => boolean;
  };
  const squadCount = (row: number) => {
    const members = runtime.mainArrays.aByte[row];
    let count = 0;
    for (let i = 0; i < 50; i += 1) if ((members?.[i] ?? 0) !== 0) count += 1;
    return count;
  };
  /** The original's 7 / 9 groups (f.a:[[B rows 2 / 3): a tap selects a stored squad, or stores
   *  the selected villagers in an empty one; a long press with villagers selected stores them
   *  (the key held 5 ticks, which f.h() counts as a hold). */
  const squad = (number: 1 | 2): FnItem => {
    const key = number === 1 ? OriginalKey.DIGIT_7 : OriginalKey.DIGIT_9;
    const row = number + 1;
    const store = () => { touch.pressKey(key, 5); return true; };
    return {
      name: () => `小队${number}`,
      icon: () => (squadCount(row) > 0 ? 13 : -1),
      text: `队${number}`,
      badge: () => (squadCount(row) > 0 ? String(squadCount(row)) : ""),
      active: () => game.selectionGroup === row,
      enabled: () => squadCount(row) > 0 || game.barMode === 1,
      act: () => (squadCount(row) > 0 ? touch.pressKey(key) : store()),
      hold: () => game.barMode === 1 && store(),
    };
  };
  // Bottom to top, as the user listed them (2026-10-17).
  const fnItems: FnItem[] = [
    { name: () => "建造", icon: () => 10, act: () => touch.command([10]) },
    { name: () => "地图", text: "地图", act: () => touch.pressKey(OriginalKey.DIGIT_3) },
    { name: () => (game.callToArmsActive ? "取消备战" : "全员备战"), icon: () => (game.callToArmsActive ? 15 : 12), act: () => touch.command([12, 15]) },
    squad(1),
    squad(2),
    { name: () => (game.formUpActive ? "取消集结" : "集结"), icon: () => (game.formUpActive ? 14 : 11), act: () => touch.command([11, 14]) },
    { name: () => "村民", icon: () => 13, act: () => touch.command([13]) },
  ];
  const tip = document.createElement("div");
  tip.className = "hud-tip";
  tip.hidden = true;
  hud.append(tip);
  /** A long press on `entry` shows `name` beside it (unless `hold` does something instead); the
   *  returned function tells the click that followed whether it was such a press. */
  const longPress = (entry: HTMLElement, name: () => string, hold?: () => boolean) => {
    let timer = 0;
    let held = false;
    entry.addEventListener("pointerdown", () => {
      held = false;
      timer = window.setTimeout(() => {
        held = true;
        if (hold?.()) return;
        const box = entry.getBoundingClientRect();
        const area = hud.getBoundingClientRect();
        tip.textContent = name();
        tip.style.top = `${box.top - area.top + box.height / 2}px`;
        tip.style.right = `${area.right - box.left + 8}px`;
        tip.hidden = false;
      }, 450);
    });
    const end = () => { window.clearTimeout(timer); tip.hidden = true; };
    entry.addEventListener("pointerup", end);
    entry.addEventListener("pointercancel", end);
    entry.addEventListener("pointerleave", end);
    entry.addEventListener("contextmenu", (event) => event.preventDefault());
    return () => held;
  };
  const fnButtons = fnItems.map((item, index) => {
    const entry = document.createElement("button");
    entry.type = "button";
    entry.className = "hud-fn";
    entry.style.setProperty("--i", String(index));
    const picture = document.createElement("img");
    picture.alt = "";
    const label = document.createElement("span");
    const badge = document.createElement("b");
    entry.append(picture, label, badge);
    fabMenu.append(entry);
    const held = longPress(entry, item.name, () => { if (!item.hold?.()) return false; fabMenu.hidden = true; return true; });
    entry.addEventListener("click", () => {
      if (held()) return;
      if (item.act() !== false) fabMenu.hidden = true;
    });
    return { entry, item, picture, label, badge };
  });
  const drawFnButtons = () => {
    for (const { entry, item, picture, label, badge } of fnButtons) {
      entry.setAttribute("aria-label", item.name());
      entry.disabled = item.enabled ? !item.enabled() : false;
      entry.classList.toggle("active", item.active?.() ?? false);
      const icon = item.icon && item.icon() >= 0 ? originalIcon(runtime, item.icon()) : null;
      if (icon) {
        if (picture.dataset.src !== icon.url) {
          picture.src = icon.url;
          picture.dataset.src = icon.url;
          picture.width = icon.width * 2;
          picture.height = icon.height * 2;
        }
        picture.hidden = false;
        label.textContent = item.text && item.badge ? String(item.text.slice(-1)) : "";
      } else {
        picture.hidden = true;
        label.textContent = item.text ?? item.name();
      }
      badge.textContent = item.badge?.() ?? "";
      badge.hidden = badge.textContent === "";
    }
  };

  // ---- left of it: the actions that apply right now ----
  const actions = document.createElement("div");
  actions.className = "hud-actions";
  hud.append(actions);
  const left = button("hud-action", "◀", "左");
  const right = button("hud-action", "▶", "右");
  const cancel = button("hud-action cancel", "✕", "取消");
  const cancelBox = button("hud-action cancel", "✕", "取消框选");
  actions.append(left, right, cancelBox, cancel);
  touch.bindKey(left, OriginalKey.LEFT);
  touch.bindKey(right, OriginalKey.RIGHT);
  // Backs out all the way: a selection, a bar, or the build cards together with the command bar
  // they were opened from (one right soft key each).
  // Aiming a weapon or spell, it goes back to the building menu only.
  cancel.addEventListener("click", () => (picking ? touch.pressKey(OriginalKey.SOFT_RIGHT) : touch.closeBars()));
  cancelBox.addEventListener("click", () => touch.cancelBox());

  // ---- the build list: while the original's build cards are up (WideScreen hides them), their
  // buildings as a column left of the function button, bottom to top; a tap picks the card ----
  const buildList = document.createElement("div");
  buildList.className = "hud-build";
  buildList.hidden = true;
  hud.append(buildList);
  const pictures = new Map<number, string>();
  const picture = (kind: number) => {
    if (!pictures.has(kind)) pictures.set(kind, renderBuildingPicture(runtime, kind)?.toDataURL() ?? "");
    return pictures.get(kind)!;
  };
  /** Level-1 price of a building kind: rows 10 (wood) and 11 (stone) of t138, as the card's cost
   *  box shows them (hut 15 / 5, store 25 / 20). */
  const price = (kind: number) => {
    const table = runtime.packedOffsets[T_BUILDING] ?? 0;
    return { wood: runtime.packedBytes[table + 10 * 26 + kind] ?? 0, stone: runtime.packedBytes[table + 11 * 26 + kind] ?? 0 };
  };
  /** The tribe's stock (f.a:[[S row 0: 2 wood, 3 stone -- the top bar's counters). */
  const stock = () => ({ wood: runtime.mainArrays.aShort[0]?.[2] ?? 0, stone: runtime.mainArrays.aShort[0]?.[3] ?? 0 });
  let shownKinds = "";
  const drawBuildList = () => {
    const kinds = screen.buildKinds();
    const key = kinds.join(",");
    if (key !== shownKinds) {
      shownKinds = key;
      buildList.replaceChildren(...kinds.map((kind, index) => {
        const entry = document.createElement("button");
        entry.type = "button";
        entry.className = "hud-build-item";
        entry.setAttribute("aria-label", capitalise(originalText(runtime, "s", kind)));
        entry.dataset.kind = String(kind);
        const image = document.createElement("img");
        image.alt = "";
        image.src = picture(kind);
        const cost = document.createElement("span");
        entry.append(image, cost);
        entry.addEventListener("click", () => touch.pickInBar(index));
        return entry;
      }));
    }
    const have = stock();
    for (const entry of Array.from(buildList.children) as HTMLElement[]) {
      const { wood, stone } = price(Number(entry.dataset.kind));
      const cost = entry.querySelector("span")!;
      // The original's own wood and stone pictures (sub-records 44 / 45) with the amounts; an
      // amount the stock cannot cover is red (it does not stop the placing, user 2026-10-17).
      const part = (subrecord: number, amount: number, short: boolean) => {
        const picture = originalIcon(runtime, subrecord);
        const image = picture ? `<img src="${picture.url}" alt="">` : "";
        return `<i class="${short ? "short" : ""}">${image}${amount}</i>`;
      };
      cost.innerHTML = `${part(44, wood, have.wood < wood)} ${part(45, stone, have.stone < stone)}`;
      cost.setAttribute("aria-label", `木 ${wood}，石 ${stone}`);
    }
  };

  // ---- choosing a new chief (the original's K:Z with its row of candidates, w == 2, f.r:[B = -id):
  // the game goes on (user, 2026-10-17); a tap on a villager moves the row's cursor to them, so the original's panel
  // shows them under the bar (as when a villager is selected), and the function button turns into
  // "确定": FIRE, FIRE in the row (user, 2026-10-17) ----
  const chiefPrompt = document.createElement("div");
  chiefPrompt.className = "hud-chief-prompt";
  chiefPrompt.hidden = true;
  app.append(chiefPrompt);
  const candidates = () => {
    if (!game.choosingChief || game.barMode !== 2 || game.loopMode !== 1) return [];
    const row = Array.from(runtime.mainArrays.r.slice(0, game.frameLayoutAR));
    return row.length > 0 && row.every((value) => value < 0) ? row.map((value) => -value) : [];
  };
  let choosing = false;
  let candidate = 0;
  const tapWhileChoosing = (villager: number) => {
    const index = candidates().indexOf(villager);
    if (villager <= 0 || index < 0) { notify("只能选成年村民当族长"); return; }
    candidate = villager;
    screen.candidatePanel = true;
    touch.pickInBar(index, 0);
  };
  const confirmChief = () => {
    const index = candidates().indexOf(candidate);
    if (index >= 0) touch.pickInBar(index, 2);
  };

  // ---- the building menu (user, 2026-10-17): the original's bar for a building (f.r:[B, filled by
  // f.Z() from aa(), ab(), ac()) as a column above the function button, bottom to top in the bar's
  // order: the building's own items, the villagers inside, upgrade / repair or their cancels,
  // demolish. A tap does what FIRE on that item does; a villager's portrait only shows them (the
  // original's panel), and ✓ then selects them as a tap on the map does (user, 2026-10-17: the menu
  // closes, the villager can be sent anywhere); demolish asks first;
  // the armoury's weapons change their count by a sideways swipe (UP / DOWN). ----
  const ARMOURY = 0;
  const label = (record: number) => capitalise(originalText(runtime, "s", record));
  const barCodes = () => Array.from(runtime.mainArrays.r.slice(0, game.frameLayoutAR));
  const buildingKind = () => runtime.denseState[BLD_KIND + game.qCounter] ?? 0;
  /** The names the bar's items have in the original's labels: weapons and traps /s 12.., the
   *  commands /s 21.. (code 10 is "build"); a villager's name /s 108 + their name index. */
  const itemName = (code: number) => (code < 0 ? label(108 + (runtime.denseState[UNIT_NAME - code] ?? 0)) : label(code <= 8 ? code + 12 : code + 11));
  const itemPicture = (code: number) => {
    if (code < 0) {
      const portrait = renderPortrait(runtime, -code);
      return portrait ? { url: portrait.toDataURL(), width: portrait.width, height: portrait.height } : null;
    }
    return code <= 8 ? originalItemIcon(runtime, code) : originalIcon(runtime, code);
  };
  const buildingMenu = document.createElement("div");
  buildingMenu.className = "hud-bmenu";
  buildingMenu.hidden = true;
  hud.append(buildingMenu);
  let shownBar = "";
  const tapBarItem = (index: number, code: number) => {
    if (code < 0 || (buildingKind() === ARMOURY && code <= 5)) { touch.pickInBar(index, 0); return; }
    if (code === 17) {
      ask(`${label(28)}：${label(buildingKind())}？`, () => {
        const at = barCodes().indexOf(17);
        if (at >= 0 && screen.buildingMenuOpen) touch.pickInBar(at, 2); // FIRE: w = 3 ... FIRE: l(-2)
      });
      return;
    }
    touch.pickInBar(index);
  };
  const drawBuildingMenu = () => {
    const codes = barCodes();
    const key = `${game.qCounter}:${codes.join(",")}`;
    if (key !== shownBar) {
      shownBar = key;
      const kind = buildingKind();
      buildingMenu.replaceChildren(...codes.map((code, index) => {
        const entry = document.createElement("button");
        entry.type = "button";
        entry.className = "hud-fn";
        entry.setAttribute("aria-label", itemName(code));
        const icon = itemPicture(code);
        const image = document.createElement("img");
        image.alt = "";
        if (icon) {
          image.src = icon.url;
          // The pictures are 2x; a portrait fills the button (trimmed to about 16 x 20).
          image.width = icon.width * 2;
          image.height = icon.height * 2;
        }
        const name = document.createElement("span");
        if (!icon) name.textContent = itemName(code).slice(0, 2);
        const badge = document.createElement("b");
        badge.hidden = true;
        entry.append(image, name, badge);
        const held = longPress(entry, () => itemName(code));
        let swiped = false;
        if (kind === ARMOURY && code >= 0 && code <= 5) {
          // A swipe to the right raises the count, to the left lowers it: one per 24 pixels.
          let start = -1;
          let applied = 0;
          entry.style.touchAction = "pan-y";
          entry.addEventListener("pointerdown", (event) => { start = event.clientX; applied = 0; swiped = false; });
          entry.addEventListener("pointermove", (event) => {
            if (start < 0) return;
            const steps = Math.trunc((event.clientX - start) / 24);
            if (steps === applied) return;
            swiped = true;
            touch.adjustInBar(index, steps - applied);
            applied = steps;
          });
          const stop = () => { start = -1; };
          entry.addEventListener("pointerup", stop);
          entry.addEventListener("pointercancel", stop);
        }
        entry.addEventListener("click", () => { if (!held() && !swiped) tapBarItem(index, code); });
        return entry;
      }));
    }
    const counts = runtime.mainArrays.s;
    Array.from(buildingMenu.children).forEach((entry, index) => {
      const code = codes[index] ?? 0;
      entry.classList.toggle("active", index === game.menuCursor);
      const badge = entry.querySelector("b")!;
      badge.textContent = code >= 0 && code <= 8 ? String(counts[index] ?? 0) : "";
      badge.hidden = badge.textContent === "";
    });
  };
  /** ✓ with a villager's portrait chosen: that villager is selected. */
  const selectChosen = () => {
    const code = barCodes()[game.menuCursor] ?? 0;
    if (code < 0) touch.selectVillager(-code);
  };

  // ---- aiming a building's item at a villager (w == 3 with the building's bar behind it, slot 2):
  // the store's weapons (f.s = -code - 1) and the sanctuary's healing, defence, love potion
  // (f.s 0..2). A tap on a villager marks them with the item's picture; ✓ sends the cursor there and
  // FIRE (f.x() gives the order), then back to the building menu. ----
  const prompt = document.createElement("div");
  prompt.className = "hud-chief-prompt";
  prompt.hidden = true;
  app.append(prompt);
  const marker = document.createElement("img");
  marker.className = "hud-pick-marker";
  marker.alt = "";
  marker.hidden = true;
  app.append(marker);
  /** The bar code being aimed (a weapon 0..5 or a spell 19..21), or -1. */
  const pickCode = () => {
    if (game.loopMode !== 1 || game.barMode !== 3 || !game.selectionFlags[2]) return -1;
    if (game.cSInt < 0) return -game.cSInt - 1;
    return game.cSInt <= 2 ? 19 + game.cSInt : -1;
  };
  let picking = false;
  let pickTarget = 0;
  const confirmPick = () => {
    const tile = pickTarget > 0 ? touch.villagerTile(pickTarget) : null;
    if (tile) touch.fireAt(tile[0], tile[1]);
    pickTarget = 0;
  };

  // ---- placing a building: a tick at the footprint's top-right corner, only where the original
  // allows the building (c(int,int)'s r:Z, the same test that shows its arrow instead of "!") ----
  const placeTick = button("hud-place", "✓", "放置");
  placeTick.hidden = true;
  app.append(placeTick);
  touch.bindKey(placeTick, OriginalKey.FIRE);
  /** Every display frame: keeps the tick on the footprint while the map is dragged. */
  const track = () => {
    // The aimed item over the chosen villager's head.
    const tile = picking && pickTarget > 0 ? touch.villagerTile(pickTarget) : null;
    marker.hidden = !tile || screen.frozen;
    if (tile) {
      const head = screen.tileToCss(tile[0], tile[1]);
      const k = screen.tileToCss(1, 1).x - screen.tileToCss(0, 0).x; // CSS pixels per 22 game pixels
      marker.style.left = `${head.x + k / 2}px`;
      marker.style.top = `${head.y - k * 0.35}px`;
    }
    const area = touch.footprint();
    if (!area || !game.cRFlag || screen.frozen || picking) { placeTick.hidden = true; return; }
    const corner = screen.tileToCss(area.column + area.columns, area.row);
    const size = 44;
    const width = screen.element.clientWidth;
    placeTick.style.left = `${Math.max(4, Math.min(width - size - 4, corner.x + 4))}px`;
    placeTick.style.top = `${Math.max(4, corner.y - size / 2)}px`;
    placeTick.hidden = false;
  };

  const show = (element: HTMLElement, on: boolean) => { element.hidden = !on; };
  // Nothing shows before the game's first frame (the splash, the start-up questions).
  for (const element of [menuButton, fab, actions]) element.hidden = true;

  return {
    track,
    update() {
      // Choosing a chief: take the map taps, hide everything else.
      const nowChoosing = candidates().length > 0;
      if (nowChoosing !== choosing) {
        choosing = nowChoosing;
        touch.setMapTapHandler(choosing ? tapWhileChoosing : null);
        chiefPrompt.textContent = `${capitalise(originalText(runtime, "s", 41))}：点一位成年村民`;
        chiefPrompt.hidden = !choosing;
        candidate = 0;
        screen.candidatePanel = false;
      }
      const code = pickCode();
      if ((code >= 0) !== picking) {
        picking = code >= 0;
        pickTarget = 0;
        if (picking) {
          const icon = code <= 8 ? originalItemIcon(runtime, code) : originalIcon(runtime, code);
          if (icon) { marker.src = icon.url; marker.width = icon.width * 2; marker.height = icon.height * 2; }
          prompt.textContent = `${itemName(code)}：点一位村民`;
        }
        prompt.hidden = !picking;
        touch.setMapTapHandler(picking ? (villager) => { pickTarget = villager; } : null);
      }
      const layout = screen.hudLayout();
      const onMap = layout !== null && game.loopMode === 1 && !choosing;
      if (layout) {
        // The menu button is a clear hit area over the icon WideScreen draws at the bar's end.
        hud.style.setProperty("--hud-menu-w", `${layout.menu.width}px`);
        hud.style.setProperty("--hud-menu-h", `${layout.menu.height}px`);
        hud.style.setProperty("--hud-bottom", `${layout.bottomPanels}px`);
        app.style.setProperty("--hud-panels-bottom", `${layout.panelsBottom}px`);
      }
      // The pause menu's screens leave the map (v:B 0); the menu shows over them.
      if (paused && game.loopMode === 1) paused = false; // resumed another way (keys)
      // The still screen covers the pause menu, its prompts (Q 16) and messages (Q 21); it goes once
      // the game is back on the map or elsewhere (Quit), and while the help pages are open.
      if (help === "asked" && !inPauseMenu()) help = "shown";
      if (help === "shown" && inPauseMenu()) { help = "no"; screen.frozen = true; }
      if (stillIsMine && !paused && (game.loopMode === 1 || ![10, 11, 16, 21].includes(game.screen))) {
        screen.frozen = false;
        stillIsMine = false;
      }
      show(menuButton, layout !== null && !choosing);
      menuList.hidden = !(paused && inPauseMenu() && help === "no");
      for (const { entry, item } of menuEntries) entry.disabled = item.enabled ? !item.enabled() : false;
      show(fab, onMap || choosing);
      if (choosing) {
        fab.textContent = "确定";
        fab.setAttribute("aria-label", "定为族长");
        fab.disabled = candidate === 0;
        fabMenu.hidden = true;
        show(actions, false);
        show(buildList, false);
        return;
      }
      fab.disabled = false;
      if (!onMap) fabMenu.hidden = true;
      show(actions, onMap);
      if (!onMap) return;
      if (!fabMenu.hidden) drawFnButtons();
      const w = game.barMode;
      const building = screen.buildCardsOpen;
      const menu = screen.buildingMenuOpen;
      show(buildList, building);
      if (building) drawBuildList();
      show(buildingMenu, menu);
      if (menu) drawBuildingMenu();
      else shownBar = "";
      show(left, w === 2 && !building && !menu);
      show(right, w === 2 && !building && !menu);
      show(cancelBox, touch.boxing);
      show(cancel, !touch.boxing && ((w !== 0 && w !== 3) || picking));
      // ✓ / ✗ for the building menu and for aiming at a villager (user, 2026-10-17).
      const tick = menu || picking;
      fab.textContent = tick ? "✓" : w === 3 ? "返回" : "功能";
      fab.classList.toggle("tick", tick);
      fab.setAttribute("aria-label", menu ? "选中这个村民" : picking ? "确定" : w === 3 ? "返回" : "功能菜单");
      fab.disabled = menu ? (barCodes()[game.menuCursor] ?? 0) >= 0 : picking ? pickTarget === 0 : false;
      if (w === 3 || menu) fabMenu.hidden = true;
      cancel.setAttribute("aria-label", w === 1 ? "取消选择" : "取消");
    },
  };
}
