import { UNIT_AGE, UNIT_FLAGS, UNIT_HP, UNIT_OFFSET_X, UNIT_OFFSET_Y, UNIT_TARGET_X, UNIT_TARGET_Y, UNIT_Y } from "../../core/DenseLayout";
import { T_RAID_INTERVAL, T_RAID_INTERVAL_DIFFICULTY } from "../../core/DataTables";
/**
 * Exact `private void as()` (bytecode/b-javap.txt offsets 0..964),
 * `aq()`'s unconditional second call -- team 1's per-entity combat-target
 * dispatcher, and the real trigger for `at()`/`av()`/`aw()`.
 *
 * Re-traced instruction-by-instruction while writing this port (the
 * earlier docs/unknowns.md entry was explicitly flagged as structural,
 * not port-ready). Caught one real formula error:
 *
 *  - The `aQ:I` (#92) periodic recompute (offset 14..69) is `aQ =
 *    (packedBytes[packedOffsets[214]+f.q] - packedBytes[packedOffsets
 *    [215]+f.q]*f.bByte) * 100` -- the earlier entry's prose ("A*B-C")
 *    had the multiplication on the wrong pair of operands; it's actually
 *    `A - B*f.bByte`, then the whole thing times 100. A second pass then
 *    sets `aQ = game.missionFrame + aQ/4 + randomA(16777215, aQ*3/2)` using that
 *    intermediate value.
 *
 * Gate: `if (aQ >= game.missionFrame) { recompute as above }`, then `if (fByte <
 * packedBytes[packedOffsets[217]+f.q]) { skip straight to the av()/aw()
 * tail }`.
 *
 * Two bodies; A runs only when `(game.missionFrame&63)===25` and then falls through into B:
 *
 *  A (===25): finds one entity `v` in `1..50` (NOT team-scoped -- scans
 *    the whole roster) whose `(dense[v],dense[101+v])` falls inside
 *    `packedBytes[aT..aT+3]` (`aT = packedOffsets[218]+f.q*4`) with
 *    `dense[1919+v]>0`/`dense[1414+v]>=12` (HP/level), and sets
 *    `Q:B=(byte)v` -- **this is where `Q:B` becomes "the currently
 *    targeted entity id"**, a different use from its boolean/flag role
 *    elsewhere. Then, for `w` in `51..100` (team 1's own 50-slot range),
 *    sets bit5 (`|=32`) of `dense[7979+w]` for every eligible
 *    (HP/level-passing, bit6-clear) entity.
 *
 *  B (!==25, team-scoped `v` over `u*50+1..(u+1)*50`, `aT=v-u*50-1`):
 *    when NOT (`dense[1919+v]>0 && dense[1414+v]>=12`), and on a
 *    `(game.missionFrame&63)===(v&31)` tick with `j[aT]<M`, scans for another slot
 *    `aU` with `j[aU idx]>=M`, THEN re-checks `dense[1919+v]>0 &&
 *    dense[1414+v]>=12` -- **confirmed via direct bytecode read (offset
 *    624/648, both `getfield #225`) this re-check reads the SAME `v`, not
 *    `aU`** -- exactly the condition that just failed to put us in this
 *    branch. So the swap (`j[aU idx]=j[aT]; j[aT]=M`) is PROVABLY
 *    UNREACHABLE: whichever of HP/level made `v` "not ready", the
 *    identical check inside the `aU` loop fails identically every time.
 *    Implemented as real (never-taken) code rather than a guaranteed
 *    throw, since nothing here actually crashes -- it just can't satisfy
 *    its own re-check. When HP/level DO pass: if
 *    `dense[7979+v]` bit6 is CLEAR, calls `at()` directly (**at()'s real
 *    trigger, confirmed**); if bit6 is SET, requires `O:B<0` and bit1
 *    set, then an occupancy check (`private int a(int,int,int)` #266,
 *    the SAME helper `aw()`'s tail uses) `<29` and
 *    `dense[202/303+v]===0`, and on success sets
 *    `dense[3131/3232+v]` from the BARE (no `+v`) cells `dense[8384]`/
 *    `dense[8445]` and calls `subsystemG(1)`.
 *
 * Tail: `av()` when `Q<0 && f.q!==3 && game.missionFrame===aQ` (saves `aR=aQ`
 * first); `aw()` when `O:B>=0 && (game.missionFrame&15)===0`; `aU:I=-1` always.
 */
export type LegacySubsystemAsInput = {
  readonly state: Int8Array;
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
  readonly jobTable: Int8Array;
  readonly team: number;
  readonly aQ: number;
  readonly fByte: number;
  readonly mByte: number;
  readonly sceneQ: number;
  readonly fBByte: number;
  readonly simulationCounter: number;
  /**
   * O:B (#40) and aR:I (#93), live: av() writes O and aw() reads aR, both
   * inside this call. CORRECTED 2026-10-10 (oracle run 7, frame 25143): O
   * was a snapshot, so the tail missed the O = 0 av() had just written and
   * skipped aw(); aR only reached the field after as() returned.
   * Q:B (#46) likewise: offset 175 sets it to -1 and at() (called from the loop below) reads it.
   * CORRECTED 2026-10-14 (oracle run 15, play25 frame 94174): a snapshot written back after the
   * call left at() seeing the old Q, so block A never ran and no raid was ordered.
   */
  readonly fields: { O: number; aR: number; v: number; w: number; Q: number };
};

export type LegacySubsystemAsResult = {
  readonly aQ: number;
  /** aU:I (#96): offsets 959..961 set it to -1 on every exit. */
  readonly aU: number;
};

