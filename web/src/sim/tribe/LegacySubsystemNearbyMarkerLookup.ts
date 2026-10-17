import { ANIMAL_TARGET, BLD_KIND, UNIT_AGE, UNIT_FLAGS, UNIT_HP, UNIT_ORDER, UNIT_TYPE, UNIT_WORK_TARGET, UNIT_Y } from "../../core/DenseLayout";
import { T_BUILDING } from "../../core/DataTables";
/**
 * Exact `private void a(byte, byte, byte, byte)` (bytecode/b-javap.txt
 * offsets 0..900), `private boolean p()`'s own per-iteration call
 * (`this.a(dense[v], dense[101+v], 0, 0)`, using the SAME `(at,au,av,aw)`
 * bounding box `b(byte,byte,byte)` just computed as ambient instance
 * state, plus an ambient `aj:I`(#111) layer index `p()`'s own `ag`-loop
 * sets before each call).
 *
 * **RETRACTED (2026-09-04/05)**: this file previously threw unconditionally
 * on the finding that class b's own `c:[[[B]`(#151) is permanently null.
 * It is not -- `f.g()` allocates it (f-javap.txt offset 460..473, `new
 * byte[5][6][6]`), and this port has had it all along as
 * `LegacySubsystemArrays.c`. The method is fully real, working code: a
 * per-(zone,layer) linked-list walk over a spatial hash the sibling method
 * `n()` (`LegacySubsystemVoidN.ts`) rebuilds every call.
 *
 * Structure, traced against `bytecode/b-javap.txt:31981..32467`:
 *
 *  - `c[layer][ai][ah]` (`ah` from `at..au`, `ai` from `av..aw`, i.e. the
 *    SAME coarse `>>4` col/row zone grid `n()` rebuilds) holds the LOCAL
 *    index (`ak`, relative to the layer's own team-start offset) of the
 *    most-recently-registered occupant of that zone, or `-1` if none.
 *    `aRows[layer][ak]` (field `a:[[B]`#75, `new byte[5][50]`,
 *    `f.g()` offset 476..487 -- the SAME field `n()` uses to stash the
 *    previous occupant before overwriting a cell) is that occupant's own
 *    "next" pointer, so `while (ak >= 0) { ...; ak = aRows[layer][ak]; }`
 *    walks every entity `n()` ever chained into this zone, most-recent
 *    first.
 *  - For each node, `al = ak + packedBytes[packedOffsets[115]+layer]`
 *    recovers the GLOBAL dense id (offset 68..91, the exact inverse of
 *    `n()`'s own `local3 = i2 - packedBytes[packedOffsets[115]+i1]`).
 *  - `ap`/`aq` (offset 94..272): the node's on-screen position, taken from
 *    `dense[saveOffsets[...]+al]` (the same #118-table lookup `n()` uses
 *    for its own row/col), plus a half-of-a-packed-byte nudge that only
 *    applies when `layer===2||layer===3` (a wide/rotated team layer).
 *  - `ar`/`as` (offset 275..292): `ap-refX`/`aq-refY`, i.e. the node's
 *    position relative to the method's own `(refX,refY)` byte params.
 *  - `ao` (offset 295..374): a distance/weight lookup,
 *    `packedBytes[packedOffsets[53] + clampedAr*25 + clampedAs] / 10`,
 *    where `clampedAr`/`clampedAs` are `12+ar`/`12+as` when in `[-12,12]`
 *    or `0` (NOT clamped to the edge) when out of range -- an out-of-range
 *    axis reads column/row 0 of the table, it doesn't saturate.
 *  - `mode===0` (param 3, offset 377..656, `p()`'s own real call always
 *    passes `0`): a "best candidate" scan. Skips the node (continues the
 *    `while`) when: the node's own group-marker liveness check fails
 *    (`dense[saveOffsets[packedBytes[packedOffsets[117]+layer]]+al] <= 0`,
 *    the same idiom `n()` uses); `layer<=1 && (dense[7979+al]&1)!==0`;
 *    `layer===4 && dense[2828+entityId]!==60 && dense[9601+al]===0`; or
 *    `ao` exceeds a threshold read from `saveOffsets[gridC[refY][refX]===
 *    entityId ? 49 : 18]+entityId` (the CALLER's own cell, not the node's
 *    -- different table entry depending on whether the caller already
 *    occupies its own cell). Otherwise computes `am` (a per-layer/counter
 *    priority class) and, if `am` beats the running best (`y:B`#232,
 *    strictly lower, or equal with a lower `ao` than the running `an:I`
 *    #115), records this node as the new best: `y=am; an=ao; z=ap; A=aq;
 *    F=al` (offset 612..656, `z:B`#235/`A:B`#6/`F:B`#17 -- `F` is this
 *    method's own EXCLUSIVE writer in the whole class, see
 *    `LegacySubsystemArrays.ts`'s docblock for the other two fields'
 *    other writers).
 *  - `mode!==0` (offset 659..854, unreached by `p()`'s own real call):
 *    skips when `ao` exceeds param 4 (`threshold`); when the node isn't at
 *    its own registered cell (`gridC[dense[101+al]][dense[al]]!==al`); or
 *    on a chain of type/counter gates
 *    (`dense[1919+al]<=0`, `dense[1414+al]<12`, `dense[6161+al]!==0`,
 *    `type∈{<=9,59,87,50}`). Otherwise marks the node
 *    `dense[6161+al]=4; dense[4747+al]=(byte)mode`.
 *  - Both branches (and every skip) fall into the SAME tail (offset
 *    854..872): `ak = aRows[layer][ak]`, then loop.
 *
 * `y:B`/`an:I` persist ACROSS calls (reset once by `p()` itself before its
 * `ag` loop, and independently by `b(byte,byte,byte)`
 * (`LegacySubsystemClampBounds.ts`) before computing each call's bounding
 * box -- neither reset is modeled by this port yet, see those files' own
 * docblocks), which is why they're threaded through `arrays` here rather
 * than being local state.
 *
 * `p()` itself (the `mode===0`/`layer`/persistent-tracker caller) is only
 * partially ported (`LegacySubsystemBBoolean2.ts`) -- its own `ag`-loop
 * (which recomputes `layer` up to 3 times per call) and its post-loop tail
 * (offset 254..385, including `H()`, 753 lines) are out of this file's
 * scope and still reflect the now-retracted premise there; see that
 * file's own docblock.
 */
