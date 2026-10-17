import { BLD_KIND, BLD_WORK, UNIT_AGE, UNIT_CARRY_KIND, UNIT_DIRECTION, UNIT_FLAGS, UNIT_HELD_ITEM, UNIT_MODE, UNIT_RECORD, UNIT_SLOT, UNIT_TIMER, UNIT_TYPE, UNIT_Y } from "../../core/DenseLayout";
import { T_ITEM_CLASS } from "../../core/DataTables";
/**
 * Exact `private boolean b(int)` (#345), bytecode/b-javap.txt line 14160,
 * offsets 0..1284, with its two callees `private void z()` (#425, line
 * 15102) and `private boolean g()` (#385, line 14833). Called from i(int)
 * (`LegacyEntityIUpdate.ts`, offset 409) for every unit type that is not
 * 0..9/92/93/106; `true` ends i(int). It picks the unit's next mode (2929)
 * from its type group `H:I` and the per-tick random `x:I`.
 *
 *  - 0..173 `H`: the unit's own type when (4444 >= 0, `arg/10 <= B`, and
 *    `t39[type] != 1` or 4646 >= 0) or type is 105/85 -- also clearing
 *    4848; otherwise 69 or 17 by `1414 >= 12`.
 *  - 176..335: `H == 13` below mode 141 -> mode -111, facing 4 unless the
 *    cell to the right is a map marker (-110..-61), true; mode -110 -> true.
 *  - 336..432: modes -101/-100 with `x > 20` -> z(); otherwise `H == 69`,
 *    `7979 & 2 == 0`, `x > 98` and g() -> true.
 *  - 433..740: row `y` -- H 72: `t158[t77[6565]]`; H 69 with 7979 bit 2: 6;
 *    H 69/109/60/51/87 carrying (3535 != 0) or 6565 == 1: 1 (60), 2 (51, 87)
 *    or 4; H 83/85/105: 1313; H 84: `t167[1313]`; else 0.
 *  - 741..1283: `y += t166[H]`; scan to `t166[H+1]` for the first
 *    `t165[y] > x`: mode = `t164[y]`; a joined worker of a type-2 record with
 *    1313 > 0 stops there; `x >= 85` swaps in `t171[mode]` unless its low 7
 *    bits are all set; a joined worker then gets `1313 = y - t166[H]` when
 *    (its type matches `t58[t174[rtype] + slot]`, is 53/111, or slot > 0 at
 *    a small record) and the record is unbuilt, else 50. Returns false.
 *
 * `H:I` (#21), `y:I` (#233) and `x:I` (#230) are b fields shared with
 * i(int), so they live on `raw`; `C:I`/`D:I` (#10/#12) on `scratch`.
 * CORRECTED 2026-09-14: this was never ported (i(int)'s `onBInt` was left
 * unwired), so units outside types 0..9 never left their idle mode -- e.g.
 * a villager ordered to a tree stood still.
 */
export type LegacyEntityModeSelectInput = {
  readonly state: Int8Array;
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
  readonly gridC: readonly Int8Array[];
  readonly entityId: number;
  /** b.u:I (#222). */
  readonly team: number;
  /** f.c:S / f.d:S. */
  readonly mapWidth: number;
  readonly mapHeight: number;
  /** b.B:I (#8), re-read on demand. */
  readonly readBValue: () => number;
  readonly raw: { x: number; H: number; y: number };
  readonly scratch: { C: number; D: number };
};

const toByte = (value: number) => ((value & 0xff) ^ 0x80) - 0x80;

function isIdleMode(mode: number): boolean {
  return mode === 8 || mode === 9 || (mode >= 15 && mode <= 18);
}

