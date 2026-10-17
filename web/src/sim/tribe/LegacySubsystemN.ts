import { BLD_KIND, BLD_WORKER_HEAD, UNIT_CARRY_AMOUNT, UNIT_NEXT_WORKER, UNIT_RECORD, UNIT_SLOT, UNIT_TARGET_X, UNIT_TARGET_Y, UNIT_TIMER, UNIT_TYPE, UNIT_VISION, UNIT_WORK_TARGET, UNIT_Y } from "../../core/DenseLayout";
/**
 * Direct translation of `private void N()`, javap offsets 0..874
 * (bytecode/b-javap.txt line 27717). Has two real callers: `an()`'s own
 * `onN` target, and a separate chain from `f.i()`/`f.aj()`/`f.am()`'s own
 * `onN(id,team)` callback (a genuinely different, unrelated subsystem --
 * `am()`'s bytecode calls into a `b` instance's `N()` directly for whatever
 * id/team it computes itself).
 *
 * Structure, fully traced 2026-08-21 (supersedes an earlier partial
 * derivation that predates this session's "confirmed-permanently-null
 * field" findings -- see the type===109/110 notes below for what changed):
 *  1. Self-occupancy check (offset 0..33): if the current cell's occupant is
 *     already this entity (`gridC[y][x] === id`), falls into a small swap
 *     (offset 36..178): when `dense[8749+linked]===2 && dense[4646+id]===0`
 *     (`linked = dense[4444+id]`), computes a replacement id (`dense[8993+
 *     linked]`, or `dense[4545+id]` if that replacement is this entity
 *     itself) and, if positive, swaps `dense[4646+id]`/`dense[4646+
 *     replacement]`. Either way, calls `g(2)` (`subsystemG`, already ported
 *     and wired elsewhere in this file) and returns.
 *  2. type-eligibility check (offset 185..288): type in {17,60,83}, or type
 *     in {11,14} with `dense[3636+id]>0`.
 *     - Eligible: resets `dense[1313+id]=0`. If type===17, checks whether
 *       the linked record (`dense[4444+id]`) falls in the OTHER team's id
 *       range (`(team^1)*50 .. (team^1+1)*50`); if so, either syncs position
 *       from the link (when the link's own type===107) or clears the link,
 *       and returns either way. Falling through that (or type!==17 to begin
 *       with): if type in {17,60,83}, resets `dense[4747+id]=0`; then calls
 *       the #270 gate with mode=0 and a data-dependent
 *       `scanLimit=dense[4949+id]*2+1`, discards the result, and returns.
 *     - Not eligible (including type in {11,14} with a low counter -- a real
 *       bug in the earlier derivation this supersedes, which silently
 *       returned instead of falling through here): type===109 computes `ae`
 *       then calls the #270 gate with mode=3, fixed scanLimit=127, and
 *       origin `(cRows[2][ae], cRows[3][ae])` -- result discarded -- then
 *       unconditionally calls `onGroupMode(3)`.
 *     - type===110: calls the gate with mode=4 and RAW (not clamped/
 *       jittered) coordinates `(dense[id], dense[101+id])` and
 *       `scanLimit=dense[4949+id]*2+1`; if that returns `false`, changes
 *       the entity's type to 109 and repeats the SAME mode=3/scanLimit=127
 *       gate call type===109 makes (result again discarded); either way
 *       (accepted or not) unconditionally calls `onGroupMode(3)` at the end.
 *       **RETRACTED (2026-09-04/05)**: both branches previously modeled
 *       `c:[[B]`(#143) as permanently null and asserted a non-null
 *       dereference here. It is not null -- `f.g()` allocates it (`new
 *       byte[6][10]`, offset 590..594) and this port already carries it as
 *       `LegacySubsystemArrays.cRows` (see `LegacySubsystemBTenSlot.ts`'s
 *       own retraction for the same field). Both branches are ordinary,
 *       reachable code now.
 *     - Neither: calls `O()` -- already ported as `stepLegacySubsystemO` /
 *       `stepLegacySubsystemOAdvanced` / `stepLegacySubsystemOBit64` (see
 *       the `am()` call chain in LegacyRuntimeState.ts for the existing
 *       wiring shape) -- and returns.
 */
