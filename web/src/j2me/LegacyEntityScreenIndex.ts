/**
 * `private void T()`, bytecode/b-javap.txt line 35270, offsets 0..315 --
 * `b.e()`'s very last call (offset 752), once per tick after both teams'
 * entity loops. It rebuilds the **on-screen entity index**: which unit sits
 * under each visible cell, so a click or a cursor can resolve back to one.
 *
 *   for (u = 0; u < 2; u++)
 *     for (v = u * 50 + 1; v <= (u + 1) * 50; v++) {
 *       if (dense[5959 + v] <= 0) continue;
 *       sx = dense[5252 + v];  sy = dense[5353 + v];
 *       if (sx < f.I || sx >= f.I + f.O) continue;      // off screen
 *       if (sy < f.K || sy >= f.K + f.P) continue;
 *       dense[6060 + v] = gridG[sy - f.K][sx - f.I];    // whoever was here
 *       gridG[sy - f.K][sx - f.I] = (byte) v;           // ... now it is me
 *     }
 *
 * The two writes are a **push onto a per-cell stack**: the previous occupant
 * is kept in `dense[6060 + v]`, so several units standing on one visible
 * cell form a chain that `LegacySecondaryCellChain.ts` already walks with
 * `do { ... } while (dense[6060 + id] != 0)`. That file has been reading a
 * chain nothing ever built -- `gridG` had no producer at all, because this
 * method was `b.e()`'s unwired `onFinalScriptedPass`.
 *
 * `5252`/`5353` are the unit's screen cell and `5959` its "is drawn" flag;
 * `f.I`/`f.K` are the viewport origin and `f.O`/`f.P` its size, so the four
 * bounds tests are just "is this unit on screen right now".
 *
 * Note the index is rebuilt from scratch each tick by the caller clearing
 * `gridG`, not here -- this method only ever pushes.
 */
export type LegacyEntityScreenIndexInput = {
  readonly state: Int8Array;
  /** f.g:[[B (#180 via b, #300 in f) -- this port's gridG. */
  readonly gridG: readonly Int8Array[];
  /** f.I:B (#25) / f.K:B (#30) -- the viewport origin. */
  readonly viewportI: number;
  readonly viewportK: number;
  /** f.O:B (#42) / f.P:B (#45) -- the viewport size. */
  readonly viewportO: number;
  readonly viewportP: number;
};

function toByte(value: number): number {
  return (value << 24) >> 24;
}

export function stepLegacyEntityScreenIndex(input: LegacyEntityScreenIndexInput): void {
  const { state, gridG, viewportI, viewportK, viewportO, viewportP } = input;

  for (let team = 0; team < 2; team += 1) {
    for (let v = team * 50 + 1; v <= (team + 1) * 50; v += 1) {
      // Offsets 42..60.
      if ((state[5959 + v] ?? 0) <= 0) continue;

      // Offsets 61..168.
      const sx = state[5252 + v] ?? 0;
      if (sx < viewportI || sx >= viewportI + viewportO) continue;
      const sy = state[5353 + v] ?? 0;
      if (sy < viewportK || sy >= viewportK + viewportP) continue;

      // Offsets 169..288.
      const row = gridG[sy - viewportK];
      if (!row) continue;
      const column = sx - viewportI;
      state[6060 + v] = row[column] ?? 0;
      row[column] = toByte(v);
    }
  }
}
