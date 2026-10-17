import type { LegacyRuntimeState } from "./core/LegacyRuntimeState";
import { OriginalKey } from "./platform/Input";
import { ZH_LANGUAGE } from "./text/LegacyZhText";
import type { TouchControls } from "./TouchControls";
import { stepAs } from "./ui/UiRuntime";
import type { WideScreen } from "./WideScreen";

/**
 * The menus off the map (phase 3, user 2026-10-17 evening; not in the original):
 *
 * - the start-up's language list and "play music?" question are answered from the player's last
 *   choice (English and no music the first time) -- main.ts shows only the game's splash meanwhile;
 * - on the main menu (Q 0), two round toggles at the top right: music (a muted speaker / a playing
 *   one; the original OPTIONS screen's switch, its own f.as()) and language (a British flag /
 *   a Chinese flag; the language the original's list would set: selectLanguage + its text tables,
 *   then the screen redraws itself);
 * - ✓ / ✗ at the parchment's lower corners, only where a screen needs them: ✓ on a yes / no
 *   question (Q 16), ✗ (back) on the other menus, the help pages and the map. They are the left /
 *   right soft keys; the frame's own corner icons are covered (WideScreen.menuFrame).
 */

const LANGUAGE_KEY = "pt.language";
const MUSIC_KEY = "pt.music";
const ENGLISH = 0;

const read = (key: string) => { try { return localStorage.getItem(key); } catch { return null; } };
const write = (key: string, value: string) => { try { localStorage.setItem(key, value); } catch { /* not kept */ } };

/** The original's language list row of the saved language (0 English, 5 Chinese). */
export function savedLanguage(): number {
  return read(LANGUAGE_KEY) === "zh" ? ZH_LANGUAGE : ENGLISH;
}

export function savedMusic(): boolean {
  return read(MUSIC_KEY) === "on";
}

const SPEAKER = (on: boolean) => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4z" fill="#2b1d0e"/>${on
  ? '<path d="M16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" stroke="#2b1d0e" stroke-width="2" fill="none" stroke-linecap="round"/>'
  : '<path d="M16 9l5 6M21 9l-5 6" stroke="#b3261e" stroke-width="2.2" stroke-linecap="round"/>'}</svg>`;
// Round flags, simplified to read at 40 pixels.
const UNION_FLAG = '<svg viewBox="0 0 60 60" aria-hidden="true"><clipPath id="r"><circle cx="30" cy="30" r="30"/></clipPath><g clip-path="url(#r)"><rect width="60" height="60" fill="#012169"/><path d="M0 0L60 60M60 0L0 60" stroke="#fff" stroke-width="12"/><path d="M0 0L60 60M60 0L0 60" stroke="#c8102e" stroke-width="5"/><path d="M30 0v60M0 30h60" stroke="#fff" stroke-width="18"/><path d="M30 0v60M0 30h60" stroke="#c8102e" stroke-width="10"/></g></svg>';
const CHINA_FLAG = '<svg viewBox="0 0 60 60" aria-hidden="true"><circle cx="30" cy="30" r="30" fill="#de2910"/><g fill="#ffde00"><polygon points="17,11 19.6,18.9 27.9,18.9 21.2,23.8 23.7,31.7 17,26.8 10.3,31.7 12.8,23.8 6.1,18.9 14.4,18.9"/><circle cx="31" cy="11" r="2"/><circle cx="35" cy="17" r="2"/><circle cx="35" cy="25" r="2"/><circle cx="31" cy="31" r="2"/></g></svg>';

export function attachMenuHud(
  app: HTMLElement,
  runtime: LegacyRuntimeState,
  screen: WideScreen,
  touch: TouchControls,
): { update(): void } {
  const game = runtime.game;
  const layer = document.createElement("div");
  layer.className = "menu-hud";
  app.append(layer);
  const button = (className: string, label: string) => {
    const element = document.createElement("button");
    element.type = "button";
    element.className = className;
    element.setAttribute("aria-label", label);
    element.hidden = true; // until the first update()
    layer.append(element);
    return element;
  };

  const music = button("menu-toggle", "音乐");
  const language = button("menu-toggle", "语言");
  music.addEventListener("click", () => {
    // f.as() for the OPTIONS row MUSIC (Z = 1), with the menu cursor it reads set for it.
    const cursor = game.Z;
    game.Z = 1;
    stepAs(runtime);
    game.Z = cursor;
    write(MUSIC_KEY, game.eByte !== 0 ? "on" : "off");
    update();
  });
  language.addEventListener("click", () => {
    const next = runtime.language === ZH_LANGUAGE ? ENGLISH : ZH_LANGUAGE;
    runtime.selectLanguage(next);
    runtime.loadLanguageResource(0);
    runtime.loadLanguageResource(1);
    game.H = true; // the screen lays itself out again in the new language
    write(LANGUAGE_KEY, next === ZH_LANGUAGE ? "zh" : "en");
    update();
  });

  const yes = button("menu-corner yes", "确定");
  const back = button("menu-corner back", "返回");
  yes.textContent = "✓";
  back.textContent = "✕";
  touch.bindKey(yes, OriginalKey.SOFT_LEFT);
  touch.bindKey(back, OriginalKey.SOFT_RIGHT);

  /** The parchment's lower corners (the menu box spans x 18..222, its bottom edge y 197). */
  const place = (element: HTMLElement, x: number) => {
    const point = screen.frameToCss(x, 197);
    element.style.left = `${point.x}px`;
    element.style.top = `${point.y}px`;
  };

  function update(): void {
    const offMap = game.loopMode !== 1 && !screen.frozen;
    const mainMenu = offMap && game.screen === 0;
    music.hidden = !mainMenu;
    language.hidden = !mainMenu;
    if (mainMenu) {
      music.innerHTML = SPEAKER(game.eByte !== 0);
      music.setAttribute("aria-pressed", String(game.eByte !== 0));
      language.innerHTML = runtime.language === ZH_LANGUAGE ? CHINA_FLAG : UNION_FLAG;
    }
    const menu = runtime.touchMenuQ === game.screen && runtime.touchMenuRows.length > 0;
    yes.hidden = !(offMap && game.screen === 16);
    back.hidden = !(offMap && game.screen !== 0 && game.screen !== 14 && (menu || [15, 16, 19].includes(game.screen)));
    place(yes, 22);
    place(back, 218);
  }

  return { update };
}
