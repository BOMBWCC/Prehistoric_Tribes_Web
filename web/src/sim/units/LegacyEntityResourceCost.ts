import { BLD_HP, BLD_KIND, BLD_LEVEL, BLD_MAX_HP, BLD_WORK, UNIT_CARRY_AMOUNT, UNIT_CARRY_KIND, UNIT_HELD_ITEM, UNIT_HOME_X, UNIT_HOME_Y, UNIT_RECORD, UNIT_TYPE } from "../../core/DenseLayout";
import { T_BUILDING } from "../../core/DataTables";
/**
 * The team-pool cost pair of class b: `private boolean b(int,boolean,int)`
 * (#344, bytecode/b-javap.txt line 27114, offsets 0..622) checks that team
 * `u` can pay for action `S`, and `private boolean a(int,boolean,int)` (#292,
 * line 26616, offsets 0..850) pays it and loads the unit.
 *
 * `pool` is b.a:[[S (#63) row `u`; `t71..t76` are the cost tables: for action
 * `S` the entries `t73[S] .. t73[S+1]-1` name pool slots `t71[R]` and amounts
 * `t72[R]`. Action 71 (unit type 99) is the building upgrade/repair of the
 * record under the unit's target cell, priced per footprint table t138: rows of 26 kinds, row
 * `(base + R) * 26 + kind` (b(IZI)Z offsets 138..148 / 310..320, a(IZI)Z 256..266 / 361..371 /
 * 482..550). FIXED 2026-10-14 (oracle run 15, play24 frame 74187, an enemy repairing record 34):
 * the port indexed `base + R * 26 + kind`.
 *
 * V:I (#54) and W:I (#55) are b fields used only by these two methods; W is
 * written before either reads it and V before it is read on the same path.
 */
export type LegacyEntityResourceCostInput = {
  readonly state: Int8Array;
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
  readonly gridC: readonly Int8Array[];
  /** b.u:I (#222). */
  readonly team: number;
  /** b.v:I (#225), the unit being processed by the caller. */
  readonly v: number;
  /** b.a:[[S (#63). */
  readonly pool: readonly Int16Array[];
  /** b.d:[S (#152). */
  readonly dShort: Int16Array;
  /** V:I (#54) / W:I (#55). */
  readonly scratch: { V: number; W: number };
  /** f.a(byte,byte,byte,byte) (#290), called as `(9, 0, 0, 0)`. */
  readonly onNotify: () => void;
  /** R:I (#49): both methods loop on the field itself, so its last value outlives the call
   *  (i()Z reads it). A local until 2026-10-08 (oracle run 3, frame 3955). */
  readonly R?: { value: number };
};

function table(input: LegacyEntityResourceCostInput, row: number, index: number): number {
  return input.packedBytes[(input.packedOffsets[row] ?? 0) + index] ?? 0;
}

function toShort(value: number): number {
  return (value << 16) >> 16;
}

function toByte(value: number): number {
  return (value << 24) >> 24;
}

/** Offsets 188..252 / 339..403 / 531..606: remember what was missing, maybe notify. */
function shortOf(input: LegacyEntityResourceCostInput, w: number, slot: number): false {
  input.state[UNIT_CARRY_KIND + w] = table(input, 76, slot);
  if ((input.dShort[1] ?? 0) < 0 && input.team === 0) {
    input.dShort[1] = 0;
    input.onNotify();
  }
  return false;
}

/** `private boolean b(int,boolean,int)` (#344). */
export function checkLegacyEntityAffordable(input: LegacyEntityResourceCostInput, s: number, flag: boolean, w: number): boolean {
  const r = input.R ?? { value: 0 };
  const { state, scratch } = input;
  const pool = input.pool[input.team]!;

  if (s === 71) {
    scratch.W = flag ? -(input.gridC[state[UNIT_HOME_Y + w] ?? 0]?.[state[UNIT_HOME_X + w] ?? 0] ?? 0) : input.v;
    const W = scratch.W;
    const kind = state[BLD_KIND + W] ?? 0;
    if ((state[BLD_WORK + W] ?? 0) === 2) {
      scratch.V = (state[BLD_MAX_HP + W] ?? 0) - (state[BLD_HP + W] ?? 0);
      for (r.value = 0; r.value < 3; r.value += 1) {
        const R = r.value;
        const need = Math.trunc(table(input, T_BUILDING, (10 + R) * 26 + kind) * scratch.V / ((state[BLD_MAX_HP + W] ?? 0) * 2));
        if ((pool[2 + R] ?? 0) < need) return shortOf(input, w, 2 + R);
      }
      return true;
    }
    for (r.value = 0; r.value < 3; r.value += 1) {
      const R = r.value;
      if ((pool[2 + R] ?? 0) < table(input, T_BUILDING, (13 + R) * 26 + kind)) return shortOf(input, w, 2 + R);
    }
    return true;
  }

  for (r.value = table(input, 73, s); r.value < table(input, 73, s + 1); r.value += 1) {
    const R = r.value;
    if ((pool[table(input, 71, R)] ?? 0) >= table(input, 72, R)) continue;
    if ((state[UNIT_HELD_ITEM + w] ?? 0) === s - 16) continue;
    if (s >= 16) return false;
    return shortOf(input, w, table(input, 71, R));
  }
  return true;
}

