import type { LegacyRuntimeState } from "./core/LegacyRuntimeState";
import { ZH_LANGUAGE } from "./text/LegacyZhText";

/**
 * A record of the original's /s (labels) or /t (messages) table in the current language, as plain
 * text for the web UI (/t records from 71 on are /d0's, the story and dialogue, as c.b() loads them): the Chinese string when Chinese is chosen, else the original's own bytes
 * without their control characters (a leading space stays: " is born" follows a name).
 */
export function originalText(runtime: LegacyRuntimeState, table: "s" | "t", record: number): string {
  if (runtime.language === ZH_LANGUAGE && runtime.zhStrings) {
    const zh = table === "s" ? runtime.zhStrings.label(record) : runtime.zhStrings.paragraph(record);
    if (zh) return zh;
  }
  const resources = runtime.languageResources;
  const bytes = table === "t" && record >= 71 ? resources?.d0[record - 71] : resources?.[table][record];
  return bytes ? String.fromCharCode(...bytes).replace(/[\x00-\x1f]/g, "").trimEnd() : "";
}

/** The original's texts are lower case; the web UI starts them with a capital. */
export function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}
