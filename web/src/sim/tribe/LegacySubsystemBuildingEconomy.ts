import { stepLegacySubsystemAx, type LegacySubsystemAxInput } from "./LegacySubsystemAx";
import { BLD_HP, BLD_KIND, BLD_MAX_HP, BLD_PLANNED_KIND, BLD_WORK, BLD_WORKERS, BLD_X, BLD_Y, UNIT_TIMER } from "../../core/DenseLayout";
import { T_BUILDING } from "../../core/DataTables";

/**
 * Exact `final void g()` (bytecode/b-javap.txt line 37692, offsets 0..820),
 * `f.j()`'s first per-tick call (`b.g()`, before `b.e()`/`b.h()`/`b.i()`).
 *
 *  - 0..16: `if (f.c % 10 == 0) n();` -- outside g()'s own try block.
 *  - 17..818 (one try block, handler 819 = `pop; return`): `ax()`, then for
 *    `u` 0..1 and record `v` from `u*30+1` to `(u+1)*30`, the per-record
 *    step below (`buildingStep`).
 *
 * CORRECTED 2026-09-14: the per-record loop (offsets 21..805) was never
 * ported; its 2026-09-07 note already retracted the "never runs" premise.
 * It is what drives a construction site: aa() walks the worker list and
 * calls ab() for each builder, ae() recruits idle villagers, and the
 * completion block turns the site into the finished building.
 *
 * b's `u:I`/`v:I`/`z:I`/`x:I`/`A:I`/`C:I` are read by the callees, so the
 * runtime passes them as accessors onto the live game fields.
 */
export type LegacyBuildingScratch = {
  /** b.u:I (#222). */
  u: number;
  /** b.v:I (#225). */
  v: number;
  /** b.z:I (#234). */
  z: number;
  /** b.x:I (#230). */
  x: number;
  /** b.A:I (#7). */
  A: number;
  /** b.C:I (#10). */
  C: number;
};

export type LegacySubsystemBuildingEconomyInput = {
  /** f.c:I (#148 here / #260 in class f) -- CONFIRMED game.missionFrame/simulationCounter (LegacyGameState.ts). */
  readonly simulationCounter: number;
  /** ax()'s own inputs -- see LegacySubsystemAx.ts. */
  readonly ax: LegacySubsystemAxInput;
  readonly state: Int8Array;
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
  /** b.f:[[B (#168), 2 x 10. */
  readonly fRows: Int8Array[];
  /** b.g:[[B (#176), 3 x 20. */
  readonly gRows: Int8Array[];
  readonly scratch: LegacyBuildingScratch;
};

export type LegacySubsystemBuildingEconomyCallbacks = {
  /** b.n():V -- tick-gated, NOT covered by g()'s own try/catch. */
  readonly onN?: () => void;
  /** f.a(int,boolean) (#286), called as `f.a(v, true)`. */
  readonly onFilterWorkers: (record: number) => void;
  /** ad() (#311). */
  readonly onAd: () => void;
  /** aa() (#308). */
  readonly onAa: () => void;
  /** ac() (#310). */
  readonly onAc: () => void;
  /** f.a(byte,int,int,int,int,boolean,int) (#303), called as `(u, 9237, 8383, 8444, 1, true, v)`; result popped. */
  readonly onAllocate: (team: number, type: number, x: number, y: number, replaced: number) => void;
  /** f.a(int,int) (#304), called as `f.a(v, 0)`. */
  readonly onEnqueueEffect: (record: number, mode: number) => void;
  /** ae() (#312). */
  readonly onAe: () => void;
};

/** A Java byte-array read/write that throws where the JVM would. */
export function javaRow(rows: Int8Array[], row: number, index: number): { get(): number; set(value: number): void } {
  const array = rows[row];
  if (!array || index < 0 || index >= array.length) throw new RangeError(`ArrayIndexOutOfBounds [${row}][${index}]`);
  return { get: () => array[index]!, set: (value) => { array[index] = value; } };
}

