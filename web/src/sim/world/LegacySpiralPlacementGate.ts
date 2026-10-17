/**
 * Direct translation of `final boolean a(int,int,int,int)` (constant pool
 * #270), javap offsets 0..1906 (bytecode/b-javap.txt line 20062). Previously
 * only ever treated as an opaque callback boundary (`onLargeGate`/
 * `onFootprintProbe`) across every known caller (`LegacySubsystemAn.ts`'s
 * `an()`, `LegacyFPairCommand.ts`'s `onFootprintProbe`, `LegacyRuntimeState`'s
 * `p()`/`N()` call sites) -- derived for real on 2026-08-21.
 *
 * **RETRACTED (2026-09-04, restored 2026-09-07)**: the 2026-08-21 pass
 * concluded every mode's "candidate accepted" path unconditionally
 * dereferences one of three permanently-null fields, so this file used to
 * stub the whole method down to whichever null dereference each mode hits.
 * All three premises were wrong:
 *  - `b:[S]`(#132) is `saveOffsets` (already restored in
 *    `LegacyEntityActionScoreGate.ts` this session).
 *  - `c:[[B]`(#143) is `LegacySubsystemArrays.cRows` (`f.g()`-allocated
 *    `new byte[6][10]`; already retracted in `LegacySubsystemNPrivateO.ts`,
 *    this file just hadn't caught up).
 *  - `f.b:[[B]` was called "newly confirmed permanently null (zero putfield
 *    sites in class f)" -- that grep, like the others, was scoped to class
 *    f only. It's allocated OUTSIDE class f, by `e.i()` (bytecode/e-javap.txt
 *    offset 22..30, `new byte[96][96]`, right before the sibling `f.c:[[B]`
 *    allocation at offset 33..45). This port already has it live, populated
 *    with real map tile data, as `LegacyRuntimeState.gridB` --
 *    `LegacyGameplayNegativeEntityBranchTail.ts`'s own docblock already
 *    independently identifies `gridB` as "f.b:[[B] (#242) -- the
 *    terrain/tile grid", it just was never cross-referenced here.
 *
 * The method is dramatically larger than the retracted pass captured: past
 * the mode dispatch there is a ~300-instruction pre-dispatch block (computed
 * for EVERY candidate cell, before mode is even consulted) and a
 * ~300-instruction shared "accepted" tail (offsets 576..889) that writes the
 * found position back into `dense[]` and, for modes 0/4 with a nonzero id,
 * runs an occupancy/placement score check before confirming. None of that
 * was previously modeled at all -- the file's only job was picking which
 * "null" field each mode threw on.
 *
 * Full control flow (per candidate cell, i.e. inside the existing
 * ring/half/i spiral loop -- that scaffolding is unchanged and already
 * correct):
 *  1. Bounds-check `x`/`y` against `mapWidth`/`mapHeight` (offsets 68..120,
 *     unchanged).
 *  2. `cell = gridC[y][x]` (offset 123..143) is stored in `B:B` (#9), a
 *     real field H() reads afterwards (`scratchB`; also offsets 331/390).
 *  3. Offsets 146..232, only when `scanLimit<24`: computes `C:B`(#11) and
 *     `E:B`(#15) from `packedBytes[packedOffsets[53] + (offsets[1]+12)*25 +
 *     (offsets[0]+12)]` -- the SAME table-53 shape
 *     `LegacyEntityActionScoreGate.ts` uses, but indexed by the RAW spiral
 *     deltas (not clamped to +-12 the way that file's score lookup is).
 *     Grepped both fields across the whole class: `C:B` is read only in the
 *     unmodeled mode>4 region (offsets 897+), `E:B` has no reader anywhere
 *     at all. Both are therefore dead for modes 0..4 -- but the READ itself
 *     is real and can throw (this method has NO local exception table at
 *     all, confirmed by grepping for one between this method and the next),
 *     so it's reproduced as a real, possibly-throwing read rather than
 *     silently skipped. This is almost certainly why every real caller of
 *     this gate already wraps it in a try/catch.
 *  4. Mode dispatch (offset 235 onward). mode>4 (offsets 890..1875) never
 *     reaches the shared tail; each cell either continues the spiral or
 *     returns true. PORTED 2026-09-23 -- it used to throw "no known caller",
 *     but af() calls mode 6 for every animal and b(IIII) mode 8/9 for the
 *     tutorial's first step, so both failed on every call:
 *     - mode 6 (animal threat, v = the animal slot), only when C <= 3: a
 *       living building (-cell 1..30, 8505 > 0, 8932 != 0) while the animal
 *       has no target, or a living unit 1..100 (units 1..50 only when it has
 *       none), gets `a(x, y, cell, 50)` (#289); an enemy-team unit (> 50)
 *       returns true.
 *     - mode 7 (scouting): an enemy unit, or an enemy building's centre
 *       cell, is spotted when `1 + (10 - 7575[v]) / 3 + skill / (7575[v] -
 *       3) >= C` (with 7979 bit 1; skill = 7575[unit] or 8688[rec] >> 4) or
 *       `4949[unit]` / `8688[rec] & 15` >= C (without): `7979[v] &= 254`,
 *       true. An enemy marker cell (-111 - 6e .. -109 - 6e) within
 *       `7575[v] - 4` of a scout with 7575 >= 6 is flipped (`+= 3 - 6u`),
 *       repainted (`f.c(x, y, 1, 1)`), and team 0 pays `R:B -= 1`.
 *     - mode 8/9: living adults of team 0 (8) or team 1 (9) are appended to
 *       `f.p[6 + O++]`.
 *     - mode 5: nothing.
 *     - mode===3 (245..470): reject unless `cell===0 || cell===cRows[0][ae]
 *       || cell===cRows[1][ae]`; reject if `x+1>=mapWidth`; re-fetch
 *       `cell=gridC[y][x+1]`, reject unless that's `0` or `cRows[1][ae]`;
 *       then REASSIGN `cell = cRows[1 - (dense[8282+id]&1)][ae]` (now an
 *       entity id, not a grid value) and, if `dense[2828+cell]===109`,
 *       write `dense[3131+cell]`/`dense[3232+cell]`. Always falls through
 *       to the shared tail after this (never rejects past this point).
 *     - mode===1 or 2 (473..493): accept iff `cell===0`.
 *     - mode===4 (493..562): reject unless `95 <= gridB[y][x] <= 114`, then
 *       accept iff `cell===0`.
 *     - mode===0 (562..576, the implicit else): accept iff
 *       `onOccupantCheck(cell)` (`private boolean c(byte)`, already known).
 *  5. Shared "accepted" tail (576..889): writes
 *     `dense[saveOffsets[mode===2?112:31]+id] = (byte)(x + (mode===3 ?
 *     dense[8282+id]&1 : 0))` and `dense[saveOffsets[mode===2?113:32]+id] =
 *     (byte)y` -- the SAME `dense[saveOffsets[N]+id]` idiom as everywhere
 *     else this session (`saveOffsets[31]`/`[32]` land on `dense[3131+id]`/
 *     `[3232+id]`, the "target position" pair `LegacyEntityActionScoreGate`
 *     reads). For modes 1/2/3, returns `true` immediately after these two
 *     writes. For modes 0/4: if `id===0`, also returns `true` immediately;
 *     otherwise resets `dense[4444+id]=-1`, calls `o()` (already-ported
 *     `stepLegacySubsystemBVoidO`), and -- only when `dense[808+id]<=0` --
 *     runs the already-ported `private int a(int,int,int)`
 *     (`stepLegacySubsystemEntityOccupancyCheck`) on `(dense[id],
 *     dense[101+id], 0)`; if `result/10 > entityB` the candidate is
 *     REJECTED (back to the outer spiral loop, not a hard return). Then,
 *     if `dense[6161+id]>0` or `type` (`dense[2828+id]`) is 10, 13, or 15,
 *     copies `dense[3131+id]`/`[3232+id]` into `dense[6262+id]`/
 *     `[6363+id]`; calls `g(2)` (already-ported `subsystemG`); returns
 *     `true`.
 *
 * `ae:I`(#105) is class b's own scalar, read-only here but written by
 * several other, not-yet-ported methods elsewhere in the class (see
 * `LegacySubsystemArrays.bField105`'s own comment) -- threaded through as a
 * plain input rather than derived. `y:B`(#232) IS written here (offset
 * 11..13, unconditional reset on entry) -- this is the third writer
 * `LegacySubsystemArrays.bField232`'s own comment already anticipated;
 * wired here via `bScalars`.
 */
