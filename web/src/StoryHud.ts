import type { LegacyRuntimeState } from "./core/LegacyRuntimeState";
import { OriginalKey } from "./platform/Input";
import { originalText } from "./OriginalText";
import { ZH_LANGUAGE } from "./text/LegacyZhText";
import type { TouchControls } from "./TouchControls";
import type { WideScreen } from "./WideScreen";

/**
 * The story pictures and the dialogue (round 4, user 2026-10-22; design: canvas artboard
 * "剧情与对话", art: docs/hd-art-handoff.md §7). Not in the original: pages over its own screens,
 * showing what it shows in HD and an ordinary font; the original still runs the scenes.
 *
 * - Story (Q 18): the HD picture of the /pi8 entry the original chose fills the screen; below it a
 *   small box with the chapter title on its top edge, the text cut into paragraphs (no scrolling),
 *   dots for the paragraphs, ✓ at the bottom right: the next paragraph, after the last one the
 *   original's FIRE (its next picture).
 * - Dialogue (Q 17, and Q 20: a villager speaking, e.g. "nothing to do here"): the map's animation (WideScreen.dialogue); a box at the bottom with the
 *   speaker's HD face, name and words, ✓ the same way. Shown while the original shows a text (its
 *   f.a(BII) composed the current step's record: resourceSectionW == vInt); steps without one run
 *   on by themselves, as there.
 * - The end of a game (user, 2026-10-26: the end pictures were redrawn): the outcome (Q 24, /t 57
 *   won, 56 lost) as the cut-out end picture (/pi8 10, 11) on the menus' background with its words
 *   in the box; the score (Q 15 after it: d0 234's six rows, ours and the enemy's from f.a:[[S rows
 *   0 / 1, 19..24); "play again?" (Q 16, /t 58) with the menus' YES / NO.
 * A tap anywhere on the page does what ✓ does (one hand), except on "play again?".
 */

const ART = "hd/story/";
type Kind = "story" | "dialogue" | "outcome" | "score" | "again";
const SCORE_TEXT = 71 + 234; // d0 234: the score's row names, '&' between them
const WON = 57;
const AGAIN = 58;
// Characters per paragraph, so that one fits the box (about 4 lines of the box's width).
const STORY_LETTERS = { latin: 120, cjk: 54 };
const DIALOGUE_LETTERS = { latin: 96, cjk: 42 };

/** The text cut at sentence ends into paragraphs of at most `limit` characters (a longer sentence
 *  stays whole and the box grows; a fragment under a third of it, "it...", runs on). */
function paragraphs(text: string, limit: number): string[] {
  const sentences = text.match(/[^.!?。！？]+(?:[.!?。！？]+\s*|$)/g) ?? [text];
  const out: string[] = [];
  for (const sentence of sentences) {
    const last = out.length - 1;
    const room = last >= 0 && (out[last]!.trim().length < limit / 3 || (out[last] + sentence).trim().length <= limit);
    if (room) out[last] += sentence;
    else out.push(sentence);
  }
  return out.map((p) => p.trim()).filter(Boolean);
}

