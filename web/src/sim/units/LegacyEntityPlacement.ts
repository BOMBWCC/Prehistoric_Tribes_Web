import { canPlaceLegacyFootprint } from "../world/LegacyFootprintCheck";
import { BLD_HP, BLD_KIND, BLD_LEVEL, BLD_MAX_HP, BLD_OWNER, BLD_PLANNED_KIND, BLD_WORK, BLD_WORKERS, BLD_WORKER_HEAD, BLD_X, BLD_Y } from "../../core/DenseLayout";
import { T_BUILDING, T_BUILDING_MAX_LEVEL } from "../../core/DataTables";

/** Raw port of f.a(byte,int,int,int,int,boolean,int). */
export type LegacyEntityPlacementInput = {
  readonly state: Int8Array;
  readonly map: Int8Array[];
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
  readonly mainShort: Int16Array[];
  readonly typeZeroRows: Int8Array[][];
  /** Raw f:[[B (4 rows x 30 columns), field #291. */
  readonly auxiliarySlots: Int8Array[];
  readonly auxiliaryIndex: number;
  readonly mapWidth: number;
  readonly mapHeight: number;
  readonly occupancyClass: (x: number, y: number) => number;
  /**
   * f.q:I (#356) -- BUG FIX (2026-08-18): this and `qByte` below used to be
   * a single merged `q` parameter, but direct bytecode reads confirm the
   * type>=20&&type<=22 branch's `auxiliarySlots[0][id]` write (offset 239)
   * and the team===0 default path's table-113 lookup (offset 546/558) read
   * TWO genuinely different constant-pool fields (#356 vs #357) that only
   * differ by one index number -- a real design-level bug in this pure
   * function itself, not just a wiring mistake at the call site.
   */
  readonly qCounter: number;
  /** f.q:B (#357) -- see `qCounter`'s docblock for the split rationale. */
  readonly qByte: number;
  /** f.s:I (#364)/`game.cSInt` -- confirmed via direct bytecode read (offset 294..303). */
  readonly frameS: number;
  readonly teamZeroSlotValue: number;
  readonly teamOneSlotValue: number;
  readonly suppressCounters: boolean;
  readonly onCapacityFailure?: (kind: "thirty-slots" | "ten-slots", team: number) => void;
  readonly onFootprintMarked?: (x: number, y: number, width: number, height: number, id: number) => void;
  readonly onTeamZeroSubsystem?: (x: number, y: number, value: number) => void;
  readonly onTenSlotAllocate?: (id: number) => boolean;
  readonly onTenSlotRelease?: (id: number) => void;
  readonly onTeamZeroReset?: (mode: number, x: number, y: number, flags: number) => void;
};