export type LegacySubsystemAsCallbacks = {
  readonly onRandomA?: (mask: number, divisor: number) => number;
  /** at()'s own aT:I input is ambient instance state, already set to (v-u*50-1) by this point -- passed explicitly here for composability. */
  readonly onAt?: (id: number, aT: number) => void;
  readonly onAv?: () => void;
  readonly onAw?: () => void;
  /** subsystemG(1), already known elsewhere. */
  readonly onGroupMode?: (id: number, argument: number) => void;
  /**
   * private int a(int,int,int) (#266), same helper aw() uses. Its real
   * guard reads dense[4444+v] as AMBIENT instance state (the entity
   * currently being processed), not from the (x,y) arguments -- id passed
   * explicitly here for composability.
   */
  readonly onCheckOccupancy?: (id: number, x: number, y: number, arg: number) => number;
};

export function stepLegacySubsystemAs(
  input: LegacySubsystemAsInput,
  callbacks: LegacySubsystemAsCallbacks = {},
): LegacySubsystemAsResult {
  const { state, packedBytes, packedOffsets, jobTable, team: u, mByte: M, sceneQ: q, fBByte, simulationCounter: c } = input;
  const randomA = (mask: number, divisor: number) => callbacks.onRandomA?.(mask, divisor) ?? 0;

  let aQ = input.aQ;
  const f = input.fields;

  if (aQ < c) {
    aQ = ((packedBytes[(packedOffsets[T_RAID_INTERVAL] ?? 0) + q] ?? 0) - (packedBytes[(packedOffsets[T_RAID_INTERVAL_DIFFICULTY] ?? 0) + q] ?? 0) * fBByte) * 100;
    aQ = c + Math.trunc(aQ / 4) + randomA(16777215, Math.trunc((aQ * 3) / 2));
  }

  if (input.fByte >= (packedBytes[(packedOffsets[217] ?? 0) + q] ?? 0)) {
    // Offsets 137..446. v:I (#225) and w:I (#228) are b's own fields, used
    // as the loop counters. CORRECTED 2026-10-13 (oracle run 13, play10
    // frame 30021): this block falls through to offset 449 (block B) when
    // it ends; the port ran it as an else, so on (c & 63) == 25 no at() ran.
    if ((c & 63) === 25) {
      const aT = (packedOffsets[218] ?? 0) + q * 4;
      f.Q = -1;

      for (f.v = 1; f.v <= 50; f.v += 1) {
        const v = f.v;
        if ((state[UNIT_HP + v] ?? 0) <= 0) continue;
        if ((state[UNIT_AGE + v] ?? 0) < 12) continue;
        if ((state[v] ?? 0) < (packedBytes[aT] ?? 0)) continue;
        if ((state[UNIT_Y + v] ?? 0) < (packedBytes[aT + 1] ?? 0)) continue;
        if ((state[v] ?? 0) > (packedBytes[aT + 2] ?? 0)) continue;
        if ((state[UNIT_Y + v] ?? 0) > (packedBytes[aT + 3] ?? 0)) continue;

        f.Q = toJavaByte(v);
        for (f.w = 51; f.w <= 100; f.w += 1) {
          const w = f.w;
          if ((state[UNIT_HP + w] ?? 0) <= 0) continue;
          if ((state[UNIT_AGE + w] ?? 0) < 12) continue;
          if (((state[UNIT_FLAGS + w] ?? 0) & 64) !== 0) continue;
          state[UNIT_FLAGS + w] = toJavaByte((state[UNIT_FLAGS + w] ?? 0) | 32);
        }
        break;
      }
    }

    // Offsets 449..888.
    for (f.v = u * 50 + 1; f.v <= (u + 1) * 50; f.v += 1) {
      const v = f.v;
      const aT = v - u * 50 - 1;
      const ready = (state[UNIT_HP + v] ?? 0) > 0 && (state[UNIT_AGE + v] ?? 0) >= 12;

      if (!ready) {
        if ((c & 63) !== (v & 31)) continue;
        if ((jobTable[aT] ?? 0) >= M) continue;

        for (let aU = u * 50 + 1; aU <= (u + 1) * 50; aU += 1) {
          const aUIdx = aU - u * 50 - 1;
          if ((jobTable[aUIdx] ?? 0) < M) continue;
          if ((state[UNIT_HP + v] ?? 0) <= 0) continue;
          if ((state[UNIT_AGE + v] ?? 0) < 12) continue;
          jobTable[aUIdx] = jobTable[aT] ?? 0;
          jobTable[aT] = toJavaByte(M);
          break;
        }
        continue;
      }

      if (((state[UNIT_FLAGS + v] ?? 0) & 64) === 0) {
        callbacks.onAt?.(v, aT);
        continue;
      }

      if (f.O >= 0) continue;
      if (((state[UNIT_FLAGS + v] ?? 0) & 2) === 0) continue;

      const result = callbacks.onCheckOccupancy?.(v, state[v] ?? 0, state[UNIT_Y + v] ?? 0, 0) ?? 0;
      if (result >= 29) continue;
      if ((state[UNIT_OFFSET_X + v] ?? 0) !== 0) continue;
      if ((state[UNIT_OFFSET_Y + v] ?? 0) !== 0) continue;

      state[UNIT_TARGET_X + v] = state[8384] ?? 0;
      state[UNIT_TARGET_Y + v] = state[8445] ?? 0;
      callbacks.onGroupMode?.(v, 1);
    }
  }

  if (f.Q < 0 && q !== 3 && c === aQ) {
    f.aR = aQ;
    callbacks.onAv?.();
  }
  if (f.O >= 0 && (c & 15) === 0) {
    callbacks.onAw?.();
  }

  return { aQ, aU: -1 };
}

function toJavaByte(value: number): number {
  const narrowed = value & 0xff;
  return narrowed >= 0x80 ? narrowed - 0x100 : narrowed;
}
