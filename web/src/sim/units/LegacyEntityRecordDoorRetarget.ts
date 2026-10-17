import { BLD_KIND, UNIT_FLAGS, UNIT_ORDER, UNIT_RECORD, UNIT_SLOT, UNIT_TARGET_X, UNIT_TARGET_Y, UNIT_TYPE, UNIT_VISION, UNIT_Y } from "../../core/DenseLayout";
/**
 * `private void q()` (#411), bytecode/b-javap.txt line 6343, offsets 0..961 --
 * `b()`'s own offset-1291 callee, so it runs for every entity that reaches
 * `b()`'s tail. It keeps a unit pointed at its record's door, and decides what
 * to do when the unit has drifted too far from it.
 *
 * The door is a pair of dense fields selected per unit type:
 *   doorX = dense[ saveOffsets[t28[type]]     + record ]
 *   doorY = dense[ saveOffsets[t28[type] + 1] + record ]
 *
 *  - 0..14: `record = dense[4444 + v]` (`p:B` #208, shared scratch).
 *  - 18..62: `if (dense[saveOffsets[t26[type]] + record] <= 0) r();` (#412,
 *    266 offsets, subsystemRecordRecovery -- exposed as `onR`, wired 2026-09-21).
 *  - 66..93: unless `t27[type] & 2`, return.
 *  - 99..129: `n = a(dense[v], dense[101+v], 0) / 10` (#266, the occupancy
 *    score; `n:B` #204 is shared scratch too).
 *  - 133..394, types 92 and 106 (the two "escort" types):
 *    - `n > dense[1818 + v]`: `b(false)` (#335, the 30-slot rescan), then
 *      `a(v, t57[t174[8749[record]] + 4646[v]])`, `i(0)` and
 *      `dense[3030 + v] = -1`; return.
 *    - otherwise the target becomes the door; return.
 *  - 396..414: any other type with `n > dense[4949 + v] + 2` jumps to 747.
 *  - 418..530: if the target already IS the door, return.
 *  - 534..642: otherwise the target becomes the door, and then
 *  - 644..745: when `n > B` (`B:I` #8, the unit's own b-value) it runs `p()`
 *    (#408) and, for types 94..97 carrying `7979 & 16`, calls `f.a(v, 0)`
 *    (#277) and clears that bit.
 *  - 748..760: (from 747) `dense[808 + v] != 0` returns.
 *  - 764..850: a type <= 9 with `dense[6161 + v] == 0` runs `Q()` (#253) and
 *    parks its target on its own cell.
 *  - 852..960: everything else re-targets the door.
 */
export type LegacyEntityRecordDoorRetargetInput = {
  readonly state: Int8Array;
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
  /** b.b:[S (#132) -- LegacyRuntimeState.saveOffsets. */
  readonly saveOffsets: Int16Array;
  /** b.v:I (#225). */
  readonly v: number;
  /** b.B:I (#8) -- the unit's own derived b-value. */
  readonly bValue: number;
  /** b.p:B (#208) and b.n:B (#204), both shared scratch. */
  readonly scratch: { p: number; n: number };
  /** a(int,int,int) (#266) -- LegacySubsystemEntityOccupancyCheck. */
  readonly onOccupancy: (x: number, y: number, mode: number) => number;
  /** private void r() (#412) -- subsystemRecordRecovery (wired 2026-09-21). */
  readonly onR?: () => void;
  /** private void b(boolean) (#335) -- LegacyRuntimeState.subsystemBVoid. */
  readonly onBVoid: (flag: boolean) => void;
  /** a(int,byte) (#275) -- changeEntityType. */
  readonly onChangeType: (id: number, type: number) => void;
  /** private void i(int) (#391) -- stepEntityIUpdate. */
  readonly onIUpdate: (argument: number) => void;
  /** private void p() (#408) -- stepSubsystemP. */
  readonly onP: () => void;
  /** private void Q() (#253) -- selectEntityTypeAfterQ. */
  readonly onQ: () => void;
  /** f.a(int,byte) (#277) -- writeLegacyEntityLinkByte; the result is popped. */
  readonly onLinkByte: (id: number, value: number) => void;
};

function toByte(value: number): number {
  return (value << 24) >> 24;
}

export function stepLegacyEntityRecordDoorRetarget(input: LegacyEntityRecordDoorRetargetInput): void {
  const { state, v, scratch } = input;
  const table = (row: number, index: number) => input.packedBytes[(input.packedOffsets[row] ?? 0) + index] ?? 0;
  const type = () => state[UNIT_TYPE + v] ?? 0;

  // Offsets 0..14.
  scratch.p = state[UNIT_RECORD + v] ?? 0;
  const record = scratch.p;

  const doorX = () => state[(input.saveOffsets[table(28, type())] ?? 0) + record] ?? 0;
  const doorY = () => state[(input.saveOffsets[table(28, type()) + 1] ?? 0) + record] ?? 0;

  // Offsets 18..62.
  if ((state[(input.saveOffsets[table(26, type())] ?? 0) + record] ?? 0) <= 0) input.onR?.();

  // Offsets 66..93.
  if ((table(27, type()) & 2) <= 0) return;

  // Offsets 99..129.
  scratch.n = toByte(Math.trunc(input.onOccupancy(state[v] ?? 0, state[UNIT_Y + v] ?? 0, 0) / 10));
  const n = scratch.n;

  // Offsets 133..394.
  if (type() === 92 || type() === 106) {
    if (n > (state[1818 + v] ?? 0)) {
      input.onBVoid(false);
      const recordKind = state[BLD_KIND + (state[UNIT_RECORD + v] ?? 0)] ?? 0;
      input.onChangeType(v, table(57, table(174, recordKind) + (state[UNIT_SLOT + v] ?? 0)));
      input.onIUpdate(0);
      state[3030 + v] = -1;
      return;
    }
    state[UNIT_TARGET_X + v] = doorX();
    state[UNIT_TARGET_Y + v] = doorY();
    return;
  }

  // Offsets 396..414.
  if (n > (state[UNIT_VISION + v] ?? 0) + 2) {
    // Offsets 748..760.
    if ((state[808 + v] ?? 0) !== 0) return;
    // Offsets 764..850.
    if (type() <= 9 && (state[UNIT_ORDER + v] ?? 0) === 0) {
      input.onQ();
      state[UNIT_TARGET_X + v] = state[v] ?? 0;
      state[UNIT_TARGET_Y + v] = state[UNIT_Y + v] ?? 0;
      return;
    }
    // Offsets 852..960.
    state[UNIT_TARGET_X + v] = doorX();
    state[UNIT_TARGET_Y + v] = doorY();
    return;
  }

  // Offsets 418..530: already standing on the door's target.
  if ((state[UNIT_TARGET_X + v] ?? 0) === doorX() && (state[UNIT_TARGET_Y + v] ?? 0) === doorY()) return;

  // Offsets 534..642.
  state[UNIT_TARGET_X + v] = doorX();
  state[UNIT_TARGET_Y + v] = doorY();

  // Offsets 644..745.
  if (n > input.bValue) {
    input.onP();
    if (type() >= 94 && type() <= 97 && ((state[UNIT_FLAGS + v] ?? 0) & 16) > 0) {
      input.onLinkByte(v, 0);
      state[UNIT_FLAGS + v] = toByte((state[UNIT_FLAGS + v] ?? 0) & 239);
    }
  }
}
