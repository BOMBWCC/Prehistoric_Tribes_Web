import type { LegacyRuntimeState } from "./core/LegacyRuntimeState";
import { UNIT_NAME } from "./core/DenseLayout";
import { capitalise, originalText } from "./OriginalText";
import type { TouchControls } from "./TouchControls";

/**
 * The notice feed (phase 3, user 2026-10-17; not in the original): a chat-like list under the top
 * bar, at most three lines, newest at the bottom; each line fades out after a few seconds, and a
 * line with a place on the map jumps there when tapped.
 *
 * - Attacks: any blow the enemy or an animal lands on one of our units or buildings, whether or not
 *   it is on screen (the strike gate's observer). A new attack line needs 15 seconds without a blow
 *   first, so one fight does not flood the feed; it blinks while it shows.
 * - Everything else is the original's own message queue, f.a(byte,byte,byte,byte): births and
 *   deaths (with the name), building finished / lost, enemy sighted, need resources, building and
 *   villager limits -- with the original's own texts. Its "under attack" (type 7, only the first
 *   blow of a game) is left to the attack line above.
 * The original's own top-panel messages, the 1 key and the sign-holding villager are unchanged.
 */

const MAX_LINES = 3;
const SHOW_MS = 5000;
const FADE_MS = 600;
const QUIET_MS = 15000;
/** The original repeats some messages while the cause lasts ("need resources!" every 50 frames):
 *  a message without a place is shown again only after this long. */
const REPEAT_MS = 30000;
const ATTACK_TYPE = 7;

/** Queue type -> record of the /s table (f.X(): k[50] = 41 + u[0]); 1/2 and 3/4 follow a name. */
const NAMED_TYPES = new Set([1, 2, 3, 4]);

/** Adds the feed; returns a function that posts a line of text (no place) to it. */
export function attachAlerts(app: HTMLElement, runtime: LegacyRuntimeState, touch: TouchControls): (text: string) => void {
  const feed = document.createElement("div");
  feed.className = "notice-feed";
  feed.setAttribute("role", "log");
  feed.setAttribute("aria-live", "polite");
  app.append(feed);

  const label = (record: number) => originalText(runtime, "s", record);

  const remove = (line: HTMLElement) => {
    line.classList.add("leaving");
    window.setTimeout(() => line.remove(), FADE_MS);
  };

  const lastShown = new Map<string, number>();
  /** The lines on screen by text: the same text again (enemy sighted as a raid comes closer)
   *  refreshes its line and moves its place to the latest one instead of adding a line. */
  const live = new Map<string, { line: HTMLElement; x: number; y: number; timer: number }>();
  const expire = (text: string, entry: { line: HTMLElement }) => {
    if (live.get(text) === entry) live.delete(text);
    remove(entry.line);
  };
  const post = (text: string, x: number, y: number, attack: boolean) => {
    if (!text) return;
    if (x === 0 && y === 0) {
      const now = performance.now();
      if (now - (lastShown.get(text) ?? -Infinity) < REPEAT_MS) return;
      lastShown.set(text, now);
    }
    let entry = live.get(text);
    if (entry) {
      window.clearTimeout(entry.timer);
      entry.x = x;
      entry.y = y;
      live.delete(text);
      live.set(text, entry); // now the newest
      feed.append(entry.line);
    } else {
      const line = document.createElement(x !== 0 || y !== 0 ? "button" : "div");
      line.className = attack ? "notice attack" : "notice";
      line.textContent = text;
      const created = { line, x, y, timer: 0 };
      if (line instanceof HTMLButtonElement) {
        line.type = "button";
        line.addEventListener("click", () => { touch.focus(created.x, created.y); expire(text, created); });
      }
      live.set(text, created);
      feed.append(line);
      entry = created;
      const shown = Array.from(live.entries());
      for (const [oldText, old] of shown.slice(0, Math.max(0, shown.length - MAX_LINES))) {
        window.clearTimeout(old.timer);
        expire(oldText, old);
      }
    }
    const current = entry;
    current.timer = window.setTimeout(() => expire(text, current), SHOW_MS);
  };

  let lastBlow = -Infinity;
  runtime.onTribeAttacked = (x, y) => {
    const now = performance.now();
    const quiet = now - lastBlow >= QUIET_MS;
    lastBlow = now;
    if (quiet) post(capitalise(label(41 + ATTACK_TYPE)), x, y, true);
  };

  runtime.onMessage = (type, x, y, value) => {
    if (type === ATTACK_TYPE || type < 1 || type > 11) return;
    let text = label(41 + type);
    if (NAMED_TYPES.has(type)) text = label(108 + (runtime.denseState[UNIT_NAME + value] ?? 0)) + text;
    post(capitalise(text.trim()), x, y, false);
  };

  // Posted on purpose (e.g. "game saved."): shown every time, not held back like repeats.
  return (text) => { lastShown.delete(text); post(text, 0, 0, false); };
}
