import { BLD_KIND, BLD_WORK, UNIT_CARRY_KIND, UNIT_DIRECTION, UNIT_HELD_ITEM, UNIT_TIMER } from "../core/DenseLayout";
/**
 * Raw port of private void a(int,byte,byte,int,int,byte) (constant pool
 * #442), bytecode/f-javap.txt offsets 0..1599 -- the detail-draw method
 * `LegacyMapMarkerDispatch.ts`'s `prepareLegacyMapMarkerDispatch` delegates
 * to whenever `arg2 !== 0` (i.e. always, for every real caller of
 * `onMapMarkerArg1`, which hardcodes arg2=1).
 *
 * Parameter names match the OUTER dispatcher's own output field names
 * (`local3`/`local7`/`local4`/`local10`/`local11`/`arg2`) for direct
 * traceability back to `LegacyMapMarkerDispatch.ts`'s
 * `LegacyMapMarkerDispatchResult`, which is this function's only producer.
 *
 * Every branch below was derived TWICE independently against the raw
 * bytecode text before being transcribed here (2026-08-14) -- a first
 * pass produced four confirmed, since-corrected errors: an inverted
 * condition (`local3<31` vs `>=31` combined with a bitmask check), a
 * completely wrong record-offset formula for the `local8===4` sub-case
 * (confused with a superficially similar formula used elsewhere in this
 * same method), a health-stat sum that reads `a[0][5]` TWICE (bytecode
 * offsets 248 and 266 are both `iconst_5`, not a `5,8,9,10` progression
 * as a first skim assumed), and a wrong top-level control-flow shape
 * (the very first draft didn't correctly model that `local8===0`/`2`/`4`/
 * `6` with their OWN gates unsatisfied ALSO fall through to the shared
 * "default" section, same as `local8` in `{3,5,7}`).
 *
 * Top-level shape (bytecode offsets 123..1205, the three-way cascade):
 * `local8===0 && arg2===2 && P===local7` draws directly and is done;
 * `local8===1` runs its own three sub-cases and is always done; anything
 * else (including `local8===0/2/4/6` whose OWN extra conditions failed)
 * falls to a shared "branch3" check (`local8` in `{2,4,6}` AND
 * `arg2!==2`) and, if THAT doesn't apply either, falls further to a
 * shared "default" section that only actually does something when
 * `local8` is `3`, `5`, or `7`.
 *
 * Per-record loop: `N:I` increments once per iteration (offsets
 * 1574..1581, right before the loop counter). Draws via one of three
 * targets: `LegacyPackedSpriteRenderer.drawComposite` (#439), the
 * already-ported `LegacyZSubrecordDraw`/`d(IIII)` (#572), or `private
 * void a(int,int,int,int,byte)` (#443) -- the SAME unported method
 * `onEntityAction` already targets elsewhere in this cluster. The whole
 * per-record body is wrapped in the bytecode's own try/catch-all
 * (exception table: offsets 17..1590 -> handler 1593), matching the
 * pattern already seen in `private void j()` (#613,
 * `LegacyFrameProgressionScan.ts`).
 */

export type LegacyMapMarkerDetailState = {
  /**
   * f.f:I (#294) -- confirmed via direct bytecode read of `a(int,byte,
   * byte,int,int,byte)` itself (#442, offset 4/1156, both refs), i.e.
   * `game.animPhase`. Same field `P()`/`u()`'s row-end draw use; distinct
   * from the negative-entity branch's own `phase` (genuinely `e:I`/#284/
   * `game.animStep`) -- see LegacyGameplayNegativeEntityBranch.ts.
   */
  readonly phase: number;
  /** f.N:I (#80), the starting record index (produced by the outer dispatch's table lookup). */
  readonly N: number;
  /** f.O:I (#84), the iteration count (produced alongside N). */
  readonly O: number;
  /** f.q:B (#357). */
  readonly qByte: number;
  /** f.v:B (#376). */
  readonly vByte: number;
  /** f.ai:I (#199), the outer loop's row-scan index. */
  readonly ai: number;
  /** f.K:B (#68). */
  readonly originRow: number;
  /** f.e:[B (#286), the dense-state array. */
  readonly dense: Int8Array;
  /** f.a:[B (#137). */
  readonly packedBytes: Int8Array;
  /** f.a:[S (#138). */
  readonly packedOffsets: Int16Array;
  /** f.b:[[S (#244), the same packed short 2D table as `packedData.shortTables`. */
  readonly shortTables: readonly Int16Array[];
  /** f.j:[[B (#326), the same packed byte 2D table as `packedData.byteTables`. */
  readonly byteTables: readonly Int8Array[];
  /** f.g:[B (#298), `new byte[11]` -- shared with `LegacyMapMarkerDispatch.ts`'s scratchGWrites target. */
  readonly entityMarkerG: Int8Array;
  /** f.h:[B (#307), `new byte[11]`. Mutated directly (read back at offset 1224/1566). */
  readonly entityMarkerH: Int8Array;
  /** f.i:[B (#314), `new byte[11]`. Mutated directly (read back at offset 990). */
  readonly entityMarkerI: Int8Array;
  /**
   * f.a:[[S (#131), `new short[2][26]` per the constructor (bytecode
   * offsets 95..103) -- a small scratch table, NOT a per-unit-type stat
   * database. Row 0 is both read and written by this method.
   */
  readonly statScratch: Int16Array[];
};

