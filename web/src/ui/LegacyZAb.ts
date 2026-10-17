import { BLD_KIND, BLD_OWNER, BLD_WORK, BLD_WORKER_HEAD, UNIT_NEXT_WORKER, UNIT_SLOT, UNIT_TIMER } from "../core/DenseLayout";
export type LegacyZAbState = {
  readonly e: Int8Array;
  readonly j: Int8Array;
  readonly r: Int8Array;
  readonly q: number;
  ar: number;
};

/** Direct mirror of private f.ab(), javap offsets 0..287. */
export function stepLegacyZAb(state: LegacyZAbState): void {
  for (let i = 0; i < 8; i += 1) state.j[i] = 0;

  let write = 0;
  let count = 0;
  const primary = state.e[BLD_OWNER + state.q] ?? 0;
  const mode = state.e[BLD_KIND + state.q] ?? 0;
  const gate = state.e[BLD_WORK + state.q] ?? 0;
  if (primary > 0 && (mode !== 2 || gate !== 0)) {
    state.j[0] = primary;
    count += 1;
    write = 1;
  }

  let id = state.e[BLD_WORKER_HEAD + state.q] ?? 0;
  while (id > 0) {
    if ((state.e[UNIT_TIMER + id] ?? 0) > 0) {
      // Offsets 132..199: the owner is listed here only for an unbuilt type-2
      // record (otherwise offsets 40..99 already put it in j[0]), and each
      // worker goes to j[write + its slot]. CORRECTED 2026-10-12 (oracle run 10,
      // frame 24327): the test was `mode != 2 || gate != 0`, listing the owner
      // twice, and the store was j[write] = slot + id.
      if (primary !== id || (mode === 2 && gate === 0)) {
        state.j[write + (state.e[UNIT_SLOT + id] ?? 0)] = id;
        count += 1;
      }
    }
    id = state.e[UNIT_NEXT_WORKER + id] ?? 0;
  }

  let read = 0;
  let emitted = 0;
  while (emitted < count) {
    if (state.j[read] !== 0) {
      state.r[state.ar] = -(state.j[read] ?? 0);
      state.ar += 1;
      emitted += 1;
    }
    read += 1;
  }
}
