import { stepLegacySubsystemEntityOccupancyCheck } from "./LegacySubsystemEntityOccupancyCheck";
import { BLD_KIND, UNIT_FLAGS, UNIT_HOME_X, UNIT_HOME_Y, UNIT_JOB_TYPE, UNIT_RECORD, UNIT_TARGET_X, UNIT_TARGET_Y, UNIT_TYPE, UNIT_VISION, UNIT_Y } from "../../core/DenseLayout";

/**
 * Direct translation of `private void p()`, javap offsets 0..1906
 * (bytecode/b-javap.txt line 1969). The method's first call (`o()`) is
 * ALREADY handled by the caller (see `stepLegacySubsystemBVoidO`,
 * `LegacySubsystemBVoidO.ts`) -- this function starts from offset 4.
 *
 * Structure:
 *  1. offset 4..18: `baload; iconst_1; if_icmpge 665` -- if
 *     `dense[808+id] >= 1`, jumps straight to the tail (offset 665, step 6
 *     below); the main body runs only when it is BELOW 1.
 *     **CORRECTED (2026-09-10)**: both this docblock and the code had that
 *     backwards. Combined with bug 2 below, the practical effect was that
 *     `p()` threw on essentially every call.
 *  2. offset 21..56: calls `a(int,int,int):int` (#266) with
 *     `(dense[id], dense[101+id], 0)`; if the result / 10 is
 *     `<= B:I`, also jumps to the tail (offset 665).
 *     **RETRACTED (2026-09-10)**: this used to be a deliberate
 *     guaranteed-throw stub, on the premise that #266 "unconditionally
 *     dereferences the confirmed-permanently-null `b:[S]`(#132) and
 *     throws". `b:[S]` is not permanently null -- `e.f()` allocates it
 *     (`e-javap.txt:1115`, `new short[570]`) and `b.a(f)` copies it in
 *     (`b-javap.txt:550`); it is this port's `saveOffsets`. #266 itself was
 *     already ported in full as `stepLegacySubsystemEntityOccupancyCheck`
 *     (`LegacySubsystemEntityOccupancyCheck.ts`, whose own docblock carries
 *     the 2026-09-07 retraction), and `LegacySubsystemPairSetup.ts` flagged
 *     this file's stub as a known-stale conclusion on 2026-09-08. Now a
 *     real call.
 *  3. offset 59..106: `dense[4848+id]++` (byte-narrowed, `i2b` at offset
 *     75); then offsets 77..86, `if (!localFlags[2]) return;` -- a real
 *     early return this port used to skip on the argument that `o()`
 *     always sets that flag; modeled properly now, it costs one field.
 *     Then `dense[7979+id] &= 223`.
 *  4. offset 107..173: if packed table 39 (indexed by this entity's type)
 *     equals 1, calls `b(int,int):void` (#333,
 *     `findLegacyNearestCandidate`) with
 *     `(dense[8749+dense[4444+id]], dense[4444+id])`.
 *  5. offset 176..470: type-dispatch. type in {69,79,59,87} -> offset 476
 *     (step 7). type in {17,109,110,27} -> calls `N()`
 *     (`stepLegacySubsystemN`) and returns. Otherwise: if packed table 39
 *     (recomputed) equals 1, plain return; if type<=9, also plain return;
 *     else calls the #270 gate (`checkLegacySpiralPlacementGate`, mode=0,
 *     `scanLimit=dense[4949+id]*2+1`, jittered/clamped coordinates),
 *     discards the result, and returns.
 *  6. offset 665..800 (the "808<1" / "avg<=B" tail): if `dense[808+id]<=0`,
 *     plain return. Otherwise sets `dense[7777+id]=3` when: type<=9, or
 *     type in {59,87}, or (team===0 and `f.N` is SET -- `ifne 786` at offset 749; this port had it inverted until 2026-09-14),
 *     or (team===1 and its own `Q:B` scratch field is >0), or (`f.q===3`
 *     and its own `f:B` scratch field ===4). Otherwise plain return.
 *  7. offset 476..664 (type in {69,79,59,87}): resets `dense[4848+id]=0`;
 *     if `dense[6464+id]===69` and `dense[6262+id]===dense[3131+id]` and
 *     `dense[6363+id]===dense[3232+id]`, first copies `dense[6262/6363+id]`
 *     from `dense[id]/dense[101+id]`; either way, unconditionally copies
 *     `dense[3131/3232+id]` from `dense[id]/dense[101+id]`; returns.
 */
