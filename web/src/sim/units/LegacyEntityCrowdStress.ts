import { UNIT_AGE, UNIT_FLAGS, UNIT_RECORD, UNIT_TYPE, UNIT_Y } from "../../core/DenseLayout";
/**
 * `private void X()` (bytecode/b-javap.txt line 37042, offsets 0..243) and
 * `private void Y()` (line 37181, offsets 0..263) -- the two halves of the
 * crowding/stress counter `8080`, both called from the status guard `a()`
 * (`LegacyEntityStatusGuard.ts`) on their own cadences: `Y()` every 8 ticks
 * while `7979 & 4` is set and the unit stands on its own cell, `X()` on every
 * other frame while that flag is clear.
 *
 * `X()`:
 *  - 0..33: the unit stands on its own cell (`gridC[101[v]][0[v]] === v`) ->
 *    37..70: `if (8080[v] > 0) 8080[v] -= 1;` (the counter decays).
 *  - 74..124: otherwise, types 92/93/106 are exempt and skip to the tail.
 *  - 128..192: otherwise `8080[v] = clamp(8080[v] + ((8871[4444[v]] & 2) != 0
 *    ? 1 : -1), 0, 30)` -- the same static `b(int,int,int)` clamp (#334) this
 *    port already has as `clampToRange`.
 *  - 194..243 (the shared tail): `if (8080[v] >= 30) { 7979[v] |= 4;
 *    8080[v] = 0; }` -- crossing 30 raises the flag whose icon `f.q()` draws
 *    as sprite record 73, and resets the counter.
 *
 * `Y()`: a 3x3 sweep around the unit that pushes the stress onto its
 * neighbours -- for each `n`,`o` in -1..1, `p = gridC[101[v] + o][0[v] + n]`,
 * and when `p` is a unit (`0 < p <= 100`) that is not flagged itself
 * (`7979[p] & 4` clear) and is an adult (`1414[p] >= 12`), `8080[p] += 8`.
 *
 * NOTE, reproduced deliberately: the original's four bounds checks (offsets
 * 27..118) all use `n` -- including the two for the ROW -- while the cell read
 * at 123..161 indexes the row with `o`. So the row bound is checked against
 * the wrong offset; a cell one row outside the map can still be read (Java
 * throws there, which the caller's own try/catch swallows). Keeping the
 * asymmetry means keeping the original's reachable behaviour.
 *
 * `n:B` (#204), `o:B` (#206) and `p:B` (#208) are written before they are
 * read, so they are locals here.
 */
export type LegacyEntityCrowdStressInput = {
  readonly state: Int8Array;
  readonly entityId: number;
  /** b.b:[[B (#129), gridC. */
  readonly gridC: readonly Int8Array[];
  /** f.c:S -- the map width. */
  readonly mapWidth: number;
  /** f.d:S -- the map height. */
  readonly mapHeight: number;
};

function toByte(value: number): number {
  return (value << 24) >> 24;
}

/** The same static `b(int,int,int)` (#334) clamp the rest of this port uses. */
function clampToRange(value: number, min: number, max: number): number {
  if (value < min) return min;
  return value >= max ? max : value;
}

export function stepLegacyEntityCrowdDecay(input: LegacyEntityCrowdStressInput): void {
  const { state, entityId: v } = input;
  const x = state[v] ?? 0;
  const y = state[UNIT_Y + v] ?? 0;

  if ((input.gridC[y]?.[x] ?? 0) === v) {
    // Offsets 37..70.
    if ((state[8080 + v] ?? 0) > 0) state[8080 + v] = toByte((state[8080 + v] ?? 0) - 1);
  } else {
    const type = state[UNIT_TYPE + v] ?? 0;
    if (type !== 92 && type !== 93 && type !== 106) {
      // Offsets 128..192.
      const record = state[UNIT_RECORD + v] ?? 0;
      const step = ((state[8871 + record] ?? 0) & 2) !== 0 ? 1 : -1;
      state[8080 + v] = toByte(clampToRange((state[8080 + v] ?? 0) + step, 0, 30));
    }
  }

  // Offsets 194..243, reached from every path above.
  if ((state[8080 + v] ?? 0) >= 30) {
    state[UNIT_FLAGS + v] = toByte((state[UNIT_FLAGS + v] ?? 0) | 4);
    state[8080 + v] = 0;
  }
}

export function stepLegacyEntityCrowdSpread(input: LegacyEntityCrowdStressInput): void {
  const { state, entityId: v } = input;
  const x = state[v] ?? 0;
  const y = state[UNIT_Y + v] ?? 0;

  for (let n = -1; n < 2; n += 1) {
    for (let o = -1; o < 2; o += 1) {
      if (x + n < 0) continue;
      if (x + n >= input.mapWidth) continue;
      // The original checks the ROW bounds with `n` too -- see the docblock.
      if (y + n < 0) continue;
      if (y + n >= input.mapHeight) continue;

      const p = input.gridC[y + o]?.[x + n] ?? 0;
      if (p <= 0 || p > 100) continue;
      if (((state[UNIT_FLAGS + p] ?? 0) & 4) !== 0) continue;
      if ((state[UNIT_AGE + p] ?? 0) < 12) continue;
      state[8080 + p] = toByte((state[8080 + p] ?? 0) + 8);
    }
  }
}
