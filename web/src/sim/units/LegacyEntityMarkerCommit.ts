import { BLD_X, BLD_Y, UNIT_CARRY_AMOUNT, UNIT_FLAGS, UNIT_HELD_ITEM, UNIT_MODE, UNIT_ORDER, UNIT_RECORD, UNIT_SLOT, UNIT_TARGET_X, UNIT_TARGET_Y, UNIT_TIMER, UNIT_TYPE, UNIT_VISION, UNIT_WORK_TARGET, UNIT_Y } from "../../core/DenseLayout";
/**
 * `private void H()` (#244), bytecode/b-javap.txt line 21160, offsets
 * 0..1392 -- the commit half of `private boolean p()`
 * (`LegacySubsystemBBoolean2.ts`). `p()` scans up to three marker layers
 * for the best candidate near the unit and leaves the winner in class b's
 * shared scratch (`y:B`#232 = the marker's kind, `z:B`#235 / `A:B`#6 = its
 * cell); when it found one it calls `H()`, which is what actually acts on
 * it: walking the unit over, re-typing it into the matching worker type,
 * or -- outside the mission's allowed rectangle -- sending it home.
 *
 * `P:I` (#44) is only written at offset 18 and read at 80/96/114/132, all
 * inside this method (its other 8 sites are one unrelated method's own
 * write-then-read), so it is a plain local here.
 *
 * Offset by offset:
 *  - 0..18: `P = packedOffsets[101] + f.q * 4` -- the mission's allowed
 *    rectangle (x0,y0,x1,y1 at `packedBytes[P..P+3]`).
 *  - 21..137: when `(I:B & (u + 1)) != 0` -- and, for `f:B < 50` (i.e.
 *    while a tutorial step is live), only when the marker is neither kind 2
 *    nor a kind-1 marker outside mission 2 AND lies INSIDE that rectangle
 *    -- the marker is reserved and the unit must keep its hands off it:
 *  - 141..211: only for marker kind 4; `dense[4646+v] < 0` (an overlay
 *    icon rather than a slot) means `a(v,false)` + type 69, otherwise the
 *    unit becomes type 87 with `dense[6161+v] = 3` (walk away). Then the
 *    method skips straight to the 1238 tail.
 *  - 214..229: `B:B = gridC[A][z]` -- whatever already occupies the
 *    marker's cell.
 *  - 232..236: `a:Z` (set by `p()`'s own tail) splits the method.
 *  - 239..409 (`a:Z` set): `f:Z` = "this unit may walk to the marker" --
 *    false only for an adult (`type > 9`) team-0 unit with `dense[6565+v]
 *    == 9`, no `f.N:Z`, a non-kind-1 marker, that has ALREADY strayed
 *    more than 6 cells from record 1 (`dense[8384]`/`dense[8445]`).
 *  - 412..434: a stay-put baby (type 59) stops here.
 *  - 437..478: if the unit is not the one standing on its own cell, a
 *    kind-1 marker stops here.
 *  - 481..557: the target becomes the marker's cell when `f:Z`, else the
 *    unit's own cell.
 *  - 565..653 (`f:Z`, unit on its own cell): `g(1)`, then
 *    `z:I = a(x,y,0)` and `p()` (#408) when `z:I / 10 > B:I`.
 *  - 656..902 (`f:Z`, cell taken by someone else): a type <= 82 is first
 *    teleported onto its own record's door, then `dense[4747+v] = B:B`,
 *    `dense[4444+v] = B:B * t62[y] - (y == 2 ? 101 : 0)`, the unit is
 *    re-typed to `t61[y]`, `i(a(x,y,0))` runs and the animation/sit timer
 *    reset.
 *  - 905..972 (`!f:Z`): the unit reverts to a type-59 idler
 *    (`dense[2929+v] = -95`, route cleared).
 *  - 975..1055 (`!a:Z`): a unit that is NOT on its own cell and still has
 *    a sit timer becomes type 87 / `dense[6161+v] = 3`.
 *  - 1056..1135: a kind-4 marker on team 0 fires `a(4, v, B:B)` (#274)
 *    unless `dense[7979+v] & 2`, and, the first time `d[0]` is still
 *    negative, resets it and queues `f.a(6, z, A, 0)`.
 *  - 1136..1141: `D:B = F:B` -- `F` is the layer `p()`'s scan settled on,
 *    and `D` is what the rescan at 1198 searches with.
 *  - 1144..1235: a kind-4 marker (or a kind-2 one on a `7979 & 128` unit)
 *    without `7979 & 2` triggers that rescan, `a(x, y, dense[4949+v])`
 *    (#291 = clamp bounds, `aj:I = u`, then the marker lookup again).
 *  - 1238..1392: the tutorial hook -- while `f:B` is below
 *    `t291[f.q]`, on team 0, with `t287[t288[f.q] + f:B] == 1`, a kind-4
 *    marker and the unit on its own cell, it runs `b(v, max(B:B,0), z, A)`
 *    (#346, `placeLegacyAuxiliary`), which is what advances `f:B` to the
 *    next tutorial step.
 */