export type LegacySubsystemNInput = {
  readonly state: Int8Array;
  readonly id: number;
  readonly team: number;
  readonly gridC: readonly Int8Array[];
  readonly mapWidth: number;
  readonly mapHeight: number;
  /** b's own c:[[B] (#143), `f.g()`-allocated `new byte[6][10]` -- LegacySubsystemArrays.cRows. */
  readonly cRows: readonly Int8Array[];
  /**
   * b.ae:I (#105). Offsets 695 and 831 store the pair slot here before the
   * #270 gate, which reads the field. CORRECTED 2026-09-15: it was a local, so
   * the gate saw a stale value (e.g. a hut id from a(boolean)) and never wrote
   * the partner's target.
   */
  readonly scratch: { bField105: number };
  readonly randomRemainder: (mask: number, divisor: number) => number;
  /** private void g(2)/g(3) -- already ported/wired as subsystemG elsewhere. */
  readonly onGroupMode?: (argument: number) => void;
  /** private void O() -- already ported/wired as the stepLegacySubsystemO* chain elsewhere. */
  readonly onOther?: (id: number, team: number) => void;
  readonly onChangeEntityType?: (id: number, type: number) => void;
  /** The #270 gate. Wire to `checkLegacySpiralPlacementGate`. */
  readonly onGate: (mode: number, scanLimit: number, originX: number, originY: number) => boolean;
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function stepLegacySubsystemN(input: LegacySubsystemNInput): void {
  const { state, id } = input;

  // Offset 33 is `if_icmpeq 185`: a unit on its own cell skips the swap.
  // CORRECTED 2026-09-15: the port had this inverted.
  if ((input.gridC[state[UNIT_Y + id] ?? 0]?.[state[id] ?? 0] ?? 0) !== id) {
    const linked = state[UNIT_RECORD + id] ?? 0;
    if ((state[BLD_KIND + linked] ?? 0) === 2 && (state[UNIT_SLOT + id] ?? 0) === 0) {
      let replacement = state[BLD_WORKER_HEAD + linked] ?? 0;
      if (replacement === id) replacement = state[UNIT_NEXT_WORKER + id] ?? 0;
      if (replacement > 0) {
        const carried = state[UNIT_SLOT + replacement] ?? 0;
        state[UNIT_SLOT + id] = carried;
        state[UNIT_SLOT + replacement] = 0;
      }
    }
    input.onGroupMode?.(2);
    return;
  }

  const type = state[UNIT_TYPE + id] ?? 0;
  const counterGate = (type === 11 || type === 14) && (state[UNIT_CARRY_AMOUNT + id] ?? 0) > 0;
  const eligible = type === 17 || type === 60 || type === 83 || counterGate;

  if (eligible) {
    state[UNIT_TIMER + id] = 0;

    if (type === 17) {
      const linked = state[UNIT_RECORD + id] ?? 0;
      const otherTeam = (input.team ?? 0) ^ 1;
      const low = otherTeam * 50;
      const high = (otherTeam + 1) * 50;
      if (linked > low && linked <= high) {
        if ((state[UNIT_TYPE + linked] ?? 0) === 107) {
          // Offsets 403..468: the target is the LINKED unit's cell
          // (e[4444[v]], e[101 + 4444[v]]). CORRECTED 2026-10-10 (oracle run 9,
          // frame 19656): the port used the child's own cell.
          state[UNIT_TARGET_X + id] = state[linked] ?? 0;
          state[UNIT_TARGET_Y + id] = state[UNIT_Y + linked] ?? 0;
        } else {
          state[UNIT_RECORD + id] = 0;
        }
        return;
      }
    }

    if (type === 17 || type === 60 || type === 83) {
      state[UNIT_WORK_TARGET + id] = 0;
    }

    const scanLimit = (state[UNIT_VISION + id] ?? 0) * 2 + 1;
    const x = clamp((state[id] ?? 0) - 3 + input.randomRemainder(255, 6), 0, input.mapWidth - 1);
    const y = clamp((state[UNIT_Y + id] ?? 0) - 3 + input.randomRemainder(255, 6), 0, input.mapHeight - 1);
    input.onGate(0, scanLimit, x, y);
    return;
  }

  if (type === 109) {
    // Offsets 674..733. RETRACTED-PREMISE (2026-09-04/05): `c:[[B]`(#143)
    // is NOT permanently null -- it's `f.g()`-allocated (`new byte[6][10]`,
    // offset 590..594) and already lives in this port as
    // LegacySubsystemArrays.cRows. mode=3's scanLimit is a FIXED 127 here
    // (not data-dependent like the mode=0 branch above), and its result is
    // discarded (offset 727: pop) just like `onGate(0, ...)` above.
    input.scratch.bField105 = (((state[8282 + id] ?? 0) & 127) >> 1) - 1;
    const ae = input.scratch.bField105;
    input.onGate(3, 127, input.cRows[2]?.[ae] ?? 0, input.cRows[3]?.[ae] ?? 0);
    input.onGroupMode?.(3);
    return;
  }

  if (type === 110) {
    // Offsets 734..869. mode=4 uses RAW (state[id],state[101+id])
    // coordinates and a data-dependent scanLimit; its boolean result is
    // NOT discarded here (unlike every other onGate call in this file) --
    // it gates whether the type===109 fallback below runs at all.
    const scanLimit = (state[UNIT_VISION + id] ?? 0) * 2 + 1;
    const accepted = input.onGate(4, scanLimit, state[id] ?? 0, state[UNIT_Y + id] ?? 0);
    if (!accepted) {
      input.onChangeEntityType?.(id, 109);
      // ae is recomputed AFTER the type change (offset 810..831) -- same
      // formula, but `state[8282+id]` may now read differently since the
      // entity's own type/state just changed underneath it.
      input.scratch.bField105 = (((state[8282 + id] ?? 0) & 127) >> 1) - 1;
      const ae = input.scratch.bField105;
      input.onGate(3, 127, input.cRows[2]?.[ae] ?? 0, input.cRows[3]?.[ae] ?? 0); // offset 863: pop, discarded
    }
    // Offset 864..869: unconditional in BOTH cases (accepted or not) --
    // falls through here whether the `if` above ran or was skipped.
    input.onGroupMode?.(3);
    return;
  }

  input.onOther?.(id, input.team ?? 0);
}
