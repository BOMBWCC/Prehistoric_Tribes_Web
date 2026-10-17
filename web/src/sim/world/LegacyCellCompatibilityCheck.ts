import { UNIT_AGE, UNIT_MODE, UNIT_TYPE, UNIT_Y } from "../../core/DenseLayout";
/**
 * Direct translation of `private byte a(int, int, int)` (constant pool
 * #272), javap offsets 0..818 (bytecode/b-javap.txt line 4536). `b(int,int)`
 * (`findLegacyNearestCandidate`, `LegacyNearestCandidateSearch.ts`)'s own
 * occupancy-check dependency, called there as `a(x, y, 0)` (mode always 0).
 *
 * **RETRACTED (2026-09-07)** -- offset 193..221 previously threw, on the
 * finding that class b's own `b:[S]`(#132) is "confirmed permanently
 * null" (the constructor-time alias of `f.b:[S]`#245). It is not: see
 * `LegacySubsystemEntityOccupancyCheck.ts`'s own docblock for the full
 * derivation (allocated by `e.f()`, copied in `b.a(f)`, live in this port
 * as `LegacyRuntimeState.saveOffsets`). That offset range is real,
 * reachable arithmetic (an occupant-state lookup), ported below.
 *
 * **ALSO CORRECTED while re-deriving this method end to end (a separate,
 * pre-existing bug, unrelated to the retraction above)**: step 4's own
 * `myTable43 <= occupantTable43 && occupantTable43 !== 0` condition was
 * previously wired as an immediate reject (`return false`). Re-tracing the
 * raw bytecode (offsets 515/548) shows the opposite: that exact condition
 * SKIPS the occupant-mode/type checks entirely and falls straight through
 * to the tail (step 5) -- the checks only run when `myTable43 >
 * occupantTable43` OR `occupantTable43 === 0`. See the inline comment at
 * the fix site for the full stack trace this was re-derived from.
 *
 * Structure, in call order:
 *  1. (offset 4..270, mode===0 only) if the grid cell is in `(0,122]` or is
 *     exactly `-128`, computes a table-53 lookup from clamped x/y deltas to
 *     this entity's own position. If the lookup exceeds 29: returns `false`
 *     when the grid cell is `-128`; otherwise (offset 193..269) looks up
 *     `dense[ saveOffsets[grid>100?108:29] + (grid>100?grid-101:grid) ]
 *     & 0xff` and returns `false` when that is `<= 7` -- otherwise falls
 *     through to step 2 as normal.
 *  2. (offset 270..308, team===0 && mode===0 only) a single-bit lookup in
 *     `f.a:[[[I]` (#72) -- confirmed identical to `mainArrays.aInt`, the
 *     field `legacyOccupancyClass`/`occupancyClass()` already uses, via the
 *     exact same `wordIndex=x>>5; bit=x&31; layers[0][wordIndex][y]` packed-
 *     bitmap formula. This method only ever checks layer 0's bit (unlike
 *     `legacyOccupancyClass`, which also checks layer 1); if the bit is
 *     unset, returns `false`.
 *  3. (offset 308..401, mode===0 only) rejects (`false`) when the grid
 *     cell is in a specific negative "boundary" sentinel range
 *     (`-111-(team^1)*6` down to 3 below that) with `dense[1414+id]>=12`.
 *     Then (any mode) returns false if the grid cell equals `id+mode`.
 *  4. (offset 401..780) if `mode===0` and `dense[4848+id]>0` and the grid
 *     cell (read as a dense-array id offset) falls in the OTHER team's id
 *     range: computes `myTable43`/`occupantTable43` (packed table 43,
 *     keyed by this entity's and the occupant's own `dense[2828+*]` type).
 *     When `myTable43 <= occupantTable43 && occupantTable43 !== 0`, skips
 *     straight to step 5. Otherwise applies the "busy/vulnerable state"
 *     (`dense[2929+occupant]`) and "type" (`dense[2828+occupant]`)
 *     rejections before falling through to step 5.
 *  5. (offset 780..818) defaults to accept, except one specific combination
 *     (mode===0, grid cell===-127, this entity's own type===13), which
 *     rejects.
 */
export type LegacyCellCompatibilityCheckInput = {
  readonly state: Int8Array;
  readonly id: number;
  readonly team: number;
  readonly gridC: readonly Int8Array[];
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
  /** b's own b:[S] (#132) -- LegacyRuntimeState.saveOffsets, see the module docblock. */
  readonly saveOffsets: Int16Array;
  /** f.a:[[[I] (#72) -- same field as `mainArrays.aInt`, see the module docblock. */
  readonly visibilityBits: readonly (readonly Int32Array[])[];
};

