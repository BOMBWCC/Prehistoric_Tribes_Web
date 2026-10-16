/**
 * Allocation-level mirror of the arrays created by f.g().
 *
 * These names describe only the Java field shape observed in bytecode.  They
 * are deliberately not semantic names: the meaning of each slot still has
 * to be established from its readers and writers.
 */
export class LegacyMainArrays {
  // f.g/h/i:[B are LegacyRuntimeState.entityMarkerG/H/I; a second copy here served the 1118
  // helper until 2026-10-16.

  /** byte[P + 3][O] with P=18 and O=11. */
  readonly g = byteMatrix(21, 11);

  /** int[2][3][96] */
  readonly aInt = intCube(2, 3, 96);

  /** byte[5][50] */
  readonly aByte = byteMatrix(5, 50);

  /** short[2][26] */
  readonly aShort = shortMatrix(2, 26);

  /** f.d:[[B] (#268) -- byte[7][40], the table LegacyAnimatedSlotScan.ts (f.r()) reads; row 0 is cleared by f.t(). */
  readonly d = byteMatrix(7, 40);

  /** byte[12] */
  readonly f = new Int8Array(12);

  /** byte[3][10], the original f.k[][] coordinate/list buffer. */
  readonly kMatrix = byteMatrix(3, 10);

  /** byte[10] and int[10] paired with f.k[][] in f.a(byte,byte,byte,byte). */
  readonly uBytes = new Int8Array(10);
  readonly gCounters = new Int32Array(10);

  /** byte[3][30] */
  readonly e = byteMatrix(3, 30);

  /** byte[2][10][12] */
  readonly aByte3 = byteCube(2, 10, 12);

  /** byte[4][30] */
  readonly f4 = byteMatrix(4, 30);

  /** int[2][12], the two confirmed color palettes from f.g(). */
  readonly bColors = [
    new Int32Array([7250486, 11637795, 2652080, 2454300, 3881776, 4605510, 16766976, 14352640, 10966528, 16750080, 7406848, -1]),
    new Int32Array([5276696, 8810262, 678290, 480512, 1907986, 2631720, 16766976, -1, -1, 16750080, 5439488, -1]),
  ];

  /**
   * f.r:[B] (#358) -- distinct from `r:Z` (#359) and `r:I` (#360). Also
   * read/written by `private void f(byte)`/`stepLegacyF` (offset ~36..47,
   * `r[0]=0`) -- confirmed the SAME field this array already serves for
   * the `Z()` choice-row cluster, not a separate one. Was briefly
   * double-tracked as a second `game.rBytes` field before being fixed
   * (2026-08-18) to alias here instead.
   */
  readonly r = new Int8Array(50);
  readonly s = new Int8Array(100);
}

function byteMatrix(rows: number, columns: number): Int8Array[] {
  return Array.from({ length: rows }, () => new Int8Array(columns));
}

function shortMatrix(rows: number, columns: number): Int16Array[] {
  return Array.from({ length: rows }, () => new Int16Array(columns));
}

function byteCube(depth: number, rows: number, columns: number): Int8Array[][] {
  return Array.from({ length: depth }, () => byteMatrix(rows, columns));
}

function intCube(depth: number, rows: number, columns: number): Int32Array[][] {
  return Array.from({ length: depth }, () =>
    Array.from({ length: rows }, () => new Int32Array(columns)),
  );
}
