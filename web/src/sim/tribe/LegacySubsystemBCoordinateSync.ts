import { UNIT_DIRECTION, UNIT_HOME_X, UNIT_HOME_Y, UNIT_MODE, UNIT_SPEED, UNIT_TARGET_X, UNIT_TARGET_Y, UNIT_TIMER, UNIT_Y } from "../../core/DenseLayout";
/**
 * Direct port of class b's `private void a(int, boolean)` (bytecode/
 * b-javap.txt offsets 0..289), `final void c()`'s (`subsystemBC`'s own
 * team-1..50 sweep) `onA` seam, which passes `arg2=false`. With `arg2`
 * true (the mission scripts' and c(boolean)'s callers) offsets 245..286
 * save the target into 6262/6363 and call `a(id, 69)` (#275, the type
 * change -- `onSpawnMark`, wired 2026-09-27; it was documented as an
 * unported no-op).
 */
export type LegacySubsystemBCoordinateSyncInput = {
  readonly dense: Int8Array;
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
  readonly onSpawnMark?: (id: number) => void;
};

export function syncLegacySubsystemBCoordinate(
  input: LegacySubsystemBCoordinateSyncInput,
  id: number,
  markSpawn: boolean,
): void {
  const { dense, packedBytes, packedOffsets } = input;

  dense[UNIT_TARGET_X + id] = dense[0 + id] ?? 0;
  dense[UNIT_TARGET_Y + id] = dense[UNIT_Y + id] ?? 0;

  if (((dense[UNIT_MODE + id] ?? 0) & 255) <= 7) {
    const mask = (dense[1111 + id] ?? 0) & 15;
    const tableIndex =
      (packedOffsets[15] ?? 0) +
      ((dense[UNIT_DIRECTION + id] ?? 0) & 1) * 9 +
      (dense[UNIT_SPEED + id] ?? 0) -
      (dense[7777 + id] ?? 0);
    const threshold = Math.trunc(((packedBytes[tableIndex] ?? 0) + 1) / 2);

    if (
      mask < threshold &&
      (dense[UNIT_TIMER + id] ?? 0) >= 0 &&
      (dense[808 + id] ?? 0) > 0
    ) {
      const offset606 = dense[UNIT_DIRECTION + id] ?? 0;
      dense[UNIT_TARGET_X + id] = toByte(
        (dense[UNIT_TARGET_X + id] ?? 0) + (packedBytes[(packedOffsets[1] ?? 0) + offset606] ?? 0),
      );
      dense[UNIT_TARGET_Y + id] = toByte(
        (dense[UNIT_TARGET_Y + id] ?? 0) + (packedBytes[(packedOffsets[1] ?? 0) + 8 + offset606] ?? 0),
      );
    }
  }

  dense[808 + id] = 0;

  if (markSpawn) {
    dense[UNIT_HOME_X + id] = dense[UNIT_TARGET_X + id] ?? 0;
    dense[UNIT_HOME_Y + id] = dense[UNIT_TARGET_Y + id] ?? 0;
    input.onSpawnMark?.(id);
  }
}

function toByte(value: number): number {
  const narrowed = value & 0xff;
  return narrowed >= 0x80 ? narrowed - 0x100 : narrowed;
}
