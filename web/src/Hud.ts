import type { LegacyRuntimeState } from "./core/LegacyRuntimeState";
import { OriginalKey } from "./platform/Input";
import { oldArt } from "./platform/OldArt";
import { BUILDING_KEYS, capitalise, labelKey, messageKey, setLabel, ui } from "./text/UiText";
import { T_BUILDING } from "./core/DataTables";
import { BLD_KIND, RES_KIND, UNIT_AGE, UNIT_ENERGY, UNIT_FOOD, UNIT_GENDER, UNIT_HELD_ITEM, UNIT_HOME_X, UNIT_HOME_Y, UNIT_HP, UNIT_MAX_HP, UNIT_SELECTION, UNIT_TARGET_X, UNIT_TARGET_Y, UNIT_TYPE, UNIT_X, UNIT_Y } from "./core/DenseLayout";
import type { PauseItem, TouchControls } from "./TouchControls";
import type { WideScreen } from "./WideScreen";
import { villagerPanelOf } from "./render/WideView";
import { touchAction } from "./render/RenderRuntime";
import { attachMiniMap } from "./MiniMap";
import { hdArt } from "./render/HdArt";

/** The round-3 UI's pictures (scripts/import-hd.mjs copies them from design/). */
const UI = "hd/ui/";
const SHEET_HEIGHT = 112; // the bottom sheet's content height (styles.css .hud-sheet)

/**
 * The touch HUD (phase 3, approved by the user 2026-10-17; not in the original), replacing the row
 * of virtual buttons under the screen:
 *
 * - top right, at the resource bar's right end: the game menu. Opening it pauses the game -- it
 *   enters the original's pause menu, while the screen keeps the map -- and drops down Save, Load,
 *   Settings, Help, Quit; each runs the original's own menu item (its yes / no prompts become a
 *   confirmation box with the original's text, its "game saved." a notice). Tapping elsewhere or
 *   the icon again closes it and the game goes on (the original's RESUME);
 * - the top bar: HD counters (round 3);
 * - bottom right, for the right thumb (round 3): the build button (it opens the original's build
 *   cards, shown as the build list in the bottom sheet), the command button above it (call to arms,
 *   form up, the map -- the original's command bar items) and the squads at the right edge (the
 *   original's 7 / 9 groups); icons only, a long press shows a name;
 * - left of it, only when they apply: cancel (the right soft key until nothing is open: cancels the
 *   selection, closes a bar), left / right while a bar is open;
 * - placing a building: ✕ (back, right soft key) where the build button was, and a tick at the
 *   footprint's corner places it (FIRE) -- shown only where the original allows the building;
 * - a building's bar (one tap on it) as the building panel in the bottom sheet, ✓ left of its ✕
 *   when something waits for confirming; a weapon or spell for a villager is aimed by tapping one.
 * Every control only presses the original's keys, so the keyboard and the game logic are unchanged.
 */

