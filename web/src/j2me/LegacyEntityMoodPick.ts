/**
 * `private void B()`, bytecode/b-javap.txt line 17070, offsets 0..522 --
 * `b.e()`'s offset-311 call, run for **every team-0 adult once every 15
 * frames** (the loop's own gate is `f.c % 15 === (id & 7) && 1414 >= 12`).
 * It chooses the villager's thought bubble.
 *
 * `dense[3333 + v]` is what `LegacyEntityOverlayDraw.ts` draws as sprite
 * `77 + dense[3333 + v]` whenever it is >= 0, so this method is the
 * producer of those icons; it was `b.e()`'s unwired `onPeriodicEntityAction`,
 * which is why villagers only ever showed the few icons `k()` and `i()`
 * set directly.
 *
 *  - 0..54: an entity mid-action (`2929` 39, 104 or 105) is left alone.
 *  - 55..136: the cooldown. A bubble that is currently showing (`3333 >= 0`)
 *    is taken down and replaced by `-2 - rand(4)`, i.e. a wait of 2..5
 *    turns; a negative counter below -1 ticks back up toward -1.
 *  - 137..172: still counting down, or not an adult worker type (`<= 9`) ->
 *    nothing more.
 *  - 173..223: a courting type (109..111) always shows bubble 1.
 *  - 224..411: otherwise roll `I = rand(22)`, and only for `I < 11` consult
 *    band `I` of `t56`: the stat at `dense[saveOffsets[t56[I]] + v]` must lie
 *    within `[t56[11 + I], t56[22 + I]]`, and a second roll must come in
 *    under `t56[33 + I]` percent. So each of the eleven thoughts has its own
 *    stat window and its own likelihood, and rolling 11..21 means "no
 *    thought this time".
 *  - 412..521: three overrides that ignore all of the above --
 *    **no home and unhappy** (`3434 < 1 && 505 < 10`) shows 9,
 *    **starving** (`2020 === 0`) shows 0, **exhausted** (`2121 === 0`)
 *    shows 2. The last one wins outright, matching the bytecode's order.
 */
export type LegacyEntityMoodPickInput = {
  readonly state: Int8Array;
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
  /** b.b:[S (#132). */
  readonly saveOffsets: Int16Array;
  /** b.v:I (#225). */
  readonly v: number;
  /** f.a(int,int) (#269) -- the shared random. */
  readonly random: (mask: number, divisor: number) => number;
};

function toByte(value: number): number {
  return (value << 24) >> 24;
}

export function stepLegacyEntityMoodPick(input: LegacyEntityMoodPickInput): void {
  const { state, v } = input;
  const table = (row: number, index: number) => input.packedBytes[(input.packedOffsets[row] ?? 0) + index] ?? 0;

  // Offsets 0..54.
  const action = state[2929 + v] ?? 0;
  if (action === 39 || action === 104 || action === 105) return;

  // Offsets 55..136.
  if ((state[3333 + v] ?? 0) >= 0) {
    state[3333 + v] = toByte(-2 - input.random(255, 4));
  } else if ((state[3333 + v] ?? 0) < -1) {
    state[3333 + v] = toByte((state[3333 + v] ?? 0) + 1);
  }

  // Offsets 137..172.
  if ((state[3333 + v] ?? 0) < -1) return;
  const type = state[2828 + v] ?? 0;
  if (type <= 9) return;

  // Offsets 173..223.
  if (type >= 109 && type <= 111) {
    state[3333 + v] = 1;
    return;
  }

  // Offsets 224..411.
  // `I:I` (#24) is written before it is read in both of its two methods
  // (`A()` and this one) and never crosses between them, so it is a local.
  const thought = input.random(0xffffff, 22);
  if (thought < 11) {
    const stat = state[(input.saveOffsets[table(56, thought)] ?? 0) + v] ?? 0;
    if (stat >= table(56, 11 + thought) &&
        stat <= table(56, 22 + thought) &&
        input.random(0xffffff, 100) < table(56, 33 + thought)) {
      state[3333 + v] = toByte(thought);
    }
  }

  // Offsets 412..521.
  if ((state[3434 + v] ?? 0) < 1 && (state[505 + v] ?? 0) < 10) state[3333 + v] = 9;
  if ((state[2020 + v] ?? 0) === 0) state[3333 + v] = 0;
  if ((state[2121 + v] ?? 0) === 0) state[3333 + v] = 2;
}
