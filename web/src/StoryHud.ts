import type { LegacyRuntimeState } from "./core/LegacyRuntimeState";
import { OriginalKey } from "./platform/Input";
import { capitalise, messageKey, missionKey, setLabel, ui } from "./text/UiText";
import { legacyDialogueSpeaker, legacyStoryTitle } from "./ui/LegacyFrameCommandChanged";
import { ZH_LANGUAGE } from "./text/LegacyZhText";
import { languageFolder, loadStoryTexts, storyKey, type StoryStep, type StoryTexts } from "./story/StoryData";
import { sceneElement, STORY_SCENES, type StoryScene } from "./story/StoryScenes";
import type { TouchControls } from "./TouchControls";
import { ANIMAL_X, ANIMAL_Y, BLD_KIND, BLD_X, BLD_Y, UNIT_HP, UNIT_PORTRAIT, UNIT_X, UNIT_Y } from "./core/DenseLayout";
import { T_BUILDING } from "./core/DataTables";
import type { WideScreen } from "./WideScreen";

/**
 * The story and the dialogue (docs/modernization-plan.md §4.4; design: canvas artboard "剧情与对话").
 *
 * - A campaign story (the original's f.b(int): Q 18 pictures, Q 17 dialogue) plays the segment
 *   story/StoryData.ts names for it from `i18n/<language>/story.json`, one step after another: a
 *   picture filling the screen with the narrator's words under it, or a box at the bottom with the
 *   speaker's face, name and words over the map as it is (the camera does not move), or a scene by
 *   name over the map (story/StoryScenes.ts). A box shows one page; ▼ (a tap anywhere) the next.
 *   The world waits meanwhile (`step()`, main.ts). After the last step the original's dialogue is
 *   ended in one go -- its last line, then f.U() with what follows it (the next dialogue, the
 *   mission script) -- and the camera put back. The original's own lines, scenes and the camera
 *   moves and actors' poses they made are not played. It fades in (0.3 s; the original closed black
 *   bars over about 8 s first). Where the original's scene 8 moved the camera to show something
 *   (raiders coming, a tiger, a camp ...), a line with › in the notice feed jumps there afterwards.
 * - A villager speaking (Q 20, e.g. "the chief will beat me"): the same box, the original's words;
 *   the game does not wait -- its prompt is answered at once; the box goes at a tap or after 6 s.
 * - The end of a game (user, 2026-10-26: the end pictures were redrawn): the outcome (Q 24, /t 57
 *   won, 56 lost) as the cut-out end picture (/pi8 10, 11) on the menus' background with its words
 *   in the box; the score (Q 15 after it: d0 234's six rows, ours and the enemy's from f.a:[[S rows
 *   0 / 1, 19..24); "play again?" (Q 16, /t 58) with the menus' YES / NO.
 */

const ART = "hd/story/";
type Kind = "outcome" | "score" | "again";
const SCORE_TEXT = 71 + 234; // d0 234: the score's row names (the page that shows them)
const WON = 57;
const AGAIN = 58;
const TAP_GAP_MS = 300; // a double tap does not skip a page
const LEAVE_WAIT_MS = 400; // how long a finished story's last screen waits for the next story
const LEAVE_FADE_MS = 300;

/** A segment's steps with its `next` segments put in their place. */
function expand(story: Record<string, StoryStep[]>, key: string, seen = new Set<string>()): StoryStep[] {
  if (seen.has(key)) return [];
  seen.add(key);
  return (story[key] ?? []).flatMap((step) => ("next" in step ? expand(story, step.next, seen) : [step]));
}

