import { BLD_KIND, BLD_OWNER, BLD_WORK, BLD_WORKERS, UNIT_HP, UNIT_RECORD, UNIT_SLOT, UNIT_TIMER } from "../../core/DenseLayout";
/**
 * Exact private void ac() (bytecode/b-javap.txt offsets 0..164), part of
 * the AI building-economy cluster (`b.g()`'s throttled sub-call). Scans
 * every entity on the current building's own team, counts how many are
 * currently linked to and training at building `v`, and writes that count
 * into `dense[8932+v]` (the "how many units this building is currently
 * producing" field `K()`/`Z()`/`g()` all read).
 *
 * CORRECTED 2026-08-27 while writing this port: an earlier docs/unknowns.md
 * entry had the tail condition backwards -- the `dense[8810+v]` branch's
 * extra checks read `dense[8749+v]`/`dense[8627+v]` (the BUILDING's own
 * kind/busy flags), not `dense[8749+id]`/`dense[8627+id]` (the looped
 * entity's). Re-verified via a fresh JVM-stack trace before shipping this
 * file; the doc entry has been fixed to match.
 */
export type LegacySubsystemTrainingCountInput = {
  readonly state: Int8Array;
  readonly team: number;
  readonly buildingId: number;
  /**
   * b.C:I (#10), the counter this method increments (offsets 130..137) and
   * then stores into `8932[v]` (offsets 146..163). CORRECTED 2026-09-20: it
   * is a FIELD, not a local -- `g()` zeroes it before `aa()`, `aa()` counts
   * the record's own workers into it, and `ac()` continues from that value.
   * Counting from 0 here dropped every worker `aa()` had just counted.
   */
  readonly scratch?: { C: number };
};

export function stepLegacySubsystemTrainingCount(input: LegacySubsystemTrainingCountInput): void {
  const { state, team, buildingId: v } = input;
  const base = team * 50 + 1;
  let count = input.scratch?.C ?? 0;

  for (let id = base; id <= base + 49; id += 1) {
    if ((state[UNIT_HP + id] ?? 0) <= 0) continue;
    if ((state[UNIT_RECORD + id] ?? 0) !== v) continue;
    if ((state[UNIT_SLOT + id] ?? 0) >= 0) continue;
    if ((state[UNIT_TIMER + id] ?? 0) !== -1) continue;

    if (id === (state[BLD_OWNER + v] ?? 0)) {
      if ((state[BLD_KIND + v] ?? 0) !== 2) continue;
      if ((state[BLD_WORK + v] ?? 0) !== 0) continue;
    }
    count += 1;
  }

  if (input.scratch) input.scratch.C = count;
  state[BLD_WORKERS + v] = toJavaByte(count);
}

function toJavaByte(value: number): number {
  const narrowed = value & 0xff;
  return narrowed >= 0x80 ? narrowed - 0x100 : narrowed;
}