export type LegacyEntityPayCostCallbacks = {
  /** b.g:[[B (#176), 3 x 20. */
  readonly gRows: readonly Int8Array[];
  /** b.f:Z (#172), shared with i()Z/j()Z. */
  readonly f: { value: boolean };
  /** M() (#249). */
  readonly onM: () => void;
  /** N() (#250). */
  readonly onN: () => void;
  /** f.d(int) (#370), called with the unit's 4444. */
  readonly onRecordFinish: (record: number) => void;
};

/** `private boolean a(int,boolean,int)` (#292): `type` is the unit's type, `w` the unit. */
export function stepLegacyEntityPayCost(
  input: LegacyEntityResourceCostInput,
  cb: LegacyEntityPayCostCallbacks,
  type: number,
  flag: boolean,
  w: number,
): boolean {
  const r = input.R ?? { value: 0 };
  const { state, scratch } = input;
  const pool = input.pool[input.team]!;
  const s = type - 28; // S:I (#51)

  // Offsets 16..19: `f = b(S, flag, w)`. CORRECTED 2026-09-15: the port never
  // wrote f:Z, so i()Z's tail (offset 916) never ran I() for a builder that
  // had just loaded materials at the Store -- it stayed there and paid again.
  cb.f.value = checkLegacyEntityAffordable(input, s, flag, w);
  if (!cb.f.value) {
    if (flag) {
      cb.onM();
      // M() keeps the unit's current type in 3939. A 2026-09-18 deviation
      // overwrote it with 69; REVERTED 2026-10-13 (oracle run 13, play10 frame
      // 32768: the original keeps 37 for a cook, sits it down as 84, and it
      // later moves on as type 110), as the sister deviation was on 2026-09-29.
      cb.onN();
    }
    return false;
  }

  // Offsets 43..70: b(III) clamp(9, 1, pool[1]) for type 37.
  const clampTo = pool[1] ?? 0;
  const loadFor37 = type === 37 ? (9 < 1 ? 1 : 9 >= clampTo ? clampTo : 9) : 0;

  if (type !== 99) {
    for (r.value = table(input, 73, s); r.value < table(input, 73, s + 1); r.value += 1) {
      const R = r.value;
      const slot = table(input, 71, R);
      pool[slot] = toShort((pool[slot] ?? 0) - (type === 37 ? loadFor37 : table(input, 72, R)));
    }
  } else {
    const W = scratch.W;
    const kind = state[BLD_KIND + W] ?? 0;
    // CORRECTED 2026-09-22: this was named `upgrading`, which is backwards.
    // `ad()` (LegacySubsystemTrainingComplete.ts) bumps 9115 -- the level --
    // only when 8627 === 1, so 8627 === 1 is the UPGRADE and 8627 === 2 is the
    // REPAIR. The price below matches: stage 2 is prorated by the missing hit
    // points (8566 - 8505), which is a repair bill, while stage 1 pays the flat
    // t138[13 + ...] entry.
    const repairing = (state[BLD_WORK + W] ?? 0) === 2;
    for (r.value = 0; r.value < 3; r.value += 1) {
      const R = r.value;
      const cost = repairing
        ? Math.trunc(table(input, T_BUILDING, (10 + R) * 26 + kind) * scratch.V / ((state[BLD_MAX_HP + W] ?? 0) * 2))
        : table(input, T_BUILDING, (13 + R) * 26 + kind);
      pool[2 + R] = toShort((pool[2 + R] ?? 0) - cost);
    }
    for (let aK = 0; aK < 20; aK += 1) {
      if ((cb.gRows[0]![aK] ?? 0) !== W) continue;
      const level = state[BLD_LEVEL + W] ?? 0;
      cb.gRows[2]![aK] = toByte(repairing
        ? -scratch.V
        : table(input, T_BUILDING, (7 + level - 1) * 26 + kind) - table(input, T_BUILDING, (7 + level) * 26 + kind));
      if (!flag) cb.gRows[2]![aK] = toByte(-(cb.gRows[2]![aK] ?? 0));
      break;
    }
  }

  if (!flag) return true;

  const wType = state[UNIT_TYPE + w] ?? 0;
  if (wType === 99) {
    state[UNIT_CARRY_AMOUNT + w] = 9;
    state[UNIT_CARRY_KIND + w] = 2;
  } else if (wType >= 44) {
    const held = state[UNIT_HELD_ITEM + w] ?? 0;
    if (held <= 5) {
      const slot = table(input, 88, held);
      pool[slot] = toShort((pool[slot] ?? 0) + table(input, 105, held));
    }
    state[UNIT_HELD_ITEM + w] = toByte(wType - 44);
    cb.onRecordFinish(state[UNIT_RECORD + w] ?? 0);
  } else {
    state[UNIT_CARRY_AMOUNT + w] = toByte(type === 37 ? loadFor37 : table(input, 75, s));
    state[UNIT_CARRY_KIND + w] = table(input, 74, s);
  }
  return true;
}
