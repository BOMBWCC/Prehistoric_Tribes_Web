import { T_MISSION_RULES } from "../../core/DataTables";
export type LegacySubsystemAkInput = {
  /** f.q:B. */
  readonly q: number;
  /** f.u:B (#224 via b, #372 in f) -- the win/lose countdown f.j() runs to 41 or 90. */
  u: number;
  /** b.f:B (#167), the mission-script step. */
  fByte: number;
  /** b.a:[B -- the dense entity bank (8506 is record 1's HP). */
  readonly dense: Int8Array;
  readonly shortRows: Int16Array[];
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
  /** f.c() (#365). */
  readonly onMapSession?: () => void;
};

/**
 * Exact b.ak() (bytecode/b-javap.txt, offsets 0..244): the mission win/lose
 * check. t279[q] bit 0 lets "enemy force a[1][14] gone" win (u = 1, f.j()
 * then counts to 41); bit 1 lets "record 1 (our home) destroyed" lose, and
 * losing every unit (a[0][11] <= 0) always loses (u = 50, counted to 90).
 * With a[1][14] <= 4 and no enemy left (a[1][11] <= 0): mission 5 wins (or,
 * at u == 20, resets and calls f.c()), mission 2 jumps its script to step 2.
 *
 * CORRECTED 2026-09-24: `u` was wired to b.u:I instead of f.u:B, so this
 * never started the countdown; the lose test was an AND where the bytecode
 * has `a[0][11] <= 0 || (dense[8506] <= 0 && bit 1)`, and 8506 was read
 * from packedBytes; the tail tested our population a[0][11] instead of the
 * enemy's a[1][11].
 */
export function stepLegacySubsystemAk(input: LegacySubsystemAkInput): void {
  const flags = input.packedBytes[(input.packedOffsets[T_MISSION_RULES] ?? 0) + input.q] ?? 0;
  const ours = input.shortRows[0]?.[11] ?? 0;
  const enemyForce = input.shortRows[1]?.[14] ?? 0;
  const enemies = input.shortRows[1]?.[11] ?? 0;

  if (enemyForce <= 0 && (flags & 1) !== 0) {
    if (input.u === 0) input.u = 1;
  } else if (ours <= 0 || ((input.dense[8506] ?? 0) <= 0 && (flags & 2) !== 0)) {
    if (input.u === 0) input.u = 50;
  }

  if (enemyForce > 4 || enemies > 0) return;
  if (input.q === 5) {
    if (input.u === 0) input.u = 1;
    else if (input.u === 20) {
      input.u = 0;
      input.onMapSession?.();
    }
  } else if (input.q === 2 && input.fByte < 2) {
    input.fByte = 2;
  }
}
