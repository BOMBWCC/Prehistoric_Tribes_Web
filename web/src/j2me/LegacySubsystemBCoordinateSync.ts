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

  dense[3131 + id] = dense[0 + id] ?? 0;
  dense[3232 + id] = dense[101 + id] ?? 0;

  if (((dense[2929 + id] ?? 0) & 255) <= 7) {
    const mask = (dense[1111 + id] ?? 0) & 15;
    const tableIndex =
      (packedOffsets[15] ?? 0) +
      ((dense[606 + id] ?? 0) & 1) * 9 +
      (dense[1010 + id] ?? 0) -
      (dense[7777 + id] ?? 0);
    const threshold = Math.trunc(((packedBytes[tableIndex] ?? 0) + 1) / 2);

    if (
      mask < threshold &&
      (dense[1313 + id] ?? 0) >= 0 &&
      (dense[808 + id] ?? 0) > 0
    ) {
      const offset606 = dense[606 + id] ?? 0;
      dense[3131 + id] = toByte(
        (dense[3131 + id] ?? 0) + (packedBytes[(packedOffsets[1] ?? 0) + offset606] ?? 0),
      );
      dense[3232 + id] = toByte(
        (dense[3232 + id] ?? 0) + (packedBytes[(packedOffsets[1] ?? 0) + 8 + offset606] ?? 0),
      );
    }
  }

  dense[808 + id] = 0;

  if (markSpawn) {
    dense[6262 + id] = dense[3131 + id] ?? 0;
    dense[6363 + id] = dense[3232 + id] ?? 0;
    input.onSpawnMark?.(id);
  }
}

function toByte(value: number): number {
  const narrowed = value & 0xff;
  return narrowed >= 0x80 ? narrowed - 0x100 : narrowed;
}
