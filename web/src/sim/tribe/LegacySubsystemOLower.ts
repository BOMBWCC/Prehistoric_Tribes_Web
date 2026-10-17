import { UNIT_TARGET_X, UNIT_TARGET_Y, UNIT_Y } from "../../core/DenseLayout";
/** Raw port of private b.o(), including its b(IIII)B callback boundary. */
export type LegacySubsystemOLowerInput = {
  readonly dense: Int8Array;
  readonly flags: boolean[];
  readonly v: number;
  readonly onBFourByte?: (x: number, y: number, targetX: number, targetY: number) => number;
};

export function stepLegacySubsystemOLower(input: LegacySubsystemOLowerInput): void {
  const { dense, v } = input;
  if ((dense[4848 + v] ?? 0) > 1) dense[4848 + v] = 0;
  input.flags[2] = true;
  dense[808 + v] = input.onBFourByte?.(
    dense[UNIT_Y + v] ?? 0,
    dense[v] ?? 0,
    dense[UNIT_TARGET_Y + v] ?? 0,
    dense[UNIT_TARGET_X + v] ?? 0,
  ) ?? 0;
}