export type LegacySubsystemNearbyMarkerLookupArrays = {
  /** b's own c:[[[B] (#151), `f.g()`-allocated `new byte[5][6][6]` -- LegacySubsystemArrays.c. */
  readonly c: readonly (readonly Int8Array[])[];
  /** b's own a:[[B] (#75), `f.g()`-allocated `new byte[5][50]` -- LegacySubsystemArrays.aRows. */
  readonly aRows: readonly Int8Array[];
  /** b's own y:B (#232) -- LegacySubsystemArrays.bField232. */
  bField232: number;
  /** b's own an:I (#115) -- LegacySubsystemArrays.bField115. */
  bField115: number;
  /** b's own z:B (#235) -- LegacySubsystemArrays.bField235. */
  bField235: number;
  /** b's own A:B (#6) -- LegacySubsystemArrays.bField6. */
  bField6: number;
  /** b's own F:B (#17) -- LegacySubsystemArrays.bField17. */
  bField17: number;
};

export type LegacySubsystemNearbyMarkerLookupInput = {
  readonly dense: Int8Array;
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
  readonly saveOffsets: Int16Array;
  readonly gridC: readonly Int8Array[];
  readonly arrays: LegacySubsystemNearbyMarkerLookupArrays;
  readonly bounds: { readonly at: number; readonly au: number; readonly av: number; readonly aw: number };
  /** aj:I (#111) -- the c-cube layer, ambient state set by p()'s own ag-loop (out of scope here). */
  readonly layer: number;
  /** v:I (#225) -- the entity this scan runs for ("this.a"'s own owner, per p()). */
  readonly entityId: number;
  /** Method param 1 (byte). p()'s own real call passes dense[entityId]. */
  readonly refX: number;
  /** Method param 2 (byte). p()'s own real call passes dense[101+entityId]. */
  readonly refY: number;
  /** Method param 3 (byte). p()'s own real call always passes 0 (branch A). */
  readonly mode: number;
  /** Method param 4 (byte). p()'s own real call always passes 0 (unused by branch A). */
  readonly threshold: number;
};

