import { BLD_KIND, BLD_OWNER, BLD_PLANNED_KIND, BLD_WORK } from "../../core/DenseLayout";
/** Raw port of f.c(int), javap offsets 0..157. */
export type LegacyEntityRecordTargetClearInput = {
  readonly state: Int8Array;
  readonly entityId: number;
  readonly onRecordReset?: (record: number, enabled: boolean) => void;
};

export function clearLegacyEntityRecordTarget(input: LegacyEntityRecordTargetClearInput): void {
  const { state, entityId: target } = input;
  const partition = Math.floor((target - 1) / 50);
  const first = partition * 30 + 1;
  const last = partition * 30 + 30;
  for (let record = first; record <= last; record += 1) {
    if ((state[BLD_OWNER + record] ?? 0) === target) {
      const type = state[BLD_KIND + record] ?? 0;
      // Bytecode offset 66: `ifeq 98` jumps PAST the reset (to the
      // association-clear tail below) when e[8627+record]===0 -- so the
      // reset only fires when 8627 is NONZERO (or type isn't 2 at all).
      // Fixed 2026-08-18: this previously had the condition inverted
      // (`=== 0` instead of `!== 0`), found while tracing f.a(byte)'s
      // dependency chain and re-verifying this port against the raw
      // bytecode line-by-line.
      if (type !== 2 || (state[BLD_WORK + record] ?? 0) !== 0) {
        input.onRecordReset?.(record, false);
        state[BLD_OWNER + record] = 0;
        state[9298 + record] = 0;
        return;
      }
    }
    const associationType = state[BLD_WORK + record] ?? 0;
    if ((associationType === 2 || associationType === 1) &&
        (state[BLD_PLANNED_KIND + record] ?? 0) === target) {
      state[BLD_PLANNED_KIND + record] = 0;
    }
  }
}
