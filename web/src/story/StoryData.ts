import { ZH_LANGUAGE } from "../text/LegacyZhText";

/**
 * The story's words (docs/modernization-plan.md §4.4): `public/i18n/<language>/story.json` holds the
 * segments, each an array of steps -- someone speaking (`speaker`, `pages`), a picture with the
 * narrator's words, a scene played by its name (story/StoryScenes.ts), or `next`, the segment to go
 * on with. `public/i18n/speakers.json` gives each speaker a face (all languages), the language's
 * own `speakers.json` the speaker's name. What is missing is skipped. `scripts/verify-i18n.mjs`
 * checks the files' form. `names.json` is the villagers' name library (`villagerName`).
 */
export type StoryStep =
  | { speaker: string; pages: string[]; picture?: string }
  | { scene: string }
  | { next: string };

export type StoryTexts = {
  story: Record<string, StoryStep[]>;
  names: Record<string, string>;
  faces: Record<string, { face?: string }>;
};

/**
 * The segment the original's dialogue `n` (f.b(int) with n >= 0, tables 310/311) plays, in its order
 * (design/story/README.md lists them). Mission 6 enters with dialogue 55's words over its own picture.
 */
const KEYS = [
  "intro", "cave-awakening", "arrival", "mumbo-hello", "tut-chiefs-hut", "tut-building-site", "tut-skills",
  "tut-more-builders", "tut-stones", "tut-huts-kitchen", "tut-huts", "tut-orders", "tut-find-people",
  "kitchen-built", "tut-mumbo-leaves", "savages-coming", "tut-call-to-arms", "tut-send-back", "close-call",
  "tut-weapons", "tut-chief", "tut-happiness", "tut-upgrade-hut", "armoury-built", "tut-weapon-store",
  "tut-training", "warriors-arrive", "do-better", "peace-talk", "not-friends", "fish-and-hunt", "ready",
  "m2-intro", "enemy-among-us", "cannibals-speak", "fight-back", "raid", "captives", "taken-away",
  "m3-intro", "smell-food", "sabretooth", "enemy-camp", "scout-report", "lure-tiger", "find-captives",
  "rescued", "back-home", "village-flattened", "m4-intro", "rest-stop", "found-cave", "visitors", "news",
  "watering-hole", "m5-intro", "arrival-promised-land", "victory", "barbarians", "ending", "shaman-intro",
  "pia-intro", "shaman-upgraded", "upgrade-kitchen", "upgrade-armoury", "upgrade-gym", "upgrade-disco",
  "upgrade-tower", "upgrade-sanctuary", "upgrade-pia",
];

export function storyKey(dialogue: number, mission: number): string {
  if (dialogue === 55 && mission === 6) return "m6-intro";
  return KEYS[dialogue] ?? "";
}

/** The language folder: Chinese, else English (the original's other languages have no files yet). */
export function languageFolder(language: number): string {
  return language === ZH_LANGUAGE ? "zh-CN" : "en";
}

const loaded = new Map<string, Promise<StoryTexts>>();

async function json<T>(url: string, fallback: T): Promise<T> {
  try {
    const response = await fetch(url);
    return response.ok ? ((await response.json()) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function loadStoryTexts(folder: string): Promise<StoryTexts> {
  let texts = loaded.get(folder);
  if (!texts) {
    texts = Promise.all([
      json(`i18n/${folder}/story.json`, {}),
      json(`i18n/${folder}/speakers.json`, {}),
      json("i18n/speakers.json", {}),
    ]).then(([story, names, faces]) => ({ story, names, faces }));
    loaded.set(folder, texts);
  }
  return texts;
}

/** A language's villager names: the original's /s 107..166 (men) and 167..227 (women), and the
 *  cannibal tribe's leaders' name (its speakers.json). */
export type VillagerNames = { male?: string[]; female?: string[]; cannibal?: string };

const FOLDERS = ["en", "zh-CN"];

/** Every language folder's names, read once at boot (a villager is named the moment it is made). */
export async function loadVillagerNames(): Promise<Record<string, VillagerNames>> {
  const entries = await Promise.all(FOLDERS.map(async (folder) => {
    const [names, speakers] = await Promise.all([
      json<VillagerNames>(`i18n/${folder}/names.json`, {}),
      json<Record<string, string>>(`i18n/${folder}/speakers.json`, {}),
    ]);
    return [folder, { ...names, cannibal: speakers.cannibal }] as const;
  }));
  return Object.fromEntries(entries);
}

/**
 * The name for the original's name index `value` (f.g(int): /s 108 + value): -2 the cannibal
 * tribe's leaders, -1 .. 58 the men's list, 59 .. 119 the women's. From the current language's
 * names, else English's (docs/modernization-plan.md §4.4).
 */
export function villagerName(library: Record<string, VillagerNames>, language: number, value: number): string {
  const pick = (names: VillagerNames | undefined) => {
    if (value === -2) return names?.cannibal;
    const index = value + 1;
    return index < 60 ? names?.male?.[index] : names?.female?.[index - 60];
  };
  return pick(library[languageFolder(language)]) ?? pick(library.en) ?? "";
}
