/** Raw port of b.k(): returns the value written to f.h. */
export type LegacySubsystemDecisionInput = {
  readonly fV: number;
  readonly fN: boolean;
  readonly fL: boolean;
  readonly bO: number;
  readonly bK: number;
  readonly bN: number;
  readonly fQ: number;
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
};

export function legacySubsystemDecision(input: LegacySubsystemDecisionInput): number {
  if (input.fV === 1 && input.bK < 50) return 2;
  if (!input.fN && !input.fL && input.bO >= 0) {
    const group = input.packedBytes[input.packedOffsets[238] + input.fQ];
    const threshold = input.packedBytes[input.packedOffsets[236] + group] + input.bN - 1;
    if (input.bO === threshold) return 1;
  }
  return input.fV === 1 ? 1 : 0;
}