export function attachHud(
  app: HTMLElement,
  runtime: LegacyRuntimeState,
  screen: WideScreen,
  touch: TouchControls,
  openSettings: () => void,
  openHelp: () => void,
  notify: (text: string, icon?: string, alert?: boolean) => void,
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
    if (label) setLabel(element, label);
    return element;
  };

  // ---- the top bar (round 3, user 2026-10-20): the HD bar, its resource icons and digits (people
  // up to 99 / 99, each resource up to 999) -- the original's f.a(byte,int,int) for command 0 shows
  // a:[[S row 0 at t146[0..4] (people, food, wood, stone, bones) and the living space, row 0 [16] ----
  const bar = document.createElement("div");
  bar.className = "hud-bar";
  bar.hidden = true;
  bar.innerHTML = `<img class="hud-bar-bg" src="${UI}bar-bg.png" alt=""><img class="hud-bar-deco left" src="${UI}deco-top-left.png" alt=""><img class="hud-bar-deco right" src="${UI}deco-top-right.png" alt="">`;
  const counters = ([["people", "a11y.people"], ["food", "a11y.food"], ["wood", "a11y.wood"], ["stone", "a11y.stone"], ["bones", "a11y.bones"]] as const).map(([icon, name]) => {
    const group = document.createElement("div");
    group.className = `hud-count ${icon}`;
    group.setAttribute("role", "img");
    group.innerHTML = `<img src="${UI}icon-${icon}.png" alt="">`;
    const digits = document.createElement("span");
    group.append(digits);
    bar.append(group);
    return { group, digits, name, text: "" };
  });
  const drawCounts = () => {
    const row = runtime.mainArrays.aShort[0];
    const table = runtime.packedOffsets[146] ?? 0;
    const value = (i: number) => row?.[runtime.packedBytes[table + i] ?? 0] ?? 0;
    const texts = [
      `${Math.min(99, value(0))}/${Math.min(99, row?.[16] ?? 0)}`,
      ...[1, 2, 3, 4].map((i) => String(Math.min(999, Math.max(0, value(i))))),
    ];
    counters.forEach((counter, i) => {
      const text = texts[i]!;
      if (text === counter.text) return;
      counter.text = text;
      counter.group.setAttribute("aria-label", `${ui(counter.name)} ${text}`);
      counter.digits.innerHTML = Array.from(text, (c) => `<img src="${UI}digit-${c === "/" ? "slash" : c}.png" alt="">`).join("");
    });
  };

  // ---- top right: the game menu, which pauses the game: a stone plate (pressed while open), the
  // items as plates with glyphs dropping down under it ----
  const menuButton = button("hud-menu-button", "", "a11y.gameMenu");
  menuButton.innerHTML = `<img class="up" src="${UI}plate-normal.png" alt=""><img class="down" src="${UI}plate-pressed.png" alt=""><img class="glyph" src="${UI}glyph-menu.png" alt="">`;
  const menuList = document.createElement("div");
  menuList.className = "hud-menu";
  menuList.hidden = true;
  const menuShade = document.createElement("div");
  menuShade.className = "hud-menu-shade";
  menuShade.hidden = true;
  // The list drops from under the bar (drawn over it), the button sits on the bar.
  hud.append(menuShade, menuList, bar, menuButton);
  /** The pause menu's screens (Q 10 with a save, 11 without). */
  const inPauseMenu = () => game.screen === 10 || game.screen === 11;
  let paused = false;
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

  const img = (name: string, cls = "") => `<img${cls ? ` class="${cls}"` : ""} src="${UI}${name}.png" alt="">`;
  // A yes / no box for the original's prompts (/t 63 load, 64 overwrite a save, 65 quit), as the UI
  // design's card ("提示与消息" A, 2026-10-27): the menu item's plate and glyph, ✓ / ✕ on its edge.
  const confirmBox = document.createElement("dialog");
  confirmBox.className = "card confirm";
  confirmBox.innerHTML = `<form method="dialog">${img("deco-vine", "deco top")}${img("deco-grass", "deco bottom")}`
    + `<span class="plate">${img("plate-normal")}${img("glyph-quit", "glyph")}</span><p></p>`
    + `<button class="corner yes" value="yes" data-ui-label="a11y.ok">${img("btn-tick")}</button>`
    + `<button class="corner no" value="no" data-ui-label="a11y.cancel">${img("btn-close")}</button></form>`;
  confirmBox.addEventListener("keydown", (event) => event.stopPropagation());
  app.append(confirmBox);
  const ask = (glyph: string, text: string, then: () => void) => {
    confirmBox.querySelector<HTMLImageElement>(".plate .glyph")!.src = `${UI}glyph-${glyph}.png`;
    confirmBox.querySelector("p")!.textContent = text;
    confirmBox.returnValue = "no";
    confirmBox.onclose = () => { if (confirmBox.returnValue === "yes") then(); };
    confirmBox.showModal();
  };
  // The pause menu's messages: game saved (/t 67), not enough memory to save (66, red-edged).
  const run = (item: PauseItem) => touch.pauseMenu(item, (record) => notify(ui(record === 66 ? "alerts.saveFailed" : "alerts.saved"), "glyph-save", record === 66));
  const menuItems: { label: string; glyph: string; act: () => void; enabled?: () => boolean }[] = [
    { label: "menu.save", glyph: "save", act: () => (game.screen === 10 ? ask("save", ui("confirm.save"), () => run("save")) : run("save")) },
    { label: "menu.load", glyph: "load", enabled: () => game.screen === 10, act: () => ask("load", ui("confirm.load"), () => { paused = false; menuList.hidden = true; run("load"); }) },
    { label: "menu.settings", glyph: "settings", act: openSettings },
    // Help: the web help card (HelpCard.ts, BUG-035), over the game menu like the settings.
    { label: "menu.help", glyph: "help", act: openHelp },
    { label: "menu.quit", glyph: "quit", act: () => ask("quit", ui("confirm.quit"), () => { paused = false; menuList.hidden = true; run("quit"); }) },
  ];
  const menuEntries = menuItems.map((item) => {
    const entry = button("hud-menu-item", "", item.label);
    entry.innerHTML = `<img class="up" src="${UI}plate-normal.png" alt=""><img class="down" src="${UI}plate-pressed.png" alt=""><img class="glyph" src="${UI}glyph-${item.glyph}.png" alt="">`;
    entry.addEventListener("click", item.act);
    menuList.append(entry);
    return { entry, item };
  });

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

  /** HD digits for a number badge. */
  const digits = (text: string) => Array.from(text, (c) => img(`digit-${c === "/" ? "slash" : c}`)).join("");

  // ---- bottom right (round 3, user 2026-10-21/22; mock-up "命令与小队"): the build button, the
  // command button above it, the squads at the right edge. Everything for the right thumb. ----
  const buildButton = button("hud-build-button", "", "a11y.build");
  buildButton.innerHTML = img("build-a", "up") + img("build-b", "down");
  buildButton.addEventListener("click", () => touch.command([10]));

  // ✓ / ✕ where something waits for confirming or going back: aiming a weapon or spell, placing
  // (back to the build list).
  const fab = button("hud-fab", "", "a11y.ok");
  fab.innerHTML = img("btn-tick", "tick") + img("btn-x", "back");
  fab.addEventListener("click", () => {
    if (picking) { confirmPick(); return; }
    // While placing it is the way back (the right soft key: back to the build cards). Choosing a
    // rally / call-to-arms spot (s 100) it goes straight back to the map, past the original's
    // command bar the soft key would show (BUG-029); the keyboard's soft key still shows it.
    if (game.barMode === 3 && game.cSInt === 100) touch.closeBars();
    else if (game.barMode === 3) touch.pressKey(OriginalKey.SOFT_RIGHT);
  });

  // The command button: unfolds call to arms, form up, the map upwards; lit (with the running
  // command's icon at its corner) while call to arms or form up is on. The same item cancels it.
  const cmdButton = button("hud-cmd", "", "a11y.commands");
  cmdButton.innerHTML = img("cmd-plate") + img("cmd-horn", "glyph") + img("cmd-arms", "badge");
  const cmdShade = document.createElement("div");
  cmdShade.className = "hud-cmd-shade";
  cmdShade.hidden = true;
  const cmdMenu = document.createElement("div");
  cmdMenu.className = "hud-cmd-menu";
  cmdMenu.hidden = true;
  const closeCommands = () => { cmdMenu.hidden = true; cmdShade.hidden = true; };
  cmdButton.addEventListener("click", () => { cmdMenu.hidden = !cmdMenu.hidden; cmdShade.hidden = cmdMenu.hidden; });
  cmdShade.addEventListener("click", closeCommands);
  const miniMap = attachMiniMap(app, runtime, screen);
  const commands = [
    { glyph: "cmd-arms", name: () => (game.callToArmsActive ? "orders.backToWork" : "orders.callToArms"), active: () => game.callToArmsActive, act: () => order("cmd-arms", game.callToArmsActive, [12, 15]) },
    { glyph: "cmd-rally", name: () => (game.formUpActive ? "orders.disband" : "orders.formUp"), active: () => game.formUpActive, act: () => order("cmd-rally", game.formUpActive, [11, 14]) },
    // The villager list: the command bar's VILLAGERS (13), a row of heads (the original's
    // f.r list).
    { glyph: "cmd-villagers", name: () => "orders.villagers", active: () => false, act: () => touch.command([13]) },
    { glyph: "cmd-map", name: () => "orders.map", active: () => false, act: () => miniMap.open() },
  ].map((command, index) => {
    const entry = button("hud-cmd-item", "", command.name());
    entry.innerHTML = img("cmd-plate") + img(command.glyph, "glyph");
    entry.style.setProperty("--i", String(index));
    entry.addEventListener("click", () => { closeCommands(); command.act(); });
    cmdMenu.append(entry);
    return { entry, command };
  });
  const drawCommands = () => {
    const running = game.callToArmsActive ? "cmd-arms" : game.formUpActive ? "cmd-rally" : "";
    cmdButton.classList.toggle("lit", running !== "");
    const badge = cmdButton.querySelector<HTMLImageElement>(".badge")!;
    badge.hidden = running === "";
    if (running && !badge.src.endsWith(`${running}.png`)) badge.src = `${UI}${running}.png`;
    for (const { entry, command } of commands) {
      if (entry.dataset.uiLabel !== command.name()) setLabel(entry, command.name());
      entry.classList.toggle("active", command.active());
      // A running order's item cancels it: its icon with a red cross (UI design, 2026-10-22).
      const glyph = entry.querySelector<HTMLImageElement>(".glyph")!;
      const src = `${UI}${command.glyph}${command.active() ? "-cancel" : ""}.png`;
      if (!glyph.src.endsWith(src)) glyph.src = src;
    }
  };

  // ---- form up (rally) and call to arms (UI design "小地图、集结与备战", 2026-10-22; BUG-028, user
  // 2026-10-29; BUG-046, user 2026-11-02): placed like a building, with its code. The order's flag, a
  // villager high, starts on the tile in the middle of the screen and stays on its map tile (the
  // cursor: the original's w == 3 spot, f.s 100); dragged, it moves, and a drag elsewhere moves the
  // map (TouchControls). Green where it may go and red where not, ✓ at its top right (grey then), ✕ at
  // the bottom right backs out. Placed, the flag stays on its tile -- it pops, rings spread, then it
  // blinks -- until the same menu item, now with the cancel icon, cancels the order. ----
  let ordering = ""; // the order's glyph while its spot is being chosen
  const order = (glyph: string, running: boolean, codes: number[]) => {
    if (!running) ordering = glyph;
    touch.command(codes);
  };
  /** Where a rally / call to arms may go: explored ground with nothing on it but people or animals
   *  (gridC >= 0: no water, tree, rock, resource or building). Not in the original, which takes any tile. */
  const orderSpotOk = (x: number, y: number) => (runtime.gridC[y]?.[x] ?? -1) >= 0 && runtime.occupancyClass(x, y) !== 2;
  const orderFlag = document.createElement("div");
  orderFlag.className = "hud-order-flag";
  orderFlag.innerHTML = `<i class="ring"></i><i class="ring late"></i><img alt="">`;
  orderFlag.hidden = true;
  const orderFlagPicture = orderFlag.querySelector("img")!;
  app.append(orderFlag);

  const squadCount = (row: number) => {
    const members = runtime.mainArrays.aByte[row];
    let count = 0;
    for (let i = 0; i < 50; i += 1) if ((members?.[i] ?? 0) !== 0) count += 1;
    return count;
  };
  // The squads (the original's 7 / 9 groups, f.a:[[B rows 2 / 3; user's design 2026-10-21): a head
  // with the head count at the right edge for each stored squad; a tap selects it. With villagers
  // selected and a squad free, a dashed "+" stores them there (the key held 5 ticks, which f.h()
  // counts as a hold). A long press on a squad: replace it with the selection, or disband it.
  const SQUADS = [
    { row: 2, key: OriginalKey.DIGIT_7 },
    { row: 3, key: OriginalKey.DIGIT_9 },
  ];
  type Squad = (typeof SQUADS)[number];
  const store = (squad: Squad) => touch.pressKey(squad.key, 5);
  const squadBox = document.createElement("div");
  squadBox.className = "hud-squads";
  const squadPop = document.createElement("div");
  squadPop.className = "hud-squad-pop";
  squadPop.hidden = true;
  const replaceButton = button("hud-squad-action", "", "a11y.replaceSquad");
  replaceButton.innerHTML = img("cmd-replace");
  const disbandButton = button("hud-squad-action", "", "a11y.disbandSquad");
  disbandButton.innerHTML = img("cmd-disband");
  squadPop.append(replaceButton, disbandButton);
  let popFor: Squad | null = null;
  const closePop = () => { squadPop.hidden = true; popFor = null; };
  replaceButton.addEventListener("click", () => { if (popFor) store(popFor); closePop(); });
  // Not in the original (it only stores and recalls): the squad's member row is cleared.
  disbandButton.addEventListener("click", () => {
    if (popFor) {
      runtime.mainArrays.aByte[popFor.row]?.fill(0);
      if (game.selectionGroup === popFor.row) touch.closeBars();
    }
    closePop();
  });
  document.addEventListener("pointerdown", (event) => {
    const target = event.target as Node;
    if (!squadPop.hidden && !squadPop.contains(target) && !squadBox.contains(target)) closePop();
  });
  const squadChips = SQUADS.map((squad, index) => {
    const chip = button("hud-squad", "");
    setLabel(chip, "hud.squad", { n: index + 1 });
    chip.innerHTML = `${img("pt-man", "head")}<span class="count"></span>`;
    const held = longPress(chip, () => ui("hud.squad", { n: index + 1 }), () => {
      popFor = squad;
      replaceButton.hidden = game.barMode !== 1;
      const box = chip.getBoundingClientRect();
      const area = hud.getBoundingClientRect();
      squadPop.style.top = `${box.top - area.top + box.height / 2}px`;
      squadPop.style.right = `${area.right - box.left + 8}px`;
      squadPop.hidden = false;
      return true;
    });
    chip.addEventListener("click", () => { if (!held()) touch.pressKey(squad.key); });
    squadBox.append(chip);
    return { chip, squad, count: chip.querySelector<HTMLElement>(".count")!, shown: "" };
  });
  const plusChip = button("hud-squad plus", "", "a11y.newSquad");
  plusChip.innerHTML = `${img("pt-man", "head")}<b>+</b>`;
  plusChip.addEventListener("click", () => {
    const free = SQUADS.find((squad) => squadCount(squad.row) === 0);
    if (free && game.barMode === 1) store(free);
  });
  squadBox.append(plusChip);
  const drawSquads = () => {
    for (const entry of squadChips) {
      const count = squadCount(entry.squad.row);
      entry.chip.hidden = count === 0;
      entry.chip.classList.toggle("active", game.selectionGroup === entry.squad.row);
      entry.chip.classList.toggle("held", popFor === entry.squad);
      const text = String(count);
      if (text !== entry.shown) { entry.shown = text; entry.count.innerHTML = digits(text); }
    }
    plusChip.hidden = !(game.barMode === 1 && SQUADS.some((squad) => squadCount(squad.row) === 0));
  };

  hud.append(cmdShade, squadBox, squadPop, cmdMenu, cmdButton, buildButton, fab);

  // ---- left of it: the actions that apply right now ----
  const actions = document.createElement("div");
  actions.className = "hud-actions";
  hud.append(actions);
  const left = button("hud-action", "◀", "a11y.left");
  const right = button("hud-action", "▶", "a11y.right");
  const cancel = button("hud-action cancel", "✕", "a11y.cancel");
  const cancelBox = button("hud-action cancel", "✕", "a11y.cancelBox");
  actions.append(left, right, cancelBox, cancel);
  touch.bindKey(left, OriginalKey.LEFT);
  touch.bindKey(right, OriginalKey.RIGHT);
  // Backs out all the way: a selection, a bar, or the build cards together with the command bar
  // they were opened from (one right soft key each).
  // Aiming a weapon or spell, it goes back to the building menu only.
  cancel.addEventListener("click", () => (picking ? touch.pressKey(OriginalKey.SOFT_RIGHT) : touch.closeBars()));
  cancelBox.addEventListener("click", () => touch.cancelBox());

  // ---- the bottom sheet (round 3): one panel for the build list (and, later, the building and
  // villager panels), sliding up from the bottom, a ✕ at its top right ----
  const sheet = document.createElement("div");
  sheet.className = "hud-sheet";
  sheet.hidden = true;
  sheet.innerHTML = img("deco-grass", "deco bottom") + img("deco-vine", "deco top");
  const sheetClose = button("hud-sheet-close", "", "a11y.close");
  sheetClose.innerHTML = img("btn-close");
  // Backs out of the build cards and the command bar they came from (right soft key, each).
  sheetClose.addEventListener("click", () => {
    if (confirming) { confirming = false; return; }
    if (viewing) { viewing = 0; return; } // back to the row of several villagers
    if (insideId) { insideId = 0; return; } // back to the building
    if (choosing) { candidateSheet = false; return; } // a chief must still be chosen
    touch.closeBars();
  });
  hud.append(sheet);

  // The build list: the original's build cards' buildings (WideScreen hides the cards), left to right
  // in their order, one size each, the price as a badge at the right (never red: being short does
  // not stop the placing, user 2026-10-17 / UI design 2026-10-22), pages swiped sideways; a tap picks
  // the card (left / right to it, FIRE) and placing starts.
  const BUILDING_ICONS = ["armoury", "gym", "hut", "chiefs-hut", "kitchen", "range", "store", "disco", "sanctuary", "pia-center", "nursery", "tower"];
  const buildList = document.createElement("div");
  buildList.className = "hud-sheet-list";
  const pageDots = document.createElement("div");
  pageDots.className = "hud-sheet-dots";
  sheet.append(buildList, pageDots, sheetClose);
  /** A price in t138 rows 10 wood, 11 stone, 12 bones: column 0..11 a building kind's level-1 price
   *  (hut 15 / 5), which is also what its upgrade shows; 12 + n weapon n, 20..22 the traps. */
  const price = (column: number) => {
    const table = runtime.packedOffsets[T_BUILDING] ?? 0;
    return [10, 11, 12].map((row) => runtime.packedBytes[table + row * 26 + column] ?? 0);
  };
  const RESOURCES = ["wood", "stone", "bones"];
  /** A price's resources that cost something: an icon and the number each. */
  const priceHtml = (need: number[]) => need
    .map((amount, i) => (amount > 0 ? `<span>${img(`icon-${RESOURCES[i]}`)}<span class="n">${digits(String(amount))}</span></span>` : ""))
    .join("");
  let shownKinds = "";
  let shownCosts = "";
  const drawBuildList = () => {
    const kinds = screen.buildKinds();
    const key = kinds.join(",");
    if (key !== shownKinds) {
      shownKinds = key;
      shownCosts = "";
      buildList.scrollLeft = 0;
      buildList.replaceChildren(...kinds.map((kind, index) => {
        const entry = document.createElement("button");
        entry.type = "button";
        entry.className = "hud-card";
        setLabel(entry, BUILDING_KEYS[kind] ?? "");
        entry.dataset.kind = String(kind);
        entry.innerHTML = `<span class="pic">${img(`ub-${BUILDING_ICONS[kind]}`)}</span><span class="cost"></span>`;
        entry.addEventListener("click", () => touch.pickInBar(index));
        return entry;
      }));
    }
    const costs = kinds.map((kind) => price(kind).join("/")).join(",");
    if (costs !== shownCosts) {
      shownCosts = costs;
      for (const entry of Array.from(buildList.children) as HTMLElement[]) {
        const need = price(Number(entry.dataset.kind));
        entry.querySelector(".cost")!.innerHTML = priceHtml(need);
      }
    }
    drawDots(buildList, kinds.length, 97);
  };
  /** One dot per page of a sideways list of `count` items `step` pixels apart, the shown one lit. */
  const drawDots = (list: HTMLElement, count: number, step: number) => {
    const perPage = Math.max(1, Math.floor(list.clientWidth / step));
    const pages = Math.ceil(count / perPage);
    const page = Math.round(list.scrollLeft / (perPage * step));
    if (pageDots.childElementCount !== pages) pageDots.replaceChildren(...Array.from({ length: pages }, () => document.createElement("i")));
    Array.from(pageDots.children).forEach((dot, i) => dot.classList.toggle("on", i === page));
  };
  buildList.addEventListener("scroll", () => drawBuildList());

  // ---- choosing a new chief (the original's K:Z with its row of candidates, w == 2, f.r:[B = -id):
  // the game goes on (user, 2026-10-17/28). As when a villager is tapped: a tap on one opens their
  // villager panel and puts the chief's head with a tick over them; the tick makes them chief (FIRE,
  // FIRE in the row); another tap picks someone else. The panel's ✕ only closes the panel: a
  // chief must be chosen. UI design "选族长" (2026-10-29): the prompt shows the chief's camp and no ✕;
  // the hat (chief-hat) with ✓ at its bottom right; once confirmed "<name> 当上了族长" and the hat
  // stays over them a moment, then fades. ----
  // The prompt (UI design "提示与消息" D, 2026-10-27): a panel at the bottom like the sheet, the
  // icon and the words in the middle; ✓ (the function button) on its top edge.
  const promptPanel = (icon: string) => {
    const panel = document.createElement("div");
    panel.className = "hud-prompt";
    panel.hidden = true;
    panel.innerHTML = `${img("deco-grass", "deco bottom")}${img("deco-vine", "deco top")}<div class="hud-prompt-line"><img class="icon" src="${icon.includes("/") ? icon : `${UI}${icon}.png`}" alt=""><span></span></div>`;
    hud.append(panel);
    return { panel, icon: panel.querySelector<HTMLImageElement>(".icon")!, words: panel.querySelector("span")! };
  };
  const chiefPrompt = promptPanel("hd/buildings/3-1.png"); // the chief's camp
  const candidates = () => {
    if (!game.choosingChief || game.barMode !== 2 || game.loopMode !== 1) return [];
    const row = Array.from(runtime.mainArrays.r.slice(0, game.frameLayoutAR));
    return row.length > 0 && row.every((value) => value < 0) ? row.map((value) => -value) : [];
  };
  let choosing = false;
  let candidate = 0;
  let candidateSheet = false; // the candidate's villager panel is open
  const tapWhileChoosing = (villager: number) => {
    if (villager <= 0 || !candidates().includes(villager)) { notify(ui("chief.adultsOnly"), "chief-hat"); return; }
    candidate = villager;
    candidateSheet = true;
  };
  let crowned = 0; // the new chief, while the hat stays over them
  let crownedUntil = 0;
  const CROWNED_MS = 1800; // the hat's stay, its fade (styles.css) included
  const confirmChief = () => {
    const index = candidates().indexOf(candidate);
    if (index < 0) return;
    touch.pickInBar(index, 2);
    crowned = candidate;
    crownedUntil = performance.now() + CROWNED_MS;
    notify(ui("chief.chosen", { name: capitalise(runtime.unitNames[candidate] ?? "") }), "chief-hat");
  };
  const chiefMark = button("hud-chief-mark", "", "a11y.makeChief");
  chiefMark.innerHTML = img("chief-hat", "hat") + img("btn-tick", "tick");
  chiefMark.hidden = true;
  chiefMark.addEventListener("click", confirmChief);
  app.append(chiefMark);

  // ---- the building panel (round 3, user 2026-10-20/21): a building selected with one tap shows
  // its bar (f.r:[B, filled by f.Z() from aa(), ab(), ac()) in the bottom sheet, left to right:
  // demolish, repair, upgrade (or their cancels), the building's own items, the villagers inside
  // (heads whose hat shows the job). A tap does what FIRE on that item does; a villager's portrait
  // opens their villager panel (✕ back to the building) and ✓ there selects them as a tap on the map
  // does. Upgrades, weapons and traps show their price under them (the original's cost box, user
  // 2026-10-28), a weapon also the skill it needs. The command bar (w 2, slot 5: what the order
  // spot's ✕ goes back to, or keys) and the VILLAGERS row it opens show in the same row;
  // demolish turns the sheet into the question with ✓ / ✕; the armoury's weapons change their
  // count by a sideways swipe (UP / DOWN). The chief's camp shows the faint "nothing to do here". ----
  const ARMOURY = 0;
  const CHIEFS_HUT = 3;
  const barCodes = () => Array.from(runtime.mainArrays.r.slice(0, game.frameLayoutAR));
  /** The open building's kind; -1 for the command bar. */
  const buildingKind = () => (screen.buildingMenuOpen ? runtime.denseState[BLD_KIND + game.qCounter] ?? 0 : -1);
  /** The names the bar's items have in the original's labels: weapons and traps /s 12.., the
   *  commands /s 21.. (code 10 is "build"); a villager's own name. */
  const itemName = (code: number) => (code < 0 ? capitalise(runtime.unitNames[-code] ?? "") : ui(labelKey(code <= 8 ? code + 12 : code + 11)));
  /** The panel icon of a bar code (design/panels). */
  const PANEL_ICONS: Record<number, string> = {
    0: "club", 1: "stone", 2: "spear", 3: "stone-axe", 4: "bone-mace", 5: "tomahawk", 6: "net-trap", 7: "spring-trap", 8: "pit-trap",
    16: "upgrade", 17: "demolish", 19: "healing", 20: "defence", 21: "love-potion", 22: "disease",
    26: "repair", 27: "cancel-upgrade", 28: "cancel-repair", 29: "unload",
    // The command bar: build, form up, call to arms, villagers, dismiss, back to work, map info
    // (all / selected / none); villagers and the map info are stand-ins.
    10: "build-a", 11: "cmd-rally", 12: "cmd-arms", 13: "pt-man", 14: "cmd-rally-cancel", 15: "cmd-arms-cancel",
    23: "cmd-map", 24: "cmd-map", 25: "cmd-map",
  };
  /** Weapon n's skill (t138 row 13, column 12 + n: the original box's composite 574 + it, the panel's
   *  skill icon) and the level it needs (row 14). */
  const weaponSkill = (code: number) => {
    const table = (runtime.packedOffsets[T_BUILDING] ?? 0) + 12 + code;
    return { icon: SKILLS[574 + (runtime.packedBytes[table + 13 * 26] ?? 0)] ?? "z", level: runtime.packedBytes[table + 14 * 26] ?? 0 };
  };
  /** Under an item of building `kind`: the price of an upgrade (the kind's) and of the armoury's
   *  weapons and traps, the skill a weapon needs. */
  const costHtml = (code: number, kind: number) => {
    const column = code === 16 ? kind : kind === ARMOURY && code >= 0 && code <= 8 ? (code <= 5 ? 12 + code : 14 + code) : -1;
    if (column < 0) return "";
    let html = `<span class="line">${priceHtml(price(column))}</span>`;
    if (column >= 12 && column < 18) {
      const skill = weaponSkill(code);
      if (skill.level > 0) html += `<span class="line"><span>${img(`sk-${skill.icon}`)}<span class="n">${digits(String(skill.level))}</span></span></span>`;
    }
    return `<span class="cost">${html}</span>`;
  };
  /** Left-to-right group of a bar code: demolish, repair, upgrade, own items, villagers. */
  const group = (code: number) => (code === 17 ? 0 : code === 26 || code === 28 ? 1 : code === 16 || code === 27 ? 2 : code < 0 ? 4 : 3);
  /** A villager's head in building `kind`'s panel: the chief's horns, a child; whoever works in a
   *  kitchen the cook's hat (a man's or a woman's), on a site (kinds 12..19) the builder's hard
   *  hat; else by gender (dense 1515, 0 a man). */
  const portrait = (id: number, kind: number) => {
    const e = runtime.denseState;
    if (id === (runtime.mainArrays.aShort[0]?.[17] ?? 0)) return "pt-chief";
    if ((e[UNIT_TYPE + id] ?? 0) === 17 || (e[UNIT_AGE + id] ?? 20) < 12) return "pt-child";
    const man = (e[UNIT_GENDER + id] ?? 0) === 0;
    if (kind === 4) return man ? "pt-cook" : "pt-cook-woman";
    if (kind >= 12) return "pt-builder";
    return man ? "pt-man" : "pt-woman";
  };
  const panelRow = document.createElement("div");
  panelRow.className = "hud-sheet-row";
  const confirmRow = document.createElement("div");
  confirmRow.className = "hud-sheet-confirm";
  confirmRow.innerHTML = `${img("demolish")}<span data-ui="confirm.demolish"></span>`;
  const sheetTick = button("hud-sheet-tick", "", "a11y.ok");
  sheetTick.innerHTML = img("btn-tick");
  // An item confirming (w == 4, BUG-019): the original's own line for it ("nothing to do here" ...)
  // in the sheet, closed with its ✕.
  const noticeRow = document.createElement("div");
  noticeRow.className = "hud-sheet-confirm";
  sheet.append(panelRow, confirmRow, noticeRow, sheetTick);
  let confirming = false;
  sheetTick.addEventListener("click", () => {
    if (confirming) {
      confirming = false;
      const at = barCodes().indexOf(17);
      if (at >= 0 && screen.buildingMenuOpen) touch.pickInBar(at, 2); // FIRE: w = 4 ... FIRE: l(-2)
      return;
    }
    selectChosen();
  });
  let shownBar = "";
  let insideId = 0; // a villager whose portrait was tapped: their panel shows
  const tapBarItem = (index: number, code: number) => {
    if (code < 0) { insideId = -code; return; }
    if (buildingKind() === ARMOURY && code <= 5) { touch.pickInBar(index, 0); return; }
    if (code === 17) { confirming = true; return; }
    // The command bar's form up / call to arms: their spot is chosen as from the command button.
    if (code === 11 || code === 12) ordering = code === 11 ? "cmd-rally" : "cmd-arms";
    touch.pickInBar(index);
  };
  const drawBuildingMenu = () => {
    const codes = barCodes();
    const kind = buildingKind();
    const key = `${kind}:${game.qCounter}:${codes.join(",")}`;
    if (key !== shownBar) {
      shownBar = key;
      confirming = false;
      insideId = 0;
      const entries = codes
        .map((code, index) => ({ code, index }))
        .filter(({ code }) => !(kind === CHIEFS_HUT && code === 17))
        .sort((a, b) => group(a.code) - group(b.code) || a.index - b.index);
      const items: HTMLElement[] = [];
      if (kind === CHIEFS_HUT) {
        const nothing = document.createElement("span");
        nothing.className = "hud-item nothing";
        nothing.setAttribute("role", "img");
        setLabel(nothing, "panel.nothingHere");
        nothing.innerHTML = img("nothing");
        items.push(nothing);
      }
      entries.forEach(({ code, index }, n) => {
        if (n > 0 && group(entries[n - 1]!.code) <= 2 && group(code) > 2) {
          const sep = document.createElement("span");
          sep.className = "hud-sep";
          items.push(sep);
        }
        const entry = document.createElement("button");
        entry.type = "button";
        entry.className = "hud-item";
        entry.dataset.index = String(index);
        entry.dataset.code = String(code);
        entry.setAttribute("aria-label", itemName(code));
        entry.innerHTML = `${img(code < 0 ? portrait(-code, kind) : PANEL_ICONS[code] ?? "nothing")}<span class="n"></span>${costHtml(code, kind)}`;
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
        items.push(entry);
      });
      panelRow.replaceChildren(...items);
    }
    const counts = runtime.mainArrays.s;
    for (const entry of Array.from(panelRow.querySelectorAll<HTMLElement>("button.hud-item"))) {
      const index = Number(entry.dataset.index);
      const code = Number(entry.dataset.code);
      entry.classList.toggle("active", index === game.menuCursor && (code < 0 || (kind === ARMOURY && code <= 5)));
      const n = entry.querySelector<HTMLElement>(".n")!;
      const text = code >= 0 && code <= 8 ? String(counts[index] ?? 0) : "";
      if (n.dataset.text !== text) { n.dataset.text = text; n.innerHTML = text ? digits(text) : ""; }
    }
    const notice = game.barMode === 4 && !confirming;
    // The line l(int) put up (d[4] = /t 33 + its number: "nothing to do here" ...).
    const line = game.zlDShorts[4] ?? 0;
    const words = notice && line > 0 ? ui(messageKey(line)) : "";
    if (noticeRow.textContent !== words) noticeRow.textContent = words;
    if (notice || confirming) insideId = 0;
    show(panelRow, !confirming && !notice && !insideId);
    show(confirmRow, confirming);
    show(noticeRow, notice);
    // ✓ left of ✕: confirming the demolish, or selecting the villager whose panel shows (or whose
    // portrait the cursor is on, keys).
    show(sheetTick, confirming || (!notice && (insideId > 0 || (barCodes()[game.menuCursor] ?? 0) < 0)));
  };
  /** ✓ with a villager's panel open (or their portrait chosen): that villager is selected. */
  const selectChosen = () => {
    const id = insideId || -(barCodes()[game.menuCursor] ?? 0);
    if (id > 0) touch.selectVillager(id);
  };

  // ---- the villager panel (BUG-017; UI design "村民面板", user 2026-10-23: follow it): in the bottom
  // sheet, the portrait (hat by job, no name) and three aligned columns -- gender + age / mood + resting
  // / weapon + pouch; health, hunger, tiredness bars; the skills, two per row. What it shows is what
  // the original's panel (frame command 4) drew, read back with WideView.villagerPanelOf (its composites
  // and numbers by frame position), the pictures swapped for the HD ones. Several villagers: their
  // portraits in a row, each with their weapon; a tap selects that one alone. ----
  /** Skill composites (docs/hd-art-handoff.md §8): 560 + n, 577 + n the highlighted ones. */
  const SKILLS: Record<number, string> = {
    561: "basket", 562: "basket-wood", 563: "basket-meat", 564: "basket-ice", 565: "basket-stone", 566: "basket-mushroom",
    567: "basket-bone", 568: "hammer", 569: "chef", 570: "horseshoe", 571: "mask", 572: "hardhat", 573: "bush", 574: "spark",
    575: "spear", 576: "eyes",
  };
  const WEAPON_BASE = 659; // + the held item (0..8; 9 none draws nothing)
  const MOOD_BASE = 674; // 675 (angriest) .. 679 (happiest): the HD mood-5 .. mood-1
  const villagerBox = document.createElement("div");
  villagerBox.className = "hud-villager";
  const groupRow = document.createElement("div");
  groupRow.className = "hud-sheet-row hud-group";
  sheet.append(villagerBox, groupRow);
  const cellImg = (name: string, cls = "") => img(name, cls);
  const statBar = (icon: string, part: number, number = "") =>
    `<span class="hud-stat">${cellImg(icon)}<span class="hud-meter"><i style="width:${Math.round(Math.max(0, Math.min(1, part)) * 100)}%"></i></span>${number ? `<span class="n">${digits(number)}</span>` : ""}</span>`;
  const cell = (icon: string, number = "", cls = "") => `<span class="hud-cell ${cls}">${icon ? cellImg(icon) : ""}${number ? `<span class="n">${digits(number)}</span>` : ""}</span>`;
  let shownVillager = "";
  const drawVillager = (id: number, cells: typeof runtime.villagerPanelDraft) => {
    const e = runtime.denseState;
    const key = `${id}:${cells.map((c) => `${c.asset}${c.text}@${c.x},${c.y}`).join(" ")}:${e[UNIT_HP + id]}:${e[UNIT_FOOD + id]}:${e[UNIT_ENERGY + id]}`;
    if (key === shownVillager) return;
    shownVillager = key;
    const textAt = (x: number, y: number) => cells.find((c) => c.asset < 0 && Math.abs(c.x - x) <= 3 && Math.abs(c.y - y) <= 3)?.text ?? "";
    const asset = (test: (asset: number) => boolean) => cells.find((c) => c.asset >= 0 && test(c.asset));
    const gender = asset((a) => a === 619 || a === 620);
    const mood = asset((a) => a > MOOD_BASE && a <= MOOD_BASE + 5);
    const rest = asset((a) => a === 560 || a === 577);
    const weapon = asset((a) => a >= WEAPON_BASE && a < WEAPON_BASE + 9);
    const pouch = asset((a) => a >= 625 && a <= 629);
    // The skills: each number right of the panel's middle, with the icon just left of it; the one
    // without an icon is speed (its legs are part of the panel's background).
    const skills = cells
      .filter((c) => c.asset < 0 && c.x >= 160)
      .sort((a, b) => a.y - b.y || a.x - b.x)
      .map((c) => {
        const icon = cells.find((d) => d.asset >= 0 && Math.abs(d.y - c.y) <= 1 && c.x - d.x >= 10 && c.x - d.x <= 20);
        const base = icon ? (icon.asset >= 577 ? icon.asset - 17 : icon.asset) : -1;
        if (icon && !SKILLS[base]) oldArt.note("村民面板 技能", `组合图 ${icon.asset}`);
        return cell(icon ? `sk-${SKILLS[base] ?? "z"}` : "sk-legs", c.text, icon && icon.asset >= 577 ? "lit" : "");
      });
    const age = gender ? textAt(gender.x + 24, gender.y + 1) : "";
    const carried = pouch ? textAt(pouch.x + 15, pouch.y) : "";
    const maxHp = Math.max(1, e[UNIT_MAX_HP + id] ?? 1);
    const row = (...items: string[]) => `<span class="hud-row">${items.join("")}</span>`;
    villagerBox.innerHTML = `${cellImg(portrait(id, -1), "face")}<span class="hud-cols">
      <span class="hud-col">${row(cell(gender?.asset === 619 ? "male" : "female", age))}${row(cell(mood ? `mood-${MOOD_BASE + 6 - mood.asset}` : ""), rest ? cell("zzz", "", rest.asset === 577 ? "lit" : "faint") : "")}${row(cell(weapon ? PANEL_ICONS[weapon.asset - WEAPON_BASE] ?? "empty-hand" : "empty-hand"), cell("pouch", carried, pouch && pouch.asset !== 625 ? "" : "faint"))}</span>
      <span class="hud-col bars">${statBar("heart", (e[UNIT_HP + id] ?? 0) / maxHp, String(e[UNIT_HP + id] ?? 0))}${statBar("hunger", (e[UNIT_FOOD + id] ?? 0) / 99)}${statBar("sleep", (e[UNIT_ENERGY + id] ?? 0) / 99)}</span>
      <span class="hud-col skills">${skills.join("")}</span></span>`;
  };
  /** Our villagers selected together: their group mark (f.e 909 + id) is the selection's group
   *  (f.F, -1 for one villager; the marks stay after a selection ends, so only the current group). */
  const groupIds = () => {
    const e = runtime.denseState;
    const ids: number[] = [];
    if (game.selectionGroup < 0) return ids;
    for (let id = 1; id <= 50; id += 1) if ((e[UNIT_SELECTION + id] ?? 0) === game.selectionGroup) ids.push(id);
    return ids;
  };
  let shownGroup = "";
  const drawGroup = (ids: number[]) => {
    const e = runtime.denseState;
    const key = ids.map((id) => `${id}:${e[UNIT_HELD_ITEM + id]}`).join(",");
    if (key === shownGroup) return;
    shownGroup = key;
    groupRow.replaceChildren(...ids.map((id) => {
      const entry = document.createElement("button");
      entry.type = "button";
      entry.className = "hud-item hud-member";
      entry.setAttribute("aria-label", capitalise(runtime.unitNames[id] ?? ""));
      const held = e[UNIT_HELD_ITEM + id] ?? 9;
      entry.innerHTML = `${img(portrait(id, -1))}${img(PANEL_ICONS[held] && held < 9 ? PANEL_ICONS[held]! : "empty-hand", "weapon")}`;
      entry.addEventListener("click", () => { viewing = id; });
      return entry;
    }));
  };
  groupRow.addEventListener("scroll", () => drawDots(groupRow, groupRow.childElementCount, 66));
  // One of several selected villagers shown alone (UI design "多选：看单人（返回）", 2026-10-23): the
  // selection stays as it is; their panel is the original's, drawn privately (villagerPanelOf),
  // again every few seconds while it shows; ✕ turns into back.
  let viewing = 0;
  let soloId = 0; // the one villager whose panel shows (picked, or a squad of one)
  let viewedId = 0;
  let viewedCells: typeof runtime.villagerPanelDraft = [];
  let viewedAt = 0;
  const VIEW_REFRESH_MS = 2000;

  // ---- aiming a building's item at a villager (w == 3 with the building's bar behind it, slot 2):
  // the store's weapons (f.s = -code - 1) and the sanctuary's healing, defence, love potion
  // (f.s 0..2). A tap on a villager marks them with the item's picture; ✓ sends the cursor there and
  // FIRE (f.x() gives the order), then back to the building menu. ----
  const prompt = promptPanel("club");
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

  // ---- touch play's action icon (user, 2026-10-26): the order a tap just gave (move, gather, attack,
  // enter ... -- the original's icon beside its hand, RenderRuntime.touchAction), in HD, centred on
  // the cursor's tile. 1.4 tiles at first; too big on the phone (user, 2026-10-27, BUG-024): 0.6 of that. ----
  const actionIcon = document.createElement("img");
  actionIcon.className = "hud-action-icon";
  actionIcon.alt = "";
  actionIcon.hidden = true;
  app.append(actionIcon);
  const ACTION_FRAMES: Record<number, number> = { 35: 5 }; // the move arrows' animation
  const ACTION_SIZE = 0.85; // tiles
  const VILLAGER_H = 24; // game pixels: about a grown villager's height (the rally's icon, BUG-028)
  const ACTION_FLASH_MS = 800;

  // ---- placing a building (UI design "放置建筑", 2026-10-22): the building's level-1 HD picture as a
  // ghost over its footprint, a green patch under it, a tick at its top right; where the original
  // does not allow it (c(int,int)'s r:Z, its "!" instead of the arrow) the ghost and patch turn red
  // and the tick grey, and a tap on it does nothing. The ghost is dragged to move it
  // (TouchControls); the original's own preview is not drawn (WideView). ----
  const ghost = document.createElement("div");
  ghost.className = "hud-ghost";
  ghost.hidden = true;
  ghost.innerHTML = '<i class="patch"></i><img alt="" draggable="false">';
  const ghostPatch = ghost.querySelector<HTMLElement>(".patch")!;
  const ghostPicture = ghost.querySelector<HTMLImageElement>("img")!;
  const placeTick = button("hud-place", "", "a11y.place");
  placeTick.innerHTML = img("btn-tick");
  placeTick.hidden = true;
  app.append(ghost, placeTick);
  placeTick.addEventListener("click", () => {
    if (ordering === "" || game.cSInt !== 100) { if (game.cRFlag) touch.pressKey(OriginalKey.FIRE); return; }
    if (!orderSpotOk(game.cameraColumn + game.cursorColumn, game.cameraRow + game.cursorRow)) return;
    touch.pressKey(OriginalKey.FIRE);
  });
  /** The building kind (0..11) whose site f.s places: t138[416 + kind] (S.site's table), or -1. */
  const placedKind = (s: number) => {
    const table = runtime.packedOffsets[T_BUILDING] ?? 0;
    for (let kind = 0; kind < 12; kind += 1) if ((runtime.packedBytes[table + 416 + kind] ?? -1) === s) return kind;
    return -1;
  };
  /** Every display frame: keeps the tick on the footprint while the map is dragged. */
  /** One selected villager's job, for the icon that stays on it (user, 2026-10-26): his work spot --
   *  the original's return position (6262 / 6363: the tree, rock, bush or fish he keeps going back
   *  to, or where he was sent) -- or the animal he hunts (his target, 3131 / 3232), with the icon the
   *  original's cursor shows on that cell (c(int,int): 44 tree, 45 rock, 46 bones, 43 the other
   *  resources and animals); plain ground while he walks there: the move arrows. Children, idlers
   *  and work inside buildings show nothing. */
  const jobIcon = (id: number): { icon: number; tx: number; ty: number } | null => {
    const e = runtime.denseState;
    if ((e[UNIT_TYPE + id] ?? 0) === 17) return null;
    const cell = (x: number, y: number) => runtime.gridC[y]?.[x] ?? 0;
    const tx = e[UNIT_TARGET_X + id] ?? 0;
    const ty = e[UNIT_TARGET_Y + id] ?? 0;
    const target = cell(tx, ty);
    if (target >= 101 && target <= 122) return { icon: 43, tx, ty };
    const hx = e[UNIT_HOME_X + id] ?? 0;
    const hy = e[UNIT_HOME_Y + id] ?? 0;
    const home = cell(hx, hy);
    if (home === -124) return { icon: 44, tx: hx, ty: hy };
    if (home === -125) return { icon: 45, tx: hx, ty: hy };
    if (home <= -61 && home >= -110) return { icon: (e[RES_KIND - (home + 61)] ?? 0) === 7 ? 46 : 43, tx: hx, ty: hy };
    const away = (e[UNIT_X + id] ?? 0) !== hx || (e[UNIT_Y + id] ?? 0) !== hy;
    if (home === 0 && away && touch.villagerTile(id)) return { icon: 35, tx: hx, ty: hy };
    return null;
  };

  const track = () => {
    // Shown for a moment after a tap: the order a tap gives (one tap, user 2026-10-26); with one
    // villager selected, his job's icon stays on it.
    const onMap = screen.touchPlay && game.loopMode === 1 && game.barMode === 1 && !screen.frozen;
    const recent = performance.now() - lastTouch < ACTION_FLASH_MS;
    const flash = recent && onMap ? touchAction.icon : 0;
    const job = !flash && onMap && screen.villagerSheet ? jobIcon(soloId) : null;
    const icon = flash || job?.icon || 0;
    actionIcon.hidden = icon === 0;
    if (icon) {
      const frames = ACTION_FRAMES[icon] ?? 1;
      const src = `hd/effects/${icon}-${frames > 1 ? Math.floor(performance.now() / 150) % frames : 0}.png`;
      if (!actionIcon.src.endsWith(src)) actionIcon.src = src;
      const at = job ? screen.tileToCss(job.tx, job.ty) : screen.tileToCss(game.cameraColumn + game.cursorColumn, game.cameraRow + game.cursorRow);
      const tile = screen.tileToCss(1, 1).x - screen.tileToCss(0, 0).x;
      const size = tile * ACTION_SIZE;
      Object.assign(actionIcon.style, { left: `${at.x + tile / 2 - size / 2}px`, top: `${at.y + (tile * 16) / 22 / 2 - size / 2}px`, width: `${size}px`, height: `${size}px` });
    }
    // The placed order's flag on its tile (f.q:[B), a villager high, while the order is on.
    const k22 = screen.tileToCss(1, 1).x - screen.tileToCss(0, 0).x; // CSS pixels per 22 game pixels
    const flagSize = (k22 * VILLAGER_H) / 22;
    const placed = game.callToArmsActive ? "cmd-arms" : game.formUpActive ? "cmd-rally" : "";
    const flagShown = placed !== "" && screen.onMap && !screen.frozen;
    if (flagShown && orderFlag.hidden) {
      // Just placed (or back on the map): pop and rings, then the blink.
      orderFlag.classList.remove("burst");
      void orderFlag.offsetWidth;
      orderFlag.classList.add("burst");
    }
    orderFlag.hidden = !flagShown;
    if (flagShown) {
      if (!orderFlagPicture.src.endsWith(`${placed}.png`)) orderFlagPicture.src = `hd/ui/${placed}.png`;
      const spot = screen.tileToCss(game.outerLoopRowEndMarker[0]!, game.outerLoopRowEndMarker[1]!);
      Object.assign(orderFlag.style, { left: `${spot.x + k22 / 2 - flagSize / 2}px`, top: `${spot.y + (k22 * 16) / 22 - flagSize}px`, width: `${flagSize}px`, height: `${flagSize}px` });
    }
    // The chief's hat and its tick over the new chief's candidate; the hat alone, fading, over the new chief.
    if (crowned && performance.now() > crownedUntil) crowned = 0;
    const wearer = choosing && candidate > 0 ? candidate : crowned;
    const hat = wearer > 0 && !screen.frozen ? touch.villagerTile(wearer) : null;
    chiefMark.hidden = !hat;
    chiefMark.classList.toggle("crowned", !choosing && crowned > 0);
    if (hat) {
      const head = screen.tileToCss(hat[0], hat[1]);
      const k = screen.tileToCss(1, 1).x - screen.tileToCss(0, 0).x;
      chiefMark.style.left = `${head.x + k / 2}px`;
      chiefMark.style.top = `${head.y - k * 0.12}px`;
    }
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
    // An order's spot (f.s 100, chosen through the menu) or a building's site.
    const spot = area && game.cSInt === 100 && ordering !== "" ? ordering : "";
    const kind = area && !spot ? placedKind(game.cSInt) : -1;
    if (!area || (kind < 0 && !spot) || screen.frozen || picking) { placeTick.hidden = true; ghost.hidden = true; return; }
    const from = screen.tileToCss(area.column, area.row);
    const to = screen.tileToCss(area.column + area.columns, area.row + area.rows);
    const blocked = spot ? !orderSpotOk(area.column, area.row) : !game.cRFlag;
    ghost.classList.toggle("order", spot !== "");
    ghost.classList.toggle("blocked", blocked);
    placeTick.classList.toggle("blocked", blocked);
    placeTick.setAttribute("aria-disabled", String(blocked));
    Object.assign(ghostPatch.style, { left: `${from.x}px`, top: `${from.y}px`, width: `${to.x - from.x}px`, height: `${to.y - from.y}px` });
    const src = spot ? `hd/ui/${spot}.png` : `hd/buildings/${kind}-1.png`;
    if (!ghostPicture.src.endsWith(src)) ghostPicture.src = src;
    // The picture at the map's scale: its pixels / the HD scale = game pixels, standing on the footprint
    // (an order's flag: a villager high).
    const cssPerGame = (screen.tileToCss(1, 0).x - screen.tileToCss(0, 0).x) / 22;
    const k = hdArt.scale();
    const w = spot ? flagSize : (ghostPicture.naturalWidth / k) * cssPerGame;
    const h = spot ? flagSize : (ghostPicture.naturalHeight / k) * cssPerGame;
    const left = (from.x + to.x) / 2 - w / 2;
    const top = to.y - h;
    Object.assign(ghostPicture.style, { left: `${left}px`, top: `${top}px`, width: `${w}px`, height: `${h}px` });
    ghost.hidden = false;
    const size = 40;
    const width = screen.element.clientWidth;
    // An order's flag is smaller than the tick: the tick goes beside it, off the flag, so a finger
    // on the flag drags it instead of placing it (BUG-046).
    placeTick.style.left = `${Math.max(4, Math.min(width - size - 4, spot ? left + w : left + w - size / 2))}px`;
    placeTick.style.top = `${Math.max(4, spot ? top - size * 0.75 : top - size / 2)}px`;
    placeTick.hidden = false;
  };

  const show = (element: HTMLElement, on: boolean) => { element.hidden = !on; };
  // A scripted scene (Q 17 / 20) from the map ends what was going on there: back on the map,
  // placing and selections are closed (BUG-010, user 2026-10-16; the original keeps them, and so
  // does play that has not touched the screen -- keys, the oracle's replays). Not when the player's
  // own tap just led to it (a villager's answer, Q 20). Counted in game ticks, not wall time: the
  // same taps give the same game however fast it runs (a slow phone, the scenario tests).
  let lastTouch = -Infinity; // ms, for the action icon's flash only
  let ticks = 0;
  let lastTouchTick = -1;
  const SCENE_AFTER_TAP_TICKS = 12; // about 1.5 s
  document.addEventListener("pointerdown", () => { lastTouch = performance.now(); lastTouchTick = ticks; }, true);
  let sceneFromMap = false;
  let wasOnMap = false;
  // Nothing shows before the game's first frame (the splash, the start-up questions).
  for (const element of [menuButton, fab, actions]) element.hidden = true;

  return {
    track,
    update() {
      ticks += 1;
      const nowOnMap = game.loopMode === 1;
      if (wasOnMap && !nowOnMap && (game.screen === 17 || game.screen === 20) && lastTouchTick >= 0 && ticks - lastTouchTick > SCENE_AFTER_TAP_TICKS) sceneFromMap = true;
      if (nowOnMap && sceneFromMap) { sceneFromMap = false; if (game.barMode !== 0 && !game.choosingChief) touch.closeBars(); }
      wasOnMap = nowOnMap;
      // Choosing a chief: take the map taps, hide everything else.
      const nowChoosing = candidates().length > 0;
      if (nowChoosing !== choosing) {
        choosing = nowChoosing;
        touch.setMapTapHandler(choosing ? tapWhileChoosing : null);
        chiefPrompt.words.textContent = ui("chief.prompt");
        candidate = 0;
        candidateSheet = false;
      }
      const code = pickCode();
      if ((code >= 0) !== picking) {
        picking = code >= 0;
        pickTarget = 0;
        if (picking) {
          // The aimed item over the villager: its HD icon (the original's small picture until 2026-10-29).
          marker.src = `${UI}${PANEL_ICONS[code] ?? "club"}.png`;
          marker.width = marker.height = 28;
          prompt.words.textContent = ui("hud.aim", { item: itemName(code) });
          prompt.icon.src = `${UI}${PANEL_ICONS[code] ?? "club"}.png`;
        }
        prompt.panel.hidden = !picking;
        touch.setMapTapHandler(picking ? (villager) => { pickTarget = villager; } : null);
      }
      const layout = screen.hudLayout();
      const onMap = layout !== null && game.loopMode === 1 && !choosing;
      if (layout) {
        hud.style.setProperty("--hud-bar-top", `${layout.barTop}px`);
        hud.style.setProperty("--hud-safe-bottom", `${layout.safeBottom}px`);
        hud.style.setProperty("--hud-bottom", "0px");
        app.style.setProperty("--hud-panels-bottom", `${layout.barBottom}px`);
      }
      // The pause menu's screens leave the map (v:B 0); the menu shows over them.
      // Resumed another way (keys) -- not while openPause() is still backing out of a selection
      // on the map (BUG-011: that cleared the still screen and showed the original's menu).
      if (paused && game.loopMode === 1 && !touch.busy) paused = false;
      // The still screen covers the pause menu, its prompts (Q 16) and messages (Q 21); it goes once
      // the game is back on the map or elsewhere (Quit).
      if (stillIsMine && !paused && (game.loopMode === 1 || ![10, 11, 16, 21].includes(game.screen))) {
        screen.frozen = false;
        stillIsMine = false;
      }
      // The bar stays over the game menu's still screen (the original's own bar was part of it).
      show(menuButton, (layout !== null || paused) && !choosing);
      menuList.hidden = !(paused && inPauseMenu());
      menuShade.hidden = menuList.hidden;
      menuButton.classList.toggle("open", paused);
      show(bar, layout !== null || paused);
      if (layout) drawCounts();
      for (const { entry, item } of menuEntries) entry.disabled = item.enabled ? !item.enabled() : false;
      const w = game.barMode;
      const building = onMap && screen.buildCardsOpen;
      // The command bar a touch script passes through (opening an order, backing out) is not shown.
      const menu = onMap && (screen.buildingMenuOpen || (screen.commandBarOpen && !touch.busy));
      // The plain map (nothing open, at most villagers selected): build, commands, squads.
      const plain = onMap && (w === 0 || w === 1) && !picking && !menu;
      const group = plain && w === 1 ? groupIds() : [];
      if (!group.includes(viewing)) viewing = 0;
      // One villager: picked, or a squad of one (storing or picking a squad leaves f.d[4] off, the
      // original's panel hidden; BUG-038, user 2026-11-02: the panel stays).
      soloId = !plain || w !== 1 ? 0
        : group.length === 1 ? group[0]!
        : game.selectedId > 0 && !!game.selectionFlags[4] && group.length < 2 ? game.selectedId : 0;
      const single = soloId > 0;
      // The panel the original draws for them (all rows, drawn privately): on a new villager and every
      // few seconds -- its own redraws are only the rows that changed.
      if (!menu) insideId = 0;
      const chiefSheet = choosing && candidateSheet && candidate > 0;
      const shownId = viewing || insideId || (chiefSheet ? candidate : 0) || soloId;
      if (shownId && (shownId !== viewedId || performance.now() - viewedAt > VIEW_REFRESH_MS)) {
        viewedId = shownId;
        viewedCells = villagerPanelOf(runtime, shownId);
        viewedAt = performance.now();
      }
      if (!shownId) viewedId = 0;
      const villager = shownId > 0;
      screen.villagerSheet = single;
      show(villagerBox, villager);
      show(groupRow, group.length > 1 && !viewing);
      show(pageDots, building || (group.length > 1 && !viewing));
      if (villager) drawVillager(shownId, viewedCells); else shownVillager = "";
      if (group.length > 1 && !viewing) { drawGroup(group); drawDots(groupRow, group.length, 66); } else shownGroup = "";
      const back = viewing > 0 || insideId > 0;
      const closeIcon = back ? "back" : "btn-close";
      if (sheetClose.dataset.icon !== closeIcon) { sheetClose.dataset.icon = closeIcon; sheetClose.innerHTML = img(closeIcon); setLabel(sheetClose, back ? "a11y.back" : "a11y.close"); }
      // A villager panel up: no build or command button (user, 2026-10-23, as with the building
      // panel); the squads stay, above the sheet (their "+" needs the selection).
      const sheetUp = (villager && !insideId) || group.length > 1;
      show(buildButton, plain && !sheetUp);
      show(cmdButton, plain && !sheetUp);
      show(squadBox, plain);
      if (!plain || sheetUp) closeCommands();
      if (!plain) closePop();
      if (plain) { drawCommands(); drawSquads(); }
      if (sheetUp) hud.style.setProperty("--hud-bottom", `${SHEET_HEIGHT}px`);
      // The prompt panel: the function button's ✓ on its top edge.
      if (picking) hud.style.setProperty("--hud-bottom", `${SHEET_HEIGHT - 26}px`);
      chiefPrompt.panel.hidden = !choosing || chiefSheet;
      show(sheet, building || menu || villager || group.length > 1);
      show(buildList, building);
      if (building) drawBuildList();
      if (!menu) { shownBar = ""; confirming = false; show(panelRow, false); show(confirmRow, false); show(noticeRow, false); show(sheetTick, false); }
      // ✓ / ✕: choosing a chief, aiming at a villager (✓); placing (✕, back).
      if (!touch.busy && w !== 3) ordering = "";
      show(fab, picking || (onMap && w === 3));
      fab.classList.toggle("is-tick", picking);
      setLabel(fab, picking ? "a11y.ok" : "a11y.back");
      fab.disabled = picking && pickTarget === 0;
      if (choosing) {
        show(actions, false);
        return;
      }
      show(actions, onMap && !building && !menu && !villager && group.length < 2 && !touch.busy);
      if (!onMap) return;
      if (menu) drawBuildingMenu();
      show(left, w === 2 && !building && !menu);
      show(right, w === 2 && !building && !menu);
      show(cancelBox, touch.boxing);
      // No ✕ for a selection (BUG-038, user 2026-11-02): its panel or queue has its own.
      show(cancel, !touch.boxing && ((w !== 0 && w !== 1 && w !== 3) || picking));
    },
  };
}
