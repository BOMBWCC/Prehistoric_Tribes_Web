/** Exact mode 4 continuation of b.a(int,int,int,int), offsets 689..888. */
export type LegacyAuxiliaryMode4Input = {
  readonly B: number;
  readonly v: number;
  readonly dense: Int8Array;
  readonly onO?: () => void;
  /** Original private a(III) neighbor/metric lookup. */
  readonly onNeighborMetric?: (x: number, y: number, mode: number) => number;
  /** Original private g(2) continuation. */
  readonly onG2?: () => void;
};

export function stepLegacyAuxiliaryMode4(input: LegacyAuxiliaryMode4Input): boolean {
  const { dense, v } = input;
  dense[4444 + v] = -1;
  input.onO?.();

  if ((dense[808 + v] ?? 0) <= 0) {
    const metric = input.onNeighborMetric?.(dense[v] ?? 0, dense[101 + v] ?? 0, 0) ?? 0;
    if (Math.trunc(metric / 10) > input.B) return false;
  }

  if ((dense[6161 + v] ?? 0) <= 0) {
    const type = dense[2828 + v] ?? 0;
    if (type !== 10 && type !== 13 && type !== 15) return true;
  }
  dense[6262 + v] = dense[3131 + v] ?? 0;
  dense[6363 + v] = dense[3232 + v] ?? 0;
  input.onG2?.();
  return true;
}