export function stepLegacySubsystemNearbyMarkerLookup(input: LegacySubsystemNearbyMarkerLookupInput): void {
  const { dense, packedBytes, packedOffsets, saveOffsets, gridC, arrays, bounds, layer, entityId, refX, refY, mode, threshold } = input;
  const { at, au, av, aw } = bounds;
  const teamStart = packedBytes[(packedOffsets[115] ?? 0) + layer] ?? 0;

  for (let ah = at; ah <= au; ah += 1) {
    for (let ai = av; ai <= aw; ai += 1) {
      let ak = arrays.c[layer]?.[ai]?.[ah] ?? -1;

      while (ak >= 0) {
        const al = ak + teamStart;

        const baseIdx118 = packedBytes[(packedOffsets[118] ?? 0) + layer] ?? 0;
        const wideTeam = layer === 2 || layer === 3;
        const colBase = dense[(saveOffsets[baseIdx118] ?? 0) + al] ?? 0;
        const rowBase = dense[(saveOffsets[baseIdx118 + 1] ?? 0) + al] ?? 0;
        const nudge = wideTeam ? Math.trunc((packedBytes[(packedOffsets[T_BUILDING] ?? 0) + 104 + (dense[BLD_KIND + al] ?? 0)] ?? 0) / 2) : 0;
        const rowNudge = wideTeam ? Math.trunc((packedBytes[(packedOffsets[T_BUILDING] ?? 0) + 130 + (dense[BLD_KIND + al] ?? 0)] ?? 0) / 2) : 0;
        const ap = colBase + nudge;
        const aq = rowBase + rowNudge;

        const ar = ap - refX;
        const as = aq - refY;
        const clampedAr = ar >= -12 && ar <= 12 ? 12 + ar : 0;
        const clampedAs = as >= -12 && as <= 12 ? 12 + as : 0;
        const ao = Math.trunc((packedBytes[(packedOffsets[53] ?? 0) + clampedAr * 25 + clampedAs] ?? 0) / 10);

        do {
          if (mode === 0) {
            const marker = packedBytes[(packedOffsets[117] ?? 0) + layer] ?? 0;
            if ((dense[(saveOffsets[marker] ?? 0) + al] ?? 0) <= 0) break;
            if (layer <= 1 && ((dense[UNIT_FLAGS + al] ?? 0) & 1) !== 0) break;
            if (layer === 4 && (dense[UNIT_TYPE + entityId] ?? 0) !== 60 && (dense[ANIMAL_TARGET + al] ?? 0) === 0) break;

            const ownCell = gridC[refY]?.[refX] ?? 0;
            const thresholdIndex = ownCell === entityId ? 49 : 18;
            if (ao > (dense[(saveOffsets[thresholdIndex] ?? 0) + entityId] ?? 0)) break;

            const am = layer < 2 && (dense[UNIT_AGE + al] ?? 0) < 12 ? 1 : packedBytes[(packedOffsets[119] ?? 0) + layer] ?? 0;

            const y = arrays.bField232;
            let accept: boolean;
            if (y < am) accept = true;
            else if (y !== am) accept = false;
            else accept = ao < arrays.bField115;
            if (!accept) break;

            arrays.bField232 = (am << 24) >> 24;
            arrays.bField115 = ao;
            arrays.bField235 = (ap << 24) >> 24;
            arrays.bField6 = (aq << 24) >> 24;
            arrays.bField17 = (al << 24) >> 24;
          } else {
            if (ao > threshold) break;
            if ((gridC[dense[UNIT_Y + al] ?? 0]?.[dense[al] ?? 0] ?? 0) !== al) break;
            if ((dense[UNIT_HP + al] ?? 0) <= 0) break;
            if ((dense[UNIT_AGE + al] ?? 0) < 12) break;
            if ((dense[UNIT_ORDER + al] ?? 0) !== 0) break;
            const type = dense[UNIT_TYPE + al] ?? 0;
            if (type <= 9 || type === 59 || type === 87 || type === 50) break;

            dense[UNIT_ORDER + al] = 4;
            dense[UNIT_WORK_TARGET + al] = (mode << 24) >> 24;
          }
          // eslint-disable-next-line no-constant-condition
        } while (false);

        ak = arrays.aRows[layer]?.[ak] ?? -1;
      }
    }
  }
}
