import { UNIT_TYPE } from "../../core/DenseLayout";
/**
 * `final void n()` (bytecode/b-javap.txt offsets 0..360) -- NOT the other,
 * unrelated `private boolean n()` overload (line 29609, already ported as
 * `legacySubsystemNGate`/`LegacySubsystemNGate.ts`, a real entity-scoped
 * gate on completely different fields). Java allows both to compile side
 * by side since their descriptors differ (`()V` vs `()Z`); named
 * `...VoidN...` here specifically to keep them from being confused.
 *
 * `b.g()`'s own tick-gated call (`if (game.missionFrame%10===0) n();`, offset 4-16)
 * -- ITS ONLY call site in the entire class, and NOT covered by `g()`'s
 * own exception table (`g()`'s try block starts at offset 17, this call
 * happens at offset 13..16, strictly before it).
 *
 * **RETRACTED (2026-09-04/05)**: this file previously threw
 * unconditionally on the finding that class b's own `c:[[[B]`(#151) is
 * permanently null. It is not -- `f.g()` allocates it (f-javap.txt offset
 * 460..473, `new byte[5][6][6]`), and this port has had it all along as
 * `LegacySubsystemArrays.c`. The method is fully real, working code: it
 * rebuilds, every time it's called, a per-team spatial hash of which
 * entities occupy which coarse (`>>4`) map zone -- the exact structure
 * `LegacySubsystemNearbyMarkerLookup.ts`'s `a(byte,byte,byte,byte)` walks.
 *
 * Two parts, both unconditional:
 *
 *  1. Offset 0..51 (`LegacySubsystemArrays.resetNCube()`, already ported):
 *     `c[5][6][6]` filled with `-1`.
 *  2. Offset 52..360: for each team `i1` in `0..4`, for each dense id `i2`
 *     from `packedBytes[packedOffsets[115]+i1]` to
 *     `packedBytes[packedOffsets[116]+i1]` inclusive (the team's own dense
 *     range): if `dense[saveOffsets[packedBytes[packedOffsets[117]+i1]]+i2]
 *     > 0` (the SAME group-marker liveness idiom
 *     `LegacySubsystemNearbyMarkerLookup.ts` re-reads later) --
 *       - for `i1<=1` only, first requires either
 *         `gridC[rowIndex][colIndex]===i2` (the entity already occupies
 *         its own registered cell) or `dense[2828+i2]` (its type) is one
 *         of `{93,92,106}`; otherwise this `i2` is skipped entirely (no
 *         write, not even the cache);
 *       - otherwise (or for `i1>1` unconditionally): computes the coarse
 *         zone `(local5,local4) = (rowIndex>>4, colIndex>>4)` from the
 *         SAME `#118`-table position lookup
 *         `LegacySubsystemNearbyMarkerLookup.ts` uses, `local3 = i2 -
 *         packedBytes[packedOffsets[115]+i1]` (the id's own offset from
 *         the team's dense-range start -- the exact inverse of that
 *         file's own `al = ak + teamStart`), stashes the cell's CURRENT
 *         occupant into `aRows[i1][local3]` (field `a:[[B]`#75, `new
 *         byte[5][50]`, `f.g()` offset 476..487 -- so a fresh id's cache
 *         slot inherits the `-1` the reset in part 1 left in the cell,
 *         correctly terminating the chain), then overwrites
 *         `c[i1][local5][local4] = (byte) local3` -- i.e. this id becomes
 *         the new head of that cell's linked list.
 *
 * Net effect on `f.j()`'s own call sequence (`b.g()`/`b.e()`/`b.h()`/
 * `b.i()`, all four wrapped in ONE shared try/catch, `f-javap.txt`
 * offsets `0..28 -> 31, pop` -- confirmed via direct read): with the
 * retracted premise gone, `n()` no longer crashes, so `g()`'s own
 * `game.missionFrame%10===0` tick gate now runs this rebuild for real every 10th
 * tick instead of skipping `e()`/`h()`/`i()` for that tick.
 *
 * See `docs/unknowns.md`'s 2026-08-27 "n()也必崩" entry for the (now
 * superseded) original derivation, and its 2026-09-04/05 entries for the
 * retraction.
 */
export type LegacySubsystemVoidNArrays = {
  /** b's own c:[[[B] (#151), `f.g()`-allocated `new byte[5][6][6]`. */
  readonly c: readonly (readonly Int8Array[])[];
  /** b's own a:[[B] (#75), `f.g()`-allocated `new byte[5][50]`. */
  readonly aRows: readonly Int8Array[];
  /** Offset 0..51: fills c[5][6][6] with -1. Already ported. */
  resetNCube(): void;
};

export type LegacySubsystemVoidNInput = {
  readonly dense: Int8Array;
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
  readonly saveOffsets: Int16Array;
  readonly gridC: readonly Int8Array[];
  readonly arrays: LegacySubsystemVoidNArrays;
};

export function stepLegacySubsystemVoidN(input: LegacySubsystemVoidNInput): void {
  const { dense, packedBytes, packedOffsets, saveOffsets, gridC, arrays } = input;

  arrays.resetNCube();

  for (let i1 = 0; i1 < 5; i1 += 1) {
    const teamStart = packedBytes[(packedOffsets[115] ?? 0) + i1] ?? 0;
    const teamEnd = packedBytes[(packedOffsets[116] ?? 0) + i1] ?? 0;

    for (let i2 = teamStart; i2 <= teamEnd; i2 += 1) {
      const marker = packedBytes[(packedOffsets[117] ?? 0) + i1] ?? 0;
      if ((dense[(saveOffsets[marker] ?? 0) + i2] ?? 0) <= 0) continue;

      const baseIdx118 = packedBytes[(packedOffsets[118] ?? 0) + i1] ?? 0;
      const colIndex = dense[(saveOffsets[baseIdx118] ?? 0) + i2] ?? 0;
      const rowIndex = dense[(saveOffsets[baseIdx118 + 1] ?? 0) + i2] ?? 0;

      if (i1 <= 1) {
        const occupant = gridC[rowIndex]?.[colIndex] ?? 0;
        if (occupant !== i2) {
          const type = dense[UNIT_TYPE + i2] ?? 0;
          if (type !== 93 && type !== 92 && type !== 106) continue;
        }
      }

      const local4 = colIndex >> 4;
      const local5 = rowIndex >> 4;
      const local3 = i2 - teamStart;

      const cell = arrays.c[i1]?.[local5];
      const aRow = arrays.aRows[i1];
      if (cell && aRow) {
        aRow[local3] = cell[local4] ?? 0;
        cell[local4] = (local3 << 24) >> 24;
      }
    }
  }
}
