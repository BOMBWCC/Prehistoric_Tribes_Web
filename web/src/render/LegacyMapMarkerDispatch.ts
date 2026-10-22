import { classifyLegacyCameraCell } from "./LegacyCameraFrame";
import { BLD_KIND, BLD_LEVEL, BLD_WORKER_HEAD, BLD_X, BLD_Y, RES_KIND, RES_LOOK, UNIT_NEXT_WORKER, UNIT_SLOT } from "../core/DenseLayout";
import { T_BUILDING } from "../core/DataTables";

/** private static boolean c(int), bytecode/f-javap.txt offsets 30583..30594. */
export function isLegacyResourceMarkerRange(value: number): boolean {
  return value <= -61 && value >= -110;
}

/**
 * private static byte c(int), bytecode/f-javap.txt offsets 30704..30728.
 * A DIFFERENT method from `isLegacyResourceMarkerRange` above -- both are
 * named `c` in the original class, distinguished only by return type
 * (boolean vs byte), confirmed via separate constant-pool indices (#553
 * vs #554) at every call site in `private void a(int,byte)`.
 */
export function classifyLegacyMarkerRange(value: number): number {
  if (value >= -116 && value <= -111) return 0;
  if (value >= -122 && value <= -117) return 1;
  if (value === -123) return 3;
  return 2;
}

export type LegacyMapMarkerDispatchState = {
  /** f.ah:I (#197) -- the outer loop's column-scan index. */
  readonly ah: number;
  /** f.ai:I (#199) -- the outer loop's row-scan index. */
  readonly ai: number;
  /** f.I:B (#60). */
  readonly originColumn: number;
  /** f.K:B (#68). */
  readonly originRow: number;
  /** f.e:[B (#286), the dense-state array. */
  readonly dense: Int8Array;
  /** f.c:[[B, gridC, the same map grid tracked elsewhere. */
  readonly gridC: readonly Int8Array[];
  /** f.a:[B (#137). */
  readonly packedBytes: Int8Array;
  /** f.a:[S (#138). */
  readonly packedOffsets: Int16Array;
  /** f.b:[[S (#244), the same packed short 2D table as `packedData.shortTables`. */
  readonly shortTables: readonly Int16Array[];
  /** f.j:[[B (#326), the same packed byte 2D table as `packedData.byteTables`. */
  readonly byteTables: readonly Int8Array[];
  /** f.aQ:I (#165). */
  readonly aQ: number;
};

export type LegacyMapMarkerDispatchResult = {
  /** f.N:I (#80) -- table row index, output for the caller's own use. */
  readonly N: number;
  /** f.O:I (#84) -- table row index, output for the caller's own use. */
  readonly O: number;
  readonly local3: number;
  readonly local7: number;
  readonly local4: number;
  readonly local10: number;
  readonly local11: number;
  /** The row of the picture table (b[0] / j[0]) N and O were read from: its map-object id is
   *  1000 + resource (the HD art's key, render/HdArt.ts). */
  readonly resource: number;
  /** Entity branch only: the cell's column/row offset inside the footprint (0 otherwise). */
  readonly local8: number;
  readonly local9: number;
  /**
   * Possibly overwritten to -1 by the `classifyLegacyMarkerRange(g0)===1`
   * branch (bytecode offset 477..478) -- confirmed the ORIGINAL arg2
   * local, mutated in place, not a separate value.
   */
  readonly arg2: number;
  /**
   * When `arg2 !== 0` and the marker took the MAIN
   * (`classifyLegacyCameraCell(marker) !== 2`) branch: entries to OR into
   * `f.g:[B]` (#298) at the given indices, walking the `e[4545+n]`/
   * `e[4646+n]` linked list (bytecode offsets 277..328 / 289..326).
   * The -111..-122 branch also writes `g[0]` = the cell's gridC value (offsets 422..450).
   * Modeled as a returned list rather than a direct array write so this
   * function stays a pure computation, matching this codebase's
   * convention elsewhere.
   */
  readonly scratchGWrites: readonly { readonly index: number; readonly value: number }[];
};

