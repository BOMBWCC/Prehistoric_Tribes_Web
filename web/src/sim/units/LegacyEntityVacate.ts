import { ANIMAL_KIND, UNIT_AGE, UNIT_HAPPINESS, UNIT_JOB_TYPE, UNIT_MODE, UNIT_SLOT } from "../../core/DenseLayout";
import { T_TYPE_JOB } from "../../core/DataTables";
/**
 * `private void a(int,int,int,byte)` (#283), bytecode/b-javap.txt line 33634,
 * offsets 0..547: a unit leaves the map -- the shared "vacate" helper `s()`
 * (the HP gate), `q()` and `a()`'s own dying branch call with kind 19, and
 * the auxiliary paths call with kind 106 / 85.
 *
 *  - 0..59, kind 106: `l(id)` (#399), `f.a(6, x, y, t183[9535+id])` (#299),
 *    `f.c(x, y, 1, 1)` (#357).
 *  - 62..372, kind 19 (a death): for a team-0 unit (`id <= 50`), the work
 *    class of its job picks a byte-queue action -- `t41[6464]` 9 -> 12,
 *    11 -> 13, 8 -> 14, 10 -> 15, anything else none (`f.a(BBBB)` #290) --
 *    and when the dead unit is the chief (`a[0][17]`), every adult loses 25
 *    happiness (clamped to 0..99). Then `f.a(id)` (#300, this port's
 *    `finalizeEntity`), `2929 = 1414 >= 12 ? 43 : 44`, `3030 = id > v ? -1
 *    : 0`, `4646 = -64`, and `e((id-1)/50, id)` (#378, below).
 *  - 373..389, kind 85: `f.c(id, true)` (#364).
 *  - 390..547, the shared tail: while `f:B < t291[f.q]` and
 *    `t287[t288[f.q] + f:B] == 10`, a kind-106 (or a kind-19 team-1 unit)
 *    departure fires `b(0, 0, 1)` (#342) and `f.b(t286[t288[f.q] + f:B])`
 *    (#343), then `f:B += 50`.
 *
 * Ported 2026-09-16: the runtime had this wired as a throwing "not ported"
 * stub, so every unit whose HP reached 0 threw inside `final void e()`'s
 * entity loop. That loop's blanket catch then skipped every remaining unit
 * for the tick, which froze the whole tribe once the first villager died of
 * old age.
 */
export type LegacyEntityVacateInput = {
  readonly state: Int8Array;
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
  /** b.a:[[S (#63) -- mainArrays.aShort; only row 0 slot 17 (the chief) is read. */
  readonly shortRows: readonly Int16Array[];
  /** f.b:[[[B (#139) -- game.xSlotTable, [team][5][30]. */
  readonly xSlots: readonly (readonly Int8Array[])[];
  /** b.v:I (#225) -- the entity the caller is processing. */
  readonly v: number;
  /** f.q:B (#211). */
  readonly fQ: number;
  /** b.f:B (#167) -- game.subsystemGFFlagByte, read and written by the tail. */
  readonly scratch: { subsystemGFFlagByte: number };
  /** b.l(int) (#399) -- removeAnimal (wired 2026-09-27). */
  readonly onL?: (id: number) => void;
  /** f.a(int,int,int,byte) (#299) -- LegacySpecialTileAllocator.ts (wired 2026-09-27). */
  readonly onSpatialAction?: (mode: number, x: number, y: number, value: number) => void;
  /** f.c(int,int,int,int) (#357) -- the rect-mark helper. */
  readonly onRectMark?: (x: number, y: number, width: number, height: number) => void;
  /** f.a(byte,byte,byte,byte) (#290) -- the byte action queue. */
  readonly onByteAction: (action: number, x: number, y: number, id: number) => void;
  /** f.a(byte) (#300) -- finalizeEntity. */
  readonly onFinalizeEntity: (id: number) => void;
  /** f.c(int,boolean) (#364) -- entity removal. */
  readonly onEntityRemoval: (id: number, flag: boolean) => void;
  /** b(int,int,int) (#342). */
  readonly onAuxiliary: (first: number, second: number, third: number) => void;
  /** f.b(int) (#343). */
  readonly onSceneDispatch: (value: number) => void;
};

function toByte(value: number): number {
  return (value << 24) >> 24;
}

function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value >= max ? max : value;
}

/**
 * `private void e(int,int)` (#378), bytecode/b-javap.txt line 46478, offsets
 * 0..81: marks this unit's own reservation in `f.b:[[[B` as cancelled.
 *
 *   for (k = 0; k < 30 && xSlots[team][0][k] != 0; k++)
 *     if (xSlots[team][2][k] == id && xSlots[team][1][k] != 3)
 *       xSlots[team][2][k] = -2;
 */
export function releaseLegacyEntitySlotReservation(
  xSlots: readonly (readonly Int8Array[])[],
  team: number,
  id: number,
): void {
  const rows = xSlots[team];
  if (!rows) return;
  for (let k = 0; k < 30; k += 1) {
    if ((rows[0]?.[k] ?? 0) === 0) return;
    if ((rows[2]?.[k] ?? 0) === id && (rows[1]?.[k] ?? 0) !== 3) {
      rows[2]![k] = -2;
    }
  }
}

export function stepLegacyEntityVacate(
  input: LegacyEntityVacateInput,
  kind: number,
  x: number,
  y: number,
  id: number,
): void {
  const { state } = input;
  const table = (row: number, index: number) => input.packedBytes[(input.packedOffsets[row] ?? 0) + index] ?? 0;

  if (kind === 106) {
    input.onL?.(id);
    input.onSpatialAction?.(6, x, y, table(183, state[ANIMAL_KIND + id] ?? 0));
    input.onRectMark?.(x, y, 1, 1);
  } else if (kind === 19) {
    if (id <= 50) {
      // Offsets 76..196: t41[6464] 9 -> 12, 11 -> 13, 8 -> 14, 10 -> 15.
      const action = { 9: 12, 11: 13, 8: 14, 10: 15 }[table(T_TYPE_JOB, state[UNIT_JOB_TYPE + id] ?? 0)];
      if (action !== undefined) input.onByteAction(action, toByte(x), toByte(y), id);

      // Offsets 197..275: the chief's death costs every adult 25 happiness.
      if (id === (input.shortRows[0]?.[17] ?? 0)) {
        for (let unit = 1; unit <= 50; unit += 1) {
          if ((state[UNIT_AGE + unit] ?? 0) < 12) continue;
          state[UNIT_HAPPINESS + unit] = toByte(clamp((state[UNIT_HAPPINESS + unit] ?? 0) - 25, 0, 99));
        }
      }
    }

    input.onFinalizeEntity(id);
    state[UNIT_MODE + id] = (state[UNIT_AGE + id] ?? 0) >= 12 ? 43 : 44;
    state[3030 + id] = id > input.v ? -1 : 0;
    state[UNIT_SLOT + id] = -64;
    releaseLegacyEntitySlotReservation(input.xSlots, Math.trunc((id - 1) / 50), id);
  } else if (kind === 85) {
    input.onEntityRemoval(id, true);
  }

  // Offsets 390..547.
  const fByte = input.scratch.subsystemGFFlagByte;
  if (fByte >= table(291, input.fQ)) return;
  const base = table(288, input.fQ) + fByte;
  if (table(287, base) !== 10) return;
  if (!(kind === 106 || (kind === 19 && id > 50))) return;

  input.onAuxiliary(0, 0, 1);
  input.onSceneDispatch(table(286, base));
  input.scratch.subsystemGFFlagByte = toByte(fByte + 50);
}
