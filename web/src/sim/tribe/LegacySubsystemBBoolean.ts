import { RES_KIND, RES_X, RES_Y, UNIT_TARGET_X, UNIT_TARGET_Y, UNIT_VISION } from "../../core/DenseLayout";
/**
 * Direct port of `private boolean b(boolean)` (bytecode/b-javap.txt,
 * `grep -n "private boolean b(boolean);"` -> line 45246, offsets 0..364),
 * the "closest scored candidate" scan `stepLegacySubsystemBDecision`
 * invokes as its own `onBBoolean`.
 *
 * **CORRECTED 2026-09-07 (RETRACTED-PREMISE, was 2026-09-04)**: this file
 * previously threw unconditionally on the finding that `b.b:[S]` (#132) --
 * class b's own constructor-aliased copy of `f.b:[S]` (#245) -- is
 * permanently null. It is not: `e.f()` allocates the backing `new
 * short[570]` (e-javap.txt:1115), and this port already has it decoded as
 * `LegacyRuntimeState.saveOffsets` (the dense-array stride table, contents
 * 0, 101, 202, ...). Fully derived below for the first time.
 *
 * Scans a 50-slot scratch table (dense-state offsets 9833/9733/9783),
 * scoring each active record by a packed table-53 lookup keyed on a
 * clamped relative position (`saveOffsets[arg?0:62]+v` / `saveOffsets[arg?1:63]+v`,
 * the SAME table-53 idiom `LegacySubsystemNearbyMarkerLookup.ts` already
 * uses), and keeps the lowest-scoring one under a running threshold
 * (`E:B`#15, starts at 12; `arg` selects between a caller-supplied
 * threshold `dense[4949+v]` or the constant `9`). If a candidate wins
 * (`private boolean c(byte)` #360, b-javap.txt line 21972, NOT examined --
 * left as the pre-existing `onC` callback per this investigation's "leave
 * un-ported callees as callbacks" rule), it writes the entity's position
 * (dense 3131/3232) to that candidate's stored position and calls
 * `g(2)` (`b.g(int)`, already ported as `stepLegacyEntityGPrefix`,
 * `onG`).
 *
 * **Newly modeled here**: every qualifying loop iteration (regardless of
 * whether it beats the running best) unconditionally overwrites two of
 * class b's own persistent scalar byte fields -- `z:B`(#235) and
 * `A:B`(#6), i.e. `LegacySubsystemArrays.bField235`/`bField6` -- with that
 * iteration's relative-position delta (offsets 43..84 / 87..128, NOT
 * reset at method entry, unlike `E:B`/`aM:I` which are). These are read
 * by an already-ported sibling method, `final void a(byte,int,int)`
 * (#274, `LegacyEntityMoveTrigger.ts`), so their leftover post-loop value
 * (from whichever slot was scanned last, not necessarily the winner) is
 * genuinely externally observable and had to be threaded through as a
 * mutable `arrays` param rather than kept as a local. `C:B`(#11, the
 * per-iteration score) and `aM:I`(#88, the loop index) are reset to a
 * known value at every method entry across every method that touches
 * them (confirmed by grepping all `putfield`s of both across the class)
 * and are not read by anything outside this method, so they stay plain
 * locals (`score`/`slot`), matching the pre-existing convention (`E:B`
 * likewise stays a local, `bestScore`).
 */
export type LegacySubsystemBBooleanArrays = {
  /** b's own z:B (#235) -- LegacySubsystemArrays.bField235. */
  bField235: number;
  /** b's own A:B (#6) -- LegacySubsystemArrays.bField6. */
  bField6: number;
};

export type LegacySubsystemBBooleanInput = {
  readonly dense: Int8Array;
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
  /** f.b:[S] (#245) via its b.b:[S] (#132) alias, game.saveOffsets -- RETRACTED 2026-09-07, confirmed real. */
  readonly saveOffsets: Int16Array;
  readonly arrays: LegacySubsystemBBooleanArrays;
  readonly v: number;
  readonly arg: boolean;
  /** private boolean c(byte) (#360, b-javap.txt line 21972) -- not examined, left as a callback. */
  readonly onC?: (value: number) => boolean;
  /** b.g(int), always called with the literal 2 (offset 356..358). */
  readonly onG?: () => void;
};

function toByte(value: number): number {
  const narrowed = value & 0xff;
  return narrowed >= 0x80 ? narrowed - 0x100 : narrowed;
}

export function stepLegacySubsystemBBoolean(input: LegacySubsystemBBooleanInput): boolean {
  const { dense, packedBytes, packedOffsets, saveOffsets, arrays, v } = input;
  let bestScore = 12;
  let bestX = 0;
  let bestY = 0;

  for (let slot = 0; slot < 50; slot += 1) {
    if ((dense[RES_KIND + slot] ?? 0) === 0) continue;

    const zIndex = input.arg ? 0 : 62;
    const zBase = saveOffsets[zIndex] ?? 0;
    const z = toByte((dense[RES_X + slot] ?? 0) - (dense[zBase + v] ?? 0));
    arrays.bField235 = z;

    const aIndex = input.arg ? 1 : 63;
    const aBase = saveOffsets[aIndex] ?? 0;
    const a = toByte((dense[RES_Y + slot] ?? 0) - (dense[aBase + v] ?? 0));
    arrays.bField6 = a;

    const clampedA = (a <= -12 || a >= 12) ? 0 : (12 + a);
    const clampedZ = (z <= -12 || z >= 12) ? 0 : (12 + z);
    const tableIndex = clampedA * 25 + clampedZ;
    const score = toByte(Math.trunc((packedBytes[(packedOffsets[53] ?? 0) + tableIndex] ?? 0) / 10));

    const threshold = input.arg ? (dense[UNIT_VISION + v] ?? 0) : 9;
    if (score > threshold) continue;
    if (score >= bestScore) continue;

    if (input.onC?.(toByte(-slot - 61))) {
      bestX = dense[RES_X + slot] ?? 0;
      bestY = dense[RES_Y + slot] ?? 0;
      bestScore = score;
    }
  }

  if (bestScore < 12) {
    dense[UNIT_TARGET_X + v] = bestX;
    dense[UNIT_TARGET_Y + v] = bestY;
    input.onG?.();
    return true;
  }
  return false;
}
