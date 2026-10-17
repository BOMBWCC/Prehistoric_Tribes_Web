import { UNIT_AGE, UNIT_HP, UNIT_MAX_HP } from "../../core/DenseLayout";
import { T_BUILDING_SKILL_ATTR, T_BUILDING_SKILL_BASE, T_BUILDING_SKILL_CAP, T_BUILDING_SKILL_CHANCE, T_BUILDING_SKILL_RANGE, T_BUILDING_SKILL_STEP, T_MAX_HP_BY_AGE, T_SKILL_FIELD } from "../../core/DataTables";
/**
 * `private boolean a(byte,byte,byte,byte)` (#293), bytecode/b-javap.txt line
 * 26453, offsets 0..269: a unit's attribute grows while it works ("each person
 * has a set of skills which get higher as a villager performs a task").
 *
 * Called with `(t45[type], t46[type], t47[type], t64[t45[type]])` by i()Z
 * (units with `4646 < 0` and `t48[type] & 2`, e.g. carriers after a delivery)
 * and by j()Z (`t48[type] & 2 == 0`, e.g. gatherers after a harvest):
 *
 *   U = dense[b[t44[attr]] + v];
 *   if (rand(100) < chance && U*step < cap*step) {
 *     dense[b[t44[attr]] + v] += step;
 *     if (attr == 4) {                      // max hit points
 *       if (6767 >= t98[age]) 6767 = t98[age];
 *       1919 += 6767 - U;
 *       return true;
 *     }
 *   }
 *   return U*step >= cap*step && chance >= 100;   // U is the value before the gain
 *
 * So the result means "this attribute is done training" (a 100% entry already
 * at its cap), not "it grew". CORRECTED 2026-09-15: offset 100 is
 * `if_icmpne 221`; the port returned true after any gain, so a builder whose
 * building skill rose (8%) ended its work and left the site.
 *
 * t44 maps attr 0..13 to 1010 (speed, step -1), 1717 melee, 1616 ranged,
 * 1818, 6767 max hp, 3737 cargo, 4949 vision, 6969..7474 civil skills and
 * 7575 scouting. `U:I` (#53) is only used by this method, so it is a local.
 */
export type LegacyEntitySkillGainInput = {
  readonly state: Int8Array;
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
  /** b.b:[S (#132). */
  readonly saveOffsets: Int16Array;
  /** b.v:I (#225). */
  readonly id: number;
  /** f.a(int,int) (#269), called as `(0xFFFFFF, 100)`. */
  readonly randomRemainder: (mask: number, divisor: number) => number;
};

function toByte(value: number): number {
  return (value << 24) >> 24;
}

/**
 * `private boolean b(int,int)` (#347), bytecode/b-javap.txt line 26318,
 * offsets 0..211: the skills a worker at a record trains, e.g. a builder's
 * building skill. For `T` from `t69[kind*4 + level]` below
 * `t69[kind*4 + level + 1]`, with `base = t68[kind]`, runs #293 with
 * `(t65[base+T], t66[base+T], t67[base+T], t63[base+T])`; returns true only
 * if every call did (every entry finished training) (b.g:Z #179 and T:I #52 are used only here).
 * i()Z passes `(8749[rec], 9115[rec] - 1)`, j()Z `(8627 != 0 ? 16 : 8749, 9115 - 1)`.
 */
export function stepLegacyEntitySlotSkillGain(input: LegacyEntitySkillGainInput, kind: number, level: number): boolean {
  const table = (row: number, index: number) => input.packedBytes[(input.packedOffsets[row] ?? 0) + index] ?? 0;
  let all = true;
  const base = table(T_BUILDING_SKILL_BASE, kind);
  for (let T = table(T_BUILDING_SKILL_RANGE, kind * 4 + level); T < table(T_BUILDING_SKILL_RANGE, kind * 4 + level + 1); T += 1) {
    if (!stepLegacyEntitySkillGain(input, table(T_BUILDING_SKILL_ATTR, base + T), table(T_BUILDING_SKILL_CHANCE, base + T), table(T_BUILDING_SKILL_CAP, base + T), table(T_BUILDING_SKILL_STEP, base + T))) {
      all = false;
    }
  }
  return all;
}

export function stepLegacyEntitySkillGain(
  input: LegacyEntitySkillGainInput,
  attr: number,
  chance: number,
  cap: number,
  step: number,
): boolean {
  const { state, id: v } = input;
  const table = (row: number, index: number) => input.packedBytes[(input.packedOffsets[row] ?? 0) + index] ?? 0;
  const slot = (input.saveOffsets[table(T_SKILL_FIELD, attr)] ?? 0) + v;
  const U = state[slot] ?? 0;

  if (input.randomRemainder(0xffffff, 100) < chance && U * step < cap * step) {
    state[slot] = toByte(U + step);
    if (attr === 4) {
      const ageCap = table(T_MAX_HP_BY_AGE, state[UNIT_AGE + v] ?? 0);
      if ((state[UNIT_MAX_HP + v] ?? 0) >= ageCap) state[UNIT_MAX_HP + v] = ageCap;
      state[UNIT_HP + v] = toByte((state[UNIT_HP + v] ?? 0) + (state[UNIT_MAX_HP + v] ?? 0) - U);
      return true;
    }
  }
  // Offsets 222..267 re-read the skill, so a gain that just reached the cap
  // counts as finished. CORRECTED 2026-10-12 (oracle run 10, frame 31276): the
  // port tested the value from before the gain, so a trainee at the gym went on
  // for another round instead of leaving.
  return (state[slot] ?? 0) * step >= cap * step && chance >= 100;
}
