import { BLD_HP, BLD_KIND } from "../../core/DenseLayout";
/**
 * Exact `private void aq()` (bytecode/b-javap.txt offsets 0..1086),
 * team 1's per-tick AI entry point (`b.e()` calls this once per tick,
 * only when `u===1`).
 *
 * Re-traced instruction-by-instruction while writing this port (not just
 * the earlier structural pass) -- caught two real direction errors in the
 * earlier docs/unknowns.md entry, both in Section 1's inner loops:
 *
 *  1. The `f.a:[[[B]`(#74)`[u][aN]` scan (offset 191..216) searches for
 *     the first NONZERO slot, not the first zero -- `ifeq` branches to
 *     the "increment and continue" target, so a zero value continues the
 *     scan and a nonzero value breaks it. (Section 2's analogous scan
 *     over `f.b:[[[B]`(#139) really does search for the first ZERO --
 *     the two are genuinely different, not a copy-paste of the same
 *     logic.)
 *  2. The write this triggers (offset 307..369) is
 *     `scoutMemory[u][aN][ packedBytes[packedOffsets[109]+v] ] =
 *     packedBytes[packedOffsets[265]+f.q*5+aO]` -- the earlier entry had
 *     the index and the value swapped.
 *
 * Gate: `if (fByte(#167) >= 50) return;`. Then `M = packedBytes[
 * packedOffsets[220]+f.q]`, `A = packedBytes[packedOffsets[216]+f.q] *
 * 500` (CONFIRMED via direct trace: `f.q` is added to the packedBytes
 * INDEX here, the opposite pattern from `at()`'s `packedOffsets[221+f.q]`
 * -- each method's exact formula needs its own verification, they are
 * not uniform across this codebase). `if (aShort[u][11]>0 && Q<1)
 * this.ar();` then unconditionally `this.as();`.
 *
 * Section 1 (tick-gated: `game.missionFrame % (packedBytes[packedOffsets[264]+f.q]
 * *50) === 50`): for `aN` in `0..9`, skips when `scoutMemory[u][aN][11]
 * <= 0`; otherwise scans for the first nonzero `scoutMemory[u][aN][0..8]`
 * slot (skipping this `aN` entirely if none found), then -- when
 * `game.missionFrame > A/3` and `(R:B&63) < packedBytes[packedOffsets[268]+f.q]` --
 * for `aO` in `2..4`: writes `scoutMemory[u][aN][aO+4] =
 * packedBytes[packedOffsets[265]+f.q*5+aO]`, then loops `aS` up to that
 * just-written count, calling `n(266)` and searching `freeSlotTable(#173)
 * [0]` for a free row (0..28, first zero OR loop exhaustion both land at
 * the same place -- no distinct bounds check), writing a 4-column record
 * (`[0]=aP`, `[2]=dense[3131]`, `[3]=dense[3232]`, `[1]=aO+18` -- all
 * BARE indices, no `+v`/`+aN`, matching a global "last flagged position"
 * this project hasn't traced the producer of yet) and marking
 * `gridC[dense[3232]][dense[3131]] = -126`.
 *
 * Section 2 (tick-gated similarly via `packedOffsets[269]`, AND
 * `game.missionFrame>A/2`): scans the 30-slot building roster for
 * `dense[8505+aN]>0 && dense[8749+aN]===8`, then for `aS` up to
 * `packedBytes[packedOffsets[270]+f.q]`: calls `n(271)`, searches
 * `buildingQueue(#139)[u][0]` for a free row (first zero, or exhaustion),
 * writes `[0]=aN`, `[2]=dense[3131]`, `[3]=dense[3232]` (bare), `[1]=3`
 * (constant).
 *
 * `f.a:[[[B]`(#74)/`scoutMemory`, `f.b:[[[B]`(#139)/`buildingQueue`, and
 * `f.f:[[B]`(#173)/`freeSlotTable` are three previously-untracked fields;
 * exposed as plain mutable arrays here since their full semantics are
 * still unclear beyond what this method itself does with them.
 */
export type LegacySubsystemAqInput = {
  readonly state: Int8Array;
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
  readonly mainShort: Int16Array[];
  readonly gridC: Int8Array[];
  /** f.a:[[[B] (#74). */
  readonly scoutMemory: Int8Array[][];
  /** f.b:[[[B] (#139). */
  readonly buildingQueue: Int8Array[][];
  /** f.f:[[B] (#173). */
  readonly freeSlotTable: Int8Array[];
  readonly team: number;
  /** b.f:B (#167). */
  readonly fByte: number;
  readonly qByte: number;
  readonly rByte: number;
  readonly sceneQ: number;
  readonly simulationCounter: number;
};

export type LegacySubsystemAqCallbacks = {
  /** Offsets 10..61: putfield M:B (#36) and A:I (#7), before ar()/as() read them. */
  readonly onPrologue?: (m: number, a: number) => void;
  readonly onAr?: () => void;
  readonly onAs?: () => void;
  /** private void n(int) (#404): picks a random spot, its free cell lands in dense[3131]/[3232]. */
  readonly onN: (arg: number) => void;
};

