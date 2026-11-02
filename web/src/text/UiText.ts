/**
 * The web UI's words (docs/texts/inventory.md §6): `public/i18n/<language>/ui.json`, groups of named
 * texts, `ui("chief.prompt")`; `{name}` in a text is filled from `values`. A key the current
 * language lacks shows in English, one English lacks as the key itself. `scripts/verify-i18n.mjs`
 * checks the files and that every key the code uses is there.
 */
export type UiTexts = Record<string, Record<string, string>>;

const FOLDERS = ["en", "zh-CN"];
let library: Record<string, UiTexts> = {};
let folder = () => "en";

/** Every language's ui.json, read once at boot; `current` names the current language's folder. */
export async function loadUiTexts(current: () => string): Promise<void> {
  folder = current;
  const entries = await Promise.all(FOLDERS.map(async (name) => {
    try {
      const response = await fetch(`i18n/${name}/ui.json`);
      return [name, response.ok ? ((await response.json()) as UiTexts) : {}] as const;
    } catch {
      return [name, {}] as const;
    }
  }));
  library = Object.fromEntries(entries);
}

export function ui(key: string, values: Record<string, string | number> = {}): string {
  const [group = "", name = ""] = key.split(".");
  const text = library[folder()]?.[group]?.[name] ?? library.en?.[group]?.[name] ?? key;
  return text.replace(/\{(\w+)\}/g, (all, value: string) => (value in values ? String(values[value]) : all));
}

/**
 * Puts the words on `root`'s elements built once (the HUD's buttons, the settings): `data-ui` the
 * key of their text, `data-ui-label` of their aria-label, `data-ui-values` the values (JSON). Run
 * once the UI is built and again whenever the language changes (StartMenu).
 */
export function translate(root: ParentNode = document): void {
  for (const element of Array.from(root.querySelectorAll<HTMLElement>("[data-ui], [data-ui-label]"))) {
    const values = element.dataset.uiValues ? (JSON.parse(element.dataset.uiValues) as Record<string, string | number>) : {};
    if (element.dataset.ui) element.textContent = ui(element.dataset.ui, values);
    if (element.dataset.uiLabel) element.setAttribute("aria-label", ui(element.dataset.uiLabel, values));
  }
}

/** Gives `element` the aria-label of `key` (kept for translate()). */
export function setLabel(element: HTMLElement, key: string, values?: Record<string, string | number>): void {
  element.dataset.uiLabel = key;
  if (values) element.dataset.uiValues = JSON.stringify(values);
  element.setAttribute("aria-label", ui(key, values));
}

/** Villager names are lower case (names.json, as the original's); the UI starts them with a capital. */
export function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

// The original's numbers, where it picks its words by them, as ui.json's keys.
/** Building kinds 0..11 (/s 0..11). */
export const BUILDING_KEYS = ["buildings.armoury", "buildings.gym", "buildings.hut", "buildings.chiefsHut", "buildings.kitchen", "buildings.range",
  "buildings.store", "buildings.disco", "buildings.sanctuary", "buildings.pia", "buildings.nursery", "buildings.tower"];
/** /s 12..40: the weapons and traps, then the commands (Hud.ts itemName). */
const LABEL_KEYS = [
  "items.club", "items.stone", "items.spear", "items.stoneAxe", "items.boneMace", "items.tomahawk", "items.netTrap", "items.springTrap", "items.pitTrap",
  "commands.build", "commands.formUp", "commands.callToArms", "commands.villagers", "commands.dismiss", "commands.backToWork", "commands.upgrade",
  "commands.demolish", "commands.getOut", "commands.healing", "commands.defence", "commands.lovePotion", "commands.disease", "commands.infoAll",
  "commands.infoSelected", "commands.infoNone", "commands.repair", "commands.cancelUpgrade", "commands.cancelRepair", "commands.unload",
];
export const labelKey = (record: number) => LABEL_KEYS[record - 12] ?? "";
/** The message queue's types 1..11 (/s 41 + type; Alerts.ts): 1/2 born, 3/4 dead, then the rest. */
export const ALERT_KEYS = [
  "", "alerts.born", "alerts.born", "alerts.dead", "alerts.dead", "alerts.buildingReady", "alerts.enemySighted", "alerts.underAttack",
  "alerts.buildingLost", "alerts.needResources", "alerts.maxBuildings", "alerts.maxVillagers",
];
/** /t 12..37: the villagers' replies (Q 20), then the building sheet's lines (/t 33 + l(int)'s number). */
const MESSAGE_KEYS = [
  "replies.starving", "replies.noRoom", "replies.depressed", "replies.needShaman", "replies.enemyHere", "replies.beingEaten", "replies.needMelee",
  "replies.needThrowing", "replies.noSpear", "replies.notAChild", "replies.chiefWillHit", "replies.childLabour", "replies.leaveMeAlone",
  "replies.privacy", "replies.hungry", "replies.tired", "replies.childEaten", "replies.childStolen", "replies.chiefDead",
  "replies.talkingToMyself", "replies.cartographer",
  "panel.placeBuilding", "panel.selectVillager", "panel.selectPlace", "panel.demolish", "panel.nothingHere",
];
export const messageKey = (record: number) => MESSAGE_KEYS[record - 12] ?? "";
/** The story pictures' titles (/s 82..91; 103 "the end", StoryHud). */
const MISSION_KEYS = [
  "missions.outside", "missions.revenge", "missions.escape", "missions.wastelands", "missions.newHome", "missions.greatLake",
  "missions.desertPass", "missions.forestBelt", "missions.slaughter", "missions.plotOfLand",
];
export const missionKey = (record: number) => (record === 103 ? "missions.theEnd" : MISSION_KEYS[record - 82] ?? "");
