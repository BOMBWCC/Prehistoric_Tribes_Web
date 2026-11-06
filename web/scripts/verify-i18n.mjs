// Checks the form of the story texts in public/i18n (docs/modernization-plan.md §4.4): every file
// reads as JSON, every step is written one of the ways story/StoryData.ts takes, names.json has its
// two lists, help.json its sections (title, pages), ui.json its groups of texts with every key the
// code uses (text/UiText.ts) and `{name}` placeholders as English's, and the speakers, scenes and `next` segments named exist. Not the words: their length and wording are checked by
// playing. `node scripts/verify-i18n.mjs` (also part of `npm test`).
import fs from "node:fs";
import path from "node:path";
import { STORY_SCENES } from "../src/story/StoryScenes.ts";

const dir = new URL("../public/i18n/", import.meta.url).pathname;
const errors = [];
const read = (file, optional = false) => {
  if (optional && !fs.existsSync(path.join(dir, file))) return null;
  try {
    return JSON.parse(fs.readFileSync(path.join(dir, file), "utf8"));
  } catch (error) {
    errors.push(`${file}: ${error.message}`);
    return null;
  }
};
const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const isText = (value) => typeof value === "string" && value.trim() !== "";

const faces = read("speakers.json") ?? {};
if (!isObject(faces)) errors.push("speakers.json: not an object");
for (const [code, entry] of Object.entries(faces)) {
  if (!isObject(entry) || (entry.face !== undefined && !isText(entry.face))) errors.push(`speakers.json: ${code}: {} or { "face": "..." }`);
  else if (entry.face && !fs.existsSync(path.join(dir, `../hd/story/faces/${entry.face}.webp`))) errors.push(`speakers.json: ${code}: no picture hd/story/faces/${entry.face}.webp`);
}

// The ui.json keys the code uses: every "group.name" string in src/ whose group is one of English's.
const englishUi = read("en/ui.json") ?? {};
const placeholders = (text) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(",");
const src = new URL("../src/", import.meta.url).pathname;
const uiKeys = new Set();
for (const file of fs.readdirSync(src, { recursive: true }).filter((name) => name.endsWith(".ts"))) {
  for (const [, key, group] of fs.readFileSync(path.join(src, file), "utf8").matchAll(/["'`]((\w+)\.\w+)["'`]/g)) if (isObject(englishUi[group])) uiKeys.add(key);
}

// Chinese files use full-width punctuation (user 2026-10-31): no half-width ! ? , in their texts,
// except between two ASCII letters or digits ("3,5").
const halfWidth = (value, at) => {
  if (typeof value === "string") {
    if (/[!?,]/.test(value.replace(/(?<=[A-Za-z0-9])[!?,](?=[A-Za-z0-9])/g, ""))) errors.push(`${at}: half-width ! ? , in "${value}"`);
  } else if (value && typeof value === "object") for (const [key, inner] of Object.entries(value)) halfWidth(inner, `${at}.${key}`);
};

for (const language of fs.readdirSync(dir).filter((name) => fs.statSync(path.join(dir, name)).isDirectory())) {
  const names = read(`${language}/speakers.json`, true);
  if (names && (!isObject(names) || !Object.values(names).every(isText))) errors.push(`${language}/speakers.json: { "code": "name" }`);
  for (const code of Object.keys(names ?? {})) if (!(code in faces)) errors.push(`${language}/speakers.json: ${code} is not in speakers.json`);
  const library = read(`${language}/names.json`, true);
  if (library && !(isObject(library) && ["male", "female"].every((list) => Array.isArray(library[list]) && library[list].every(isText)))) errors.push(`${language}/names.json: { "male": [names], "female": [names] }`);
  // help.json (HelpCard.ts): { "sections": [{ "title": "...", "pages": ["..."] }] }, the pages may still be empty.
  const help = read(`${language}/help.json`, true);
  if (help && !(isObject(help) && Array.isArray(help.sections) && help.sections.length > 0
    && help.sections.every((section) => isObject(section) && isText(section.title) && Array.isArray(section.pages) && section.pages.every(isText))))
    errors.push(`${language}/help.json: { "sections": [{ "title": "...", "pages": ["...", ...] }] }`);
  const texts = read(`${language}/ui.json`, true);
  if (texts) {
    if (!(isObject(texts) && Object.values(texts).every((group) => isObject(group) && Object.values(group).every(isText)))) errors.push(`${language}/ui.json: { "group": { "name": "text" } }`);
    for (const key of uiKeys) if (typeof texts[key.split(".")[0]]?.[key.split(".")[1]] !== "string") errors.push(`${language}/ui.json: no "${key}" (used in src/)`);
    for (const [group, names] of Object.entries(texts)) for (const [name, text] of Object.entries(isObject(names) ? names : {})) {
      if (typeof text !== "string") continue;
      if (/[{}]/.test(text.replace(/\{\w+\}/g, ""))) errors.push(`${language}/ui.json: ${group}.${name}: a placeholder is written {name}`);
      const english = englishUi?.[group]?.[name];
      if (typeof english === "string" && placeholders(text) !== placeholders(english)) errors.push(`${language}/ui.json: ${group}.${name}: placeholders ${placeholders(text)} are not English's ${placeholders(english)}`);
    }
  }
  if (language.startsWith("zh")) for (const [file, value] of [["speakers.json", names], ["names.json", library], ["ui.json", texts], ["help.json", help]]) halfWidth(value, `${language}/${file}`);
  const story = read(`${language}/story.json`, true);
  if (story && language.startsWith("zh")) halfWidth(story, `${language}/story.json`);
  if (!story) continue;
  if (!isObject(story)) { errors.push(`${language}/story.json: not an object`); continue; }
  for (const [key, steps] of Object.entries(story)) {
    const at = `${language}/story.json: ${key}`;
    if (!Array.isArray(steps)) { errors.push(`${at}: not an array of steps`); continue; }
    steps.forEach((step, i) => {
      const where = `${at}[${i}]`;
      const fields = isObject(step) ? Object.keys(step).sort().join(",") : "";
      if (fields === "scene") {
        if (!(step.scene in STORY_SCENES)) errors.push(`${where}: no scene "${step.scene}" (story/StoryScenes.ts)`);
      } else if (fields === "next") {
        if (!(step.next in story)) errors.push(`${where}: no segment "${step.next}"`);
        if (i !== steps.length - 1) errors.push(`${where}: "next" must be the last step`);
      } else if (fields === "pages,speaker" || fields === "pages,picture,speaker") {
        if (!(step.speaker in faces)) errors.push(`${where}: no speaker "${step.speaker}" in speakers.json`);
        if (!Array.isArray(step.pages) || step.pages.length === 0 || !step.pages.every(isText)) errors.push(`${where}: "pages" must be a list of texts`);
        if (step.picture && !fs.existsSync(path.join(dir, `../hd/story/${step.picture}`))) errors.push(`${where}: no picture hd/story/${step.picture}`);
        if (step.picture !== undefined && (!isText(step.picture) || !fs.existsSync(path.join(dir, `../hd/story/${step.picture}`)))) errors.push(`${where}: no picture hd/story/${step.picture}`);
      } else {
        errors.push(`${where}: expected { speaker, pages }, { picture, speaker, pages }, { scene } or { next }`);
      }
    });
  }
}

for (const error of errors) console.error(error);
if (errors.length) process.exit(1);
console.log("i18n: ok");
