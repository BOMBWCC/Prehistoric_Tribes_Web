import { UNIT_CARRY_KIND, UNIT_JOB_TYPE, UNIT_ORDER, UNIT_SAVED_TYPE, UNIT_TIMER, UNIT_TYPE, UNIT_WORK_PROGRESS, UNIT_Y } from "../../core/DenseLayout";
/**
 * `private void I()` (constant pool #245), bytecode/b-javap.txt line 24732,
 * offsets 0..498. i()Z's tail calls it when the unit's work is done (b.f:Z
 * set) and k()Z declined: the unit switches to its follow-up type, e.g. a
 * full gatherer (11) to its carrier (t160[11] = 21), and a carrier back.
 *
 *  - 0..86: type >= 83 and 3939 in 44..48 -> 3535 = 3939 - 36.
 *  - 87..251, type 85: 6161 >= 2 -> 3939 = 69; a(v, 3939); new type in
 *    44..48 -> 3535 = 0; 3939 = 69; 1313 = 0; 404 = 0.
 *  - 254..345, otherwise: a(v, 19 <= type <= 26 && 6464 == 69 ? 69 : t160[type]).
 *  - 348..388: new type 26/27 -> f(false).
 *  - 389..475: 6161 < 2 and (t39[type] == 2 or the unit occupies its own
 *    grid cell) -> N().
 *  - 476..497: type 16 -> an().
 */
export type LegacyEntityIFinalizeInput = {
  readonly state: Int8Array;
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
  readonly gridC: Int8Array[];
  readonly id: number;
  /** a(int,byte) (#275). */
  readonly onChangeType: (id: number, type: number) => void;
  /** f(boolean) (#382). */
  readonly onF: (flag: boolean) => void;
  /** N() (#250). */
  readonly onN: () => void;
  /** an() (#321). */
  readonly onAn: () => void;
};

export function stepLegacyEntityIFinalize(input: LegacyEntityIFinalizeInput): void {
  const { state, packedBytes, packedOffsets, gridC, id } = input;
  const table = (row: number, index: number) => packedBytes[(packedOffsets[row] ?? 0) + index] ?? 0;
  const type = () => state[UNIT_TYPE + id] ?? 0;

  const saved = state[UNIT_SAVED_TYPE + id] ?? 0;
  if (type() >= 83 && saved >= 44 && saved <= 48) state[UNIT_CARRY_KIND + id] = saved - 44 + 8;

  if (type() === 85) {
    if ((state[UNIT_ORDER + id] ?? 0) >= 2) state[UNIT_SAVED_TYPE + id] = 69;
    input.onChangeType(id, state[UNIT_SAVED_TYPE + id] ?? 0);
    if (type() >= 44 && type() <= 48) state[UNIT_CARRY_KIND + id] = 0;
    state[UNIT_SAVED_TYPE + id] = 69;
    state[UNIT_TIMER + id] = 0;
    state[UNIT_WORK_PROGRESS + id] = 0;
  } else {
    input.onChangeType(id, type() >= 19 && type() <= 26 && (state[UNIT_JOB_TYPE + id] ?? 0) === 69
      ? 69
      : table(160, type()));
  }

  if (type() === 26 || type() === 27) input.onF(false);

  if ((state[UNIT_ORDER + id] ?? 0) < 2 &&
      (table(39, type()) === 2 || (gridC[state[UNIT_Y + id] ?? 0]?.[state[id] ?? 0] ?? 0) === id)) {
    input.onN();
  }

  if (type() === 16) input.onAn();
}
