import { UNIT_AGE } from "../../core/DenseLayout";
export type LegacySubsystemBEntryGateInput = {
  /** Original f.c frame counter, not the state-machine Q field. */
  readonly frame: number;
  /** Original b.v record id. */
  readonly id: number;
  /** Original b.u team partition. */
  readonly team: number;
  readonly state: Int8Array;
};

/** Exact b() offsets 0..59 gate before its first per-entity decision branch. */
export function legacySubsystemBEntryGate(input: LegacySubsystemBEntryGateInput): boolean {
  const { frame, id, team, state } = input;
  // Offsets 17..27 pick the frame condition; both paths then go through 30..52, the team-0 and
  // adult checks. FIXED 2026-10-09 (oracle run 5, frame 12203): a frame match returned true at
  // once, so A() also re-sorted the skills of raiders and children.
  if ((frame & 31) !== (id & 31) && frame !== 0) return false;
  if (team !== 0) return false;
  return (state[UNIT_AGE + id] ?? 0) >= 12;
}
