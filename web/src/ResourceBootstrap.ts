import { loadDelimitedResource, type DelimitedTable } from "./platform/DelimitedResource";
import { ImagePack } from "./platform/ImagePack";
import { diagnoseTableA, loadMaResource, type AResourceDiagnostic, type MaResource } from "./platform/BinaryResource";
import { loadMidiResource, type MidiResource } from "./platform/Audio";
import { loadPackedData, type PackedData } from "./platform/PackedData";

export type OriginalResources = {
  readonly languageS: DelimitedTable;
  readonly languageT: DelimitedTable;
  readonly languageD0: DelimitedTable;
  /** All five original language table sets, in JAR language index order. */
  readonly languageTables: readonly OriginalLanguageResources[];
  readonly ma: MaResource;
  readonly tableA: AResourceDiagnostic;
  readonly sa: MidiResource;
  readonly pd0: PackedData;
};

export type OriginalLanguageResources = {
  readonly language: number;
  readonly s: DelimitedTable;
  readonly t: DelimitedTable;
  readonly d0: DelimitedTable;
};

/** Loads only resources whose bytecode-level formats are currently confirmed. */
export async function loadOriginalResources(language = 0, version = "0.1.28"): Promise<OriginalResources> {
  if (!Number.isInteger(language) || language < 0 || language >= 5) {
    throw new RangeError(`Original language index ${language} is outside 0..4`);
  }
  const languageTables = await Promise.all(Array.from({ length: 5 }, (_, index) => loadLanguageTables(index, version)));
  const selected = languageTables[language];
  const [ma, tableA, sa, pd0] = await Promise.all([
    loadMaResource(),
    diagnoseTableA(),
    loadMidiResource(),
    loadPackedData(),
  ]);
  return {
    languageS: selected.s,
    languageT: selected.t,
    languageD0: selected.d0,
    languageTables,
    ma,
    tableA,
    sa,
    pd0,
  };
}

/**
 * The original's image packs (pi0 the sprite sheets, pi9 the colour variants, pi8 the large
 * pictures) -- not part of the game since 2026-10-29: they live in the repository's original/packs/,
 * which only the dev server serves (vite.config.ts), for the tools that measure or export the
 * original's art (scripts/make-catalog.mjs, export-art.mjs) and the oracle.
 */
export async function loadOriginalArt(): Promise<[ImagePack, ImagePack, ImagePack]> {
  return Promise.all([
    ImagePack.load("original/packs/pi0", 31),
    ImagePack.load("original/packs/pi9", 6),
    ImagePack.load("original/packs/pi8", 12),
  ]);
}

async function loadLanguageTables(language: number, version: string): Promise<OriginalLanguageResources> {
  const root = `assets/lang/${language}`;
  const [s, t, d0] = await Promise.all([
    loadDelimitedResource(`${root}/s`, version),
    loadDelimitedResource(`${root}/t`, version),
    loadDelimitedResource(`${root}/d0`, version),
  ]);
  return { language, s, t, d0 };
}