export type LegacyEntityMarkerCommitScratch = {
  /** b.y:B (#232) -- the marker kind p() settled on. */
  y: number;
  /** b.z:B (#235) / b.A:B (#6) -- the marker's cell. */
  z: number;
  A: number;
  /** b.B:B (#9) -- whoever already stands on that cell. */
  B: number;
  /** b.a:Z (#73). */
  a: boolean;
  /** b.f:Z (#172). */
  f: boolean;
  /** b.z:I (#234). */
  zInt: number;
  /** b.D:B (#13) -- the layer the 1198 rescan uses. */
  D: number;
  /** b.F:B (#17) -- the layer p()'s scan settled on. */
  F: number;
};

export type LegacyEntityMarkerCommitInput = {
  readonly state: Int8Array;
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
  /** b.b:[[B (#129) -- gridC[y][x]. */
  readonly gridC: readonly Int8Array[];
  /** b.v:I (#225). */
  readonly v: number;
  /** b.u:I (#222). */
  readonly team: number;
  /** f.q:B (#211). */
  readonly sceneQ: number;
  /** b.f:B (#167) -- the tutorial-step counter. */
  readonly fByte: number;
  /** b.I:B (#23). */
  readonly IByte: number;
  /**
   * b.B:I (#8), read at offset 640 -- after `g(1)` may have re-typed the unit, which rewrites B:I.
   * Read then, not on entry (oracle run 5, frame 12645: a raider re-typed to 6 planned twice).
   */
  readonly bValue: () => number;
  /** f.N:Z (#37). */
  readonly nFlag: boolean;
  /** b.d:[S (#152). */
  readonly dShort: Int16Array;
  readonly scratch: LegacyEntityMarkerCommitScratch;
  /** private void a(int,boolean) (#278) -- syncLegacySubsystemBCoordinate. */
  readonly onCoordinateSync: (id: number, flag: boolean) => void;
  /** a(int,byte) (#275) -- changeEntityType. */
  readonly onChangeType: (id: number, type: number) => void;
  /** private void g(int) (#384) -- subsystemG. */
  readonly onGroupMode: (argument: number) => void;
  /** private int a(int,int,int) (#266) -- the occupancy score. */
  readonly onOccupancy: (x: number, y: number, mode: number) => number;
  /** private void p() (#408) -- stepSubsystemP. */
  readonly onPVoid: () => void;
  /** private void i(int) (#391) -- stepEntityIUpdate. */
  readonly onIUpdate: (argument: number) => void;
  /** final void a(byte,int,int) (#274) -- triggerLegacyEntityMove. */
  readonly onMoveTrigger: (action: number, id: number, id2: number) => void;
  /** f.a(byte,byte,byte,byte) (#290) -- runByteActionQueue. */
  readonly onByteAction: (type: number, x: number, y: number, value: number) => void;
  /** private void a(byte,byte,byte) (#291) -- clamp bounds, `aj:I = u`, rescan. */
  readonly onMarkerRescan: (x: number, y: number, range: number) => void;
  /** private void b(int,int,int,int) (#346) -- placeLegacyAuxiliary. */
  readonly onAuxRecord: (first: number, second: number, x: number, y: number) => void;
};

function toByte(value: number): number {
  return (value << 24) >> 24;
}