export function attachStoryHud(
  app: HTMLElement,
  runtime: LegacyRuntimeState,
  screen: WideScreen,
  touch: TouchControls,
): { update(): void; covers(): boolean } {
  const game = runtime.game;
  const layer = document.createElement("div");
  layer.className = "story-hud";
  layer.hidden = true;
  app.append(layer);

  let shown = ""; // what the layer was last built for
  let parts: string[] = [];
  let part = 0;
  // When FIRE was sent (in game ticks): taps right after it are dropped, so a double tap cannot skip
  // a text.
  let ticks = 0;
  let pressedTick = -Infinity;
  let pendingFire = false;
  const PRESS_GAP_TICKS = 5; // about 0.6 s

  const next = () => {
    if (layer.dataset.kind === "again") return; // YES / NO only
    if (ticks - pressedTick < PRESS_GAP_TICKS) return;
    if (part < parts.length - 1) {
      part += 1;
      build();
      return;
    }
    pressedTick = ticks;
    // The original ignores keys in a screen's first ticks (f.n:Z): the press waits for them.
    pendingFire = true;
  };
  layer.addEventListener("click", next);

  const text = (cls: string, value: string) => {
    const element = document.createElement("div");
    element.className = cls;
    element.textContent = value;
    return element;
  };

  const tick = '<img class="story-tick" src="hd/ui/btn-tick.png" alt="">';
  const background = '<img class="story-picture" src="hd/menu/bg-menu.jpg" alt="">';

  /** The outcome, the score and "play again?" (see the module's docblock). */
  function buildEnd(kind: Kind): void {
    layer.innerHTML = background;
    const box = document.createElement("div");
    box.className = "story-box";
    if (kind === "outcome") {
      const won = game.vInt === WON;
      layer.insertAdjacentHTML("beforeend", `<img class="end-picture" src="${ART}story-${won ? 10 : 11}.webp" alt="">`);
      box.append(text("story-text", originalText(runtime, "t", game.vInt)));
      box.insertAdjacentHTML("beforeend", tick);
      layer.append(box);
      return;
    }
    if (kind === "score") {
      const names = originalText(runtime, "t", SCORE_TEXT).split("&").map((s) => s.replace(/[\x00-\x1f]/g, "").trim()).filter(Boolean);
      const [ours, theirs] = [0, 1].map((team) => runtime.mainArrays.aShort[team]!);
      box.classList.add("end-score");
      const head = `<div class="end-row head"><img src="hd/ui/pt-chief.png" alt="我方"><span></span><img src="${ART}faces/face-0748.png" alt="敌方"></div>`;
      // The total (row 24) shows as the original draws it, count * 10 + a random last digit
      // (c.a(Graphics,int)); the page's own random, not the game's.
      const value = (row: Int16Array, i: number) => (i === 5 ? (row[24] ?? 0) * 10 + Math.floor(Math.random() * 10) : row[19 + i] ?? 0);
      const rows = names.map((name, i) => `<div class="end-row"><b>${value(ours, i)}</b><span>${name}</span><b>${value(theirs, i)}</b></div>`).join("");
      box.innerHTML = head + rows + tick;
      box.append(text("story-title", originalText(runtime, "s", 97)));
      layer.append(box);
      return;
    }
    // "play again?": the question and the menus' word pictures; YES is the left soft key.
    const art = runtime.language === ZH_LANGUAGE ? "cn" : "en";
    layer.insertAdjacentHTML("beforeend", '<img class="end-logo" src="hd/menu/logo.png" alt="">');
    const column = document.createElement("div");
    column.className = "end-again";
    column.append(text("story-text", originalText(runtime, "t", AGAIN)));
    for (const [word, key] of [["yes", OriginalKey.SOFT_LEFT], ["no", OriginalKey.SOFT_RIGHT]] as const) {
      const button = document.createElement("button");
      button.type = "button";
      button.setAttribute("aria-label", word);
      button.innerHTML = `<img src="hd/menu/words/${art}/${word}.png" alt="">`;
      button.addEventListener("click", (event) => { event.stopPropagation(); touch.pressKey(key); });
      column.append(button);
    }
    layer.append(column);
  }

  function build(): void {
    const story = game.screen === 18;
    const box = document.createElement("div");
    box.className = "story-box";
    if (story) {
      box.append(text("story-text", parts[part] ?? ""));
      const dots = document.createElement("div");
      dots.className = "story-dots";
      dots.innerHTML = parts.length > 1 ? parts.map((_, i) => `<span${i === part ? ' class="on"' : ""}></span>`).join("") : "";
      box.append(dots, text("story-title", originalText(runtime, "s", game.zlDShorts[62] ?? 0)));
    } else {
      const face = `${720 + (game.zlDShorts[58] ?? 0)}`.padStart(4, "0");
      box.insertAdjacentHTML("beforeend", `<img class="story-face" src="${ART}faces/face-${face}.png" alt="">`);
      box.append(text("story-name", originalText(runtime, "s", game.zlDShorts[57] ?? 0)), text("story-text", parts[part] ?? ""));
    }
    box.insertAdjacentHTML("beforeend", '<img class="story-tick" src="hd/ui/btn-tick.png" alt="">');
    const picture = story ? `<img class="story-picture" src="${ART}story-${String(runtime.shownPicture).padStart(2, "0")}.jpg" alt="">` : "";
    layer.innerHTML = picture;
    layer.append(box);
  }

  function update(): void {
    ticks += 1;
    if (pendingFire && !game.nFlag) { pendingFire = false; touch.pressKey(OriginalKey.FIRE); }
    const offMap = game.loopMode !== 1 && !screen.frozen;
    const end: Kind | null = !offMap ? null
      : game.screen === 24 ? "outcome"
      : game.screen === 15 && runtime.shownTextRecord === SCORE_TEXT ? "score"
      : game.screen === 16 && game.vInt === AGAIN ? "again"
      : null;
    if (end) {
      layer.hidden = false;
      layer.dataset.kind = end;
      const key = `${end}:${game.vInt}:${runtime.language}`;
      if (key !== shown) { shown = key; pressedTick = -Infinity; buildEnd(end); }
      return;
    }
    const story = offMap && game.screen === 18;
    const talking = offMap && (game.screen === 17 || game.screen === 20) && game.resourceSectionW === game.vInt;
    layer.hidden = !story && !talking;
    layer.dataset.kind = story ? "story" : "dialogue";
    if (layer.hidden) { shown = ""; return; }
    const record = game.resourceSectionW === game.vInt ? runtime.shownTextRecord : -1;
    const key = `${game.screen}:${record}:${runtime.shownPicture}:${runtime.language}`;
    if (key === shown) return;
    shown = key;
    const letters = story ? STORY_LETTERS : DIALOGUE_LETTERS;
    const words = record >= 0 ? originalText(runtime, "t", record) : "";
    parts = paragraphs(words, runtime.language === ZH_LANGUAGE ? letters.cjk : letters.latin);
    part = 0;
    build();
  }

  // Every page but the dialogue box hides the original's screen.
  return { update, covers: () => !layer.hidden && layer.dataset.kind !== "dialogue" };
}
