import { UNIT_DIRECTION, UNIT_HOME_X, UNIT_HOME_Y, UNIT_HP, UNIT_MODE, UNIT_OFFSET_X, UNIT_OFFSET_Y, UNIT_ORDER, UNIT_SPEED, UNIT_TARGET_X, UNIT_TARGET_Y, UNIT_TYPE, UNIT_VISION, UNIT_Y } from "../core/DenseLayout";
/**
 * Raw port of final f.b(int,int).
 *
 * The overload is intentionally separate from f.b(int): it clears active
 * footprints, performs the map/packed-table gate, updates one record, and
 * invokes b.a(III) through an explicit subsystem boundary.
 */
export type LegacyFPairCommandInput = {
  readonly dense: Int8Array;
  readonly map: Int8Array[];
  readonly subsystem: { v: number };
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
  /** b.a(IIII)Z (#474), with b.v = 0. */
  readonly onFootprintProbe?: (mode: number, value: number, x: number, y: number) => boolean;
  readonly onRecordAction?: (x: number, y: number, value: number) => void;
};

export function stepLegacyFPairCommand(
  input: LegacyFPairCommandInput,
  x: number,
  y: number,
): void {
  const { dense, map } = input;

  // Bytecode 0..52: clear c[e[101+i]][e[i]] for active records 1..50.
  for (let id = 1; id <= 50; id += 1) {
    if ((dense[UNIT_HP + id] ?? 0) <= 0) continue;
    const row = dense[UNIT_Y + id] ?? 0;
    const column = dense[id] ?? 0;
    const rowData = map[row];
    if (rowData) rowData[column] = 0;
  }

  // Bytecode 53..570, per living record 1..50. FIXED 2026-10-14 (oracle run 15, play21 frame
  // 64816, mission 4's regroup at (52, 7)): offset 82 is `ifeq 124` -- an empty cell skips only
  // the probe, not the record (the port skipped every record, leaving the party off the grid);
  // the probe is b.a(1, 127, x, y) with b.v = 0 (the port passed mode 0 and the record id); and
  // the -128 cell is c[y + t1[8 + 606]][x + t1[606]], tested against t15[...] whose index does
  // not include `1111 & 15`.
  for (let id = 1; id <= 50; id += 1) {
    if ((dense[UNIT_HP + id] ?? 0) <= 0) continue;
    if ((map[y]?.[x] ?? 0) !== 0) {
      input.subsystem.v = 0;
      input.onFootprintProbe?.(1, 127, x, y);
      // The shared candidate cell, which the probe wrote for b.v = 0; it stays for later records.
      x = dense[3131] ?? 0;
      y = dense[3232] ?? 0;
    }

    if (((dense[UNIT_MODE + id] ?? 0) & 0xff) <= 7) {
      const thresholdIndex =
        (input.packedOffsets[15] ?? 0)
        + (((dense[UNIT_DIRECTION + id] ?? 0) & 1) * 9)
        + (dense[UNIT_SPEED + id] ?? 0)
        - (dense[7777 + id] ?? 0);
      const threshold = Math.trunc(((input.packedBytes[thresholdIndex] ?? 0) + 1) / 2);
      if (((dense[1111 + id] ?? 0) & 15) < threshold) {
        const facing = dense[UNIT_DIRECTION + id] ?? 0;
        const row = (dense[UNIT_Y + id] ?? 0) + (input.packedBytes[(input.packedOffsets[1] ?? 0) + 8 + facing] ?? 0);
        const column = (dense[id] ?? 0) + (input.packedBytes[(input.packedOffsets[1] ?? 0) + facing] ?? 0);
        const rowData = map[row];
        if (rowData?.[column] === -128) rowData[column] = 0;
      }
    }

    dense[id] = x;
    dense[UNIT_HOME_X + id] = x;
    dense[UNIT_TARGET_X + id] = x;
    dense[UNIT_Y + id] = y;
    dense[UNIT_HOME_Y + id] = y;
    dense[UNIT_TARGET_Y + id] = y;
    dense[UNIT_OFFSET_X + id] = 0;
    dense[UNIT_OFFSET_Y + id] = 0;
    dense[808 + id] = 0;
    dense[UNIT_TYPE + id] = 69;
    dense[UNIT_MODE + id] = 8;
    dense[3030 + id] = 0;
    dense[UNIT_ORDER + id] = 0;
    const updatedRow = map[y];
    if (updatedRow) updatedRow[x] = id;
    input.onRecordAction?.(x, y, dense[UNIT_VISION + id] ?? 0);
  }
}
