import { BLD_HP, BLD_KIND, BLD_PLANNED_KIND, BLD_WORK, BLD_WORKERS, BLD_WORKER_HEAD, BLD_X, BLD_Y, UNIT_MODE, UNIT_NEXT_WORKER, UNIT_RECORD, UNIT_TIMER, UNIT_TYPE } from "../../core/DenseLayout";
/**
 * Exact private void Z() (bytecode/b-javap.txt offsets 0..664), the AI's
 * own "train a new unit" trigger. Scans the current team's 30-slot
 * building roster (`dense[8505/8749/8627/8932/9237+aH]`, distinct from the
 * usual 50-slot unit roster) for one eligible building, accumulates
 * training progress, and once ready calls the real entity-allocation
 * method (`allocateLegacyRecord`, `LegacyRecordAllocator.ts`) -- the exact
 * same function player-triggered unit creation uses.
 *
 * CORRECTED while writing this port (re-traced the argument-building
 * sequence at offset 404..484): the `allocateLegacyRecord` call passes
 * `(team, x, y, type=2 CONSTANT, flags=<team-dependent>)`, not
 * `(team, x, y, type=<team-dependent>, flags)` as an earlier
 * docs/unknowns.md entry described. `type` is always the literal `2`;
 * it's the trailing `flags` argument that differs by team (team 1 always
 * passes `0`; team 0 looks up `packedBytes[packedOffsets[212]+f.b+f.q]/4`).
 * `allocateLegacyRecord` itself only uses `type` for its own `<12`
 * threshold branch (setting an initial `dense[2828+id]=17`), which `Z()`
 * immediately overwrites to `59` right after -- a two-stage init, not a
 * contradiction.
 *
 * `G()` (#243, 545 lines) is now fully derived/ported
 * (`LegacySubsystemEntityTrainingSlot.ts`, wired as `onG`). The visibility/
 * bounds check (`f.I:B`/`f.K:B`/`f.O:B`/`f.P:B`, `game.cameraColumn`/`KByte`/
 * `viewportO`/`viewportP`) is wired as `isInView` in
 * `LegacyRuntimeState.ts`'s `subsystemUnitTraining`.
 */
export type LegacySubsystemUnitTrainingInput = {
  readonly state: Int8Array;
  readonly team: number;
  readonly mainShort: Int16Array[];
  /** t[a_s[275 + f.b] + f.q] (offsets 37..57), the population-gate threshold for team 1. */
  readonly populationThreshold: number;
  /** t[a_s[212 + f.b] + f.q] / 4 (offsets 453..482), team 1's flags argument. */
  readonly teamOneFlags: number;
  /** f.q:B === 3 gate -- true when Z() should no-op entirely this call. */
  readonly sceneGateActive: boolean;
  /**
   * b.Q:B (#46) -- NOT the same field as game.screen (f's own frame-dispatch
   * selector); this is class b's own same-named field, meaning unclear.
   * Team 1 returns without spawning when this is > 0.
   */
  readonly subsystemQByte: number;
  /** private void G() (#243), LegacySubsystemEntityTrainingSlot.ts -- runs implicitly on the newly-allocated entity (v). */
  readonly onG?: (newEntityId: number) => void;
  /**
   * Offsets 247..358: team 1 skips a hut inside the view, `x` in
   * [f.I - 1, f.I + f.O] and `y` in [f.K - 1, f.K + f.P]; it spawns only off-screen.
   */
  readonly isInView?: (x: number, y: number) => boolean;
  /** allocateLegacyRecord, already fully ported/wired. */
  readonly allocateRecord: (team: number, x: number, y: number, type: number, flags: number) => number;
};

export function stepLegacySubsystemUnitTraining(input: LegacySubsystemUnitTrainingInput): void {
  const { state, team } = input;
  if (input.sceneGateActive) return;

  if (team === 1) {
    if ((input.mainShort[1]?.[11] ?? 0) >= input.populationThreshold) {
      input.mainShort[1]![18] = 0;
    }
    if ((input.mainShort[1]?.[18] ?? 0) !== -1) return;
  }

  for (let aH = team * 30 + 1; aH <= (team + 1) * 30; aH += 1) {
    if ((state[BLD_HP + aH] ?? 0) === 0) continue;
    if ((state[BLD_KIND + aH] ?? 0) !== 2) continue;
    if ((state[BLD_WORK + aH] ?? 0) !== 0) continue;
    if ((state[BLD_WORKERS + aH] ?? 0) > 3) continue;

    if (team === 0) {
      if ((state[BLD_PLANNED_KIND + aH] ?? 0) < 9) {
        if ((state[BLD_PLANNED_KIND + aH] ?? 0) >= 3) {
          state[BLD_PLANNED_KIND + aH] = toJavaByte((state[BLD_PLANNED_KIND + aH] ?? 0) + 1);
        }
        continue;
      }
    } else {
      const x = state[BLD_X + aH] ?? 0;
      const y = state[BLD_Y + aH] ?? 0;
      if (input.isInView?.(x, y) ?? false) continue;
      // Offsets 362..389: only team 1 reaches the a[u][18] reset; team 0's
      // `9237 >= 9` jumps straight to 390. CORRECTED 2026-10-10 (oracle run
      // 8, frame 11338): the reset ran for team 0 too, and the view test
      // was inverted (team 1 spawned only on-screen).
      input.mainShort[team]![18] = 0;
      if (input.subsystemQByte > 0) return;
    }


    state[BLD_PLANNED_KIND + aH] = 0;
    const x = state[BLD_X + aH] ?? 0;
    const y = state[BLD_Y + aH] ?? 0;
    // Offsets 440..483: `u == 0 ? 0 : t212 / 4` -- the table is team 1's. FIXED 2026-10-14 (oracle
    // run 15, play24 frame 75408, enemy 60 born at skill 2..3): the port gave it to team 0.
    const flags = team === 0 ? 0 : input.teamOneFlags;
    const v = input.allocateRecord(team, x, y, 2, flags);
    if (v < 1) return;

    state[UNIT_RECORD + v] = toJavaByte(aH);
    state[BLD_WORKERS + aH] = toJavaByte((state[BLD_WORKERS + aH] ?? 0) + 1);
    input.onG?.(v);
    state[UNIT_NEXT_WORKER + v] = state[BLD_WORKER_HEAD + aH] ?? 0;
    state[BLD_WORKER_HEAD + aH] = toJavaByte(v);
    state[UNIT_TIMER + v] = -3;
    state[UNIT_MODE + v] = 71;
    state[3030 + v] = 0;
    state[UNIT_TYPE + v] = 59;
    if (team === 1) return;
  }
}

function toJavaByte(value: number): number {
  const narrowed = value & 0xff;
  return narrowed >= 0x80 ? narrowed - 0x100 : narrowed;
}
