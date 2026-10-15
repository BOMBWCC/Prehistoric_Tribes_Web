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
    dense[101 + v] ?? 0,
    dense[v] ?? 0,
    dense[3232 + v] ?? 0,
    dense[3131 + v] ?? 0,
  ) ?? 0;
}