export type LegacySubsystemPInput = {
  readonly state: Int8Array;
  readonly id: number;
  readonly team: number;
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
  /** b.B (#8), a scratch threshold compared against a(III):I's return value / 10. */
  readonly bThreshold: number;
  /** f.N:Z, raw. */
  readonly fNFlag: boolean;
  /** b.Q:B (#46), raw scratch field. */
  readonly qByte: number;
  /** f.q:B, raw (already known elsewhere as game.mission, but kept explicit here to match this method's own inputs). */
  readonly fQByte: number;
  /** b.f:B (#167), raw scratch field. */
  readonly fByte: number;
  /** b.b:[S] (#132) -- saveOffsets, forwarded to #266. */
  readonly saveOffsets: Int16Array;
  /** b.q:B / b.r:B (#212/#215), written by #266. */
  readonly qrFields?: { bField212: number; bField215: number };
  /** b's own `boolean[] a` (#69); offset 83 reads index 2. */
  readonly localFlags: readonly boolean[];
  readonly onNearestCandidate: (arg1: number, arg2: number) => void;
  readonly onN: () => void;
  readonly onGate: (mode: number, scanLimit: number, originX: number, originY: number) => boolean;
  readonly randomRemainder: (mask: number, divisor: number) => number;
  readonly mapWidth: number;
  readonly mapHeight: number;
};

function table(input: LegacySubsystemPInput, row: number, index: number): number {
  return input.packedBytes[(input.packedOffsets[row] ?? 0) + index] ?? 0;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function toByte(value: number): number {
  return (value << 24) >> 24;
}

export function stepLegacySubsystemP(input: LegacySubsystemPInput): void {
  const { state, id } = input;

  // Offset 18: `if_icmpge 665` -- the main body is the `< 1` side.
  if ((state[808 + id] ?? 0) < 1) {
    const avg = Math.trunc(stepLegacySubsystemEntityOccupancyCheck(
      state,
      input.packedBytes,
      input.packedOffsets,
      input.saveOffsets,
      id,
      state[id] ?? 0,
      state[UNIT_Y + id] ?? 0,
      0,
      input.qrFields,
    ) / 10);
    if (avg > input.bThreshold) {
      state[4848 + id] = toByte((state[4848 + id] ?? 0) + 1);
      // Offsets 77..86.
      if (!input.localFlags[2]) return;
      state[UNIT_FLAGS + id] = toByte((state[UNIT_FLAGS + id] ?? 0) & 223);

      const type = state[UNIT_TYPE + id] ?? 0;
      if (table(input, 39, type) === 1) {
        input.onNearestCandidate(
          state[BLD_KIND + (state[UNIT_RECORD + id] ?? 0)] ?? 0,
          state[UNIT_RECORD + id] ?? 0,
        );
      }

      if (type === 69 || type === 79 || type === 59 || type === 87) {
        stepLegacyTypeTail(state, id);
        return;
      }
      if (type === 17 || type === 109 || type === 110 || type === 27) {
        input.onN();
        return;
      }

      if (table(input, 39, state[UNIT_TYPE + id] ?? 0) === 1) return;
      if ((state[UNIT_TYPE + id] ?? 0) <= 9) return;

      const scanLimit = (state[UNIT_VISION + id] ?? 0) * 2 + 1;
      const x = clamp((state[id] ?? 0) - 3 + input.randomRemainder(255, 6), 0, input.mapWidth - 1);
      const y = clamp((state[UNIT_Y + id] ?? 0) - 3 + input.randomRemainder(255, 6), 0, input.mapHeight - 1);
      input.onGate(0, scanLimit, x, y);
      return;
    }
  }

  stepLegacySubsystemPTail(input);
}

function stepLegacyTypeTail(state: Int8Array, id: number): void {
  state[4848 + id] = 0;
  if (
    (state[UNIT_JOB_TYPE + id] ?? 0) === 69 &&
    (state[UNIT_HOME_X + id] ?? 0) === (state[UNIT_TARGET_X + id] ?? 0) &&
    (state[UNIT_HOME_Y + id] ?? 0) === (state[UNIT_TARGET_Y + id] ?? 0)
  ) {
    state[UNIT_HOME_X + id] = state[id] ?? 0;
    state[UNIT_HOME_Y + id] = state[UNIT_Y + id] ?? 0;
  }
  state[UNIT_TARGET_X + id] = state[id] ?? 0;
  state[UNIT_TARGET_Y + id] = state[UNIT_Y + id] ?? 0;
}

function stepLegacySubsystemPTail(input: LegacySubsystemPInput): void {
  const { state, id } = input;
  if ((state[808 + id] ?? 0) <= 0) return;

  const type = state[UNIT_TYPE + id] ?? 0;
  const reset =
    type <= 9 ||
    type === 59 ||
    type === 87 ||
    // Offsets 736..749: `getfield u:I; ifne 752; getfield f.N:Z; ifne 786`
    // -- N SET jumps to the write. CORRECTED (2026-09-14): was `!fNFlag`.
    (input.team === 0 && input.fNFlag) ||
    (input.team === 1 && input.qByte > 0) ||
    (input.fQByte === 3 && input.fByte === 4);

  if (reset) state[7777 + id] = 3;
}
