import type { LegacyRuntimeState } from "./core/LegacyRuntimeState";
import { ui } from "./text/UiText";
import { ZH_LANGUAGE } from "./text/LegacyZhText";
import type { TouchControls } from "./TouchControls";
import { stepAs } from "./ui/UiRuntime";
import { hdArt } from "./render/HdArt";
import type { WideScreen } from "./WideScreen";

/**
 * The start-up picture and the start menus (round 4, user 2026-10-22; design: canvas artboard
 * "开始菜单", art: docs/hd-art-handoff.md §6). Not in the original: a page over the game while the
 * original sits on its main menu (Q 0). The player's choices are then played into the original's
 * own menus (TouchControls.startGame) behind a loading bar, so the game starts exactly as there.
 *
 * - main: CAMPAIGN, CUSTOM, ABOUT (no back button);
 * - CAMPAIGN / CUSTOM: CONTINUE / NEW GAME when that mode has a save, else straight on; NEW GAME asks
 *   the original's "... will be lost! continue?" (YES / NO); then EASY / HARD; custom then the map;
 *   custom is open from the start (user 2026-11-03; the original wanted the tutorial passed first);
 * - ABOUT: empty for now;
 * - language flag and sound at the top right, back at the bottom right, on every page but the
 *   splash and the loading bar. The loading bar takes at least LOADING_MS (user: entering the game
 *   is so quick it feels abrupt) and until every HD picture is loaded (BUG-057, user 2026-11-03:
 *   none fetched while playing); they start loading with the splash, the game only after them.
 *
 * The start-up's language list and "play music?" are still answered from the last choice
 * (TouchControls.answerStartQuestions) while the splash is shown.
 */

const ART = "hd/menu/";
const LANGUAGE_KEY = "pt.language";
const MUSIC_KEY = "pt.music";
/** One row per language: the stored code, the art folder (flag-<art>.webp, words/<art>/), and the
 *  original's language list row. Adding a language is a row here plus its pictures. */
const LANGUAGES = [
  { code: "en", art: "en", row: 0 },
  { code: "zh", art: "cn", row: ZH_LANGUAGE },
] as const;
const LOADING_MS = 1500;
/** Where each cloud is on its way across at the start, in seconds of its drift (styles.css). */
const CLOUD_START_S = [100, 75, 30, 60];
const MAPS = 5; // the custom maps, q 7..11 (the original's Q 9 list)
/** Each map card's picture and, until it has loaded, its main colour (the picture's average). */
const MAP_PICTURE = (index: number) => `${ART}maps/map-${index + 1}.webp`;
const MAP_COLOURS = ["#257479", "#938412", "#449415", "#449515", "#469514"];

const read = (key: string) => { try { return localStorage.getItem(key); } catch { return null; } };
const write = (key: string, value: string) => { try { localStorage.setItem(key, value); } catch { /* not kept */ } };

/** The original's language list row of the saved language (English the first time). */
export function savedLanguage(): number {
  return (LANGUAGES.find((l) => l.code === read(LANGUAGE_KEY)) ?? LANGUAGES[0]).row;
}

export function savedMusic(): boolean {
  return read(MUSIC_KEY) === "on";
}

type Page = "splash" | "main" | "mode" | "question" | "difficulty" | "maps" | "about" | "loading";

