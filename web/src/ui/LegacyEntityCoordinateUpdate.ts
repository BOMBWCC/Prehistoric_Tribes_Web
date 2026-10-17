import { ANIMAL_X, ANIMAL_Y, BLD_KIND, BLD_X, BLD_Y, UNIT_Y } from "../core/DenseLayout";
import { T_BUILDING } from "../core/DataTables";
export type LegacyEntityCoordinateState = {
  J: number; I: number; L: number; K: number; C: number; D: number; AFlag: boolean;
};

export type LegacyEntityCoordinateInput = {
  readonly state: LegacyEntityCoordinateState;
  readonly id: number; readonly offset: number;
  readonly dense: Int8Array; readonly packedBytes: Int8Array; readonly packedOffsets: Int16Array;
  readonly onViewportNormalize?: () => void;
};

/**
 * Exact private f(int,int) coordinate branches and post-aK writes.
 *
 * BUG FIX (2026-08-18): the id===-100 branch's K write was `state.K -
 * state.D - offset`, but a fresh, twice-verified manual JVM-stack
 * simulation of the raw bytecode (offsets 139..152: `K:B -= (D:B -
 * arg2)`, i.e. dup, getfield K, getfield D, iload_2, isub, isub, i2b,
 * putfield K) confirms it must be `state.K - state.D + offset` --
 * matching every OTHER branch's `- D + offset` shape, which the buggy
 * version was the lone exception to. This was caught while independently
 * re-deriving the same method from scratch (not realizing it was already
 * ported) and comparing the two derivations line by line; the old test
 * (`verify-entity-coordinate-update.mjs`) happened to assert a value the
 * buggy formula also produced for its one chosen input, so it never
 * caught the discrepancy.
 */
export function stepLegacyEntityCoordinateUpdate(input: LegacyEntityCoordinateInput): void {
  const { state, dense, packedBytes, packedOffsets, id, offset } = input;
  state.J = state.I;
  state.L = state.K;
  if (id > 100) {
    state.I = dense[ANIMAL_X + id - 101] - state.C;
    state.K = dense[ANIMAL_Y + id - 101] - state.D + offset;
  } else if (id > 0) {
    state.I = dense[id] - state.C;
    state.K = dense[UNIT_Y + id] - state.D + offset;
  } else if (id === -100) {
    state.I = state.I - state.C;
    state.K = state.K - state.D + offset;
  } else if (id < 0) {
    const local = -id;
    const kind = dense[BLD_KIND + local] ?? 0;
    state.I = dense[BLD_X + local] + (packedBytes[packedOffsets[T_BUILDING] + 104 + kind] >> 1) - state.C;
    state.K = dense[BLD_Y + local] + (packedBytes[packedOffsets[T_BUILDING] + 130 + kind] >> 1) - state.D + offset;
  } else return;
  input.onViewportNormalize?.();
  state.AFlag = true;
}
