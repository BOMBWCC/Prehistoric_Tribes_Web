import { BLD_KIND, BLD_LEVEL, UNIT_ENERGY, UNIT_FOOD, UNIT_HAPPINESS, UNIT_RECORD, UNIT_SLOT, UNIT_TYPE } from "../../core/DenseLayout";
import { T_BUILDING } from "../../core/DataTables";
/**
 * Exact `private void W()` (#?), bytecode/b-javap.txt line 36836, offsets
 * 0..371: the happiness (505) drift. Its only caller is `private boolean
 * a()`'s periodic `W()` call (`LegacyEntityStatusGuard.ts`'s `onW`, once
 * every 32 frames per unit).
 *
 *   if (f.c < b[c[4] + f.q]) return;                  // same opening grace as r()
 *   w  = 505 + t51[type];
 *   w += (t51[type] < 0 && 3434 < 1) ? -3 : 0;          // homeless
 *   w -= (2121 < 20) ? 1 : 0;                           // tired
 *   w -= (2020 < 20) ? 1 : 0;                           // hungry
 *   w += (4646 >= 0 && type not in {92, 93, 106})
 *        ? t138[(20 + 9115[rec]) * 26 + 8749[rec]] : 0; // working in a building, rec = 4444
 *   505 = clamp(w + (f.q < 2 ? 1 : 0) + u, 0, 99);
 *
 * `w:I` (#228) is b's shared scratch and is written through.
 *
 * WIRED 2026-09-18: the status guard's only call site did not pass `onW`, so
 * a villager's happiness never moved from the random value it was born with.
 * Happiness gates courtship (both partners need 505 >= 75) and sends a
 * villager dancing at 505 <= 30, and the homeless penalty ties it to housing
 * (`LegacyEntityHousing.ts`) -- which is how more villagers than beds turns
 * into no more births.
 */
export type LegacyEntityHappinessInput = {
  readonly state: Int8Array;
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
  readonly id: number;
  /** b.u:I (#222). */
  readonly team: number;
  /** f.c:I (#148). */
  readonly frame: number;
  /** f.q:B (#211). */
  readonly fQ: number;
  /** b.b:[S (#132) -- saveOffsets. */
  readonly bShort: Int16Array;
  /** b.c:[S (#142) -- sectionOffsets. */
  readonly shortTableBOffsets: Int16Array;
  /** b.w:I (#228). */
  readonly scratch: { w: number };
};

function toByte(value: number): number {
  return (value << 24) >> 24;
}

export function stepLegacyEntityHappiness(input: LegacyEntityHappinessInput): void {
  const { state, id: v } = input;
  const table = (row: number, index: number) => input.packedBytes[(input.packedOffsets[row] ?? 0) + index] ?? 0;

  // Offsets 0..29.
  if (input.frame < (input.bShort[(input.shortTableBOffsets[4] ?? 0) + input.fQ] ?? 0)) return;

  // Offsets 30..172.
  const type = state[UNIT_TYPE + v] ?? 0;
  const t51 = table(51, type);
  let w = (state[UNIT_HAPPINESS + v] ?? 0) + t51;
  w += t51 < 0 && (state[3434 + v] ?? 0) < 1 ? -3 : 0;
  w -= (state[UNIT_ENERGY + v] ?? 0) < 20 ? 1 : 0;
  w -= (state[UNIT_FOOD + v] ?? 0) < 20 ? 1 : 0;
  input.scratch.w = w;

  // Offsets 175..322.
  if ((state[UNIT_SLOT + v] ?? 0) >= 0 && type !== 92 && type !== 93 && type !== 106) {
    const rec = state[UNIT_RECORD + v] ?? 0;
    input.scratch.w += table(T_BUILDING, (20 + (state[BLD_LEVEL + rec] ?? 0)) * 26 + (state[BLD_KIND + rec] ?? 0));
  }

  // Offsets 325..370. `b(III)` is clamp(value, min, max).
  const raw = input.scratch.w + (input.fQ < 2 ? 1 : 0) + input.team;
  state[UNIT_HAPPINESS + v] = toByte(raw < 0 ? 0 : raw >= 99 ? 99 : raw);
}
