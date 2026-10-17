import type { DelimitedTable } from "./DelimitedResource";
import type { ZhToken } from "../text/LegacyZhText";

/** Allocation-level mirror of c's decoded resource buffers. */
export class LegacyResourceTables {
  readonly smallBytes = new Int8Array(1674);
  readonly smallOffsets = new Int16Array(230);
  readonly largeBytes = new Int8Array(37488);
  readonly largeOffsets = new Int16Array(310);

  /** c.g:I (#52) -- last section argument passed to c.a(int). */
  sectionArg = 0;
  /** c.c:I (#39) -- scratch/result of c.a(int)'s threshold scan. */
  sectionScan = 0;
  /** c.f:I (#49), the loaded section; c.a(int) reloads (c.b(2)) when it changes. The constructor sets -1 (c-javap offset 130..132), so the first c.a(int) always loads d0. */
  currentSection = -1;

  // c.a[0] aliases the small view; c.a[1] and c.a[2] alias the large view.
  readonly byteViews = [this.smallBytes, this.largeBytes, this.largeBytes] as const;
  readonly offsetViews = [this.smallOffsets, this.largeOffsets, this.largeOffsets] as const;

  // c fields allocated by e.e(); names retain the original field families.
  readonly geometryB = byteMatrix(33, 25);
  readonly geometryC = byteMatrix(33, 25);
  readonly rowDByte = new Int8Array(33);
  readonly rowEByte = new Int8Array(33);
  readonly rowDShort = new Int16Array(33);
  readonly rowEShort = new Int16Array(33);
  readonly rowFShort = new Int16Array(33);
  /** Not in the original: a row's Chinese tokens (rows 0..12), drawn instead of its glyphs. */
  readonly rowZh: (readonly ZhToken[] | null)[] = new Array(33).fill(null);
  /**
   * c.f:[B (#51) -- 122 bytes, allocated by `e.e()` alongside its siblings
   * (bytecode/e-javap.txt offset 31..35, `bipush 122; newarray byte`).
   * Added 2026-09-04 with the retraction below.
   */
  readonly rowFByte = new Int8Array(122);
  /** c.b:B (#33) -- ring-buffer end cursor, reset by c.a(). */
  cBByte = 0;
  /** c.c:B (#38) -- ring-buffer start cursor, reset by c.a(). */
  cCByte = 0;
  readonly geometryG = new Int16Array(250);
  readonly geometryH = new Int16Array(250);

  /**
   * Mirror c.b(int): delimiters define destination offsets while every source
   * byte is translated through f.a[f.b[280] + byte] before storage.
   */
  loadTranslatedRecords(
    view: 0 | 1 | 2,
    records: DelimitedTable,
    translationBytes: Int8Array,
    translationOffset: number,
    startRecord = 0,
  ): number {
    if (!Number.isInteger(translationOffset) || translationOffset < 0) throw new RangeError("Invalid translation-table offset");
    const bytes = this.byteViews[view];
    const offsets = this.offsetViews[view];
    let cursor = startRecord === 0 ? 0 : offsets[startRecord];
    let recordIndex = startRecord;
    if (recordIndex < 0 || recordIndex >= offsets.length) throw new RangeError("Invalid resource record index");
    offsets[recordIndex] = cursor;
    for (const record of records) {
      if (recordIndex >= offsets.length - 1) throw new RangeError("Decoded resource offsets exceed c's table");
      if (cursor + record.length > bytes.length) throw new RangeError("Decoded resource exceeds c's byte buffer");
      for (const sourceByte of record) {
        const translationIndex = translationOffset + sourceByte;
        if (translationIndex < 0 || translationIndex >= translationBytes.length) {
          throw new RangeError("Translated resource byte exceeds f.a");
        }
        bytes[cursor] = translationBytes[translationIndex];
        cursor += 1;
      }
      recordIndex += 1;
      offsets[recordIndex] = cursor;
    }
    return recordIndex;
  }
}

/**
 * Raw port of `final void a(int)` (bytecode/c-javap.txt offsets 0..110):
 * a linear scan through the `/a[308..309]` threshold table finding which
 * section bucket `arg1` falls into, reloading section-2 language records
 * (`c.b(2)`, already ported as `loadLanguageResource(2)`) only when the
 * selected section actually changes. `c.a:[S]`/`c.a:[B]` (constant-pool
 * #24/#22 in class c's own numbering) are the SAME shared `packedOffsets`/
 * `packedBytes` used everywhere else in this project -- class c holds a
 * reference to the same `/a` table, not its own copy.
 */
export function selectLegacyResourceSection(
  tables: LegacyResourceTables,
  packedBytes: Int8Array,
  packedOffsets: Int16Array,
  arg1: number,
  onFReset: () => void,
  onSectionReload: () => void,
): void {
  onFReset(); // f.w:I = -1
  tables.sectionArg = arg1;

  let scan = packedOffsets[308] ?? 0;
  const limit = packedOffsets[309] ?? 0;
  while (scan < limit) {
    // c.a(int) offsets 40..70: stop at the first entry greater than arg1
    // (`if_icmpge 73` continues). CORRECTED 2026-09-29: the test was inverted.
    if (arg1 < (packedBytes[scan] ?? 0)) {
      scan -= packedOffsets[308] ?? 0;
      break;
    }
    scan += 1;
  }
  tables.sectionScan = scan;

  if (tables.currentSection !== tables.sectionScan) {
    tables.currentSection = tables.sectionScan;
    onSectionReload();
  }
}

/**
 * Raw port of class c's no-arg `final void a()` (bytecode/c-javap.txt
 * offsets 0..85):
 *
 *   for (k = 13; k < 33; k++) f:[S][k] = 0;
 *   b:B = 0; c:B = 0;
 *   for (k = 0; k < 122; k++) f:[B][k] = 0;
 *
 * **RETRACTED (2026-09-07)**: this was a two-line stub that threw, on the
 * 2026-08-18 finding that `f:[S]` (#50) and `f:[B]` (#51) are "CONFIRMED
 * (exhaustive grep of every putfield/getfield reference in c-javap.txt) to
 * never be assigned anywhere in the whole program". The grep covered class
 * `c` only. Both are allocated by `e.e()`, in the same run that allocates
 * their siblings `c.d:[S]`/`c.e:[S]`/`c.g:[S]`: `f:[S] = new short[33]`
 * (bytecode/e-javap.txt offset 137..141) and `f:[B] = new byte[122]`
 * (offset 31..35). Every array field of class `c` is allocated from class
 * `e`, exactly as class `f`'s are. Found while porting `c.a(int,int,int)`,
 * which reads `f:[S]` live. This is the twelfth instance of that retracted
 * premise -- see docs/unknowns.md's 2026-09-07 sweep.
 *
 * `f.ak()`'s try/catch around the call site stays (it is the bytecode's
 * own), but nothing here throws any more.
 */
export function stepLegacyClassCReset(tables: LegacyResourceTables): void {
  for (let k = 13; k < 33; k += 1) tables.rowFShort[k] = 0;
  tables.cBByte = 0;
  tables.cCByte = 0;
  for (let k = 0; k < 122; k += 1) tables.rowFByte[k] = 0;
}

function byteMatrix(rows: number, columns: number): Int8Array[] {
  return Array.from({ length: rows }, () => new Int8Array(columns));
}
