/**
 * Where the original's own pictures still reach the screen (user, 2026-10-23; not in the original):
 * every /pi0, /pi8, /pi9 image the screen shows is meant to be HD by now, so each draw of one into a
 * canvas that ends up on screen is reported once, with the screen it is on and which picture it is:
 *
 *   [旧素材] 地图 | pi0#7 (22,16 22x16)
 *
 * `where` says what the draws in progress are for (set around the drawing that is shown: the map
 * view, the HUD over it, a screen shown as the original's frame); a canvas counts only once marked
 * `shown` (the offscreen buffers, the frame, the map view, the HUD layer -- not the HD art's own
 * scratch canvases). `window.__oldArt()` lists everything seen so far.
 */

type Seen = { count: number; regions: Set<string> };

const names = new WeakMap<object, string>();
/** where -> picture -> what was seen (two lookups per draw, no strings built once seen). */
const seen = new Map<string, Map<string, Seen>>();
const REGIONS_KEPT = 12;

const entry = (where: string, picture: string): { entry: Seen; first: boolean } => {
  let pictures = seen.get(where);
  if (!pictures) { pictures = new Map(); seen.set(where, pictures); }
  let found = pictures.get(picture);
  const first = !found;
  if (!found) { found = { count: 0, regions: new Set() }; pictures.set(picture, found); }
  return { entry: found, first };
};

export const oldArt = {
  /** What the drawing in progress is shown as, or null while it is not shown. */
  where: null as string | null,

  /** Names an original image (pack and record, e.g. "pi0#7"). */
  name(image: object, name: string): void {
    names.set(image, name);
  },

  /** A draw of `image` (its region sx, sy, w x h) into a shown canvas. */
  report(image: object, sx: number, sy: number, w: number, h: number): void {
    const name = names.get(image);
    if (!name || !oldArt.where) return;
    const { entry: seenIt, first } = entry(oldArt.where, name);
    seenIt.count += 1;
    if (seenIt.regions.size < REGIONS_KEPT) seenIt.regions.add(`${sx},${sy} ${w}x${h}`);
    if (first) console.warn(`[旧素材] ${oldArt.where} | ${name} (${sx},${sy} ${w}x${h})`);
  },

  /** A use of original art outside the canvases (a DOM picture made from it). */
  note(where: string, what: string): void {
    const { entry: seenIt, first } = entry(where, what);
    seenIt.count += 1;
    if (first) console.warn(`[旧素材] ${where} | ${what}`);
  },

  list(): { where: string; picture: string; draws: number; regions: string[] }[] {
    return [...seen].flatMap(([where, pictures]) =>
      [...pictures].map(([picture, found]) => ({ where, picture, draws: found.count, regions: [...found.regions] })));
  },
};

if (typeof window !== "undefined") {
  (window as Window & { __oldArt?: () => unknown }).__oldArt = () => {
    const rows = oldArt.list();
    console.table(rows.map((row) => ({ ...row, regions: row.regions.join("  ") })));
    return rows;
  };
}