export function stepLegacyEntityMarkerCommit(input: LegacyEntityMarkerCommitInput): void {
  const { state, v, team, sceneQ, fByte, gridC, scratch } = input;
  const table = (row: number, index: number) => input.packedBytes[(input.packedOffsets[row] ?? 0) + index] ?? 0;
  const cellOwner = () => gridC[state[UNIT_Y + v] ?? 0]?.[state[v] ?? 0] ?? 0;

  // Offsets 0..18.
  const P = (input.packedOffsets[101] ?? 0) + sceneQ * 4;

  // Offsets 21..137: is this marker inside the mission's reserved rectangle
  // while this team is flagged for it? Every compare below jumps to offset
  // 214 (the normal body) when the answer is no; falling through to offset
  // 141 is the "hands off" handling. Note the direction: a marker OUTSIDE
  // the rectangle takes the normal body.
  let restricted = false;
  if ((input.IByte & (team + 1)) !== 0) {
    restricted = true;
    if (fByte < 50) {
      if (scratch.y === 2) restricted = false;
      else if (scratch.y === 1 && sceneQ !== 2) restricted = false;
      else if (scratch.z < (input.packedBytes[P] ?? 0)) restricted = false;
      else if (scratch.A < (input.packedBytes[P + 1] ?? 0)) restricted = false;
      else if (scratch.z > (input.packedBytes[P + 2] ?? 0)) restricted = false;
      else if (scratch.A > (input.packedBytes[P + 3] ?? 0)) restricted = false;
    }
  }

  if (restricted) {
    // Offsets 141..211.
    if (scratch.y === 4) {
      if ((state[UNIT_SLOT + v] ?? 0) < 0) {
        input.onCoordinateSync(v, false);
        input.onChangeType(v, 69);
      } else {
        input.onChangeType(v, 87);
        state[UNIT_ORDER + v] = 3;
      }
    }
    // Offset 184/211's `goto 1238`: everything in between is skipped.
    stepTutorialHook(input, table);
    return;
  }

  // Offsets 214..229.
  scratch.B = gridC[scratch.A]?.[scratch.z] ?? 0;

  if (scratch.a) {
    // Offsets 239..409.
    const strayGate =
      (state[UNIT_HELD_ITEM + v] ?? 0) === 9 &&
      (state[UNIT_TYPE + v] ?? 0) > 9 &&
      team !== 1 &&
      !input.nFlag &&
      scratch.y !== 1;
    if (!strayGate) {
      scratch.f = true;
    } else {
      const dx = (state[v] ?? 0) - (state[8384] ?? 0);
      const dy = (state[UNIT_Y + v] ?? 0) - (state[8445] ?? 0);
      scratch.f = dx >= -6 && dx <= 6 && dy >= -6 && dy <= 6;
    }

    // Offsets 412..434.
    if (scratch.f || (state[UNIT_TYPE + v] ?? 0) !== 59) {
      // Offsets 437..478.
      if (cellOwner() === v || scratch.y !== 1) {
        // Offsets 481..557.
        state[UNIT_TARGET_X + v] = scratch.f ? scratch.z : (state[v] ?? 0);
        state[UNIT_TARGET_Y + v] = scratch.f ? scratch.A : (state[UNIT_Y + v] ?? 0);

        if (!scratch.f) {
          // Offsets 905..972.
          input.onChangeType(v, 59);
          state[UNIT_MODE + v] = -95;
          state[3030 + v] = 0;
          state[UNIT_CARRY_AMOUNT + v] = 0;
          state[808 + v] = 0;
        } else if (cellOwner() === v) {
          // Offsets 565..653.
          input.onGroupMode(1);
          scratch.zInt = input.onOccupancy(state[v] ?? 0, state[UNIT_Y + v] ?? 0, 0);
          if (Math.trunc(scratch.zInt / 10) > input.bValue()) input.onPVoid();
        } else {
          // Offsets 656..902.
          if ((state[UNIT_TYPE + v] ?? 0) <= 82) {
            const record = state[UNIT_RECORD + v] ?? 0;
            state[v] = state[BLD_X + record] ?? 0;
            state[UNIT_Y + v] = state[BLD_Y + record] ?? 0;
          }
          state[UNIT_WORK_TARGET + v] = scratch.B;
          state[UNIT_RECORD + v] = toByte(scratch.B * table(62, scratch.y) - (scratch.y === 2 ? 101 : 0));
          input.onChangeType(v, table(61, scratch.y));
          scratch.zInt = input.onOccupancy(state[v] ?? 0, state[UNIT_Y + v] ?? 0, 0);
          input.onIUpdate(scratch.zInt);
          state[3030 + v] = 0;
          state[UNIT_TIMER + v] = 1;
        }
      }
    }
  } else if (cellOwner() !== v && (state[UNIT_TIMER + v] ?? 0) > 0) {
    // Offsets 975..1055.
    state[UNIT_TYPE + v] = 87;
    state[UNIT_ORDER + v] = 3;
  }

  // Offsets 1056..1135.
  if (scratch.y === 4 && team === 0) {
    if (((state[UNIT_FLAGS + v] ?? 0) & 2) === 0) input.onMoveTrigger(4, v, scratch.B);
    if ((input.dShort[0] ?? 0) < 0) {
      input.dShort[0] = 0;
      input.onByteAction(6, scratch.z, scratch.A, 0);
    }
  }

  // Offsets 1136..1141.
  scratch.D = scratch.F;

  // Offsets 1144..1235.
  if (scratch.y === 4 || (scratch.y === 2 && ((state[UNIT_FLAGS + v] ?? 0) & 128) !== 0)) {
    if (((state[UNIT_FLAGS + v] ?? 0) & 2) === 0) {
      input.onMarkerRescan(state[v] ?? 0, state[UNIT_Y + v] ?? 0, state[UNIT_VISION + v] ?? 0);
    }
  }

  stepTutorialHook(input, table);
}

/** Offsets 1238..1392, reached from both of H()'s exits. */
function stepTutorialHook(
  input: LegacyEntityMarkerCommitInput,
  table: (row: number, index: number) => number,
): void {
  const { state, v, gridC, scratch } = input;
  if (input.fByte >= table(291, input.sceneQ)) return;
  if (input.team !== 0) return;
  if (table(287, table(288, input.sceneQ) + input.fByte) !== 1) return;
  if (scratch.y !== 4) return;
  if ((gridC[state[UNIT_Y + v] ?? 0]?.[state[v] ?? 0] ?? 0) !== v) return;
  input.onAuxRecord(v, scratch.B > 0 ? scratch.B : 0, scratch.z, scratch.A);
}
