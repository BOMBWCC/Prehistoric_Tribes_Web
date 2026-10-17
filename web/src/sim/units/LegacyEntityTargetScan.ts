import { BLD_HP, BLD_KIND, BLD_LEVEL, BLD_OWNER, BLD_PLANNED_KIND, BLD_WORK, BLD_WORKERS, BLD_X, BLD_Y, UNIT_TARGET_X, UNIT_TARGET_Y, UNIT_TYPE, UNIT_Y } from "../../core/DenseLayout";
import { T_BUILDING } from "../../core/DataTables";
/** Raw port of final boolean a(int), javap offsets 0..858: target scan prefix. */
export type LegacyEntityTargetScanInput = {
  readonly state: Int8Array;
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
  readonly partition: number;
  readonly entityId: number;
  readonly targetType: number;
  readonly onBestTarget?: (id: number, score: number, differentType: boolean) => void;
};

export type LegacyEntityTargetScanResult = {
  readonly found: boolean;
  readonly targetId: number;
  readonly score: number;
  readonly differentType: boolean;
};

function table(input: LegacyEntityTargetScanInput, row: number, index: number): number {
  return input.packedBytes[(input.packedOffsets[T_BUILDING] ?? 0) + row + index] ?? 0;
}

function clamp(value: number, low: number, high: number): number {
  if (value < low) return low;
  if (value < high) return value;
  return high;
}

export function scanLegacyEntityTargets(input: LegacyEntityTargetScanInput): LegacyEntityTargetScanResult {
  const { state, entityId: current, targetType } = input;
  const isTypeSix = targetType === 6;
  let bestScore = 1_000_000;
  let bestId = 0;
  let bestDifferentType = false;
  const first = input.partition * 30 + 1;
  const last = (input.partition + 1) * 30;

  for (let candidate = first; candidate <= last; candidate += 1) {
    if ((state[BLD_HP + candidate] ?? 0) <= 0) continue;
    const candidateType = state[BLD_KIND + candidate] ?? 0;
    if (candidateType !== targetType) {
      if (!isTypeSix || candidateType !== 16 || (state[BLD_PLANNED_KIND + candidate] ?? 0) !== 6 ||
          (state[UNIT_TYPE + current] ?? 0) > 25) continue;
    }
    if ((state[BLD_WORK + candidate] ?? 0) !== 0 && !isTypeSix) continue;
    if (table(input, 156, targetType) >= 0 && (state[BLD_OWNER + candidate] ?? 0) < 1) continue;
    if ((state[BLD_WORKERS + candidate] ?? 0) > 0) {
      // Offsets 236..282: t138[(level - 1) * 26 + type]. FIXED 2026-10-14 (found next to the
      // play24 t138 fix): the port read t138[138 + level - 1] * 26 + type.
      const threshold = table(input, 0, ((state[BLD_LEVEL + candidate] ?? 0) - 1) * 26 + targetType);
      if ((state[BLD_WORKERS + candidate] ?? 0) >= threshold && !isTypeSix) continue;
    }

    const xDelta = (state[BLD_X + candidate] ?? 0) +
      Math.trunc((table(input, 104, candidateType) + (state[BLD_KIND + candidate] ?? 0)) / 2) -
      (state[current] ?? 0);
    const yDelta = (state[BLD_Y + candidate] ?? 0) +
      Math.trunc((table(input, 130, candidateType) + (state[BLD_KIND + candidate] ?? 0)) / 2) -
      (state[UNIT_Y + current] ?? 0);
    const score = xDelta * xDelta + yDelta * yDelta;
    if (bestScore < score) continue;
    if (!isTypeSix && candidateType !== targetType) continue;
    bestScore = score;
    bestId = candidate;
    bestDifferentType = candidateType !== targetType;
  }

  if (bestScore < 1_000_000) {
    const candidateType = state[BLD_KIND + bestId] ?? 0;
    state[UNIT_TARGET_X + current] = toByte(clamp(
      (state[current] ?? 0),
      state[BLD_X + bestId] ?? 0,
      (state[BLD_X + bestId] ?? 0) + table(input, 104, candidateType) + (state[BLD_KIND + bestId] ?? 0) - 1,
    ));
    state[UNIT_TARGET_Y + current] = toByte(clamp(
      (state[UNIT_Y + current] ?? 0),
      state[BLD_Y + bestId] ?? 0,
      (state[BLD_Y + bestId] ?? 0) + table(input, 130, candidateType) + (state[BLD_KIND + bestId] ?? 0) - 1,
    ));
    input.onBestTarget?.(bestId, bestScore, bestDifferentType);
    return { found: true, targetId: bestId, score: bestScore, differentType: bestDifferentType };
  }

  state[UNIT_TARGET_X + current] = state[current] ?? 0;
  state[UNIT_TARGET_Y + current] = state[UNIT_Y + current] ?? 0;
  return { found: false, targetId: 0, score: 1_000_000, differentType: false };
}

function toByte(value: number): number {
  const narrowed = value & 0xff;
  return narrowed >= 0x80 ? narrowed - 0x100 : narrowed;
}
