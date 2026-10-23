import type { LegacyRuntimeState } from "./core/LegacyRuntimeState";
import { OriginalKey } from "./platform/Input";
import { originalIcon, originalItemIcon } from "./OriginalIcons";
import { capitalise, originalText } from "./OriginalText";
import { T_BUILDING } from "./core/DataTables";
import { BLD_KIND, UNIT_AGE, UNIT_GENDER, UNIT_NAME, UNIT_TYPE } from "./core/DenseLayout";
import type { PauseItem, TouchControls } from "./TouchControls";
import type { WideScreen } from "./WideScreen";

/** The round-3 UI's pictures (scripts/import-hd.mjs copies them from design/). */
const UI = "hd/ui/";

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

  // ---- the top bar (round 3, user 2026-10-20): the HD bar, its resource icons and digits (people
  // up to 99 / 99, each resource up to 999) -- the original's f.a(byte,int,int) for command 0 shows
  // a:[[S row 0 at t146[0..4] (people, food, wood, stone, bones) and the living space, row 0 [16] ----
  const bar = document.createElement("div");
  bar.className = "hud-bar";
  bar.hidden = true;
  bar.innerHTML = `<img class="hud-bar-bg" src="${UI}bar-bg.png" alt=""><img class="hud-bar-deco left" src="${UI}deco-top-left.png" alt=""><img class="hud-bar-deco right" src="${UI}deco-top-right.png" alt="">`;
  const counters = ([["people", "人口"], ["food", "食物"], ["wood", "木材"], ["stone", "石头"], ["bones", "骨头"]] as const).map(([icon, name]) => {
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
      counter.group.setAttribute("aria-label", `${counter.name} ${text}`);
      counter.digits.innerHTML = Array.from(text, (c) => `<img src="${UI}digit-${c === "/" ? "slash" : c}.png" alt="">`).join("");
    });
  };

  // ---- top right: the game menu, which pauses the game: a stone plate (pressed while open), the
  // items as plates with glyphs dropping down under it ----
  const menuButton = button("hud-menu-button", "", "游戏菜单");
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
  const menuItems: { label: string; glyph: string; act: () => void; enabled?: () => boolean }[] = [
    { label: "保存", glyph: "save", act: () => (game.screen === 10 ? ask(message(64), () => run("save")) : run("save")) },
    { label: "读取", glyph: "load", enabled: () => game.screen === 10, act: () => ask(message(63), () => { paused = false; menuList.hidden = true; run("load"); }) },
    { label: "设置", glyph: "settings", act: openSettings },
    // Help shows the original's help pages (to be rewritten); back from them, the menu returns.
    { label: "帮助", glyph: "help", act: () => { help = "asked"; screen.frozen = false; run("help"); } },
    { label: "退出", glyph: "quit", act: () => ask(message(65), () => { paused = false; menuList.hidden = true; run("quit"); }) },
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

  const img = (name: string, cls = "") => `<img${cls ? ` class="${cls}"` : ""} src="${UI}${name}.png" alt="">`;
  /** HD digits for a number badge. */
  const digits = (text: string) => Array.from(text, (c) => img(`digit-${c === "/" ? "slash" : c}`)).join("");

  // ---- bottom right (round 3, user 2026-10-21/22; mock-up "命令与小队"): the build button, the
  // command button above it, the squads at the right edge. Everything for the right thumb. ----
  const buildButton = button("hud-build-button", "", "建造");
  buildButton.innerHTML = img("build-a", "up") + img("build-b", "down");
  buildButton.addEventListener("click", () => touch.command([10]));

  // ✓ / ✕ where something waits for confirming or going back: choosing a chief, aiming a weapon or
  // spell, the building menu (select the villager), placing (back to the build list).
  const fab = button("hud-fab", "", "确定");
  fab.innerHTML = img("btn-tick", "tick") + img("btn-x", "back");
  fab.addEventListener("click", () => {
    if (choosing) { confirmChief(); return; }
    if (picking) { confirmPick(); return; }
    // While placing it is the way back (the right soft key: back to the build cards).
    if (game.barMode === 3) touch.pressKey(OriginalKey.SOFT_RIGHT);
  });

  // The command button: unfolds call to arms, form up, the map upwards; lit (with the running
  // command's icon at its corner) while call to arms or form up is on. The same item cancels it.
  const cmdButton = button("hud-cmd", "", "命令");
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
  const commands = [
    { glyph: "cmd-arms", name: () => (game.callToArmsActive ? "回去干活" : "全员备战"), active: () => game.callToArmsActive, act: () => touch.command([12, 15]) },
    { glyph: "cmd-rally", name: () => (game.formUpActive ? "解散" : "集结"), active: () => game.formUpActive, act: () => touch.command([11, 14]) },
    { glyph: "cmd-map", name: () => "小地图", active: () => false, act: () => touch.pressKey(OriginalKey.DIGIT_3) },
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
      entry.setAttribute("aria-label", command.name());
      entry.classList.toggle("active", command.active());
    }
  };

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
  const replaceButton = button("hud-squad-action", "", "替换：用选中的人覆盖这一队");
  replaceButton.innerHTML = img("cmd-replace");
  const disbandButton = button("hud-squad-action", "", "解散这一队");
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
    const chip = button("hud-squad", "", `小队${index + 1}`);
    chip.innerHTML = `${img("pt-man", "head")}<span class="count"></span>`;
    const held = longPress(chip, () => `小队${index + 1}`, () => {
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
  const plusChip = button("hud-squad plus", "", "把选中的人存成一队");
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

  // ---- the bottom sheet (round 3): one panel for the build list (and, later, the building and
  // villager panels), sliding up from the bottom, a ✕ at its top right ----
  const sheet = document.createElement("div");
  sheet.className = "hud-sheet";
  sheet.hidden = true;
  sheet.innerHTML = img("deco-grass", "deco bottom") + img("deco-vine", "deco top");
  const sheetClose = button("hud-sheet-close", "", "关闭");
  sheetClose.innerHTML = img("btn-close");
  // Backs out of the build cards and the command bar they came from (right soft key, each).
  sheetClose.addEventListener("click", () => {
    if (confirming) { confirming = false; return; }
    touch.closeBars();
  });
  hud.append(sheet);

  // The build list: the original's build cards' buildings (WideScreen hides the cards), left to right
  // in their order, one size each, the price as a badge at the top right (red when the stock is
  // short -- it does not stop the placing, user 2026-10-17), pages swiped sideways; a tap picks the
  // card (left / right to it, FIRE) and placing starts.
  const BUILDING_ICONS = ["armoury", "gym", "hut", "chiefs-hut", "kitchen", "range", "store", "disco", "sanctuary", "pia-center", "nursery", "tower"];
  const buildList = document.createElement("div");
  buildList.className = "hud-sheet-list";
  const pageDots = document.createElement("div");
  pageDots.className = "hud-sheet-dots";
  sheet.append(buildList, pageDots, sheetClose);
  /** Level-1 price of a building kind: t138 rows 10 wood, 11 stone, 12 bones (hut 15 / 5). */
  const price = (kind: number) => {
    const table = runtime.packedOffsets[T_BUILDING] ?? 0;
    return [10, 11, 12].map((row) => runtime.packedBytes[table + row * 26 + kind] ?? 0);
  };
  /** The tribe's stock (f.a:[[S row 0: 2 wood, 3 stone, 4 bones -- the top bar's counters). */
  const stock = () => [2, 3, 4].map((i) => runtime.mainArrays.aShort[0]?.[i] ?? 0);
  const RESOURCES = ["wood", "stone", "bones"];
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
        entry.setAttribute("aria-label", capitalise(originalText(runtime, "s", kind)));
        entry.dataset.kind = String(kind);
        entry.innerHTML = `<span class="pic">${img(`ub-${BUILDING_ICONS[kind]}`)}</span><span class="cost"></span>`;
        entry.addEventListener("click", () => touch.pickInBar(index));
        return entry;
      }));
    }
    const have = stock();
    const costs = kinds.map((kind) => price(kind).join("/")).join(",") + "|" + have.join(",");
    if (costs !== shownCosts) {
      shownCosts = costs;
      for (const entry of Array.from(buildList.children) as HTMLElement[]) {
        const need = price(Number(entry.dataset.kind));
        entry.querySelector(".cost")!.innerHTML = need
          .map((amount, i) => (amount > 0 ? `<span class="${amount > have[i]! ? "short" : ""}">${img(`icon-${RESOURCES[i]}`)}<span class="n">${digits(String(amount))}</span></span>` : ""))
          .join("");
      }
    }
    // One dot per page of cards.
    const perPage = Math.max(1, Math.floor(buildList.clientWidth / 97));
    const pages = Math.ceil(kinds.length / perPage);
    const page = Math.round(buildList.scrollLeft / (perPage * 97));
    if (pageDots.childElementCount !== pages) pageDots.replaceChildren(...Array.from({ length: pages }, () => document.createElement("i")));
    Array.from(pageDots.children).forEach((dot, i) => dot.classList.toggle("on", i === page));
  };
  buildList.addEventListener("scroll", () => drawBuildList());

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

  // ---- the building panel (round 3, user 2026-10-20/21): a building selected with one tap shows
  // its bar (f.r:[B, filled by f.Z() from aa(), ab(), ac()) in the bottom sheet, left to right:
  // demolish, repair, upgrade (or their cancels), the building's own items, the villagers inside
  // (heads whose hat shows the job). A tap does what FIRE on that item does; a villager's portrait
  // only shows them (the original's panel) and ✓ then selects them as a tap on the map does;
  // demolish turns the sheet into the question with ✓ / ✕; the armoury's weapons change their
  // count by a sideways swipe (UP / DOWN). The chief's camp shows the faint "nothing to do here". ----
  const ARMOURY = 0;
  const CHIEFS_HUT = 3;
  const label = (record: number) => capitalise(originalText(runtime, "s", record));
  const barCodes = () => Array.from(runtime.mainArrays.r.slice(0, game.frameLayoutAR));
  const buildingKind = () => runtime.denseState[BLD_KIND + game.qCounter] ?? 0;
  /** The names the bar's items have in the original's labels: weapons and traps /s 12.., the
   *  commands /s 21.. (code 10 is "build"); a villager's name /s 108 + their name index. */
  const itemName = (code: number) => (code < 0 ? label(108 + (runtime.denseState[UNIT_NAME - code] ?? 0)) : label(code <= 8 ? code + 12 : code + 11));
  /** The panel icon of a bar code (design/panels). */
  const PANEL_ICONS: Record<number, string> = {
    0: "club", 1: "stone", 2: "spear", 3: "stone-axe", 4: "bone-mace", 5: "tomahawk", 6: "net-trap", 7: "spring-trap", 8: "pit-trap",
    16: "upgrade", 17: "demolish", 19: "healing", 20: "defence", 21: "love-potion", 22: "disease",
    26: "repair", 27: "cancel-upgrade", 28: "cancel-repair", 29: "unload",
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
  confirmRow.innerHTML = `${img("demolish")}<span>是否确认拆除？</span>`;
  const sheetTick = button("hud-sheet-tick", "", "确定");
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
  const tapBarItem = (index: number, code: number) => {
    if (code < 0 || (buildingKind() === ARMOURY && code <= 5)) { touch.pickInBar(index, 0); return; }
    if (code === 17) { confirming = true; return; }
    touch.pickInBar(index);
  };
  const drawBuildingMenu = () => {
    const codes = barCodes();
    const kind = buildingKind();
    const key = `${game.qCounter}:${codes.join(",")}`;
    if (key !== shownBar) {
      shownBar = key;
      confirming = false;
      const entries = codes
        .map((code, index) => ({ code, index }))
        .filter(({ code }) => !(kind === CHIEFS_HUT && code === 17))
        .sort((a, b) => group(a.code) - group(b.code) || a.index - b.index);
      const items: HTMLElement[] = [];
      if (kind === CHIEFS_HUT) {
        const nothing = document.createElement("span");
        nothing.className = "hud-item nothing";
        nothing.setAttribute("role", "img");
        nothing.setAttribute("aria-label", "这里没什么可做");
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
        entry.innerHTML = `${img(code < 0 ? portrait(-code, kind) : PANEL_ICONS[code] ?? "nothing")}<span class="n"></span>`;
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
    const words = notice && game.resourceSectionW === game.vInt ? capitalise(originalText(runtime, "t", runtime.shownTextRecord)) : "";
    if (noticeRow.textContent !== words) noticeRow.textContent = words;
    show(panelRow, !confirming && !notice);
    show(confirmRow, confirming);
    show(noticeRow, notice);
    // ✓ left of ✕: confirming the demolish, or selecting the villager whose portrait is chosen.
    show(sheetTick, confirming || (!notice && (barCodes()[game.menuCursor] ?? 0) < 0));
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
      screen.scripting = touch.busy && game.loopMode === 1;
      const layout = screen.hudLayout();
      const onMap = layout !== null && game.loopMode === 1 && !choosing;
      if (layout) {
        hud.style.setProperty("--hud-bar-top", `${layout.barTop}px`);
        hud.style.setProperty("--hud-safe-bottom", `${layout.safeBottom}px`);
        hud.style.setProperty("--hud-bottom", `${layout.bottomPanels}px`);
        app.style.setProperty("--hud-panels-bottom", `${layout.panelsBottom}px`);
      }
      // The pause menu's screens leave the map (v:B 0); the menu shows over them.
      // Resumed another way (keys) -- not while openPause() is still backing out of a selection
      // on the map (BUG-011: that cleared the still screen and showed the original's menu).
      if (paused && game.loopMode === 1 && !touch.busy) paused = false;
      // The still screen covers the pause menu, its prompts (Q 16) and messages (Q 21); it goes once
      // the game is back on the map or elsewhere (Quit), and while the help pages are open.
      if (help === "asked" && !inPauseMenu()) help = "shown";
      if (help === "shown" && inPauseMenu()) { help = "no"; screen.frozen = true; }
      if (stillIsMine && !paused && (game.loopMode === 1 || ![10, 11, 16, 21].includes(game.screen))) {
        screen.frozen = false;
        stillIsMine = false;
      }
      // The bar stays over the game menu's still screen (the original's own bar was part of it).
      show(menuButton, (layout !== null || paused) && !choosing);
      menuList.hidden = !(paused && inPauseMenu() && help === "no");
      menuShade.hidden = menuList.hidden;
      menuButton.classList.toggle("open", paused);
      show(bar, layout !== null || paused);
      if (layout) drawCounts();
      for (const { entry, item } of menuEntries) entry.disabled = item.enabled ? !item.enabled() : false;
      const w = game.barMode;
      const building = onMap && screen.buildCardsOpen;
      const menu = onMap && screen.buildingMenuOpen;
      // The plain map (nothing open, at most villagers selected): build, commands, squads.
      const plain = onMap && (w === 0 || w === 1) && !picking && !menu;
      show(buildButton, plain);
      show(cmdButton, plain);
      show(squadBox, plain);
      if (!plain) { closeCommands(); closePop(); }
      if (plain) { drawCommands(); drawSquads(); }
      show(sheet, building || menu);
      show(buildList, building);
      show(pageDots, building);
      if (building) drawBuildList();
      if (!menu) { shownBar = ""; confirming = false; show(panelRow, false); show(confirmRow, false); show(noticeRow, false); show(sheetTick, false); }
      // ✓ / ✕: choosing a chief, aiming at a villager (✓); placing (✕, back).
      const tick = choosing || picking;
      show(fab, tick || (onMap && w === 3));
      fab.classList.toggle("is-tick", tick);
      fab.setAttribute("aria-label", choosing ? "定为族长" : tick ? "确定" : "返回");
      fab.disabled = choosing ? candidate === 0 : picking ? pickTarget === 0 : false;
      if (choosing) {
        show(actions, false);
        return;
      }
      show(actions, onMap && !building && !menu && !touch.busy);
      if (!onMap) return;
      if (menu) drawBuildingMenu();
      show(left, w === 2 && !building && !menu);
      show(right, w === 2 && !building && !menu);
      show(cancelBox, touch.boxing);
      show(cancel, !touch.boxing && ((w !== 0 && w !== 3) || picking));
      cancel.setAttribute("aria-label", w === 1 ? "取消选择" : "取消");
    },
  };
}