export function stepLegacyEntityModeSelect(input: LegacyEntityModeSelectInput, arg: number): boolean {
  const { state, entityId: v, raw } = input;
  const table = (row: number, index: number) => input.packedBytes[(input.packedOffsets[row] ?? 0) + index] ?? 0;
  const type = () => state[UNIT_TYPE + v] ?? 0;

  const ownGroup = ((state[UNIT_RECORD + v] ?? 0) >= 0 && Math.trunc(arg / 10) <= input.readBValue() &&
    (table(39, type()) !== 1 || (state[UNIT_SLOT + v] ?? 0) >= 0)) || type() === 105 || type() === 85;
  if (ownGroup) {
    state[4848 + v] = 0;
    raw.H = type();
  } else {
    raw.H = (state[UNIT_AGE + v] ?? 0) >= 12 ? 69 : 17;
  }

  if (raw.H === 13) {
    if (((state[UNIT_MODE + v] ?? 0) & 255) < 141) {
      state[UNIT_MODE + v] = -111;
      const right = input.gridC[state[UNIT_Y + v] ?? 0]?.[(state[v] ?? 0) + 1] ?? 0;
      state[UNIT_DIRECTION + v] = right > -61 || right < -110 ? 4 : 0;
      return true;
    }
    if ((state[UNIT_MODE + v] ?? 0) === -110) return true;
  }

  const mode = state[UNIT_MODE + v] ?? 0;
  if ((mode === -101 || mode === -100) && raw.x > 20) {
    stepLegacyEntityFaceNeighbour(input);
  } else if (raw.H === 69 && ((state[UNIT_FLAGS + v] ?? 0) & 2) === 0 && raw.x > 98 && stepLegacyEntityGreetNeighbour(input)) {
    return true;
  }

  let y: number;
  if (raw.H === 72) {
    y = table(158, table(T_ITEM_CLASS, state[UNIT_HELD_ITEM + v] ?? 0));
  } else if (raw.H === 69 && ((state[UNIT_FLAGS + v] ?? 0) & 2) > 0) {
    y = 6;
  } else if ((raw.H === 69 || raw.H === 109 || raw.H === 60 || raw.H === 51 || raw.H === 87) &&
      ((state[UNIT_CARRY_KIND + v] ?? 0) !== 0 || (state[UNIT_HELD_ITEM + v] ?? 0) === 1)) {
    y = raw.H === 60 ? 1 : (raw.H === 51 || raw.H === 87 ? 2 : 4);
  } else if (raw.H === 83 || raw.H === 85 || raw.H === 105) {
    y = state[UNIT_TIMER + v] ?? 0;
  } else if (raw.H === 84) {
    y = table(167, state[UNIT_TIMER + v] ?? 0);
  } else {
    y = 0;
  }
  raw.y = y + (table(166, raw.H) & 255);

  while (raw.y < (table(166, raw.H + 1) & 255)) {
    if (table(165, raw.y) > raw.x) {
      state[UNIT_MODE + v] = table(164, raw.y);
      const record = state[UNIT_RECORD + v] ?? 0;
      if ((state[UNIT_SLOT + v] ?? 0) >= 0 && (state[BLD_KIND + record] ?? 0) === 2 && (state[UNIT_TIMER + v] ?? 0) > 0) return false;
      const swap = table(171, (state[UNIT_MODE + v] ?? 0) & 255);
      if ((swap & 254) !== 254 && raw.x >= 85) state[UNIT_MODE + v] = swap;
      if ((state[UNIT_SLOT + v] ?? 0) < 0) return false;
      const slot = state[UNIT_SLOT + v] ?? 0;
      const recordType = state[BLD_KIND + record] ?? 0;
      const matches = type() === table(58, table(174, recordType) + slot) || type() === 53 || type() === 111 ||
        (slot > 0 && recordType < 12);
      state[UNIT_TIMER + v] = matches && (state[BLD_WORK + record] ?? 0) === 0
        ? toByte(raw.y - (table(166, raw.H) & 255))
        : 50;
      return false;
    }
    raw.y += 1;
  }
  return false;
}

/** `private void z()` (#425), offsets 0..351: turn the teammate in front to face this unit. */
export function stepLegacyEntityFaceNeighbour(input: LegacyEntityModeSelectInput): void {
  const { state, entityId: v, raw, team: u } = input;
  const table = (row: number, index: number) => input.packedBytes[(input.packedOffsets[row] ?? 0) + index] ?? 0;
  const facing = state[UNIT_DIRECTION + v] ?? 0;
  raw.y = input.gridC[(state[UNIT_Y + v] ?? 0) + table(1, 8 + facing)]?.[(state[v] ?? 0) + table(1, facing)] ?? 0;
  const y = raw.y;
  if (y <= u * 50 || y > (u + 1) * 50 || !isIdleMode(state[UNIT_MODE + y] ?? 0)) return;
  state[UNIT_MODE + y] = (state[UNIT_CARRY_KIND + y] ?? 0) === 0 && (state[UNIT_HELD_ITEM + y] ?? 0) !== 1 ? -101 : -100;
  state[UNIT_DIRECTION + y] = ((state[UNIT_DIRECTION + v] ?? 0) + 4) & 7;
  state[3030 + y] = y < v ? 0 : -1;
  state[UNIT_SLOT + y] = toByte(-92 - table(99, 8 + (state[UNIT_DIRECTION + y] ?? 0)));
}

/** `private boolean g()` (#385), offsets 0..475: start a greeting with an idle teammate next to this unit. */
export function stepLegacyEntityGreetNeighbour(input: LegacyEntityModeSelectInput): boolean {
  const { state, entityId: v, raw, team: u, scratch } = input;
  const table = (row: number, index: number) => input.packedBytes[(input.packedOffsets[row] ?? 0) + index] ?? 0;
  for (scratch.C = (state[v] ?? 0) - 1; scratch.C < (state[v] ?? 0) + 2; scratch.C += 2) {
    for (scratch.D = (state[UNIT_Y + v] ?? 0) - 1; scratch.D < (state[UNIT_Y + v] ?? 0) + 2; scratch.D += 1) {
      if (scratch.C <= 0 || scratch.C >= input.mapWidth - 1 || scratch.D <= 0 || scratch.D >= input.mapHeight - 1) continue;
      raw.y = input.gridC[scratch.D]?.[scratch.C] ?? 0;
      const y = raw.y;
      if (y <= u * 50 || y > (u + 1) * 50 || !isIdleMode(state[UNIT_MODE + y] ?? 0)) continue;
      state[UNIT_MODE + v] = (state[UNIT_CARRY_KIND + v] ?? 0) === 0 && (state[UNIT_HELD_ITEM + v] ?? 0) !== 1 ? -101 : -100;
      state[UNIT_DIRECTION + v] = table(53, (12 + scratch.D - (state[UNIT_Y + v] ?? 0)) * 25 + 12 + scratch.C - (state[v] ?? 0)) % 10;
      state[UNIT_DIRECTION + y] = ((state[UNIT_DIRECTION + v] ?? 0) + 4) & 7;
      state[UNIT_SLOT + v] = toByte(-92 - table(99, 8 + (state[UNIT_DIRECTION + v] ?? 0)));
      return true;
    }
  }
  return false;
}