export function stepLegacySubsystemAq(input: LegacySubsystemAqInput, callbacks: LegacySubsystemAqCallbacks): void {
  const {
    state, packedBytes, packedOffsets, mainShort, gridC, scoutMemory, buildingQueue, freeSlotTable,
    team: u, qByte: Q, rByte: R, sceneQ: q, simulationCounter: c,
  } = input;

  if (input.fByte >= 50) return;

  const M = packedBytes[(packedOffsets[220] ?? 0) + q] ?? 0;
  const A = (packedBytes[(packedOffsets[216] ?? 0) + q] ?? 0) * 500;
  callbacks.onPrologue?.(M, A);

  if ((mainShort[u]?.[11] ?? 0) > 0 && Q < 1) callbacks.onAr?.();
  callbacks.onAs?.();

  // Section 1.
  const period1 = (packedBytes[(packedOffsets[264] ?? 0) + q] ?? 0) * 50;
  if (period1 !== 0 && c % period1 === 50) {
    for (let aN = 0; aN < 10; aN += 1) {
      const aP = scoutMemory[u]?.[aN]?.[11] ?? 0;
      if (aP <= 0) continue;

      // Offsets 177..241: only a row whose slots 0..8 are all empty goes on
      // (`if_icmpge 244`, else `goto 738`). CORRECTED 2026-10-13 (oracle run
      // 13, play10 frame 30713): inverted, so the tribe never dropped its
      // -126 supply cells (n(266)).
      let aOFound = 0;
      while (aOFound < 9 && (scoutMemory[u]?.[aN]?.[aOFound] ?? 0) === 0) aOFound += 1;
      if (aOFound < 9) continue;

      for (let aO = 0; aO < 2; aO += 1) {
        for (let v = aO * 3; v < 5; v += 1) {
          const flag = mainShort[u]?.[5 + (packedBytes[(packedOffsets[109] ?? 0) + v] ?? 0)] ?? 0;
          if (flag === 0) continue;
          const slotIndex = packedBytes[(packedOffsets[109] ?? 0) + v] ?? 0;
          const value = packedBytes[(packedOffsets[265] ?? 0) + q * 5 + aO] ?? 0;
          if (scoutMemory[u]?.[aN]) scoutMemory[u][aN][slotIndex] = toJavaByte(value);
          break;
        }
      }

      if (c <= Math.trunc(A / 3)) continue;
      if ((R & 63) >= (packedBytes[(packedOffsets[268] ?? 0) + q] ?? 0)) continue;

      for (let aO = 2; aO < 5; aO += 1) {
        const count = packedBytes[(packedOffsets[265] ?? 0) + q * 5 + aO] ?? 0;
        if (scoutMemory[u]?.[aN]) scoutMemory[u][aN][aO + 4] = toJavaByte(count);

        for (let aS = 0; aS < count; aS += 1) {
          callbacks.onN(266);

          let aT = 0;
          while (aT < 29 && (freeSlotTable[0]?.[aT] ?? 0) !== 0) aT += 1;

          if (freeSlotTable[0]) freeSlotTable[0][aT] = toJavaByte(aP);
          if (freeSlotTable[2]) freeSlotTable[2][aT] = state[3131] ?? 0;
          if (freeSlotTable[3]) freeSlotTable[3][aT] = state[3232] ?? 0;
          if (freeSlotTable[1]) freeSlotTable[1][aT] = toJavaByte(aO + 18);

          const gy = state[3232] ?? 0;
          const gx = state[3131] ?? 0;
          if (gridC[gy]) gridC[gy][gx] = toJavaByte(-126);
        }
      }
    }
  }

  // Section 2.
  const period2 = (packedBytes[(packedOffsets[269] ?? 0) + q] ?? 0) * 50;
  if (period2 !== 0 && c % period2 === 50 && c > Math.trunc(A / 2)) {
    for (let aN = u * 30 + 1; aN <= (u + 1) * 30; aN += 1) {
      if ((state[BLD_HP + aN] ?? 0) <= 0) continue;
      if ((state[BLD_KIND + aN] ?? 0) !== 8) continue;

      const limit = packedBytes[(packedOffsets[270] ?? 0) + q] ?? 0;
      for (let aS = 0; aS < limit; aS += 1) {
        callbacks.onN(271);

        let aT = 0;
        while (aT < 29 && (buildingQueue[u]?.[0]?.[aT] ?? 0) !== 0) aT += 1;

        if (buildingQueue[u]?.[0]) buildingQueue[u][0][aT] = toJavaByte(aN);
        if (buildingQueue[u]?.[2]) buildingQueue[u][2][aT] = state[3131] ?? 0;
        if (buildingQueue[u]?.[3]) buildingQueue[u][3][aT] = state[3232] ?? 0;
        if (buildingQueue[u]?.[1]) buildingQueue[u][1][aT] = 3;
      }
    }
  }
}

function toJavaByte(value: number): number {
  const narrowed = value & 0xff;
  return narrowed >= 0x80 ? narrowed - 0x100 : narrowed;
}