export type LegacyMapMarkerDetailCallbacks = {
  /** f.a(int,int,int) / LegacyPackedSpriteRenderer.drawComposite (#439). */
  readonly onComposite?: (record: number, x: number, y: number) => void;
  /** f.d(int,int,int,int) / LegacyZSubrecordDraw (#572). */
  readonly onSpriteDraw?: (record: number, x: number, y: number, phase: number) => void;
  /**
   * f.a(int,int,int,int,byte) (#443) -- the SAME unresolved method
   * `onEntityAction` already targets in
   * `LegacyGameplayPositiveEntityBranch.ts`/`LegacyGameplayNegativeEntityBranchTail.ts`.
   */
  readonly onEntityAction?: (id: number, x: number, y: number, arg4: number, arg5: number) => void;
  /** f.x:Z (#383) -- set unconditionally true in one sub-branch; no other reads found in this method. */
  readonly onXFlag?: () => void;
  /**
   * f.X:B (#113): offset 94 stores g[pipIndex] -- the unit inside the building -- for each record,
   * and offset 1596 clears it on the way out. q(), reached through onEntityAction, reads it to draw
   * that unit's health bar while the cursor is on the building.
   */
  readonly onX?: (value: number) => void;
};

export function stepLegacyMapMarkerDetail(
  local3: number,
  local7: number,
  local4: number,
  local10In: number,
  local11In: number,
  arg2: number,
  state: LegacyMapMarkerDetailState,
  callbacks: LegacyMapMarkerDetailCallbacks = {},
): void {
  const phase = state.phase;
  // local10 (offset 7): f:I once per call, then carried across records -- local8===6 adds to it and
  // local8===4 overwrites it, and every later record's draw sees that value. CORRECTED 2026-10-15
  // (pixel comparison, play26 frame 22500): it was recomputed from f:I per record, so a building's
  // second and third smoke puffs ran in the wrong phase.
  let local10 = phase;
  let U = 0;
  let recordN = state.N;

  try {
    for (let i = 0; i < state.O; i += 1) {
      const flags3 = state.byteTables[3]?.[recordN] ?? 0;
      const local8 = flags3 & 7;
      const pipIndex = (flags3 & 63) >> 3;
      const P = (flags3 & 0xff) >> 6;
      const X = state.entityMarkerG[pipIndex] ?? 0;
      callbacks.onX?.(X);
      const familyShift = (((state.shortTables[1]?.[recordN] ?? 0) & 49152) >> 14) << 7;
      const recordShortBase = (state.shortTables[1]?.[recordN] ?? 0) & 4095;
      const x1 = local10In + (state.byteTables[1]?.[recordN] ?? 0) + familyShift;
      const y1 = local11In + (state.byteTables[2]?.[recordN] ?? 0);

      if (local8 === 0 && arg2 === 2 && P === local7) {
        callbacks.onComposite?.(recordShortBase, x1, y1);
      } else if (local8 === 1) {
        stepBranch1(local8, P, local7, local4, local3, U, recordShortBase, x1, y1, state, callbacks, (u) => {
          U = u;
        });
      } else {
        let ranBranch3 = false;
        if ((local8 === 2 || local8 === 4 || local8 === 6) && arg2 !== 2) {
          ranBranch3 = true;
          if (P === 0 || P <= local7) {
            local10 = stepBranch3(local8, pipIndex, local3, recordShortBase, X, recordN, phase, local10, state, x1, y1, local10In, local11In, familyShift, callbacks);
          }
          // P>local7 (and P!==0): no-op, matches bytecode's direct skip.
        }
        if (!ranBranch3) {
          stepDefaultSection(local8, pipIndex, X, arg2, local3, local4, state, x1, y1, callbacks);
        }
      }

      recordN += 1;
    }
  } catch {
    // Bytecode's own exception table (offsets 17..1590 -> 1593) swallows
    // any exception from a single record's processing.
  }
  callbacks.onX?.(0);
}

