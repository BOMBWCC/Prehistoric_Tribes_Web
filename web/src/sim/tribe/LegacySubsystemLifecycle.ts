import { UNIT_HP } from "../../core/DenseLayout";
/** Raw control-flow port of b.l() and b.m(). */
export type LegacySubsystemLifecycleInput = {
  readonly state: Int8Array;
  /** Original f.c(id, false) call used by b.l(). */
  readonly onPrimaryStep?: (id: number, flag: boolean) => void;
  /** Original f.a((byte)id) cleanup call. */
  readonly onEntityCleanup?: (id: number) => void;
  /** Original private b.m(id) maintenance call. */
  readonly onRecordMaintenance?: (id: number) => void;
  /** Original private b.l(index) auxiliary pass. */
  readonly onAuxiliaryPass?: (index: number) => void;
};

export function runLegacyL(input: LegacySubsystemLifecycleInput): void {
  for (let id = 1; id <= 60; id += 1) input.onPrimaryStep?.(id, false);
  scanRecords(input, 1, 100);
  for (let index = 0; index < 22; index += 1) input.onAuxiliaryPass?.(index);
}

export function runLegacyM(input: LegacySubsystemLifecycleInput): void {
  scanRecords(input, 51, 100);
  for (let index = 0; index < 22; index += 1) input.onAuxiliaryPass?.(index);
}

function scanRecords(input: LegacySubsystemLifecycleInput, first: number, last: number): void {
  for (let id = first; id <= last; id += 1) {
    if (input.state[UNIT_HP + id] === 0) continue;
    input.onEntityCleanup?.(id);
    input.onRecordMaintenance?.(id);
  }
}
