import { UNIT_AGE, UNIT_GENDER } from "../core/DenseLayout";
/**
 * Raw port of `private void p()`, bytecode/f-javap.txt offsets 0..473.
 * Called from `private void a(int,int,int,int,byte)` (#443, already ported
 * as `LegacyEntityAction.ts`'s `stepLegacyEntityAction`, exposed there as
 * the still-unwired `onP` callback) right after that method finishes
 * computing `aq`/`ar`/`as`/`Y`/`au` -- this is the per-entity sprite-layer
 * loop those fields feed into.
 *
 * Shape: linear setup (`aA = b[8][au]`; `ao = ap = -1`), then a single
 * `for (aB = 0; aB < j[15][au]; aB++)` loop (offsets 31..470, `goto 31`)
 * over `az = aA + aB` (one layer per iteration). Per layer:
 *   - offset 75: skip the layer entirely (`continue`) if `b[7][az] === 0`.
 *   - offset 105: branch on `Y === 29`.
 *     - `Y === 29`: gate on callback `onA` (private boolean a(), #444,
 *       offset 115) with `continue` on false; then branch on
 *       `dense[1414+aq] < 12`:
 *       - `< 12` (offset 166): `ay`-keyed sub-branches -- `ay===7` skips
 *         the layer unless `dense[1515+aq] !== 0`; `ay===0` sets
 *         `ap = az` and (`aq>=51`) bumps `ax`; `ay===9` sets `ao = az` and
 *         recomputes `ax` from `dense[5151+aq] & 1`; `ay===5` skips the
 *         layer; any other `ay` falls through unchanged.
 *       - `>= 12` (offset 142): (`aq>=51`) sets `an = 4`, then gates on
 *         callback `onB` (private boolean b(), #534, offset 157) with
 *         `continue` on false.
 *       Both sub-paths (except the `continue`s) converge at offset 281,
 *       which skips the layer if `b[7][az] === 1`.
 *     - `Y !== 29` (offset 300): if `ay === 0`, sets both `ap = az` and
 *       `ao = az`. No offset-281-equivalent check on this side.
 *   - offset 320 (shared convergence for both `Y` branches that didn't
 *     `continue`): reads bit 7 of `j[14][az]` (the one masked read in this
 *     method, `& 255` then `>> 7`, matching the bytecode's explicit
 *     `sipush 255; iand` at offset 332-335) to choose between callback
 *     `onDrawSprite` (bit clear, private void b(int,int,int) #535,
 *     already ported as `LegacyPackedSpriteRenderer.drawSprite`) and
 *     callback `onDrawComposite` (bit set, private void a(int,int,int)
 *     #439, already ported as `LegacyPackedSpriteRenderer.drawComposite`),
 *     both called with `(b[7][az] + ax, ar + j[12][az], as + j[13][az])`.
 *     Either way, `an` is reset to `-1` afterward (offset 455-457) -- note
 *     this reset is skipped by every `continue` path, so `an` genuinely
 *     persists across layers/calls until a draw actually happens, matching
 *     `LegacyPackedSpriteRenderer`'s own `an` input (`-1` = no remap).
 *
 * No exception table on this method (unlike its caller) -- nothing here
 * needs to be caught.
 *
 * Field identities, each confirmed via its own constant-pool index (this
 * class has same-letter fields of different types all over, several with
 * real bug history -- see docs/goal.md's 2026-09-04 entries):
 *   - `aA`/#149 `aA:I` (no twin), `aB`/#150 `aB:I` (no twin), `az`/#233
 *     `az:I` (no twin).
 *   - `ao`/#211 `ao:I` -- distinct from `ao:B`/#212 (`LegacyGameState.ao`).
 *   - `ap`/#213 `ap:I` -- distinct from `ap:B`/#214.
 *   - `ax`/#230 `ax:I` -- distinct from `ax:B`/#229 (`selectionAx`).
 *   - `ay`/#231 `ay:I` -- distinct from `ay:B`/#232.
 *   - `an`/#209 `an:I` -- distinct from `an:B`/#210 (`LegacyGameState.an`).
 *     This IS the field `LegacyPackedSpriteRenderer`'s `input.an` reads.
 *   - `aq`/#216, `ar`/#217, `as`/#220, `au`/#223 -- all the `:I` twins,
 *     matching `LegacyEntityAction.ts`'s field of the same names (its
 *     `#216`/`#217`/`#220`/`#223`), NOT the `:B` twins (#215/#218/#219/#224).
 *   - `Y`/#117 `Y:B` -- same field as `LegacyEntityAction.ts`'s `Y`.
 *   - `e:[B`/#286 -- `denseState` elsewhere in this port.
 *   - `j:[[B`/#326 -- `byteTables` elsewhere in this port (confirmed the
 *     only 2D byte-array-of-byte-arrays `j` field; the other five `j`
 *     twins are `I`/`[B`/`[I`/`B`/`Z`).
 *   - `b:[[S`/#244 -- `shortTables` elsewhere in this port (confirmed the
 *     only 2D-short `b` field among four 2D-array `b` twins:
 *     `[[[B`/#237, `[[I`/#238, `[[B`/#242, `[[S`/#244).
 */