export function attachStartMenu(
  app: HTMLElement,
  runtime: LegacyRuntimeState,
  screen: WideScreen,
  touch: TouchControls,
): { update(): void; covers(): boolean } {
  const game = runtime.game;
  const layer = document.createElement("div");
  layer.className = "start-menu";
  app.append(layer);

  let page: Page | null = "splash";
  const history: Page[] = [];
  let custom = false;
  let difficulty: 1 | 2 = 1;
  let loadingStart = 0;
  let started = false;
  void hdArt.preloadAll();

  const language = () => LANGUAGES.find((l) => l.row === runtime.language) ?? LANGUAGES[0];
  const picture = (name: string, cls: string) => `<img class="${cls}" src="${ART}${name}" alt="" draggable="false">`;

  const button = (cls: string, label: string, html: string, onClick: () => void) => {
    const element = document.createElement("button");
    element.type = "button";
    element.className = cls;
    element.setAttribute("aria-label", label);
    element.innerHTML = html;
    element.addEventListener("click", onClick);
    return element;
  };
  const word = (key: string, onClick: () => void) =>
    button("start-item", key, picture(`words/${language().art}/${key}.webp`, "start-word"), onClick);

  const go = (next: Page) => { if (page) history.push(page); show(next); };
  const back = () => show(history.pop() ?? "main");

  const hasSave = () => (custom ? game.actionWFlag : game.sByte > -1);
  const choose = (isCustom: boolean) => {
    custom = isCustom;
    go(hasSave() ? "mode" : "difficulty");
  };
  const start = (resume: boolean, map = 0) => {
    history.length = 0;
    started = false;
    void hdArt.preloadAll().then(() => { started = true; touch.startGame({ custom, resume, difficulty, map }); });
    loadingStart = performance.now();
    show("loading");
    requestAnimationFrame(fill);
  };

  const toggleMusic = () => {
    // f.as() for the OPTIONS row MUSIC (Z = 1), with the menu cursor it reads set for it.
    const cursor = game.Z;
    game.Z = 1;
    stepAs(runtime);
    game.Z = cursor;
    write(MUSIC_KEY, game.eByte !== 0 ? "on" : "off");
    show(page!);
  };
  const nextLanguage = () => {
    const next = LANGUAGES[(LANGUAGES.indexOf(language()) + 1) % LANGUAGES.length];
    runtime.selectLanguage(next.row);
    runtime.loadLanguageResource(0);
    runtime.loadLanguageResource(1);
    game.H = true; // the original's own screens lay themselves out again in the new language
    write(LANGUAGE_KEY, next.code);
    show(page!);
  };

  const message = (key: string) => {
    const text = document.createElement("p");
    text.className = "start-text";
    text.textContent = ui(key);
    return text;
  };
  const column = (...items: HTMLElement[]) => {
    const element = document.createElement("div");
    element.className = "start-column";
    element.append(...items);
    return element;
  };
  const mapCard = (index: number) => {
    const badge = Array.from(String(index + 1), (c) => `<img src="hd/ui/digit-${c}.webp" alt="">`).join("");
    const card = button("start-map", ui("start.map", { n: index + 1 }),
      `<img class="start-map-picture" src="${MAP_PICTURE(index)}" alt="" draggable="false"><span class="start-map-number">${badge}</span>`,
      () => start(false, index));
    card.style.background = MAP_COLOURS[index] ?? "";
    // Fades in once loaded (preloaded below, so usually at once).
    const shot = card.querySelector<HTMLImageElement>(".start-map-picture")!;
    if (shot.complete && shot.naturalWidth > 0) shot.classList.add("loaded");
    else shot.addEventListener("load", () => shot.classList.add("loaded"), { once: true });
    return card;
  };
  // The map cards' pictures load while the splash and the menus are up (user, 2026-10-23), so the
  // map page does not open on empty cards.
  for (let i = 0; i < MAPS; i += 1) new Image().src = MAP_PICTURE(i);

  /** The clouds over the cloudless sky (user 2026-10-28, UI design 2026-10-29): a CSS drift, each
   *  cloud started where it would be by now, so a new page does not put them back. */
  function clouds(): HTMLElement {
    const sky = document.createElement("div");
    sky.className = "start-clouds";
    for (let i = 1; i <= 4; i += 1) {
      const cloud = document.createElement("img");
      cloud.className = `start-cloud c${i}`;
      cloud.src = `${ART}cloud-${i}.webp`;
      cloud.alt = "";
      cloud.draggable = false;
      cloud.style.animationDelay = `${-(performance.now() / 1000 + CLOUD_START_S[i - 1]!)}s`;
      sky.append(cloud);
    }
    return sky;
  }

  function show(next: Page | null): void {
    page = next;
    layer.hidden = next === null;
    layer.dataset.page = next ?? "";
    if (next === null) return;
    layer.replaceChildren();
    layer.insertAdjacentHTML("beforeend", picture(next === "splash" ? "bg-splash.jpg" : "bg-menu-sky.jpg", "start-bg"));
    if (next !== "splash") layer.append(clouds());
    layer.insertAdjacentHTML("beforeend", picture("logo.webp", "start-logo"));
    if (next === "splash") {
      layer.insertAdjacentHTML("beforeend", picture("chars.webp", "start-chars"));
      return;
    }
    if (next === "loading") {
      layer.insertAdjacentHTML("beforeend",
        `<div class="start-loading">${picture("loading-empty.webp", "")}<div class="start-loading-fill">${picture("loading-full.webp", "")}</div></div>`);
      return;
    }

    if (next === "main") layer.append(column(word("campaign", () => choose(false)), word("custom", () => choose(true)), word("about", () => go("about"))));
    else if (next === "mode") layer.append(column(word("continue", () => start(true)), word("newgame", () => go("question"))));
    else if (next === "question") {
      layer.append(column(message(custom ? "confirm.save" : "confirm.newCampaign"), word("yes", () => go("difficulty")), word("no", back)));
    }
    else if (next === "difficulty") {
      const pick = (level: 1 | 2) => () => { difficulty = level; if (custom) go("maps"); else start(false); };
      layer.append(column(word("easy", pick(1)), word("hard", pick(2))));
    } else if (next === "maps") {
      const list = document.createElement("div");
      list.className = "start-maps";
      for (let i = 0; i < MAPS; i += 1) list.append(mapCard(i));
      layer.append(list);
    } else if (next === "about") {
      layer.insertAdjacentHTML("beforeend", `<div class="start-column">${picture(`words/${language().art}/about.webp`, "start-word")}</div>`);
    }

    const corner = document.createElement("div");
    corner.className = "start-corner";
    corner.append(
      button("start-round", ui("a11y.language"), picture(`flag-${language().art}.webp`, ""), nextLanguage),
      button("start-round", ui(game.eByte !== 0 ? "a11y.soundOn" : "a11y.soundOff"), picture(game.eByte !== 0 ? "sound-on.webp" : "sound-off.webp", ""), toggleMusic),
    );
    layer.append(corner);
    if (next !== "main") layer.append(button("start-back", ui("a11y.back"), picture("back.webp", ""), back));
  }

  /** The loading bar: fills over LOADING_MS at the least, as far as the pictures are loaded (most of
   *  it), and waits short of the end until the game is on. */
  function fill(): void {
    if (page !== "loading") return;
    const ready = started && !touch.busy;
    const part = Math.min((performance.now() - loadingStart) / LOADING_MS, ready ? 1 : 0.9 * hdArt.preloaded());
    const bar = layer.querySelector<HTMLElement>(".start-loading-fill");
    if (bar) bar.style.width = `${part * 100}%`;
    if (part >= 1) show(null);
    else requestAnimationFrame(fill);
  }

  /** Called every frame: the menu comes back whenever the original is on its main menu. */
  function update(): void {
    const mainMenu = game.loopMode !== 1 && game.screen === 0 && !screen.frozen;
    if (page === "loading") return;
    // At once, not after the touch script that got here (quit) ends: its last ticks showed the
    // original's main menu for a moment (user, 2026-10-27).
    if (page === null) { if (mainMenu) show("main"); return; }
    if (page === "splash") { if (mainMenu) show("main"); else if (game.loopMode === 1) show(null); return; }
    if (!mainMenu) show(null); // the keyboard took the original's own menus elsewhere
  }

  show("splash");
  return { update, covers: () => page !== null };
}