/**
 * Routing/preparation half of private void a(int,byte), bytecode/f-javap.txt
 * offsets 0..993. The arg2===0 scan (187..276) is in the entity branch.
 * CORRECTED 2026-09-30: this note used to exclude that scan, claiming f.o()
 * never passes entity ids here; f.o() offsets 179..217 pass every gridC
 * value in [-123,-1], buildings included, and the scan is what picks each
 * footprint cell's ground piece.
 *
 * Still excluded: offsets 609..929 (the `marker>=1000` one-time hint-content
 * initialization, dozens of hardcoded dense-state writes), unreachable from
 * both callers (f.o() passes gridB >= 175 or gridC in [-123,-1]; f.u()'s
 * entity branches pass entity ids). `marker>=1000` here just replays the N/O
 * table lookup without those writes.
 */
export function prepareLegacyMapMarkerDispatch(
  marker: number,
  arg2In: number,
  state: LegacyMapMarkerDispatchState,
): LegacyMapMarkerDispatchResult {
  let local3 = -marker;
  let local4 = 0;
  let local7 = 0;
  let local10 = state.ah * 22;
  let local11 = state.ai * 16;
  let arg2 = arg2In;
  let local8 = 0;
  let local9 = 0;
  let N = 0;
  let O = 0;
  let resource = 0;
  const scratchGWrites: { index: number; value: number }[] = [];

  if (classifyLegacyCameraCell(marker) === 2) {
    if (isLegacyResourceMarkerRange(marker)) {
      local3 -= 61;
      local4 = state.dense[RES_KIND + local3] ?? 0;
      local7 = state.dense[RES_LOOK + local3] ?? 0;
      N = state.shortTables[0]?.[local4 + 26] ?? 0;
      resource = local4 + 26;
      O = state.byteTables[0]?.[local4 + 26] ?? 0;
    } else {
      const classify2 = classifyLegacyMarkerRange(marker);
      if (classify2 === 2) {
        if (marker >= 1000) {
          local3 = 0;
          local7 = 0;
          local4 = marker - 1000;
          N = state.shortTables[0]?.[local4] ?? 0;
          resource = local4;
          O = state.byteTables[0]?.[local4] ?? 0;
        } else if (marker < 175) {
          // Falls straight through to the shared continuation with
          // local3/local4/local7/local10/local11 at their top-of-method
          // values (confirmed: bytecode offset 941 `if_icmplt 994` jumps
          // directly past all further prep).
        } else {
          local4 = marker - 180 + 34;
          N = state.shortTables[0]?.[local4] ?? 0;
          resource = local4;
          O = state.byteTables[0]?.[local4] ?? 0;
          local11 += state.aQ;
          local7 = 0;
          local3 = 0;
        }
      } else if (classify2 === 3) {
        // marker === -123. Confirmed NOT row-clamped (bytecode offsets
        // 560..567 fall straight through to the N/O lookup, skipping the
        // offset-547 clamp loop entirely -- unlike the g0 sub-case below).
        local4 = 23;
        local7 = 0;
        N = state.shortTables[0]?.[local4 + 1] ?? 0;
        resource = local4 + 1;
        O = state.byteTables[0]?.[local4 + 1] ?? 0;
        local3 = 0;
      } else {
        // classify2 is 0 ([-116,-111]) or 1 ([-122,-117]): read the
        // camera-relative gridC cell and classify THAT value too.
        const g0 = state.gridC[state.originRow + state.ai]?.[state.originColumn + state.ah] ?? 0;
        // Offsets 422..450 store it in g[0], so the detail pass draws that unit (a FORM UP member
        // whose mode > 14 is skipped by f.u()). FIXED 2026-10-13 (oracle run 15, play11 frame 48470).
        scratchGWrites.push({ index: 0, value: g0 });
        const classifyG0 = classifyLegacyMarkerRange(g0);
        if (classifyG0 === 2) {
          const nested = classifyLegacyMarkerRange(state.dense[UNIT_NEXT_WORKER + g0] ?? 0);
          if (nested !== 2) {
            local4 = 20 - ((state.dense[UNIT_NEXT_WORKER + g0] ?? 0) + 111);
            local7 = 2;
          }
          // nested === 2: local4/local7 stay at 0 (top-of-method values).
        } else {
          if (classifyG0 === 1) arg2 = -1;
          local4 = 20 - (g0 + 111);
          local7 = 1;
        }
        while (local4 > 22) local4 -= 3;
        N = state.shortTables[0]?.[local4 + 1] ?? 0;
        resource = local4 + 1;
        O = state.byteTables[0]?.[local4 + 1] ?? 0;
        local3 = 0;
      }
    }
  } else {
    // MAIN case: ordinary entity ids (classify(marker) in {0,1}, e.g.
    // marker in [-60,-1]).
    local4 = state.dense[BLD_KIND + local3] ?? 0;
    local7 = state.dense[BLD_LEVEL + local3] ?? 0;
    local8 = state.ah + state.originColumn - (state.dense[BLD_X + local3] ?? 0);
    local9 = state.ai + state.originRow - (state.dense[BLD_Y + local3] ?? 0);
    local10 -= local8 * 22;
    local11 -= local9 * 16;
    N = state.shortTables[0]?.[local4 + 1] ?? 0;
    resource = local4 + 1;
    O = state.byteTables[0]?.[local4 + 1] ?? 0;

    if (arg2 === 0) {
      // Offsets 187..276: step N to this cell's ground piece -- the
      // (width*local9 + local8)-th entry with P == 0 -- stopping early at
      // the first entry whose low 3 bits are set.
      const width = state.packedBytes[(state.packedOffsets[T_BUILDING] ?? 0) + 104 + local4] ?? 0;
      const target = width * local9 + local8;
      let seen = 0;
      for (;;) {
        const flags = state.byteTables[3]?.[N] ?? 0;
        if (((flags & 0xff) >> 6) === 0) {
          if (seen === target) break;
          seen += 1;
        }
        if ((flags & 7) !== 0) break;
        N += 1;
        O -= 1;
      }
    } else {
      let cursor = state.dense[BLD_WORKER_HEAD + local3] ?? 0;
      while (cursor > 0) {
        scratchGWrites.push({ index: state.dense[UNIT_SLOT + cursor] ?? 0, value: cursor & 0xff });
        cursor = state.dense[UNIT_NEXT_WORKER + cursor] ?? 0;
      }
    }
  }

  return { N, O, local3, local7, local4, local10, local11, resource, local8, local9, arg2, scratchGWrites };
}

/**
 * private void a(int,byte) offsets 994..1140, taken when arg2 is still 0:
 * draws piece N at cell (ah-local8, ai-local9), then any following pieces
 * stacked on it (low 3 bits clear, P nonzero), each only while P <= local7.
 */
export function drawLegacyMapMarkerPieces(
  result: LegacyMapMarkerDispatchResult,
  ah: number,
  ai: number,
  shortTables: readonly Int16Array[],
  byteTables: readonly Int8Array[],
  onComposite: (record: number, x: number, y: number) => void,
): void {
  let N = result.N;
  for (;;) {
    const P = ((byteTables[3]?.[N] ?? 0) & 0xff) >> 6;
    if (P <= result.local7) {
      onComposite(
        (shortTables[1]?.[N] ?? 0) & 4095,
        (ah - result.local8) * 22 + (byteTables[1]?.[N] ?? 0),
        (ai - result.local9) * 16 + (byteTables[2]?.[N] ?? 0),
      );
    }
    N += 1;
    const next = byteTables[3]?.[N] ?? 0;
    if ((next & 7) !== 0 || ((next & 0xff) >> 6) === 0) return;
  }
}