function table(input: LegacyCellCompatibilityCheckInput, row: number, index: number): number {
  return input.packedBytes[(input.packedOffsets[row] ?? 0) + index] ?? 0;
}

function clampDelta(delta: number): number {
  if (delta < -12 || delta > 12) return 0;
  return delta + 12;
}

export function checkLegacyCellCompatibility(
  input: LegacyCellCompatibilityCheckInput,
  x: number,
  y: number,
  mode: number,
): boolean {
  const { state, id } = input;
  const grid = input.gridC[y]?.[x] ?? 0;

  if (mode === 0) {
    const inRange = (grid > 0 && grid <= 122) || grid === -128;
    if (inRange) {
      const dy = clampDelta(y - (state[UNIT_Y + id] ?? 0));
      const dx = clampDelta(x - (state[id] ?? 0));
      const scanIndex = (input.packedOffsets[53] ?? 0) + dy * 25 + dx;
      const value = input.packedBytes[scanIndex] ?? 0;
      if (value > 29) {
        if (grid === -128) return false;

        // offset 193..269: NOT a throw (see the module docblock's
        // RETRACTED note) -- a real occupant-state lookup, keyed by
        // which "half" of the grid-cell encoding `grid` falls in.
        const saveIndex = grid > 100 ? 108 : 29;
        const occupantIndex = grid > 100 ? grid - 101 : grid;
        const occupantByte = (state[(input.saveOffsets[saveIndex] ?? 0) + occupantIndex] ?? 0) & 0xff;
        if (occupantByte <= 7) return false;
      }
    }
  }

  if ((input.team ?? 0) === 0 && mode === 0) {
    const packed = input.visibilityBits[0]?.[x >> 5]?.[y] ?? 0;
    const bit = (packed >> (x & 31)) & 1;
    if (bit === 0) return false;
  }

  if (mode === 0) {
    const otherTeam = (input.team ?? 0) ^ 1;
    const threshold = -111 - otherTeam * 6;
    const inBoundaryRange = grid > threshold - 3 && grid <= threshold;
    // Offset 377 is `if_icmplt 382`: only 1414 >= 12 rejects. CORRECTED
    // 2026-09-15: the port rejected the < 12 side.
    if (inBoundaryRange && (state[UNIT_AGE + id] ?? 0) >= 12) {
      return false;
    }
  }

  // Offsets 382..400 run for every mode: a cell holding `v + mode` (an
  // animal's own 101 + slot when mode is 101) is free. CORRECTED 2026-10-12
  // (oracle run 12, frame 7267): this sat inside the mode-0 block, so an
  // animal's route treated its own cell as blocked and took an extra step.
  if (grid === id + mode) return false;

  return checkLegacyCellTeamTypeGate(input, mode, grid);
}

function checkLegacyCellTeamTypeGate(
  input: LegacyCellCompatibilityCheckInput,
  mode: number,
  grid: number,
): boolean {
  const { state, id } = input;

  if (mode === 0 && (state[4848 + id] ?? 0) > 0) {
    const team = input.team ?? 0;
    if (grid > team * 50 && grid <= (team + 1) * 50) {
      const myTable43 = table(input, 43, state[UNIT_TYPE + id] ?? 0);
      const occupantTable43 = table(input, 43, state[UNIT_TYPE + grid] ?? 0);

      // CORRECTED (2026-09-04, re-derived from bytecode offsets 515/548):
      // `myTable43<=occupantTable43 && occupantTable43!==0` SKIPS the
      // occupant-mode/type checks below (falls straight to the step-5
      // tail) -- it is not itself a rejection. The checks run in every
      // other case (myTable43>occupantTable43, OR occupantTable43===0).
      const skipTypeChecks = myTable43 <= occupantTable43 && occupantTable43 !== 0;
      if (!skipTypeChecks) {
        const occupantMode = state[UNIT_MODE + grid] ?? 0;
        if (occupantMode >= 8 && occupantMode < 21) return false;
        if (occupantMode === -101 || occupantMode === -100) return false;

        if ((occupantMode & 0xff) > 7) {
          const occupantType = state[UNIT_TYPE + grid] ?? 0;
          if (occupantType === 69 || occupantType === 79 || occupantType === 80) return false;
          if (occupantType >= 83 && occupantType <= 85) return false;
        }
      }
    }
  }

  if (mode === 0 && grid === -127 && (state[UNIT_TYPE + id] ?? 0) === 13) {
    return false;
  }
  return true;
}
