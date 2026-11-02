/**
 * The scenes a story segment plays by name (`{ "scene": "cave-wake" }`, docs/modernization-plan.md §5
 * rounds 2 and 3; what each showed in the original: design/story/README.md). Over the map, played
 * once (`onceMs`, the original's length at 0.12 s a frame), then held while the words that follow
 * show. Moved by code, not drawn frame by frame (user 2026-10-29):
 *
 * - a map scene is one picture (UI design 2026-10-30, hd/story/scenes/scene-<nn>.jpg, 1024 x 1536, the
 *   bottom left for the box) that slowly pushes in; 24 (the quake) shakes instead;
 * - the cave (scenes 1-6) is layered: the cave, the fire's 6 frames in a loop, pairs of eyes (open,
 *   half shut, shut, looking aside) that wake, blink, gather round the chief and walk out of the cave
 *   mouth, and the speech bubbles of hd/cave.
 *
 * When a scene ends, the story code puts the people and buildings where its picture shows them (none
 * do yet: the missions' scripts place their own).
 */
export type StoryScene =
  | { readonly kind: "picture"; readonly picture: string; readonly motion: "push" | "shake"; readonly onceMs: number }
  | { readonly kind: "cave"; readonly pose: CavePose; readonly bubble?: "mumbo" | "chief"; readonly onceMs: number };

/** Where the eyes are: scattered (waking at the start), scattered, walking to the chief, round him, out. */
type CavePose = "wake" | "scattered" | "gather" | "gathered" | "leave";

const ART = "hd/story/scenes/";
const FRAME_MS = 120;
const once = (frames: number) => Math.max(500, frames * FRAME_MS);
const picture = (n: string, frames: number, motion: "push" | "shake" = "push"): StoryScene =>
  ({ kind: "picture", picture: `${ART}scene-${n}.jpg`, motion, onceMs: once(frames) });
const cave = (pose: CavePose, frames: number, bubble?: "mumbo" | "chief"): StoryScene => ({ kind: "cave", pose, bubble, onceMs: once(frames) });

export const STORY_SCENES: Record<string, StoryScene> = {
  "cave-wake": cave("wake", 31),
  "cave-mumbo": cave("scattered", 12, "mumbo"),
  "cave-chief": cave("scattered", 13, "chief"),
  "cave-gather": cave("gather", 14),
  "cave-shout": cave("gathered", 9, "chief"),
  "cave-leave": cave("leave", 15),
  "mumbo-hello": picture("07", 20),
  "peace-talk": picture("10", 20),
  "cannibal-speaks": picture("11", 20),
  raid: picture("12", 70),
  captives: picture("13", 0),
  "taken-away": picture("14", 40),
  "lure-tiger": picture("15", 20),
  "tiger-chase": picture("17", 20),
  "tiger-attack": picture("18", 20),
  reunion: picture("20", 20),
  "village-flattened": picture("21", 35),
  "follow-jafar": picture("22", 1),
  quake: picture("24", 22, "shake"),
  "newcomer-shaman": picture("26a", 5),
  "newcomer-pia": picture("26b", 5),
  "newcomer-shaman-up": picture("26c", 5),
};

// The cave on its 1024 x 1536 picture, in % of it (a phone shows about 15..85 % across): the fire, the
// eye pairs (0 Mumbo, 1 the chief), where they gather (round the chief), the cave mouth they leave by
// and the speech bubbles' bottom middles.
const FIRE = { x: 52, y: 53, w: 24 };
const EYES_W = 10;
const EYES_AT = [[30, 44], [62, 40], [44, 37], [55, 47], [74, 46]] as const;
const GATHERED = [[52, 41], [62, 40], [56, 35], [58, 46], [69, 44]] as const;
const MOUTH = [68, 12] as const;
const BUBBLE = { mumbo: { x: 39, y: 42, src: "hd/cave/bubble-big-left.png" }, chief: { x: 53, y: 38, src: "hd/cave/bubble-big-right.png" } } as const;