import type { LegacySubsystemArrays } from "../../core/LegacySubsystemArrays";
import { ANIMAL_TARGET, BLD_HP, BLD_KIND, BLD_WORKERS, BLD_X, BLD_Y, UNIT_AGE, UNIT_FLAGS, UNIT_HOME_X, UNIT_HOME_Y, UNIT_HP, UNIT_ORDER, UNIT_RECORD, UNIT_SCOUT_SKILL, UNIT_TARGET_X, UNIT_TARGET_Y, UNIT_TYPE, UNIT_VISION, UNIT_Y } from "../../core/DenseLayout";
import { T_BUILDING } from "../../core/DataTables";

export type LegacySpiralPlacementGateInput = {
  /** Java int param 1: 0..9. */
  readonly mode: number;
  /** Java int param 2: number of spiral rings to search. */
  readonly scanLimit: number;
  /** Java int param 3. */
  readonly originX: number;
  /** Java int param 4. */
  readonly originY: number;
  readonly dense: Int8Array;
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
  /** b:[S] (#132), this port's `saveOffsets` -- the dense-stride table. */
  readonly saveOffsets: Int16Array;
  /** b:[[B] (#129), the real (non-null) gridC alias. */
  readonly gridC: readonly Int8Array[];
  /** f.b:[[B] (#133 as read here / #242 from f's own pool) -- `gridB`, the terrain/tile grid. Mode 4 only. */
  readonly gridB: readonly Int8Array[];
  /** c:[[B] (#143), `LegacySubsystemArrays.cRows`, `new byte[6][10]`. Mode 3 only. */
  readonly cRows: readonly Int8Array[];
  /** f.c:S (#145). */
  readonly mapWidth: number;
  /** f.d:S (#156). */
  readonly mapHeight: number;
  /** v:I (#225), the entity this search runs for. */
  readonly id: number;
  /** B:I (#8), `entityBValue(id)` -- the same threshold used throughout this session. */
  readonly entityB: number;
  /** b's own ae:I (#105), ambient. Mode 3 only. */
  readonly ae: number;
  /** Java local 7's starting value; always 1 at every known real call site. */
  readonly initialStep?: number;
  /** mode===0's acceptance test: the already-ported `c(byte):Z` occupant check. */
  readonly onOccupantCheck?: (cellValue: number) => boolean;
  /** `private void o()` (#405) -- already-ported `stepLegacySubsystemBVoidO`. */
  readonly onO?: () => void;
  /** `private int a(int,int,int)` (#266) -- already-ported `stepLegacySubsystemEntityOccupancyCheck`, called with arg3=0. */
  readonly onOccupancyCheck?: (x: number, y: number, arg3: number) => number;
  /** `private void g(int)` (#384) -- already-ported `subsystemG`, called with argument=2. */
  readonly onGroupMode?: (id: number, argument: number) => void;
  /** class b's own y:B (#232) -- reset to 0 unconditionally on entry (offset 11..13). */
  readonly bScalars: Pick<LegacySubsystemArrays, "bField232" | "bField11" | "bField15">;
  /** b.B:B (#9), written with each scanned cell (offsets 143/331/390). */
  readonly scratchB?: { value: number };
  /** b.u:I (#222) -- mode 7's enemy team is `u ^ 1` (offset 16..23). */
  readonly team?: number;
  /** mode 6: `private void a(int,int,byte,int)` (#289), the animal's reaction. */
  readonly onHitReaction?: (x: number, y: number, target: number, arg4: number) => void;
  /** mode 7: f.c(int,int,int,int) (#357), the dirty-rectangle repaint. */
  readonly onRepaint?: (x: number, y: number, w: number, h: number) => void;
  /** mode 7: b.R:B (#48). */
  readonly rByte?: { value: number };
  /** mode 8/9: f.p:[B] and b.O:I (#41). */
  readonly fP?: Int8Array;
  readonly oCounter?: { value: number };
};