export type LegacySpriteLayerLoopState = {
  /** f.aA:I (#149), computed fresh each call from b[8][au]. */
  aA: number;
  /** f.aB:I (#150), loop counter, reset to 0 at method entry. */
  aB: number;
  /** f.ao:I (#211), output -- set from `az` on some paths. */
  ao: number;
  /** f.ap:I (#213), output -- set from `az` on some paths. */
  ap: number;
  /** f.ax:I (#230), per-layer scratch used as a draw-index offset. */
  ax: number;
  /** f.ay:I (#231), per-layer selector (`j[14][az] & 15`). */
  ay: number;
  /** f.az:I (#233), current layer index (`aA + aB`). */
  az: number;
  /**
   * f.an:I (#209) -- sprite-index override consumed by
   * `LegacyPackedSpriteRenderer.drawSprite`'s `an` input. Persists across
   * calls (only reset to -1 right before a successful draw), so callers
   * should carry this field the same way they carry `ao`/`ap`.
   */
  an: number;
  /** f.aq:I (#216) -- same field as LegacyEntityAction.ts's `aq`. */
  readonly aq: number;
  /** f.ar:I (#217) -- same field as LegacyEntityAction.ts's `ar`. */
  readonly ar: number;
  /** f.as:I (#220) -- same field as LegacyEntityAction.ts's `as`. */
  readonly as: number;
  /** f.au:I (#223) -- same field as LegacyEntityAction.ts's `au`. */
  readonly au: number;
  /** f.Y:B (#117) -- same field as LegacyEntityAction.ts's `Y`. */
  readonly Y: number;
  /** f.e:[B (#286), dense state. */
  readonly dense: Int8Array;
  /** f.j:[[B (#326). */
  readonly byteTables: readonly Int8Array[];
  /** f.b:[[S (#244). */
  readonly shortTables: readonly Int16Array[];
};

export type LegacySpriteLayerLoopCallbacks = {
  /** private boolean a() (#444) -- LegacySpriteLayerPredicates.ts. */
  readonly onA?: () => boolean;
  /** private boolean b() (#534) -- LegacySpriteLayerPredicates.ts. */
  readonly onB?: () => boolean;
  /** private void b(int,int,int) (#535) -- LegacyPackedSpriteRenderer.drawSprite. */
  readonly onDrawSprite?: (index: number, x: number, y: number) => void;
  /** final void a(int,int,int) (#439) -- LegacyPackedSpriteRenderer.drawComposite. */
  readonly onDrawComposite?: (index: number, x: number, y: number) => void;
};

export function stepLegacySpriteLayerLoop(
  state: LegacySpriteLayerLoopState,
  callbacks: LegacySpriteLayerLoopCallbacks = {},
): void {
  // Offsets 0-28: linear setup.
  state.aA = state.shortTables[8]?.[state.au] ?? 0;
  state.ao = -1;
  state.ap = -1;
  state.aB = 0;

  // Offset 31-47: loop condition (while (aB < j[15][au])).
  for (; state.aB < (state.byteTables[15]?.[state.au] ?? 0); state.aB += 1) {
    // Offsets 50-60.
    state.az = state.aA + state.aB;

    // Offsets 63-78: skip this layer entirely if b[7][az] === 0.
    if ((state.shortTables[7]?.[state.az] ?? 0) === 0) continue;

    // Offsets 81-102.
    state.ax = 0;
    state.ay = (state.byteTables[14]?.[state.az] ?? 0) & 15;

    // Offset 105-111.
    if (state.Y === 29) {
      // Offsets 114-121.
      if (!(callbacks.onA?.() ?? false)) continue;

      if ((state.dense[UNIT_AGE + state.aq] ?? 0) < 12) {
        // Offset 166-278: ay-keyed sub-branches.
        if (state.ay === 7) {
          // Offsets 175-191.
          if ((state.dense[UNIT_GENDER + state.aq] ?? 0) === 0) continue;
        }
        if (state.ay === 0) {
          // Offsets 201-228.
          state.ap = state.az;
          if (state.aq >= 51) state.ax += 1;
        } else if (state.ay === 9) {
          // Offsets 240-267.
          state.ao = state.az;
          state.ax = (state.dense[5151 + state.aq] ?? 0) & 1;
        } else if (state.ay === 5) {
          // Offsets 270-278.
          continue;
        }
        // Any other `ay` (including ay===7 with dense[1515+aq]!==0) falls
        // straight through to offset 281 with no further change here.
      } else {
        // Offset 142-163: dense[1414+aq] >= 12.
        if (state.aq >= 51) state.an = 4;
        if (!(callbacks.onB?.() ?? false)) continue;
      }

      // Offset 281-297: shared check before the offset-320 convergence.
      if ((state.shortTables[7]?.[state.az] ?? 0) === 1) continue;
    } else {
      // Offset 300-317: Y !== 29. No offset-281 check on this side.
      if (state.ay === 0) {
        state.ap = state.az;
        state.ao = state.az;
      }
    }

    // Offset 320-452: shared draw dispatch.
    const bit7 = ((state.byteTables[14]?.[state.az] ?? 0) & 0xff) >> 7;
    const record = state.shortTables[7]?.[state.az] ?? 0;
    const index = record + state.ax;
    const x = state.ar + (state.byteTables[12]?.[state.az] ?? 0);
    const y = state.as + (state.byteTables[13]?.[state.az] ?? 0);
    if (bit7 === 0) {
      callbacks.onDrawSprite?.(index, x, y);
    } else {
      callbacks.onDrawComposite?.(index, x, y);
    }

    // Offset 455-457: reset only reached after an actual draw.
    state.an = -1;
  }
}
