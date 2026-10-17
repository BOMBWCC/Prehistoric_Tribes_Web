/**
 * Exact `private void ax()` (bytecode/b-javap.txt offsets 0..130,
 * line 50802) -- `b.g()`'s own unconditional prologue call (its ONLY call
 * site in the entire class).
 *
 * **RETRACTED (2026-09-07)** -- the previous docblock claimed BOTH branches
 * "unconditionally dereference class b's own `b:[S]` (#132)" and throw on
 * the very first loop iteration. That premise is gone: `b:[S]` (#132) is a
 * live alias of `f.b:[S]` (#245), a real 570-entry table this port already
 * models as `LegacyRuntimeState.saveOffsets` (see `LegacyAuxiliaryCopy.ts`
 * for the full derivation of the alias chain). Re-tracing the whole method
 * shows it never throws at all -- it's a plain, bounded 6-iteration loop
 * over `d:[S]` (#152, `f.g()`'s `new short[6]`, already modelled as
 * `LegacySubsystemArrays.dShort`), reading BOTH `saveOffsets` (#132) and
 * `sectionOffsets` (`c:[S]`, #142, the 5-entry table) together via the
 * exact `saveOffsets[sectionOffsets[N] + q]` combined idiom this project
 * has already confirmed elsewhere -- not a bug, not a twin mix-up.
 *
 * Full control flow (`a:I`, #68, is a pure loop counter local to this
 * method, distinct from `b`'s several other same-letter `a:*` array
 * fields):
 *
 *   for (a = 0; a < 6; a++) {
 *     if (game.l !== 1) {                                  // offset 14..24
 *       d[a] = saveOffsets[sectionOffsets[2] + a];          // offset 25..50
 *     } else {
 *       if (d[a] >= 0) d[a] = (short) (d[a] + 1);           // offset 53..78
 *       if (d[a] >= saveOffsets[sectionOffsets[2] + a])      // offset 79..104
 *         d[a] = -1;                                         // offset 107..116
 *     }
 *   }
 *
 * `game.l` is `f.l:I` (#334, `LegacyGameState.lInt`) -- a field this port
 * had never tracked before this derivation; see its own doc comment in
 * `LegacyGameState.ts` for the full write-site sweep (constructor default
 * 1, `as()`'s `Z===3` toggle, an RMS-load overwrite).
 *
 * Since `b.g()` calls this from offset 17 (inside `g()`'s own exception
 * table range), any throw here would have been swallowed by `g()`'s
 * `pop;return` handler -- but there is no throw to swallow: `ax()` now
 * runs to completion and `g()` proceeds normally past it. See
 * `LegacySubsystemBuildingEconomy.ts`'s own docblock, which should be
 * revisited now that this retraction removes the "g() always returns
 * immediately" premise it depended on.
 */
export type LegacySubsystemAxInput = {
  /** b.d:[S] (#152) -- LegacySubsystemArrays.dShort, new short[6]. */
  readonly dShort: Int16Array;
  /** b.b:[S] (#132), alias of f.b:[S] (#245) -- saveOffsets, 570 entries. */
  readonly saveOffsets: Int16Array;
  /** b.c:[S] (#142) -- sectionOffsets, 5 entries. */
  readonly sectionOffsets: Int16Array;
  /** f.l:I (#334) -- game.lInt. */
  readonly gameL: number;
};

export function stepLegacySubsystemAx(input: LegacySubsystemAxInput): void {
  const { dShort, saveOffsets, sectionOffsets, gameL } = input;

  for (let a = 0; a < 6; a += 1) {
    const threshold = saveOffsets[(sectionOffsets[2] ?? 0) + a] ?? 0;
    if (gameL !== 1) {
      dShort[a] = threshold;
      continue;
    }
    if ((dShort[a] ?? 0) >= 0) {
      dShort[a] = toJavaShort((dShort[a] ?? 0) + 1);
    }
    if ((dShort[a] ?? 0) >= threshold) {
      dShort[a] = -1;
    }
  }
}

function toJavaShort(value: number): number {
  const narrowed = value & 0xffff;
  return narrowed >= 0x8000 ? narrowed - 0x10000 : narrowed;
}
