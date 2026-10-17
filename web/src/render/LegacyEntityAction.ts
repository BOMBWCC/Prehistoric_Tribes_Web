import { UNIT_AGE, UNIT_DIRECTION } from "../core/DenseLayout";
/**
 * Raw port of private void a(int,int,int,int,byte) (constant pool #443),
 * bytecode/f-javap.txt offsets 0..445 -- `onEntityAction`'s real target,
 * shared by `LegacyGameplayPositiveEntityBranch.ts`,
 * `LegacyGameplayNegativeEntityBranchTail.ts`, and `LegacyMapMarkerDetail.ts`.
 *
 * Every step below was derived via a full JVM stack trace (not a skim)
 * before being transcribed (2026-08-14) -- the previous method ported in
 * this cluster (`a(IBBIIB)`, `LegacyMapMarkerDetail.ts`) had four real
 * errors slip past a faster first pass, so this one gets the same
 * discipline throughout, not just for the branchy parts.
 *
 * Shape: linear setup (the 5 params become `aq`/`ar`/`as`/`at`/`Y`, then
 * `av` is derived from a `dense`/`b:[S]` lookup), an `at<0` branch that
 * recomputes `av` from `-at` instead, a shared table-driven `au`/`ar`/`as`
 * refinement, an `x:Z`-gated one-shot adjustment, a 4-way `av` range check
 * gating one more `ar` adjustment, and a final `au`/`aw` computation
 * before delegating to two NOT-yet-ported sibling methods, `private void
 * p()` and (only when `v:B!==0`) `private void q()`. The whole body is
 * wrapped in the bytecode's own try/catch-all (offsets 0..445 -> handler
 * 446, `pop; return`).
 *
 * **RETRACTED (2026-09-07) -- `bShort` is NOT null, and this method is NOT
 * dead code.** The 2026-08-15 entry here declared `f.b:[S]` (#245, the
 * single-dimension short array, distinct from the widely-used `f.b:[[S]`
 * #244) permanently `null` on the strength of an exhaustive grep for
 * `putfield`/`putstatic #245` -- but that grep covered only class `f`'s own
 * disassembly. `short[] b;` is declared with no access modifier, i.e.
 * package-private, and it is written from **outside** the class: `e.f()`
 * (`bytecode/e-javap.txt` offset 30..41) does `f.b:[S] = new short[570]` in
 * the very same prologue that allocates `f.a:[B] = new byte[17638]` and
 * `f.a:[S] = new short[312]` -- the two tables this whole port already
 * depends on as `packedBytes`/`packedOffsets` -- and then fills all of them
 * from the `/a` resource. Class `b` corroborates it: `b-javap.txt:549..550`
 * copies `f.b:[S]` straight into its own `b:[S]` (#132), which it then reads
 * at a dozen sites. So `this.b` is a live 570-entry table for the entire
 * lifetime of every `f` instance, this method runs to completion, and its
 * `p()`/`q()` tail is genuinely reachable.
 *
 * `LegacyRuntimeState.ts` now wires `bShort` to `saveOffsets`, which is
 * exactly that table: `BinaryResource.decodeShortTableB()` already decoded
 * the five trailing `/a` sections into a 570-short array, and
 * `withTableA()` already stored it -- the value was sitting there unused
 * while this call site passed `null`.
 *
 * The `Int16Array | null` type is kept because the field really is `null`
 * before `e.f()` runs (and the surrounding try/catch is the bytecode's own),
 * but the live runtime now passes the real table.
 *
 * `p()`/`q()` are exposed as `onP`/`onQ` callbacks and remain unported
 * (253 and 889 javap lines respectively) -- with this retraction they are
 * on the critical path for entity sprites, not off it. See
 * `docs/unknowns.md`'s 2026-09-04 entry.
 */

