import { BLD_KIND } from "../core/DenseLayout";
/**
 * `final void f(int)` (#383), bytecode/f-javap.txt line 28740, offsets
 * 0..79 -- the other half of `f.h(int)`, which is just `f(id); e(id);`.
 * Where `e(int)` (`LegacyEntitySelectionRelease.ts`) drops the unit out of
 * whichever squad row holds it, this one drops it out of the **cursor**:
 *
 *   if (k:B != id) return;              // not the unit under the cursor
 *   k:B = 0;
 *   if (w:B == 1) { w:B = 0; l:B = 0; a(true, true, false, false); return; }
 *   if (w:B == 2 && dense[8749 + q:I] == 6) { w:B = 0; a(true, true, false, false); }
 *
 * So a unit that vanishes while selected takes the selection with it, and
 * the open panel closes -- unconditionally for the unit panel (`w:B` 1),
 * and for the building panel (`w:B` 2) only when the record it is showing
 * is a storehouse (kind 6), which is the one panel whose contents belong to
 * the unit rather than the building.
 *
 * Reached from `c(byte)` (#363, `LegacyEntityAbduction.ts`) when the enemy
 * carries one of the player's villagers off.
 */
export type LegacyEntitySelectionDropState = {
  /** f.k:B (#333) -- the unit under the cursor. */
  kByte: number;
  /** f.w:B (#382) -- which panel is open. */
  barMode: number;
  /** f.l:B (#337) -- the focus id. */
  selectedId: number;
};

export type LegacyEntitySelectionDropInput = {
  readonly state: Int8Array;
  /** f.q:I (#356) -- the selected record. */
  readonly qCounter: number;
  readonly game: LegacyEntitySelectionDropState;
  /** private void a(boolean,boolean,boolean,boolean) (#434). */
  readonly onSelectionRefresh: (a: boolean, b: boolean, c: boolean, d: boolean) => void;
};

export function stepLegacyEntitySelectionDrop(input: LegacyEntitySelectionDropInput, id: number): void {
  const { game } = input;

  // Offsets 0..7.
  if (game.kByte !== id) return;

  // Offsets 8..12.
  game.kByte = 0;

  // Offsets 13..39.
  if (game.barMode === 1) {
    game.barMode = 0;
    game.selectedId = 0;
    input.onSelectionRefresh(true, true, false, false);
    return;
  }

  // Offsets 40..78.
  if (game.barMode === 2 && (input.state[BLD_KIND + input.qCounter] ?? 0) === 6) {
    game.barMode = 0;
    input.onSelectionRefresh(true, true, false, false);
  }
}
