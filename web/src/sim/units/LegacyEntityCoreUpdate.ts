import { BLD_KIND, BLD_WORK, UNIT_HELD_ITEM, UNIT_MODE, UNIT_RECORD, UNIT_SLOT, UNIT_TIMER, UNIT_TYPE } from "../../core/DenseLayout";
export type LegacyEntityCoreUpdateInput = {
  readonly state: Int8Array;
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
  readonly entityId: number;
  readonly readJ: (row: number, index: number) => number;
  readonly readTable39: (index: number) => number;
  readonly readTable138: (index: number) => number;
  readonly raw: { d: boolean };
  readonly onW?: () => void;
  readonly onD?: () => boolean;
  /** f.a(int,boolean) (#286), called as `f.a(4444[v], false)`. */
  readonly onFilterWorkers?: (record: number) => void;
  readonly onX?: () => void;
  readonly onE?: () => boolean;
  readonly onY?: () => void;
};

/**
 * Direct translation of b.v() (javap offsets 0..528).
 * The callbacks intentionally retain the original private-method boundaries;
 * their meanings are not inferred here.
 *
 * ADDED (2026-08-31): the real bytecode carries its own local exception
 * table -- five ranges (0..211, 212..333, 334..509, 510..517, 518..527)
 * that collectively cover the ENTIRE method body, all targeting the same
 * `pop; return` handler (offset 528). This means any exception thrown
 * anywhere in v(), including from its two `y()` call sites (`onY`, see
 * `LegacyEntityFollowup.ts`), is caught LOCALLY here and never escapes to
 * `b.e()`'s own outer exception table. Wrapping the whole body reproduces
 * that boundary now that `onY` can genuinely throw (via `i():Z`/#392).
 */
export function stepLegacyEntityCoreUpdate(input: LegacyEntityCoreUpdateInput): boolean {
  try {
    return stepLegacyEntityCoreUpdateBody(input);
  } catch {
    return false;
  }
}

function stepLegacyEntityCoreUpdateBody(input: LegacyEntityCoreUpdateInput): boolean {
  const { state, entityId: id } = input;
  input.raw.d = false;

  const type = state[UNIT_TYPE + id] ?? 0;
  if ((state[5959 + id] ?? 0) > 0 &&
      (state[3030 + id] ?? 0) === 0 &&
      (state[UNIT_HELD_ITEM + id] ?? 0) === 1 &&
      // offsets 55..140: only types 5..9 and 92/93/106 reach 143. CORRECTED
      // 2026-09-14: the port had this inverted.
      ((type >= 5 && type <= 9) || type === 92 || type === 93 || type === 106) &&
      ((state[UNIT_MODE + id] ?? 0) & 255) > 7 &&
      (state[5858 + id] ?? 0) + 2 < (state[5959 + id] ?? 0)) {
    state[UNIT_MODE + id] = 34;
    return true;
  }

  input.onW?.();

  const mode = (state[UNIT_MODE + id] ?? 0) & 255;
  // offset 256 `if_icmplt 523`, and 523 is `y(); return` -- CORRECTED
  // 2026-09-14: the port returned without calling y().
  if ((state[3030 + id] ?? 0) < input.readJ(4, mode)) {
    input.onY?.();
    return true;
  }

  state[3030 + id] = 0;
  if ((state[UNIT_SLOT + id] ?? 0) < -1) state[UNIT_SLOT + id] = -1;
  if (mode <= 7) {
    input.onY?.();
    return true;
  }

  if (input.onD?.() ?? false) return true;

  if (input.readTable39(type) === 2 && (state[UNIT_TIMER + id] ?? 0) === -3) {
    // offsets 383..502: `f.a(rec, false)` when `t138[156 + 8749[rec]] >= 0 ||
    // 8627[rec] != 0`. CORRECTED 2026-09-14: the port read a garbled table
    // index, inverted the first test and called f.d(int) instead.
    if (type === 59 && (state[UNIT_SLOT + id] ?? 0) === 0) {
      const record = state[UNIT_RECORD + id] ?? 0;
      if (input.readTable138(156 + (state[BLD_KIND + record] ?? 0)) >= 0 || (state[BLD_WORK + record] ?? 0) !== 0) {
        input.onFilterWorkers?.(record);
      }
    }
    input.onX?.();
    return true;
  }

  if (input.onE?.() ?? false) return true;
  input.raw.d = true;
  input.onY?.();
  return true;
}