/** local8===1, bytecode offsets 195..700 (all three sub-cases plus the plain default). */
function stepBranch1(
  local8: number,
  P: number,
  local7: number,
  local4: number,
  local3: number,
  U: number,
  recordShortBase: number,
  x1: number,
  y1: number,
  state: LegacyMapMarkerDetailState,
  callbacks: LegacyMapMarkerDetailCallbacks,
  setU: (u: number) => void,
): void {
  if (P > local7) return;

  if (local4 === 6 && U < 5) {
    // Offsets 224..291: a[0][t142[0]] = 2*a[0][5] + a[0][8] + a[0][9] + a[0][10] -- t142[0] is the
    // index. FIXED 2026-10-09: it was added to the sum and stored in a[0][0] (hidden until the
    // markerStatScratch twin of f.a:[[S was merged).
    const statIndex = state.packedBytes[state.packedOffsets[142] ?? 0] ?? 0;
    state.statScratch[0]![statIndex] = toByte(
        2 * (state.statScratch[0]?.[5] ?? 0) +
        (state.statScratch[0]?.[8] ?? 0) +
        (state.statScratch[0]?.[9] ?? 0) +
        (state.statScratch[0]?.[10] ?? 0),
    );
    const idx = state.packedBytes[(state.packedOffsets[142] ?? 0) + U] ?? 0;
    const statValue = state.statScratch[0]?.[idx] ?? 0;
    if (statValue > 0 || local3 >= 31) {
      let V = Math.trunc(Math.trunc(statValue / 7) / (U !== 0 ? 10 : 1));
      if (V >= 5 || local3 >= 31) V = 4;
      callbacks.onComposite?.(recordShortBase + V, x1, y1);
    }
    setU(U + 1);
  } else if (local4 === 4 && U < 1) {
    if (local3 >= 31) {
      callbacks.onComposite?.(recordShortBase + 2, x1, y1);
    } else {
      const stat0 = state.statScratch[0]?.[0] ?? 0;
      if (stat0 >= 5) {
        const V = stat0 > 35 ? 2 : Math.trunc((stat0 - 5) / 15);
        callbacks.onComposite?.(recordShortBase + V, x1, y1);
      }
      // stat0 < 5: no draw at all (bytecode offset 542 goto 634 directly).
    }
    setU(U + 1);
  } else {
    callbacks.onComposite?.(recordShortBase, x1, y1);
  }
}

/** local8 in {2,4,6}, arg2!==2, P===0||P<=local7 -- bytecode offsets 763..1204. */
function stepBranch3(
  local8: number,
  pipIndex: number,
  local3: number,
  recordShortBase: number,
  X: number,
  recordN: number,
  phase: number,
  carried: number,
  state: LegacyMapMarkerDetailState,
  x1: number,
  y1: number,
  local10In: number,
  local11In: number,
  familyShift: number,
  callbacks: LegacyMapMarkerDetailCallbacks,
): number {
  let local12 = 0;
  let local10 = carried;
  let drawRecord = recordShortBase;

  if (local8 === 6) {
    let pos = local10 + state.originRow + state.ai + recordN * 2;
    while (pos >= 120) pos -= 120;
    local10 = pos;
    let reachedInc = false;
    if (pipIndex === 1) {
      reachedInc = true;
    } else if (pipIndex === 2) {
      const marker8627 = state.dense[BLD_WORK + local3] ?? 0;
      if (marker8627 === 1 || marker8627 === 2) reachedInc = true;
    }
    if (reachedInc) {
      local12 = 1;
      if (local3 >= 31) drawRecord = recordShortBase + 1;
    } else if (pipIndex !== 2) {
      local12 = 1;
    }
    // pipIndex===2 && !reachedInc: local12 stays 0, no draw.
  } else if (state.qByte === 3 && local3 === 31 && pipIndex === 0) {
    if (recordShortBase === 116 && local8 === 4) {
      local12 = 1;
      local10 = 0;
    }
    // else: no draw at all, regardless of local8 being 2 or 4.
  } else if (local8 === 2) {
    const marker = state.dense[UNIT_TIMER + X] ?? 0;
    if (!(marker > 0 && marker < 50)) {
      local12 = 1;
      if (marker === 51) state.entityMarkerI[pipIndex] = 1;
    }
  } else {
    // local8 === 4, the "normal" (non-qByte-shortcut) path.
    if ((state.entityMarkerI[pipIndex] ?? 0) === 0) {
      const marker = state.dense[UNIT_TIMER + X] ?? 0;
      if (marker >= 1 && marker !== 50) {
        drawRecord = (state.shortTables[1]?.[recordN + marker - 1] ?? 0) & 4095;
        local10 = state.dense[3030 + X] ?? 0;
        local12 = 1;
        state.entityMarkerI[pipIndex] = 1;
        if ((state.dense[BLD_KIND + local3] ?? 0) === 2 && marker === 2) {
          callbacks.onSpriteDraw?.(
            90,
            local10In + (state.byteTables[1]?.[recordN] ?? 0) + familyShift,
            local11In + (state.byteTables[2]?.[recordN] ?? 0),
            phase,
          );
        }
      }
    }
  }

  if (local12 !== 0) {
    callbacks.onSpriteDraw?.(drawRecord, x1, y1, local10);
  }
  return local10;
}

