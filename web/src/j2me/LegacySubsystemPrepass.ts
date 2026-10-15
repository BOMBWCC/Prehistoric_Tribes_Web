/** Raw port of b.s(), the prepass invoked at the start of b.e(). */
export type LegacySubsystemPrepassInput = {
  readonly frame: number;
  readonly q: number;
  /** f.b:B (#138 via b) -- the interval scale. */
  readonly bByte: number;
  /** b.f:B (#167), the mission-script step -- NOT f.b:B. */
  readonly fByte: number;
  readonly lFlag: boolean;
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
  readonly mainShort: Int16Array[];
  readonly onResourceTick?: () => void;
  readonly onSpatialPass?: () => void;
  readonly onEntityGuardPass?: () => void;
  /** Offsets 184..194: `F:I = 0` (#16). */
  readonly onFReset?: () => void;
};

/** Exact b.s() calls and scalar writes; callbacks retain unresolved callees. */
export function runLegacySubsystemPrepass(input: LegacySubsystemPrepassInput): void {
  input.onResourceTick?.();
  if ((input.frame & 3) === 0) input.onSpatialPass?.();
  if (input.lFlag && (input.frame & 63) === 2) input.onEntityGuardPass?.();

  // Offsets 55..157: b[a[277] + q] and b[a[278] + q] -- tables 277/278 indexed by the mission.
  // FIXED 2026-10-08 (oracle frame 441): read table 138 at 277+q / 278+q, which handed the
  // enemy tribe its 5000 stock on the very first simulated frame of the tutorial.
  const intervalScale = Math.trunc(1000 / (1 + input.bByte * 3));
  if (input.frame === input.packedBytes[input.packedOffsets[277] + input.q] * intervalScale) {
    input.mainShort[1][8] = 5000;
  }
  if (input.frame === input.packedBytes[input.packedOffsets[278] + input.q] * intervalScale) {
    input.mainShort[1][9] = 5000;
    input.mainShort[1][10] = 5000;
  }
  // CORRECTED 2026-09-23: offset 185 reads b's own f:B (#167), not f.b:B.
  if (input.fByte === 2) input.onFReset?.();
}
