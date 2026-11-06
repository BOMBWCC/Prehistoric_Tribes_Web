import type { LegacyRuntimeState } from "./core/LegacyRuntimeState";
import { languageFolder } from "./story/StoryData";

/**
 * The help (user 2026-10-31, BUG-035; not the original's help screen 15, which drew the original's
 * frame and could not be left by touch): a card like the settings' -- the help plate on top, a
 * section's title and one of its pages, ▼ to the next page (after a section's last page the next
 * section, after the last the first again), dots for where it is, ✕ on the top edge back to the game
 * menu. Esc and the phone's back gesture close it too.
 *
 * The words are i18n/<language>/help.json: { "sections": [{ "title": "...", "pages": ["..."] }] }
 * (scripts/verify-i18n.mjs checks it); the pages are written with the game's texts later
 * (docs/texts/inventory.md §2.4) -- until then a section shows its title alone.
 */

type Help = { sections: { title: string; pages: string[] }[] };

/** Adds the card; returns the function that opens it. */
export function attachHelp(app: HTMLElement, runtime: LegacyRuntimeState): () => void {
  const art = (path: string, cls = "") => `<img${cls ? ` class="${cls}"` : ""} src="hd/${path}.webp" alt="">`;
  const dialog = document.createElement("dialog");
  dialog.className = "card help";
  dialog.dataset.uiLabel = "menu.help";
  dialog.innerHTML = `
    <form method="dialog">
      ${art("ui/deco-vine", "deco top")}${art("ui/deco-grass", "deco bottom")}
      <span class="plate">${art("ui/plate-normal")}${art("ui/glyph-help", "glyph")}</span>
      <h2 class="help-title"></h2>
      <p class="help-page"></p>
      <span class="help-dots"></span>
      <button type="button" class="help-next" data-ui-label="a11y.next">${art("ui/btn-next")}</button>
      <button class="corner no" value="close" data-ui-label="a11y.close">${art("ui/btn-close")}</button>
    </form>`;
  const title = dialog.querySelector<HTMLElement>(".help-title")!;
  const page = dialog.querySelector<HTMLElement>(".help-page")!;
  const dots = dialog.querySelector<HTMLElement>(".help-dots")!;

  /** Every page in order: a section with no pages yet is one page with its title alone. */
  let pages: { title: string; text: string }[] = [];
  let at = 0;
  const draw = () => {
    const shown = pages[at] ?? { title: "", text: "" };
    title.textContent = shown.title;
    page.textContent = shown.text;
    dots.innerHTML = pages.map((_, i) => `<span${i === at ? ' class="on"' : ""}></span>`).join("");
  };
  dialog.querySelector(".help-next")!.addEventListener("click", () => { at = (at + 1) % Math.max(1, pages.length); draw(); });

  const load = async (): Promise<void> => {
    let help: Help = { sections: [] };
    try {
      const response = await fetch(`i18n/${languageFolder(runtime.language)}/help.json`);
      if (response.ok) help = await response.json() as Help;
    } catch { /* none: an empty card, still closable */ }
    pages = help.sections.flatMap((section) => (section.pages.length > 0 ? section.pages : [""]).map((text) => ({ title: section.title, text })));
  };

  // Keys pressed in the card must not reach the game (Esc closes the dialog itself).
  dialog.addEventListener("keydown", (event) => event.stopPropagation());
  dialog.addEventListener("keyup", (event) => event.stopPropagation());
  // The back gesture: the card puts an entry in the history (only if the current one is not already
  // the help's) and closes when going back leaves it. Closed another way (✕, Esc), the entry stays
  // and the next opening uses it again -- no history.back() of its own: that went back only a moment
  // later and closed a card opened in between (BUG-036). One back press after ✕ then does nothing.
  window.addEventListener("popstate", () => {
    if (dialog.open && !(history.state as { help?: boolean } | null)?.help) dialog.close();
  });

  app.append(dialog);
  return () => {
    at = 0;
    draw();
    dialog.showModal();
    if (!(history.state as { help?: boolean } | null)?.help) history.pushState({ help: true }, "");
    void load().then(draw);
  };
}
