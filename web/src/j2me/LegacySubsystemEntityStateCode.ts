/**
 * Direct translation of `final byte b(int)` (constant pool #340),
 * bytecode/b-javap.txt offsets 0..154 (line 31567). Real, working state-code
 * classifier -- no confirmed-null field involved. Callers: `u()` (offset 96,
 * `dense[2929+v] = this.b(v)`), `P()` (offset 17, `dense[2929+v] =
 * (this.b(v)%7)+8` -- wait, P() actually just feeds `b(v)` through a `%7+8`
 * formula, see `LegacySubsystemEntityRevertIdle.ts`).
 *
 * Structure: gated on level (`dense[1414+id]>=12`), then a small flag/task
 * decision tree over `dense[7979+id]` bit2, `dense[7777+id]`, `dense[3535+id]`,
 * and `dense[6565+id]` (task/role, established elsewhere this session),
 * resetting `dense[7777+id]` to 0 on most return paths.
 */
export function deriveLegacyEntityStateCode(state: Int8Array, id: number): number {
  const level = state[1414 + id] ?? 0;
  if (level < 12) {
    state[7777 + id] = 0;
    return 6;
  }

  const bit2 = (state[7979 + id] ?? 0) & 2;
  if (bit2 > 0) {
    const counter = state[7777 + id] ?? 0;
    const flag = state[3535 + id] ?? 0;
    const role = state[6565 + id] ?? 0;
    if (counter === 0 || flag !== 0 || role === 1) {
      state[7777 + id] = 0;
      return 5;
    }
  }

  const flag2 = state[3535 + id] ?? 0;
  if (flag2 !== 0) {
    state[7777 + id] = 0;
    return 1;
  }
  const role2 = state[6565 + id] ?? 0;
  if (role2 === 1) {
    state[7777 + id] = 0;
    return 1;
  }
  const counter2 = state[7777 + id] ?? 0;
  if (counter2 > 0) return 7;
  return 0;
}