export function stepLegacySubsystemBuildingEconomy(
  input: LegacySubsystemBuildingEconomyInput,
  callbacks: LegacySubsystemBuildingEconomyCallbacks,
): void {
  if (input.simulationCounter % 10 === 0) callbacks.onN?.();

  try {
    stepLegacySubsystemAx(input.ax);
    const s = input.scratch;
    for (s.u = 0; s.u < 2; s.u += 1) {
      for (s.v = s.u * 30 + 1; s.v <= (s.u + 1) * 30; s.v += 1) {
        buildingStep(input, callbacks);
      }
    }
  } catch {
    // offsets 819..820: `pop; return`
  }
}

/** Offsets 64..792 for record `v`. */
function buildingStep(input: LegacySubsystemBuildingEconomyInput, cb: LegacySubsystemBuildingEconomyCallbacks): void {
  const { state, fRows, gRows } = input;
  const s = input.scratch;
  const v = s.v;
  const table = (row: number, index: number) => input.packedBytes[(input.packedOffsets[row] ?? 0) + index] ?? 0;

  if ((state[BLD_HP + v] ?? 0) === 0) return;
  s.z = state[BLD_KIND + v] ?? 0;
  if ((input.simulationCounter & 15) === 0) state[9054 + v] = (state[9054 + v] ?? 0) & 127;
  if (s.z < 12 && s.z !== 4 && s.z !== 2 && (state[BLD_WORK + v] ?? 0) === 0) return;

  s.A = 0;
  s.x = 0;
  if (s.z >= 12) {
    while (s.x < 10 && javaRow(fRows, 0, s.x).get() !== v) s.x += 1;
  }
  if ((state[BLD_WORK + v] ?? 0) !== 0) {
    while (s.x < 20 && javaRow(gRows, 0, s.x).get() !== v) s.x += 1;
  }

  if ((state[BLD_WORK + v] ?? 0) !== 0) {
    const stage = state[BLD_WORK + v] ?? 0;
    const g1 = javaRow(gRows, 1, s.x).get();
    const g2 = javaRow(gRows, 2, s.x).get();
    // 313..432: g2 > 0 && g1 >= g2 && stage 1, or stage 2 at full 8505, or 9054 bit 0.
    if ((g2 > 0 && g1 >= g2 && stage === 1) ||
        (stage === 2 && (state[BLD_HP + v] ?? 0) >= (state[BLD_MAX_HP + v] ?? 0)) ||
        ((state[9054 + v] ?? 0) & 1) !== 0) {
      cb.onFilterWorkers(v);
      cb.onAd();
      return;
    }
  }

  s.C = 0;
  cb.onAa();
  if ((input.simulationCounter & 255) === v) cb.onAc();

  if (s.z === 2 && s.x > 0) {
    if ((state[UNIT_TIMER + s.x] ?? 0) === 2 && s.A !== 3) state[UNIT_TIMER + s.x] = 1;
    if ((state[UNIT_TIMER + s.x] ?? 0) === 1 && s.A === 3) state[UNIT_TIMER + s.x] = 2;
  }

  if (s.z >= 12 &&
      (state[BLD_HP + v] ?? 0) >= table(T_BUILDING, 182 + (state[BLD_PLANNED_KIND + v] ?? 0)) &&
      (state[BLD_WORKERS + v] ?? 0) === 0) {
    cb.onAllocate(s.u, state[BLD_PLANNED_KIND + v] ?? 0, state[BLD_X + v] ?? 0, state[BLD_Y + v] ?? 0, v);
    cb.onEnqueueEffect(v, 0);
    state[BLD_PLANNED_KIND + v] = 0;
    javaRow(fRows, 0, s.x).set(0);
  }

  if ((s.z >= 12 || (state[BLD_WORK + v] ?? 0) !== 0) && (input.simulationCounter & 15) === (v & 15)) {
    cb.onAe();
  }
}