/** The element a scene plays in; `draw` moves it to `ms` after the scene started. */
export function sceneElement(scene: StoryScene): { element: HTMLElement; draw(ms: number): void } {
  const element = document.createElement("div");
  element.className = "story-scene";
  if (scene.kind === "picture") {
    const image = document.createElement("img");
    image.className = "story-picture";
    image.src = scene.picture;
    image.alt = "";
    element.append(image);
    return {
      element,
      draw(ms) {
        if (scene.motion === "shake") {
          // Up and down, dying away over the once-through part.
          const left = Math.max(0, 1 - ms / scene.onceMs);
          image.style.transform = `translateY(${(Math.sin(ms / 28) * 1.6 * left).toFixed(2)}%) scale(1.04)`;
        } else {
          // A slow push in: 8 % over 20 s, easing out.
          const t = Math.min(1, ms / 20000);
          image.style.transform = `scale(${(1 + 0.08 * (1 - (1 - t) ** 2)).toFixed(4)})`;
        }
      },
    };
  }
  element.classList.add("cave");
  const stage = document.createElement("div");
  stage.className = "story-cave";
  const layer = (src: string, cls: string) => {
    const image = document.createElement("img");
    image.className = cls;
    image.src = src;
    image.alt = "";
    stage.append(image);
    return image;
  };
  layer(`${ART}cave-bg.jpg`, "cave-bg");
  const fire = layer(`${ART}cave-fire-1.png`, "cave-fire");
  Object.assign(fire.style, { left: `${FIRE.x}%`, top: `${FIRE.y}%`, width: `${FIRE.w}%` });
  const eyes = EYES_AT.map(() => layer(`${ART}cave-eyes-3.png`, "cave-eyes"));
  for (const image of eyes) image.style.width = `${EYES_W}%`;
  const bubble = scene.bubble ? layer(BUBBLE[scene.bubble].src, "cave-bubble") : null;
  if (bubble && scene.bubble) Object.assign(bubble.style, { left: `${BUBBLE[scene.bubble].x}%`, top: `${BUBBLE[scene.bubble].y}%` });
  element.append(stage);
  return {
    element,
    draw(ms) {
      // The pictures switch on the original's 0.12 s frames; the eyes move smoothly.
      const frame = Math.floor(ms / FRAME_MS);
      const fireSrc = `${ART}cave-fire-${(frame % 6) + 1}.png`;
      if (!fire.src.endsWith(fireSrc)) fire.src = fireSrc;
      const t = Math.min(1, ms / scene.onceMs);
      eyes.forEach((image, i) => {
        const [x0, y0] = EYES_AT[i]!;
        const [x1, y1] = GATHERED[i]!;
        const walk = (a: number, b: number, k: number) => a + (b - a) * k;
        let x: number = x0, y: number = y0, size = 1, alpha = 1;
        if (scene.pose === "gather") { x = walk(x0, x1, t); y = walk(y0, y1, t); }
        if (scene.pose === "gathered") { x = x1; y = y1; }
        if (scene.pose === "leave") {
          // One after another, towards the mouth, smaller and fading.
          const k = Math.min(1, Math.max(0, t * 1.6 - i * 0.15));
          x = walk(x1, MOUTH[0], k); y = walk(y1, MOUTH[1], k);
          size = 1 - 0.6 * k;
          alpha = 1 - k;
        }
        // Waking: shut, half, open, one pair after another; then a blink now and then (each pair at
        // its own time), and a look aside while walking.
        const wake = scene.pose === "wake" ? frame - 4 - i * 4 : 99;
        const blink = (frame + i * 7) % 26 === 0;
        const look = (scene.pose === "gather" || scene.pose === "leave") && t < 1 ? 4 : 1;
        const state = wake < 0 ? 3 : wake < 2 ? 2 : blink ? 3 : look;
        const src = `${ART}cave-eyes-${state}.png`;
        if (!image.src.endsWith(src)) image.src = src;
        Object.assign(image.style, { left: `${x}%`, top: `${y}%`, opacity: String(alpha), transform: `translate(-50%, -50%) scale(${size})` });
      });
    },
  };
}
