/**
 * Direct translation of `private void a(int, int, boolean, boolean)`
 * (bytecode/f-javap.txt offsets 0..420, constant-pool #470). `arg4` is
 * read nowhere before any return or the guaranteed throw below, so it is
 * dropped from this port's signature (confirmed dead by direct bytecode
 * read, not assumed).
 *
 * The `owner2!==arg1 || (ownerX===2 && flagY===0)` guard picks a SAFE path
 * (offset 310..420): it only ever writes `dense[2828+arg1]`/
 * `dense[6161+arg1]` to mark the record idle/cancelled, or sets
 * `dense[6161+arg1]=2` -- no null dereference, no side effect beyond these
 * two dense-array cells.
 *
 * The other path (offset 88..309) is real. RETRACTED (2026-09-07): a
 * 2026-08-22 note here declared it a guaranteed throw, because
 * `f.c:[[B]` (#262) was found to have zero `putfield` sites "anywhere in the
 * whole decompiled class". The grep covered class `f` only; `e.i()` allocates
 * the field (bytecode/e-javap.txt offset 41..45, `new byte[96][96]`) -- it is
 * `gridC`, which this port has had all along. The same note also declared
 * `f.b(int,boolean)`'s linked-list walk unreachable for the same reason;
 * `LegacyZB2.ts` has been restored too. `arg4` is likewise no longer dead: it
 * gates the `a(int,boolean)` (#469) call at offset 298..309, which the
 * throwing version could never reach. See docs/unknowns.md's 2026-09-07 entry.
 */
export type LegacyEntityRecordCancelCallbacks = {
  /** f's own `final void d(int)` (#573), offset 103..107. Not ported yet. */
  readonly onD?: (record: number) => void;
  /** f's own `final void a(int,boolean)` (#469), offset 303..309. Not ported yet. */
  readonly onA?: (record: number, flag: boolean) => void;
};

export function stepLegacyEntityRecordCancel(
  dense: Int8Array,
  gridC: readonly Int8Array[],
  arg1: number,
  arg2: number,
  arg3: boolean,
  arg4: boolean,
  onCompleteEntityRecord: (record: number) => void,
  callbacks: LegacyEntityRecordCancelCallbacks = {},
): void {
  const marker = dense[2828 + arg1] ?? 0;
  const local3 = arg3 || marker === 93 || marker === 92 || marker === 106;
  const owner2 = dense[8810 + arg2] ?? 0;
  const ownerX = dense[8749 + arg2] ?? 0;
  const flagY = dense[8627 + arg2] ?? 0;

  if (owner2 !== arg1 || (ownerX === 2 && flagY === 0)) {
    if (!local3) {
      dense[2828 + arg1] = 87;
      dense[6161 + arg1] = 3;
      return;
    }
    if (flagY !== 0) {
      dense[6161 + arg1] = 2;
      return;
    }
    if (ownerX === 2 || ownerX === 7 || ownerX === 4) {
      dense[2828 + arg1] = 87;
      dense[6161 + arg1] = 3;
      return;
    }
    if (ownerX !== 8) {
      dense[6161 + arg1] = 2;
      return;
    }
    dense[2828 + arg1] = 87;
    dense[6161 + arg1] = 3;
    return;
  }

  // Offset 88..102.
  if (local3) dense[8810 + arg2] = 0;
  // Offset 103..107: `this.d(arg2)` (#573).
  onCompleteEntityRecord(arg2);
  callbacks.onD?.(arg2);

  // Offset 108..297. RETRACTED 2026-09-07: everything from here down used to
  // be a `throw`, because f.c:[[B] (#262) was believed permanently null. It is
  // gridC, allocated by e.i().
  if ((gridC[dense[101 + arg1] ?? 0]?.[dense[arg1] ?? 0] ?? 0) !== arg1) {
    if (local3) {
      dense[6161 + arg1] = 2;
    } else {
      dense[2828 + arg1] = 87;
      dense[6161 + arg1] = 3;
    }
  } else {
    dense[3131 + arg1] = dense[arg1] ?? 0;
    dense[3232 + arg1] = dense[101 + arg1] ?? 0;
    if (local3) {
      dense[6262 + arg1] = dense[arg1] ?? 0;
      dense[6363 + arg1] = dense[101 + arg1] ?? 0;
    }
    dense[2828 + arg1] = 69;
    if (local3) {
      dense[6161 + arg1] = 2;
      dense[4747 + arg1] = 0;
    } else {
      dense[6161 + arg1] = 3;
    }
  }

  // Offset 298..309.
  if (arg4) callbacks.onA?.(arg2, false);
}