function javaByte(value: number): number {
  const narrowed = value & 0xff;
  return narrowed >= 0x80 ? narrowed - 0x100 : narrowed;
}

function strictByte(bytes: Int8Array, index: number): number {
  if (index < 0 || index >= bytes.length) {
    throw new RangeError(`checkLegacySpiralPlacementGate: packed byte ${index} is out of range`);
  }
  return bytes[index] ?? 0;
}

function strictGrid(grid: readonly Int8Array[], row: number, col: number): number {
  const line = row >= 0 && row < grid.length ? grid[row] : undefined;
  if (!line) throw new RangeError(`checkLegacySpiralPlacementGate: grid row ${row} is out of range`);
  return strictByte(line, col);
}

/** Java `idiv`: truncates, and throws on a zero divisor. */
function idiv(a: number, b: number): number {
  if (b === 0) throw new RangeError("checkLegacySpiralPlacementGate: / by zero");
  return Math.trunc(a / b);
}

/** Offsets 890..1875 for one scanned cell; true means `return true`. */
function scanHighMode(input: LegacySpiralPlacementGateInput, x: number, y: number, cell: number): boolean {
  const { dense, id: v } = input;
  const C = input.bScalars.bField11;
  const table = (row: number, index: number) => input.packedBytes[(input.packedOffsets[row] ?? 0) + index] ?? 0;

  if (input.mode === 6) {
    if (C > 3) return false;
    const rec = -cell;
    if (rec > 0 && rec <= 30 && (dense[ANIMAL_TARGET + v] ?? 0) === 0) {
      if ((dense[BLD_HP + rec] ?? 0) <= 0 || (dense[BLD_WORKERS + rec] ?? 0) === 0) return false;
      input.onHitReaction?.(x, y, cell, 50);
      return false;
    }
    if (cell <= 0 || cell > 100 || (dense[UNIT_HP + cell] ?? 0) <= 0) return false;
    if ((dense[ANIMAL_TARGET + v] ?? 0) > 0 && cell <= 50) return false;
    input.onHitReaction?.(x, y, cell, 50);
    // Offset 1088 re-reads the field B:B, which a fleeing animal's own free-cell scan (e(true) ->
    // a(2, 127, x, y)) has just overwritten, so the scan usually goes on. FIXED 2026-10-13 (oracle
    // run 15, play12 frame 57130: a deer spooked by an enemy unit fled a second time).
    return (input.scratchB?.value ?? cell) > 50;
  }

  if (input.mode === 7) {
    const u = input.team ?? 0;
    const e = javaByte(u ^ 1);
    const scouted = (dense[UNIT_FLAGS + v] ?? 0) & 2;
    const skill = dense[UNIT_SCOUT_SKILL + v] ?? 0;
    const spot = () => {
      dense[UNIT_FLAGS + v] = javaByte((dense[UNIT_FLAGS + v] ?? 0) & 254);
      return true;
    };
    if (cell > e * 50 && cell <= (e + 1) * 50) {
      if ((dense[UNIT_HP + cell] ?? 0) <= 0) return false;
      if (scouted > 0 && 1 + idiv(10 - skill, 3) + idiv(dense[UNIT_SCOUT_SKILL + cell] ?? 0, skill - 3) >= C) return spot();
      if (scouted !== 0 || (dense[UNIT_VISION + cell] ?? 0) < C) return false;
      return spot();
    }
    const rec = -cell;
    if (rec > e * 30 && rec <= (e + 1) * 30) {
      if ((dense[BLD_HP + rec] ?? 0) <= 0 || (dense[BLD_WORKERS + rec] ?? 0) === 0) return false;
      const kind = dense[BLD_KIND + rec] ?? 0;
      if (x !== (dense[BLD_X + rec] ?? 0) + idiv(table(T_BUILDING, 104 + kind), 2)) return false;
      if (y !== (dense[BLD_Y + rec] ?? 0) + idiv(table(T_BUILDING, 130 + kind), 2)) return false;
      const size = dense[8688 + rec] ?? 0;
      if (scouted > 0 && 1 + idiv(10 - skill, 3) + idiv(size >> 4, skill - 3) >= C) return spot();
      if (scouted !== 0 || (size & 15) < C) return false;
      return spot();
    }
    const markerBase = 111 + 6 * (u ^ 1);
    if (rec < markerBase || rec >= markerBase + 3) return false;
    if (skill < 6 || C > skill - 4) return false;
    const row = input.gridC[y];
    if (row) row[x] = javaByte((row[x] ?? 0) + 3 - u * 6);
    input.onRepaint?.(x, y, 1, 1);
    if (u === 0 && input.rByte) input.rByte.value = javaByte(input.rByte.value - 1);
    return false;
  }

  if (input.mode >= 8) {
    const lo = input.mode === 9 ? 51 : 1;
    const hi = input.mode === 9 ? 100 : 50;
    if (cell < lo || cell > hi) return false;
    if ((dense[UNIT_HP + cell] ?? 0) <= 0 || (dense[UNIT_AGE + cell] ?? 0) < 12) return false;
    if (input.fP && input.oCounter) {
      input.fP[6 + input.oCounter.value] = cell;
      input.oCounter.value += 1;
    }
  }
  return false;
}