export type LegacyEntityActionState = {
  /** f.aq:I (#216), param1. */
  aq: number;
  /** f.ar:I (#217), param2. */
  ar: number;
  /** f.as:I (#220), param3. */
  as: number;
  /** f.at:I (#221), param4. */
  at: number;
  /** f.Y:B (#117), param5. */
  Y: number;
  /** f.av:I (#225), output. */
  av: number;
  /** f.au:I (#223), output. */
  au: number;
  /** f.aw:I (#228), output. */
  aw: number;
  /** f.x:Z (#383) -- shared one-shot flag, also written (never read) by `LegacyMapMarkerDetail.ts`'s `onXFlag`. */
  xFlag: boolean;
  /** f.e:[B (#286), dense state. */
  readonly dense: Int8Array;
  /**
   * f.b:[S (#245) -- a single-dimension short array, distinct from
   * `b:[[S` (#244) used throughout this cluster. Confirmed ALWAYS `null`
   * in the original game (see this file's own docblock) -- pass `null`
   * here to reproduce the original's guaranteed no-op exactly.
   */
  readonly bShort: Int16Array | null;
  /** f.a:[B (#137). */
  readonly packedBytes: Int8Array;
  /** f.a:[S (#138). */
  readonly packedOffsets: Int16Array;
  /** f.b:[[S (#244). */
  readonly shortTables: readonly Int16Array[];
  /** f.j:[[B (#326). */
  readonly byteTables: readonly Int8Array[];
  /** f.aQ:I (#165). */
  readonly aQ: number;
  /** f.v:B (#376). */
  readonly vByte: number;
};

export type LegacyEntityActionCallbacks = {
  /** private void p() -- LegacySpriteLayerLoop.ts. */
  readonly onP?: () => void;
  /** private void q() -- LegacyEntityOverlayDraw.ts. */
  readonly onQ?: () => void;
};

export function stepLegacyEntityAction(
  state: LegacyEntityActionState,
  callbacks: LegacyEntityActionCallbacks = {},
): void {
  try {
    // Non-null assertion deliberate: the field is genuinely `null` until
    // e.f() allocates it, and indexing `null` then is exactly what the
    // original would do -- caught by the try/catch below, which is the
    // bytecode's own handler. After e.f() this is the real 570-short table.
    state.av = (state.dense[(state.bShort![state.Y] ?? 0) + state.aq] ?? 0) & 0xff;

    if (state.at >= 0) {
      const shift = (((state.shortTables[3]?.[state.av] ?? 0) >> 14) & 3) << 3;
      state.at = state.packedBytes[(state.packedOffsets[99] ?? 0) + shift + state.at] ?? 0;

      const local6 =
        ((state.shortTables[2]?.[state.av] ?? 0) & 4095) +
        state.at * (state.byteTables[4]?.[state.av] ?? 0) +
        (state.dense[(state.bShort![state.Y + 1] ?? 0) + state.aq] ?? 0);

      state.au = state.shortTables[4]?.[local6] ?? 0;
      state.ar += state.byteTables[7]?.[local6] ?? 0;
      state.as += (state.byteTables[8]?.[local6] ?? 0) + state.aQ;

      if (state.xFlag) {
        if (state.av !== 124) {
          state.au += 48;
          state.av = 1;
        }
        state.xFlag = false;
      }

      if (state.av === 141 || state.av === 142 || state.av === 143 || state.av === 144) {
        state.ar +=
          22 *
          (state.packedBytes[
            (state.packedOffsets[1] ?? 0) + (state.dense[UNIT_DIRECTION + state.aq] ?? 0)
          ] ?? 0);
      }
    } else {
      state.av = -state.at;
      if ((state.dense[UNIT_AGE + state.aq] ?? 0) < 12) {
        state.av = 14;
        state.as -= 6;
      }
      state.au = state.shortTables[4]?.[((state.shortTables[2]?.[state.av] ?? 0) & 4095) + 2] ?? 0;
    }

    state.aw = ((state.shortTables[2]?.[state.av] ?? 0) & 61440) >> 14;

    callbacks.onP?.();
    if (state.vByte !== 0) callbacks.onQ?.();
  } catch {
    // Bytecode's own exception table (offsets 0..445 -> 446) swallows
    // any exception, matching the original's `pop; return`.
  }
}
