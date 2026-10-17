import { BLD_HP, BLD_KIND, BLD_MAX_HP, BLD_WORK } from "../../core/DenseLayout";
/** Raw candidate selection performed by b.g() before its private entity helpers. */
export type LegacyEntityUpdateSelectionInput = {
  readonly state: Int8Array;
  readonly simulationCounter: number;
  /** Original f[4][30] auxiliary table. */
  readonly auxiliaryF: Int8Array[];
  /** Original b.g[3][20] association table. */
  readonly subsystemG: Int8Array[];
  readonly onPeriodicReset?: () => void;
  readonly onPreUpdate?: () => void;
  readonly onCandidate?: (candidate: LegacyEntityUpdateCandidate) => void;
  /**
   * All three real gates below (association/capacity/flag) converge on the
   * SAME bytecode call site (offset 432..448 of b.g()): `f.a(id,true)`
   * (`filterLegacyEntityLifecycle`) followed by `b.ad()`
   * (`cleanupLegacyEntityUpdate`), then the id is skipped for this pass.
   * Previously modeled as three separate `onBlocked` reasons that just
   * skipped the id with no side effect -- CORRECTED (2026-08-24) after a
   * direct bytecode re-read found: (1) the capacity condition was
   * inverted (real gate is `state[8505+id] >= state[8566+id]`, not `<`),
   * (2) the flag condition was inverted too (real gate is
   * `(state[9054+id] & 1) !== 0`, not `=== 0`), and (3) the flag check
   * was applied unconditionally instead of nested inside `mode !== 0`
   * (so `mode === 0` entities were wrongly checked against it at all).
   * None of this was previously observable: no real caller ever passed
   * these callbacks, so the bugs shipped silently.
   */
  readonly onCleanup?: (id: number, associationIndex: number) => void;
};

export type LegacyEntityUpdateCandidate = {
  readonly id: number;
  readonly team: number;
  readonly type: number;
  readonly associationIndex: number;
};

/**
 * Preserves the proven outer selection gates of b.g(). Inner calls (`aa`,
 * `ad`, `ae`, and the movement/combat helpers) remain explicit boundaries.
 */
export function selectLegacyEntityUpdateCandidates(input: LegacyEntityUpdateSelectionInput): void {
  if (input.simulationCounter % 10 === 0) input.onPeriodicReset?.();
  input.onPreUpdate?.();

  for (let team = 0; team < 2; team += 1) {
    for (let id = 1 + team * 30; id <= (team + 1) * 30; id += 1) {
      if (input.state[BLD_HP + id] === 0) continue;
      const type = input.state[BLD_KIND + id];
      if ((input.simulationCounter & 15) === 0) {
        input.state[9054 + id] = toByte(input.state[9054 + id] & 127);
      }
      if (type < 12 && type !== 4 && type !== 2 && input.state[BLD_WORK + id] === 0) continue;

      let associationIndex = 0;
      if (type >= 12) {
        while (associationIndex < 10 && input.auxiliaryF[0][associationIndex] !== id) associationIndex += 1;
      }
      if (input.state[BLD_WORK + id] !== 0) {
        while (associationIndex < 20 && input.subsystemG[0][associationIndex] !== id) associationIndex += 1;
      }

      const mode = input.state[BLD_WORK + id];
      if (mode !== 0) {
        const g2 = input.subsystemG[2][associationIndex];
        const g1 = input.subsystemG[1][associationIndex];
        if (g2 > 0 && g1 >= g2 && mode === 1) {
          input.onCleanup?.(id, associationIndex);
          continue;
        }
        if (mode === 2 && input.state[BLD_HP + id] >= input.state[BLD_MAX_HP + id]) {
          input.onCleanup?.(id, associationIndex);
          continue;
        }
        if ((input.state[9054 + id] & 1) !== 0) {
          input.onCleanup?.(id, associationIndex);
          continue;
        }
      }
      input.onCandidate?.({ id, team, type, associationIndex });
    }
  }
}

function toByte(value: number): number {
  const narrowed = value & 0xff;
  return narrowed >= 0x80 ? narrowed - 0x100 : narrowed;
}
