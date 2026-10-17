import { UNIT_AGE, UNIT_HP, UNIT_NEXT_WORKER, UNIT_SCOUT_SKILL } from "../../core/DenseLayout";
/** Outer, bytecode-backed control flow of b.e(). */
export type LegacySubsystemEntityLoopInput = {
  readonly state: Int8Array;
  readonly mainShort: Int16Array[];
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
  readonly frame: number;
  readonly q: number;
  readonly bByte: number;
  readonly scheduler: { kByte: number };
  readonly onPrepass?: () => void;
  readonly onTeamOneAuxiliary?: () => void;
  readonly onTeamStart?: (team: number) => void;
  /**
   * b.v:I (#225) writes: b.e() keeps its entity index in the FIELD (offsets 150, 728), and so does
   * the 1..4 cap loop at the end (777, 826). Everything the loop calls reads that ambient v -- e.g.
   * C() after a type change. Added 2026-10-09 (oracle run 4, frame 4758): the port kept it local,
   * so C() updated whichever unit v last pointed at, not the one whose type changed.
   */
  readonly onV?: (v: number) => void;
  /**
   * b.v:I read back: offsets 721..731 step the loop as `v = v + 1` on the field, so a callee that
   * writes v moves the loop. f.b(II) (a scene regroup inside a unit's turn) sets v = 0, and the
   * original then runs units 1.. again in the same tick. Added 2026-10-14 (oracle run 15, play22
   * frame 70887): the port stepped a local index.
   */
  readonly readV?: () => number;
  /**
   * b.e() offset 29..34: `a(0)` (#281, the worker dispatch), with the result
   * popped. CORRECTED 2026-09-22: this used to be typed `(team) => void` and
   * named as if it took the team; the argument is the literal 0 and the team
   * is the ambient `u:I` the dispatch reads for itself.
   */
  readonly onWorkerDispatchPass?: (argument: number) => void;
  readonly onEntityTargetStep?: (id: number) => void;
  readonly onEntityStatusCheck?: (id: number) => boolean;
  readonly onEntityTimingCheck?: (id: number) => boolean;
  readonly onPeriodicEntityAction?: (id: number) => void;
  readonly onEntityDecisionCheck?: (id: number) => boolean;
  readonly onEntityCoreUpdate?: (id: number, team: number) => void;
  readonly onEntityLoopTail?: (id: number, team: number) => void;
  readonly onTeamEnd?: (team: number) => void;
  readonly onFinalScriptedPass?: () => void;
};

/**
 * Preserves b.e()'s team/record order and all visible scalar gates. The
 * private entity methods remain callbacks because their semantics are still
 * being reconstructed from separate bytecode bodies.
 */
export function runLegacySubsystemEntityLoop(input: LegacySubsystemEntityLoopInput): void {
  input.onPrepass?.();
  for (let team = 0; team < 2; team += 1) {
    // b.e() offsets 4..6 and 738..745: `u:I = 0` before the loop and `u:I += 1`
    // at the end of each iteration, i.e. u:I IS the team index the whole body
    // reads. BUG FIX (2026-09-10): the port kept the loop variable local and
    // never wrote the field, so `game.bTeam` held whatever b.h()/b.ak()
    // last left in it -- measured 50. b()'s own gate is
    // `if (u != 0) goto 660; ... 660: if (u != 1) return`, so a u of 50
    // returned immediately for EVERY entity, every round, which is what kept
    // `dense[5050+id]` from ever being cleared and in turn kept b()'s p() gate
    // shut. onTeamStart fires at the top of each iteration, so wiring the field
    // there reproduces both writes.
    input.onTeamStart?.(team);
    // Offsets 18..26: aq() runs with u:I already 1 -- its as() -> av() -> L() equips the new raiders
    // from team u's pool. FIXED 2026-10-09 (oracle run 5, frame 12188): it ran before u was set.
    if (team === 1) input.onTeamOneAuxiliary?.();

    input.onWorkerDispatchPass?.(0);
    // Offsets 36..139: the courtship timer a[u][18] only counts while >= 0; at
    // the threshold it becomes -1 and stays there until a(boolean) pairs a
    // couple (a[u][18] = 0). Team 1's threshold is `t[273 + f.b][f.q] * 50`.
    // CORRECTED 2026-09-15: the port counted -1 back up to 0 the next frame
    // and indexed the threshold as t138[273 + f.b + f.q].
    if (input.mainShort[team][18] >= 0) input.mainShort[team][18] += 1;
    const threshold = team === 0
      ? 750
      : input.packedBytes[(input.packedOffsets[273 + input.bByte] ?? 0) + input.q] * 50;
    if (input.mainShort[team][18] >= threshold) input.mainShort[team][18] = -1;

    let id = 1 + team * 50;
    for (; id <= (team + 1) * 50; id = (input.readV?.() ?? id) + 1) {
      input.onV?.(id);
      if (input.state[UNIT_HP + id] === 0) continue;
      if (input.onEntityStatusCheck?.(id)) continue;

      // Offsets 199..231: a 4545 link in -122..-111 jumps straight to v() (offset 324), skipping
      // t(), h(), B() and b(). FIXED 2026-10-13 (oracle run 15, play11 frame 48459): only t() was
      // skipped, so a FORM UP unit (4545 = -119) ran b() and re-routed off its attack.
      const sparseValue = input.state[UNIT_NEXT_WORKER + id];
      if (sparseValue > -111 || sparseValue < -122) {
        input.onEntityTargetStep?.(id);
        if (input.state[UNIT_SCOUT_SKILL + id] > 3 && input.onEntityTimingCheck?.(id)) continue;

        if (
          team === 0 &&
          input.frame % 15 === (id & 7) &&
          input.state[UNIT_AGE + id] >= 12
        ) input.onPeriodicEntityAction?.(id);

        if (input.onEntityDecisionCheck?.(id)) continue;
      }
      input.onEntityCoreUpdate?.(id, team);
      input.onEntityLoopTail?.(id, team);
    }
    input.onV?.(id);
    // b.e()'s own offset 734..737 (private void Z()), fired once per team
    // right after that team's entity loop finishes, before `u:I` (team)
    // increments.
    input.onTeamEnd?.(team);
  }

  // Offsets 745 -> 9: the loop exits with u:I = 2, which later readers see (oracle, 2026-10-09).
  input.onTeamStart?.(2);
  input.onFinalScriptedPass?.();
  if (input.scheduler.kByte < 50) input.scheduler.kByte += 1;
  for (let index = 1; index <= 4; index += 1) {
    input.onV?.(index);
    if (input.mainShort[0][index] > 999) input.mainShort[0][index] = 999;
  }
  input.onV?.(5);
}
