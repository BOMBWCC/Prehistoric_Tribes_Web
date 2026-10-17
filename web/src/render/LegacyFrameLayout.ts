/**
 * `f.aV:I` / `f.aU:I`, the two statics computed during asset bootstrap.
 *
 * CORRECTION (2026-09-09): this docblock (and docs/unknowns.md's own
 * "`e.c()` frame-layout statics" heading) used to attribute these to
 * `e.c()`. They are actually `e.b()` offsets 160..235 -- `putstatic #44`
 * and `#43` both sit inside `private void b()` (e-javap.txt lines 400 and
 * 414; `b()` spans lines 294..421, `c()` starts at 422). `e`'s constructor
 * calls `a()`, then `c()`, then `i()`, `d()`, `d()`, and only then `b()`
 * (offsets 306..336), so this runs AFTER applyLegacyFrameGeometry below --
 * the order this port's `withPackedData()` applies them in.
 *
 * This is intentionally kept as a raw table lookup: javap shows no semantic
 * names at this boundary, only the exact indices and Java int division.
 */
export function deriveLegacyFrameLayout(
  shortTables: readonly Int16Array[],
  byteTables: readonly Int8Array[],
): { readonly aV: number; readonly aU: number } {
  const widthTable = byteTables[23];
  const short10 = shortTables[10];
  const short9 = shortTables[9];
  const glyphRecord = (short9?.[548] ?? 0) & 0x1fff;
  const glyphIndex = (short10?.[glyphRecord] ?? 0) & 0x1fff;
  const aV = (widthTable?.[glyphIndex] ?? 0) + 9;
  const textWidth = (byteTables[1]?.[1010] ?? 0) * 2;
  const aU = Math.trunc((240 - textWidth) / aV);
  return { aV, aU };
}

/** JVM `i2b`. */
function toByte(value: number): number {
  return (value << 24) >> 24;
}

/**
 * `e.c()` offsets 6..110 -- the frame-geometry block, the FIRST thing asset
 * bootstrap does after `System.gc()`/`Thread.yield()`.
 *
 * These seven fields of class `f` are written by class `e` through its
 * `a:Lf;` back-reference, the same cross-class-writer pattern that already
 * caught this project out over `f`'s array fields (`e.i()`/`e.f()` allocate
 * almost all of them). Grepping class `f` alone finds ZERO `putfield` for
 * `O:B` and exactly one for `P:B` (in `a(ZZZZZZZZZ)`'s untranslated tail),
 * which is why they sat at their Java defaults of 0 in this port until
 * 2026-09-09 -- and `O:B`/`P:B` are the viewport size every camera path
 * divides and clamps by:
 *
 *   f.A:I = 288                          (offsets 10..13)
 *   f.O:B = 11                           (offsets 20..22)
 *   f.P:B = (byte)(((A:I - 1) / 16) + 1) (offsets 29..44)  = 18
 *   f.y:B = (byte)(O:B >> 1)             (offsets 49..63)  = 5
 *   f.A:B = (byte)(P:B >> 1)             (offsets 66..80)  = 9
 *   f.C:B = y:B                          (offsets 83..94)
 *   f.D:B = A:B                          (offsets 97..108)
 *
 * `idiv` truncates toward zero and `ishr` is arithmetic, both reproduced
 * literally. Field identities are by constant-pool index as javap prints
 * them from class `e`'s own pool (`f.A:I`, `f.O:B`, `f.P:B`, `f.y:B`,
 * `f.A:B`, `f.C:B`, `f.D:B`), NOT by letter -- `A` alone names three
 * different fields of `f` (`A:I`#35, `A:B`#34, `A:Z`#36).
 *
 * Everything after offset 111 is the literal image/table block already
 * mirrored by `LegacyRenderTargets.ts`; the asset-loading remainder of
 * `e.c()` (through its offset 898) is still unported.
 */
export function applyLegacyFrameGeometry(state: {
  selectionAInt: number;
  viewColumns: number;
  viewRows: number;
  cursorColumn: number;
  cursorRow: number;
  cursorTargetColumn: number;
  cursorTargetRow: number;
}): void {
  state.selectionAInt = 288;
  state.viewColumns = 11;
  state.viewRows = toByte(Math.trunc((state.selectionAInt - 1) / 16) + 1);
  state.cursorColumn = toByte(state.viewColumns >> 1);
  state.cursorRow = toByte(state.viewRows >> 1);
  state.cursorTargetColumn = state.cursorColumn;
  state.cursorTargetRow = state.cursorRow;
}