/** Reached when local8 in {3,5,7}, or local8===0/2/4/6's own gate didn't match -- bytecode offsets 1205..1518. */
function stepDefaultSection(
  local8: number,
  pipIndex: number,
  X: number,
  arg2: number,
  local3: number,
  local4: number,
  state: LegacyMapMarkerDetailState,
  x1: number,
  y1: number,
  callbacks: LegacyMapMarkerDetailCallbacks,
): void {
  if (local8 !== 3 && local8 !== 5 && local8 !== 7) return;
  if ((state.entityMarkerH[pipIndex] ?? 0) !== 0) return;
  if (X <= 0) return;
  if (arg2 === 2) return;

  let local12 = 0;
  let local13 = 0;
  if (local3 < 31 || ((state.dense[9176 + local3] ?? 0) & 3) >= 2) {
    if (local8 === 7) {
      if ((state.dense[UNIT_TIMER + X] ?? 0) === 50) local12 = 1;
    } else if (local8 === 3) {
      const marker = state.dense[UNIT_TIMER + X] ?? 0;
      if (marker >= 1 && marker !== 50) {
        local13 = computeMarkerDetailRecord(local4, pipIndex, X, state);
        local12 = 1;
      }
    } else if (local8 === 5) {
      if ((state.dense[UNIT_TIMER + X] ?? 0) <= 0) {
        local12 = 1;
        const d3535 = state.dense[UNIT_CARRY_KIND + X] ?? 0;
        const d6565 = state.dense[UNIT_HELD_ITEM + X] ?? 0;
        if (d3535 !== 0 || (d3535 === 0 && d6565 === 1)) {
          if (local4 !== 10 && local4 !== 11) callbacks.onXFlag?.();
        }
        if (state.vByte === 0) local13 = state.dense[UNIT_DIRECTION + X] ?? 0;
      }
    }
  }
  if (local12 !== 0) {
    callbacks.onEntityAction?.(X, x1, y1, local13, 29);
    state.entityMarkerH[pipIndex] = 1;
  }
}

/**
 * Shared `local13` ("icon variant") lookup for the `local8===3` default
 * branch, bytecode offsets 1347..1415: `packedBytes[packedOffsets[139]
 * + packedBytes[packedOffsets[140]+variant] + pipIndex]`, with a `-1`
 * sentinel replaced by `dense[606+X]` (a `lookupswitch` with one explicit
 * case).
 */
function computeMarkerDetailRecord(
  variant: number,
  pipIndex: number,
  X: number,
  state: LegacyMapMarkerDetailState,
): number {
  const base = state.packedOffsets[139] ?? 0;
  const rowOffset = state.packedBytes[(state.packedOffsets[140] ?? 0) + variant] ?? 0;
  const value = state.packedBytes[base + rowOffset + pipIndex] ?? 0;
  return value === -1 ? state.dense[UNIT_DIRECTION + X] ?? 0 : value;
}

function toByte(value: number): number {
  const narrowed = value & 0xff;
  return narrowed >= 0x80 ? narrowed - 0x100 : narrowed;
}