export function checkLegacySpiralPlacementGate(input: LegacySpiralPlacementGateInput): boolean {
  const { dense, packedBytes, packedOffsets, saveOffsets, id } = input;
  input.bScalars.bField232 = 0;

  const offsets = [0, 0];
  let step = javaByte(input.initialStep ?? 1);

  let ring = 0;
  while (ring < input.scanLimit) {
    ring = javaByte(ring + 1);
    for (let half = 0; half < 2; half += 1) {
      for (let i = 0; i < ring; i += 1) {
        offsets[half] = javaByte(offsets[half] + step);
        const x = input.originX + offsets[0];
        if (x < 0 || x >= input.mapWidth) continue;
        const y = input.originY + offsets[1];
        if (y < 0 || y >= input.mapHeight) continue;
        let cell = input.gridC[y]?.[x] ?? 0;
        if (input.scratchB) input.scratchB.value = cell; // offset 143

        // Offsets 146..232. RETRACTED 2026-09-22: this used to read the byte
        // and throw the value away, on the basis that "E:B has no reader
        // anywhere". It has two -- `private void e(boolean)` (#376,
        // LegacyAnimalRoam.ts) indexes the 8-direction table `t1` with it to
        // send a fleeing animal running. t53 packs a distance in the tens and
        // a direction in the units; E:B is that direction rotated by 4, i.e.
        // the way AWAY from the scanned cell. C:B stays unread outside the
        // unmodeled mode>4 region, but is recorded for the same reason.
        if (input.scanLimit < 24) {
          const packed = strictByte(packedBytes, (packedOffsets[53] ?? 0) + (offsets[1] + 12) * 25 + (offsets[0] + 12));
          input.bScalars.bField11 = javaByte(Math.trunc(packed / 10));
          input.bScalars.bField15 = javaByte(((packed % 10) + 4) & 7);
        }

        if (input.mode > 4) {
          if (scanHighMode(input, x, y, cell)) return true;
          continue;
        }

        if (input.mode === 3) {
          if (cell !== 0 && cell !== (input.cRows[0]?.[input.ae] ?? 0) && cell !== (input.cRows[1]?.[input.ae] ?? 0)) {
            continue; // offset 285
          }
          if (x + 1 >= input.mapWidth) continue; // offset 306
          cell = input.gridC[y]?.[x + 1] ?? 0; // offset 331: cell reassigned to the (x+1) neighbor
          if (input.scratchB) input.scratchB.value = cell;
          if (cell !== 0 && cell !== (input.cRows[1]?.[input.ae] ?? 0)) continue; // offset 359
          const bit = (dense[8282 + id] ?? 0) & 1;
          cell = input.cRows[1 - bit]?.[input.ae] ?? 0; // offset 390: cell reassigned again, now an entity id
          if (input.scratchB) input.scratchB.value = cell;
          if ((dense[UNIT_TYPE + cell] ?? 0) === 109) {
            dense[UNIT_TARGET_X + cell] = javaByte(x + 1 - bit);
            dense[UNIT_TARGET_Y + cell] = javaByte(y);
          }
          // falls through unconditionally to the shared tail below.
        } else if (input.mode === 1 || input.mode === 2) {
          if (cell !== 0) continue;
        } else if (input.mode === 4) {
          const terrain = strictGrid(input.gridB, y, x);
          if (terrain < 95 || terrain > 114) continue;
          if (cell !== 0) continue;
        } else {
          // mode === 0
          if (!(input.onOccupantCheck?.(cell) ?? false)) continue;
        }

        // Shared "accepted" tail, offset 576..889.
        const targetXIndex = saveOffsets[input.mode === 2 ? 112 : 31] ?? 0;
        dense[targetXIndex + id] = javaByte(x + (input.mode === 3 ? (dense[8282 + id] ?? 0) & 1 : 0));
        const targetYIndex = saveOffsets[input.mode === 2 ? 113 : 32] ?? 0;
        dense[targetYIndex + id] = javaByte(y);

        if (input.mode === 1 || input.mode === 2 || input.mode === 3) return true;

        // mode === 0 or mode === 4 from here (offset 670..689).
        if (id === 0) return true;

        dense[UNIT_RECORD + id] = -1;
        input.onO?.();
        if ((dense[808 + id] ?? 0) <= 0) {
          const score = input.onOccupancyCheck?.(dense[id] ?? 0, dense[UNIT_Y + id] ?? 0, 0) ?? 0;
          if (Math.trunc(score / 10) > input.entityB) continue; // offset 758: reject, back to the spiral search
        }

        const type = dense[UNIT_TYPE + id] ?? 0;
        if ((dense[UNIT_ORDER + id] ?? 0) > 0 || type === 10 || type === 13 || type === 15) {
          dense[UNIT_HOME_X + id] = dense[UNIT_TARGET_X + id] ?? 0;
          dense[UNIT_HOME_Y + id] = dense[UNIT_TARGET_Y + id] ?? 0;
        }
        input.onGroupMode?.(id, 2);
        return true;
      }
    }
    step = javaByte(-step);
  }
  return false;
}