export function placeLegacyEntity(
  input: LegacyEntityPlacementInput,
  team: number,
  type: number,
  x: number,
  y: number,
  flags: number,
  specialPlacement: boolean,
  existingId: number,
): number {
  const tableBase = input.packedOffsets[T_BUILDING];
  const width = input.packedBytes[tableBase + 104 + type];
  const height = input.packedBytes[tableBase + 130 + type];
  const partitionBase = 1 + team * 30;
  let id = 0;
  while (id < 30 && input.state[BLD_HP + partitionBase + id] !== 0) id += 1;
  if (id >= 30) {
    input.onCapacityFailure?.("thirty-slots", team);
    return -1;
  }
  id = existingId === -1 ? id + partitionBase : existingId;

  if (existingId === -1 && !canPlaceLegacyFootprint({
    map: input.map,
    packedBytes: input.packedBytes,
    packedOffsets: input.packedOffsets,
    mapWidth: input.mapWidth,
    mapHeight: input.mapHeight,
    occupancyClass: input.occupancyClass,
  }, x, y, type, !specialPlacement)) return -2;

  if (type >= 20 && type <= 22) {
    if (existingId === -1) {
      let auxiliaryId = 0;
      while (auxiliaryId < 30 && input.auxiliarySlots[0][auxiliaryId] !== 0) auxiliaryId += 1;
      id = auxiliaryId;
    }
    if (id === 30) return -1;
    input.auxiliarySlots[0][id] = toByte(input.qCounter);
    input.auxiliarySlots[2][id] = toByte(x);
    input.auxiliarySlots[3][id] = toByte(y);
    input.auxiliarySlots[1][id] = toByte(type);
    if (!specialPlacement) {
      // The counter is in f's a[[[B field (#132), not in f:[[B (#291).
      input.typeZeroRows[0][input.auxiliaryIndex][6 + input.frameS - 20] =
        toByte(input.typeZeroRows[0][input.auxiliaryIndex][6 + input.frameS - 20] + 1);
      input.map[y][x] = team === 0 ? -123 : -126;
    } else {
      input.map[y][x] = toByte(20 - type - 111 - team * 6);
    }
    input.onFootprintMarked?.(x, y, 1, 1, id);
    return id;
  }

  if (type === 0) {
    let row = 0;
    while (row < 10 && input.typeZeroRows[team][row][11] !== 0) row += 1;
    if (row >= 10) return -1;
    input.typeZeroRows[team][row][11] = toByte(id);
  }
  input.onFootprintMarked?.(x, y, width, height, id);
  input.state[BLD_X + id] = toByte(x);
  input.state[BLD_Y + id] = toByte(y);
  input.state[BLD_KIND + id] = toByte(type);
  input.state[8871 + id] = 0;
  input.state[9176 + id] = 0;
  input.state[BLD_WORKERS + id] = 0;
  input.state[BLD_WORKER_HEAD + id] = 0;
  input.state[9054 + id] = 0;

  // Offsets 529..591: level = flags != 0 ? flags : t113[row(q) + type].
  // FIXED 2026-10-07: was `team === 0 ? t113[..] : unchanged`, so a finished
  // hut site (placed with flags 1) came out at the table's level 2 -- already
  // the maximum, so UPGRADE never showed -- and team 1's buildings kept 0.
  let level = flags;
  if (level === 0) {
    const tableOffset = input.packedOffsets[T_BUILDING_MAX_LEVEL] + (input.qByte < 2 ? 0 : input.qByte === 2 ? 12 : 24) + type;
    level = input.packedBytes[tableOffset];
  }
  input.state[BLD_LEVEL + id] = toByte(level);
  input.state[BLD_OWNER + id] = 0;
  input.state[8688 + id] = 5;
  input.state[BLD_WORK + id] = 0;
  input.state[BLD_HP + id] = input.packedBytes[tableBase + 182 + type];
  input.state[BLD_MAX_HP + id] = input.state[BLD_HP + id];

  if (type >= 12 && type <= 19) {
    if (!input.onTenSlotAllocate?.(id)) {
      input.onCapacityFailure?.("ten-slots", team);
      input.state[BLD_HP + id] = 0;
      return -1;
    }
    input.state[BLD_PLANNED_KIND + id] = toByte(team === 0 ? input.teamZeroSlotValue : input.teamOneSlotValue);
    input.state[BLD_MAX_HP + id] = input.packedBytes[tableBase + 182 + input.state[BLD_PLANNED_KIND + id]];
    input.state[BLD_LEVEL + id] = 3;
  } else if (team === 0) {
    input.onTeamZeroSubsystem?.(
      input.state[BLD_X + id] + Math.floor(width / 2),
      input.state[BLD_Y + id] + Math.floor(height / 2),
      input.state[8688 + id] & 15,
    );
  }

  for (let yy = 0; yy < height; yy += 1) {
    for (let xx = 0; xx < width; xx += 1) input.map[y + yy][x + xx] = toByte(-id);
  }
  if (type === 2) {
    input.mainShort[team][16] = Math.min(50, input.mainShort[team][16] + 4);
  }
  if (!input.suppressCounters && existingId === -1) {
    input.mainShort[team][14] += 1;
    input.mainShort[team][20] += 1;
  }
  if (type === 2) input.onTenSlotRelease?.(id);
  if (specialPlacement && team === 0) input.onTeamZeroReset?.(5, x, y, 0);
  return id;
}

function toByte(value: number): number {
  const narrowed = value & 0xff;
  return narrowed >= 0x80 ? narrowed - 0x100 : narrowed;
}
