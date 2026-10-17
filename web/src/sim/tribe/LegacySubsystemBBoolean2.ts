import { stepLegacySubsystemClampBounds } from "./LegacySubsystemClampBounds";
import { stepLegacySubsystemNearbyMarkerLookup, type LegacySubsystemNearbyMarkerLookupArrays } from "./LegacySubsystemNearbyMarkerLookup";
import { UNIT_TYPE, UNIT_VISION, UNIT_Y } from "../../core/DenseLayout";

/**
 * Exact `private boolean p()` (bytecode/b-javap.txt offsets 0..385) --
 * NOT the already-ported, unrelated `private void p()` (`LegacySubsystemP.ts`,
 * a different overload distinguished by return type/descriptor; confirmed
 * via constant-pool cross-reference, this project's recurring "same name,
 * different signature" hazard). Named `BBoolean2` to disambiguate from
 * the existing `LegacySubsystemBBoolean.ts` (an unrelated earlier port).
 *
 * This is the "look for something worth doing near me" scan: it walks up
 * to three marker layers (`ag`), each call to `a(byte,byte,byte,byte)`
 * (`LegacySubsystemNearbyMarkerLookup.ts`) leaving the best candidate so
 * far in class b's shared scratch (`y:B`#232 = its priority class,
 * `an:I`#115 = its distance score, `z:B`#235/`A:B`#6 = its cell,
 * `F:B`#17 = its record). When a layer yields a candidate of that layer's
 * own top class the scan stops early. If anything was found at all, `H()`
 * (`LegacyEntityMarkerCommit.ts`) acts on it and `p()` returns true.
 *
 *  - 0..39: `if ((f.q===3 && f:B>=5) || (f.q===2 && f:B===1)) return false;`
 *    -- the only way out without scanning.
 *  - 40..84: `b(dense[v], dense[101+v], dense[4949+v])`
 *    (`LegacySubsystemClampBounds.ts`, the bounding box plus `an:I = 0`)
 *    and `y:B = 0`.
 *  - 85..251: `for (ag = u*(f.q===3?6:3); ag <= that+2; ag++)`, skipping
 *    `ag===1` when `f.q===3`; each iteration sets `aj:I =
 *    t120[ag]`, scans, and breaks out when `y:B === t119[aj]`.
 *  - 254..258: nothing found (`y:B <= 0`) -> return false.
 *  - 261..357: for a type <= 9 unit with `b:Z` clear, `a:Z` is narrowed to
 *    `a:Z && (t122[type] < y:B || (z:I/10 > B:I && an:I <= B:I))` -- i.e.
 *    it survives only for a high-priority find, or a find that is both far
 *    enough from home and close enough to the unit.
 *  - 360..383: `B:B = gridC[A:B][z:B]`, `H()`, return true.
 *
 * **RETRACTED (2026-09-04/05)**: this file once modeled the scan call as a
 * confirmed guaranteed throw and declared offsets 254..385 plus `H()`
 * unreachable dead code. Both premises were wrong (`c:[[[B`#151 is not
 * null); the loop, the tail and `H()` are all real, and all three are now
 * ported -- see this file's git history and `LegacyEntityMarkerCommit.ts`.
 */
export type LegacySubsystemBBoolean2Input = {
  readonly state: Int8Array;
  readonly entityId: number;
  readonly sceneQ: number;
  readonly fByte: number;
  /** b.u:I (#222) -- the current team, used by the ag-loop's own formula. */
  readonly team: number;
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
  readonly saveOffsets: Int16Array;
  readonly gridC: readonly Int8Array[];
  readonly arrays: LegacySubsystemNearbyMarkerLookupArrays;
  /** b.b:Z (#137). */
  readonly bFlag: boolean;
  /** b.a:Z (#73) -- narrowed by the tail; read back by H(). */
  readonly aFlag: { value: boolean };
  /** b.z:I (#234). */
  readonly zInt: number;
  /** b.B:I (#8) -- the unit's own derived b-value. */
  readonly bValue: number;
  /** b.B:B (#9) -- set from the found cell right before H() runs. */
  readonly bByte: { value: number };
  /** private void H() (#244) -- stepLegacyEntityMarkerCommit. */
  readonly onH: () => void;
};

export function stepLegacySubsystemBBoolean2(input: LegacySubsystemBBoolean2Input): boolean {
  const { state, entityId: v, sceneQ: q, fByte, team, packedBytes, packedOffsets, saveOffsets, gridC, arrays } = input;

  if ((q === 3 && fByte >= 5) || (q === 2 && fByte === 1)) return false;

  const bounds = stepLegacySubsystemClampBounds(state[v] ?? 0, state[UNIT_Y + v] ?? 0, state[UNIT_VISION + v] ?? 0);
  arrays.bField115 = bounds.an; // offset 0..4 of b(byte,byte,byte): an:I reset to 0.
  arrays.bField232 = 0; // offset 80..84 of p() itself: y:B reset to 0.

  // Offsets 85..251.
  const first = team * (q === 3 ? 6 : 3);
  for (let ag = first; ag <= first + 2; ag += 1) {
    if (q === 3 && ag === 1) continue;
    const layer = packedBytes[(packedOffsets[120] ?? 0) + ag] ?? 0;

    stepLegacySubsystemNearbyMarkerLookup({
      dense: state,
      packedBytes,
      packedOffsets,
      saveOffsets,
      gridC,
      arrays,
      bounds,
      layer,
      entityId: v,
      refX: state[v] ?? 0,
      refY: state[UNIT_Y + v] ?? 0,
      mode: 0,
      threshold: 0,
    });

    if (arrays.bField232 === (packedBytes[(packedOffsets[119] ?? 0) + layer] ?? 0)) break;
  }

  // Offsets 254..258.
  if (arrays.bField232 <= 0) return false;

  // Offsets 261..357.
  if (!input.bFlag && (state[UNIT_TYPE + v] ?? 0) <= 9) {
    input.aFlag.value = input.aFlag.value && (
      (packedBytes[(packedOffsets[122] ?? 0) + (state[UNIT_TYPE + v] ?? 0)] ?? 0) < arrays.bField232
      || (Math.trunc(input.zInt / 10) > input.bValue && arrays.bField115 <= input.bValue)
    );
  }

  // Offsets 360..383.
  input.bByte.value = gridC[arrays.bField6]?.[arrays.bField235] ?? 0;
  input.onH();
  return true;
}