export function attachStoryHud(
  app: HTMLElement,
  runtime: LegacyRuntimeState,
  screen: WideScreen,
  touch: TouchControls,
  notify: (text: string, icon?: string, alert?: boolean, x?: number, y?: number) => void,
): { update(): void; step(): boolean; covers(): boolean } {
  const game = runtime.game;
  const layer = document.createElement("div");
  layer.className = "story-hud";
  layer.hidden = true;
  app.append(layer);
  // A finished story's last screen (BUG-045, user 2026-11-02): it stays under what comes next
  // until the next story's words are up (or LEAVE_WAIT_MS passed), then fades out -- the map does
  // not flash between a picture and the dialogue after it.
  const leaving = document.createElement("div");
  leaving.className = "story-leaving";
  leaving.hidden = true;
  app.append(leaving);
  let leaveTimer = 0;

  let texts: StoryTexts | null = null;
  let textsFolder = "";
  // The story being played: which f.b(int) start, its steps, where it is.
  let playing = 0;
  let finished = 0; // the start the original's dialogue was last ended for
  let finishing = false;
  let steps: StoryStep[] = [];
  let index = 0;
  let page = 0;
  let scene: { def: StoryScene; start: number; view: ReturnType<typeof sceneElement> } | null = null;
  let waiting = false; // a scene's once-through part is playing
  /** Where the original's scene 8 put the camera's middle during this story (null: it did not). */
  let look: { x: number; y: number } | null = null;
  let lastTap = -Infinity;
  // The end pages and a villager speaking answer the original's prompt with FIRE.
  let shown = "";
  let pendingFire = false;
  let reply = "";
  let replyTicks = 0;
  const REPLY_TICKS = 50; // about 6 s: a villager's words close by themselves after this, or at a tap

  const holding = () =>
    runtime.storyStarts !== finished && game.loopMode !== 1 && (game.screen === 17 || game.screen === 18);

  const text = (cls: string, value: string) => {
    const element = document.createElement("div");
    element.className = cls;
    element.textContent = value;
    return element;
  };
  const tick = '<img class="story-tick" src="hd/ui/btn-tick.png" alt="">';
  const background = '<img class="story-picture" src="hd/menu/bg-menu.jpg" alt="">';

  /** The box: face, name, the page, the page dots and ▼. */
  function box(face: string, name: string, pages: readonly string[], at: number): HTMLElement {
    const element = document.createElement("div");
    element.className = "story-box";
    if (face) element.insertAdjacentHTML("beforeend", `<img class="story-face" src="${ART}faces/${face}.png" alt="">`);
    else element.classList.add("no-face");
    if (name) element.append(text("story-name", name));
    element.append(text("story-text", pages[at] ?? ""));
    const dots = document.createElement("div");
    dots.className = "story-dots";
    dots.innerHTML = pages.length > 1 ? pages.map((_, i) => `<span${i === at ? ' class="on"' : ""}></span>`).join("") : "";
    element.append(dots);
    element.insertAdjacentHTML("beforeend", '<img class="story-more" src="hd/ui/btn-next.png" alt="">');
    return element;
  }

  /** Villager `id`'s face by their looks (the original's 720 + dense 2727, d[58]). */
  const villagerFace = (id: number) => `face-${`${720 + (runtime.denseState[UNIT_PORTRAIT + id] ?? 0)}`.padStart(4, "0")}`;
  /**
   * A speaker's face. The tribe's own people show the villager speaking now: the chief whoever is
   * chief, the shaman and the scout the story's cast (p[al], table 311's al: 3 and 4, as the original
   * draws them); with no such villager alive, and for everyone else, speakers.json's face.
   */
  function speakerFace(code: string): string {
    const cast = code === "shaman" ? 3 : code === "scout" ? 4 : -1;
    const id = code === "chief" ? runtime.mainArrays.aShort[0]?.[17] ?? 0 : cast > 0 ? runtime.stateCommandState.p[cast] ?? 0 : 0;
    if (id > 0 && id < 51 && (runtime.denseState[UNIT_HP + id] ?? 0) > 0) return villagerFace(id);
    return texts?.faces[code]?.face ?? "";
  }

  /** The layer for the story's current step (and its scene). */
  function build(): void {
    layer.innerHTML = "";
    layer.hidden = false;
    const step = waiting ? undefined : steps[index];
    const words = step && "pages" in step ? step : null;
    layer.dataset.kind = words?.picture ? "story" : scene ? "scene" : "dialogue";
    if (scene && !words?.picture) layer.append(scene.view.element); // the same element: it moves on
    if (!words) return;
    if (words.picture) layer.insertAdjacentHTML("beforeend", `<img class="story-picture" src="${ART}${words.picture}" alt="">`);
    const face = speakerFace(words.speaker);
    const name = texts?.names[words.speaker] ?? "";
    const element = box(words.picture ? "" : face, words.picture ? "" : name, words.pages, page);
    if (words.picture) element.append(text("story-title", ui(missionKey(legacyStoryTitle(game.mission, runtime.packedBytes, runtime.packedOffsets)))));
    layer.append(element);
  }

  /** From step `index` on: starts a scene, or shows words; past the last step, ends the story. */
  function run(): void {
    for (; index < steps.length; index += 1) {
      const step = steps[index]!;
      if ("scene" in step) {
        const def = STORY_SCENES[step.scene];
        if (!def) continue;
        scene = { def, start: performance.now(), view: sceneElement(def) };
        waiting = true;
        build();
        animate(scene);
        return;
      }
      if ("pages" in step && step.pages.length > 0) {
        page = 0;
        build();
        return;
      }
    }
    scene = null;
    leave();
    layer.hidden = true;
    finishing = true; // the next tick ends the original's dialogue
  }

  /** Moves the scene each display frame while it is the one shown. */
  function animate(shown: NonNullable<typeof scene>): void {
    if (scene !== shown || layer.hidden) return;
    shown.view.draw(performance.now() - shown.start);
    requestAnimationFrame(() => animate(shown));
  }

  function begin(): void {
    playing = runtime.storyStarts;
    const key = storyKey(runtime.stateCommandState.ai, game.mission);
    layer.dataset.segment = key; // for the scenario tests
    steps = texts ? expand(texts.story, key) : [];
    index = 0;
    scene = null;
    waiting = false;
    look = null;
    layer.classList.remove("fade-in");
    void layer.offsetWidth; // restarts the animation
    if (leaving.hidden) layer.classList.add("fade-in"); // else the last screen fades out over it
    run();
    fadeLeaving();
  }

  /** Keeps the story's last screen on top of what follows (the layer's own elements, moved). */
  function leave(): void {
    leaving.replaceChildren(...Array.from(layer.childNodes));
    leaving.dataset.kind = layer.dataset.kind ?? "";
    leaving.classList.remove("fade-out");
    leaving.hidden = false;
    clearTimeout(leaveTimer);
    leaveTimer = window.setTimeout(fadeLeaving, LEAVE_WAIT_MS);
  }

  function fadeLeaving(): void {
    clearTimeout(leaveTimer);
    if (leaving.hidden || leaving.classList.contains("fade-out")) return;
    leaving.classList.add("fade-out");
    leaveTimer = window.setTimeout(() => { leaving.hidden = true; leaving.replaceChildren(); }, LEAVE_FADE_MS);
  }

  /** Scene 8 (docs/modernization-plan.md §5, 2026-10-29): the original moved the camera to what
   *  the words are about -- its line's target an (b(int): p[an], an itself above 100, p[0] for 99, a
   *  building below 0; f(int,int) aims at it) --; that tile is kept for the notice afterwards. */
  function watchScene8(): void {
    const state = runtime.stateCommandState;
    if (state.aS !== 8) return;
    const id = state.an > 100 ? state.an : state.an === 99 ? state.p[0] ?? 0 : state.an > 0 ? state.p[state.an] ?? 0 : state.an === -100 ? 0 : state.an;
    const e = runtime.denseState;
    const table = runtime.packedOffsets[T_BUILDING] ?? 0;
    if (id > 100) look = { x: e[ANIMAL_X + id - 101] ?? 0, y: e[ANIMAL_Y + id - 101] ?? 0 };
    else if (id > 0) look = { x: e[UNIT_X + id] ?? 0, y: e[UNIT_Y + id] ?? 0 };
    else if (id < 0) {
      const kind = e[BLD_KIND - id] ?? 0;
      look = { x: (e[BLD_X - id] ?? 0) + ((runtime.packedBytes[table + 104 + kind] ?? 0) >> 1), y: (e[BLD_Y - id] ?? 0) + ((runtime.packedBytes[table + 130 + kind] ?? 0) >> 1) };
    }
  }

  /** The notice for scene 8: the story's first words, shortened; › jumps to the place. */
  function postLook(): void {
    if (!look) return;
    const first = steps.find((s): s is Extract<StoryStep, { pages: string[] }> => "pages" in s && s.pages.length > 0)?.pages[0] ?? "";
    const words = first.replace(/\s+/g, " ").trim();
    notify(words.length > 28 ? `${words.slice(0, 27)}…` : words, "", false, look.x, look.y);
    look = null;
  }

  /** Ends the original's dialogue: its last line (U() reads its speaker), then f.U(). */
  function finish(): void {
    const state = runtime.stateCommandState;
    const camera = runtime.storyCamera;
    finished = runtime.storyStarts;
    if (state.ak < state.aj - 1) {
      state.ak = state.aj - 2;
      runtime.stepSubsystemStateCommand(-1);
    }
    watchScene8();
    runtime.stepSubsystemStateCommand(-1);
    if (game.mission === camera.mission && (game.cameraColumn !== camera.column || game.cameraRow !== camera.row)) {
      game.cameraColumn = camera.column;
      game.cameraRow = camera.row;
      game.AFlag = true;
    }
    postLook();
  }

  const next = () => {
    const now = performance.now();
    if (now - lastTap < TAP_GAP_MS) return;
    lastTap = now;
    const kind = layer.dataset.kind;
    if (kind === "reply") return;
    if (kind === "outcome" || kind === "score") { pendingFire = true; return; }
    if (kind === "again" || waiting) return; // YES / NO only; a scene plays on
    const step = steps[index];
    if (step && "pages" in step && page < step.pages.length - 1) {
      page += 1;
      build();
      return;
    }
    index += 1;
    run();
  };
  layer.addEventListener("click", next);

  /** The outcome, the score and "play again?" (see the module's docblock). */
  function buildEnd(kind: Kind): void {
    layer.innerHTML = background;
    const box = document.createElement("div");
    box.className = "story-box";
    if (kind === "outcome") {
      const won = game.vInt === WON;
      layer.insertAdjacentHTML("beforeend", `<img class="end-picture" src="${ART}story-${won ? 10 : 11}.webp" alt="">`);
      box.append(text("story-text", ui(won ? "end.won" : "end.lost")));
      box.insertAdjacentHTML("beforeend", tick);
      layer.append(box);
      return;
    }
    if (kind === "score") {
      const names = ["end.population", "end.built", "end.razed", "end.killed", "end.resources", "end.total"].map((key) => ui(key));
      const [ours, theirs] = [0, 1].map((team) => runtime.mainArrays.aShort[team]!);
      box.classList.add("end-score");
      const head = `<div class="end-row head"><img src="hd/ui/pt-chief.png" alt="${ui("a11y.ours")}"><span></span><img src="${ART}faces/face-cannibal.png" alt="${ui("a11y.theirs")}"></div>`;
      // The total (row 24) shows as the original draws it, count * 10 + a random last digit
      // (c.a(Graphics,int)); the page's own random, not the game's.
      const value = (row: Int16Array, i: number) => (i === 5 ? (row[24] ?? 0) * 10 + Math.floor(Math.random() * 10) : row[19 + i] ?? 0);
      const rows = names.map((name, i) => `<div class="end-row"><b>${value(ours, i)}</b><span>${name}</span><b>${value(theirs, i)}</b></div>`).join("");
      box.innerHTML = head + rows + tick;
      box.append(text("story-title", ui("end.score")));
      layer.append(box);
      return;
    }
    // "play again?": the question and the menus' word pictures; YES is the left soft key.
    const art = runtime.language === ZH_LANGUAGE ? "cn" : "en";
    layer.insertAdjacentHTML("beforeend", '<img class="end-logo" src="hd/menu/logo.png" alt="">');
    const column = document.createElement("div");
    column.className = "end-again";
    column.append(text("story-text", ui("end.again")));
    for (const [word, key] of [["yes", OriginalKey.SOFT_LEFT], ["no", OriginalKey.SOFT_RIGHT]] as const) {
      const button = document.createElement("button");
      button.type = "button";
      setLabel(button, word === "yes" ? "a11y.yes" : "a11y.no");
      button.innerHTML = `<img src="hd/menu/words/${art}/${word}.png" alt="">`;
      button.addEventListener("click", (event) => { event.stopPropagation(); touch.pressKey(key); });
      column.append(button);
    }
    layer.append(column);
  }

  /** A villager speaking (Q 20): the box over the live map, closed by a tap on it. */
  function showReply(): void {
    const speaker = legacyDialogueSpeaker(game.am, game.mission, game.screen, game.al, game.ai, runtime.mainArrays.aShort[0]?.[17] ?? 0, runtime.denseState);
    const face = villagerFace(speaker.am);
    // The chief and the shaman by their title (speakers.json), anyone else by their own name.
    const name = speaker.name === 104 || speaker.name === 105 ? texts?.names[speaker.name === 104 ? "chief" : "shaman"] ?? "" : capitalise(runtime.unitNames[speaker.am] ?? "");
    const element = box(face, name, [ui(messageKey(runtime.shownTextRecord))], 0);
    element.addEventListener("click", () => { layer.hidden = true; });
    layer.innerHTML = "";
    layer.append(element);
    layer.dataset.kind = "reply";
    layer.hidden = false;
    replyTicks = REPLY_TICKS;
  }

  function update(): void {
    if (pendingFire && !game.nFlag) { pendingFire = false; touch.pressKey(OriginalKey.FIRE); }
    const folder = languageFolder(runtime.language);
    if (textsFolder !== folder) {
      textsFolder = folder;
      texts = null;
      void loadStoryTexts(folder).then((loaded) => { if (textsFolder === folder) texts = loaded; });
    }
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
      if (key !== shown) { shown = key; buildEnd(end); }
      return;
    }
    shown = "";
    if (holding()) {
      if (playing !== runtime.storyStarts && texts) begin();
      else if (scene && waiting && performance.now() - scene.start >= scene.def.onceMs) { waiting = false; index += 1; run(); }
      watchScene8();
      return;
    }
    if (offMap && game.screen === 20 && game.resourceSectionW === game.vInt) {
      const key = `${game.vInt}:${runtime.shownTextRecord}:${game.am}:${runtime.language}`;
      if (key !== reply) { reply = key; showReply(); pendingFire = true; }
      return;
    }
    if (game.screen !== 20) reply = "";
    if (layer.dataset.kind !== "reply" || replyTicks <= 0) layer.hidden = true;
  }

  /** Each game tick, before the game's own phases: ends a finished story; true while one plays. */
  function step(): boolean {
    if (finishing) { finishing = false; finish(); }
    if (replyTicks > 0) replyTicks -= 1;
    return holding();
  }

  // The end pages and the pictures hide the original's screen; the boxes do not.
  return { update, step, covers: () => !layer.hidden && layer.dataset.kind !== "dialogue" && layer.dataset.kind !== "reply" };
}
