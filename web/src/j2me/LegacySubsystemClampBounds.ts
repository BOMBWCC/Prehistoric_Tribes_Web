/**
 * Exact `private void b(byte, byte, byte)` (bytecode/b-javap.txt offsets
 * 0..61), `private boolean p()`'s own prep call (`this.b(dense[v],
 * dense[101+v], dense[4949+v])`). Fully real, working code -- touches no
 * confirmed-null field.
 *
 * Computes a 4-cell bounding box in a coarse (`>>4`, i.e. /16) grid,
 * clamped to `[0,5]`, from a center `(arg1,arg2)` and a "radius" `arg3`:
 * `at=clamp((arg1-arg3)>>4,0,5)`, `au=clamp((arg1+arg3)>>4,0,5)`,
 * `av=clamp((arg2-arg3)>>4,0,5)`, `aw=clamp((arg2+arg3)>>4,0,5)`.
 *
 * `arg3` (`dense[4949+id]`) is, per this project's convention for
 * fields with reads-only-no-writes, presumed to always be Java's default
 * `0` -- independently grepped (14 read sites in class b, zero writes
 * found via literal-offset stores; not exhaustively proven against a
 * dynamically-computed index, but consistent with every other
 * never-written scratch field this project has catalogued). With
 * `arg3===0`, `at===au` and `av===aw` always -- the bounding box collapses
 * to exactly one cell, never an empty range.
 *
 * **ADDED (2026-09-05)**: offset 0..4 (`this.an = 0`, BEFORE any of the
 * bounds math above) was missed by the original derivation -- this method
 * ALSO unconditionally resets b's own `an:I`(#115) to 0 every call. This
 * matters because `an` is one of `LegacySubsystemNearbyMarkerLookup.ts`'s
 * own persistent "best candidate" trackers (see that file's docblock);
 * without this reset a stale `an` from a previous scan would leak into the
 * next one. Surfaced as `result.an` (always exactly `0`, not computed);
 * the caller (`LegacySubsystemBBoolean2.ts`) is responsible for applying
 * it to whatever holds that persistent field -- NOT modeled there yet,
 * see that file's own docblock.
 */
export type LegacySubsystemClampBoundsResult = {
  readonly at: number;
  readonly au: number;
  readonly av: number;
  readonly aw: number;
  /** an:I (#115), unconditionally reset to 0 by this method (offset 0..4). */
  readonly an: number;
};

export function stepLegacySubsystemClampBounds(arg1: number, arg2: number, arg3: number): LegacySubsystemClampBoundsResult {
  const clamp = (value: number) => Math.max(0, Math.min(5, value));
  return {
    an: 0,
    at: clamp((arg1 - arg3) >> 4),
    au: clamp((arg1 + arg3) >> 4),
    av: clamp((arg2 - arg3) >> 4),
    aw: clamp((arg2 + arg3) >> 4),
  };
}
