import { UNIT_FLAGS, UNIT_HP, UNIT_MAX_HP } from "../../core/DenseLayout";
/**
 * `private boolean a(int,int)` (#294), bytecode/b-javap.txt line 25749,
 * offsets 0..154: change a unit's hit points by `delta` and report whether it
 * ends up at full health.
 *
 *   if (delta > 1) { 8080[id] = -100; 7979[id] &= 251; }      // 0..33
 *   if (1919[id] >= 6767[id] && delta > 0) return true;       // 35..62
 *   if (u == 0 || delta < 0) c.f[id] += delta;                // 64..91
 *   1919[id] = clamp(1919[id] + delta, 0, 6767[id]);          // 92..127
 *   return 1919[id] >= 6767[id];                              // 129..154
 *
 * Callers (all previously unwired, so hunger and tiredness had no bite):
 * `r()` passes `-1` when hunger or tiredness bottoms out and `1`/`2` on its
 * own periodic ticks, and `q()` reaches it the same way.
 */
export type LegacyEntityHealthDeltaInput = {
  readonly state: Int8Array;
  /** b.u:I (#222). */
  readonly team: number;
  /** c.f:[B (#51 in class c) -- LegacyResourceTables.rowFByte, 122 bytes. */
  readonly cBytes: Int8Array;
};

function toByte(value: number): number {
  return (value << 24) >> 24;
}

function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value >= max ? max : value;
}

export function stepLegacyEntityHealthDelta(
  input: LegacyEntityHealthDeltaInput,
  id: number,
  delta: number,
): boolean {
  const { state } = input;

  if (delta > 1) {
    state[8080 + id] = -100;
    state[UNIT_FLAGS + id] = toByte((state[UNIT_FLAGS + id] ?? 0) & 251);
  }

  if ((state[UNIT_HP + id] ?? 0) >= (state[UNIT_MAX_HP + id] ?? 0) && delta > 0) return true;

  // Offset 67 `ifeq 74` jumps straight to the record when u == 0: every change to one of our
  // units shows a floating number, the other team's only when it loses hit points. FIXED
  // 2026-10-09 (oracle run 5, frame 14268): the u test was inverted.
  if (input.team === 0 || delta < 0) {
    if (id >= 0 && id < input.cBytes.length) {
      input.cBytes[id] = toByte((input.cBytes[id] ?? 0) + delta);
    }
  }

  state[UNIT_HP + id] = toByte(clamp((state[UNIT_HP + id] ?? 0) + delta, 0, state[UNIT_MAX_HP + id] ?? 0));
  return (state[UNIT_HP + id] ?? 0) >= (state[UNIT_MAX_HP + id] ?? 0);
}
