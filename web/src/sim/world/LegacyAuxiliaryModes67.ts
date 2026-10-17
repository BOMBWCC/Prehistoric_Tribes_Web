import { ANIMAL_TARGET, BLD_HP, BLD_KIND, BLD_WORKERS, BLD_X, BLD_Y, UNIT_FLAGS, UNIT_HP, UNIT_SCOUT_SKILL } from "../../core/DenseLayout";
import { T_BUILDING } from "../../core/DataTables";
/** Raw mode 6/7 gates of b.a(int,int,int,int), offsets 890..1763. */
export type LegacyAuxiliaryModes67Input = {
  readonly mode: 6 | 7;
  readonly B: number;
  readonly C: number;
  readonly x: number;
  readonly y: number;
  readonly offsetX: number;
  readonly offsetY: number;
  readonly u: number;
  readonly v: number;
  readonly dense: Int8Array;
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
  readonly onMode6Record?: (x: number, y: number, entity: number, limit: number) => void;
  readonly onMapCellWrite?: (x: number, y: number, value: number) => void;
  readonly onFCellCommand?: (x: number, y: number, width: number, height: number) => void;
  readonly onMode7Positive?: (entity: number) => void;
};

export function stepLegacyAuxiliaryModes67(input: LegacyAuxiliaryModes67Input): boolean {
  const { dense, B } = input;
  if (input.mode === 6) {
    if (input.C > 3) return false;
    if (B < 0 && B >= -30 && (dense[ANIMAL_TARGET + input.v] ?? 0) === 0) {
      const entity = -B;
      if ((dense[BLD_HP + entity] ?? 0) > 0 && (dense[BLD_WORKERS + entity] ?? 0) !== 0) {
        input.onMode6Record?.(input.x + input.offsetX, input.y + input.offsetY, B, 50);
      }
      return false;
    }
    if (B <= 0 || B > 100) return false;
    if ((dense[UNIT_HP + B] ?? 0) <= 0) return false;
    if ((dense[ANIMAL_TARGET + input.v] ?? 0) > 0 && B <= 50) return false;
    input.onMode6Record?.(input.x + input.offsetX, input.y + input.offsetY, B, 50);
    return B > 50;
  }

  const group = (input.u ^ 1);
  if (B > group * 50 && B <= (group + 1) * 50) {
    if ((dense[UNIT_HP + B] ?? 0) <= 0) return false;
    if (((dense[UNIT_FLAGS + input.v] ?? 0) & 2) !== 0) {
      const expression = 1
        + Math.trunc((10 - (dense[UNIT_SCOUT_SKILL + input.v] ?? 0)) / 3)
        + Math.trunc(((dense[UNIT_SCOUT_SKILL + B] ?? 0) - (dense[UNIT_SCOUT_SKILL + input.v] ?? 0) - 3) / 3);
      if (expression < input.C) return false;
    }
    dense[UNIT_FLAGS + input.v] = (dense[UNIT_FLAGS + input.v] ?? 0) & 0xfe;
    input.onMode7Positive?.(B);
    return true;
  }

  const entity = -B;
  if (entity <= group * 30 || entity > (group + 1) * 30) return false;
  if ((dense[BLD_HP + entity] ?? 0) <= 0 || (dense[BLD_WORKERS + entity] ?? 0) === 0) return false;
  const type = dense[BLD_KIND + entity] ?? 0;
  const width = (input.packedBytes[(input.packedOffsets[T_BUILDING] ?? 0) + 104 + type] ?? 0) / 2;
  const height = (input.packedBytes[(input.packedOffsets[T_BUILDING] ?? 0) + 130 + type] ?? 0) / 2;
  if (input.x + input.offsetX !== (dense[BLD_X + entity] ?? 0) + Math.trunc(width)) return false;
  if (input.y + input.offsetY !== (dense[BLD_Y + entity] ?? 0) + Math.trunc(height)) return false;
  if (((dense[UNIT_FLAGS + input.v] ?? 0) & 2) !== 0) {
    const expression = 1
      + Math.trunc((10 - (dense[UNIT_SCOUT_SKILL + input.v] ?? 0)) / 3)
      + Math.trunc((((dense[8688 + entity] ?? 0) >> 4) - (dense[UNIT_SCOUT_SKILL + input.v] ?? 0) - 3) / 3);
    if (expression < input.C) return false;
  }
  dense[UNIT_FLAGS + input.v] = (dense[UNIT_FLAGS + input.v] ?? 0) & 0xfe;
  return true;
}
