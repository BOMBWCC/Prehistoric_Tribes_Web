import { UNIT_GENDER, UNIT_HP, UNIT_RECORD, UNIT_Y } from "../../core/DenseLayout";
/**
 * `private void c(byte)` (#363), bytecode/b-javap.txt line 25846, offsets
 * 0..429 -- **moving a unit into the other tribe**, i.e. what the balloon
 * does. `k()` calls it for a type-107 unit with that unit's own
 * `dense[4444]` as the argument, so `arg1` is the captive and `u:I` the
 * tribe doing the taking.
 *
 * It copies rather than re-flags: the victim is rebuilt in the first free
 * slot of the capturing team's 50, both tribes' counters are adjusted, and
 * the original is then cleared.
 *
 *   R = u * 50 + 1;
 *   while (R <= (u + 1) * 50) {
 *     if (dense[1919 + R] != 0) { R++; continue; }          // slot in use
 *     if (u == 1) { f.e(arg1); f.f(arg1); a(17, a[0][17], arg1); }
 *     dense[4444 + arg1] = 0;
 *     for (S = 0; S < 83; S++) dense[b[S] + R] = dense[b[S] + arg1];
 *     for (S = 0; S < 80; S++) { a[0][R][S] = a[0][arg1][S]; a[1][R][S] = a[1][arg1][S]; }
 *     pools[u][11] += 1;            pools[u ^ 1][11] -= 1;
 *     pools[u][12 + dense[1515 + R]] += 1;
 *     pools[u ^ 1][12 + dense[1515 + R]] -= 1;
 *     dense[1919 + arg1] = 0;                               // the original dies
 *     gridC[dense[101 + R]][dense[R]] = (byte) R;
 *     f.b((byte) R); f.g(R);
 *     return;
 *   }
 *
 * The `u == 1` prefix is the alarm: only when the ENEMY is the one taking
 * someone does it run `f.e`/`f.f` and `a(17, chief, victim)` (#274), which
 * is the player being told a villager has been carried off. Doing it the
 * other way round costs the player nothing, which matches the original's
 * asymmetry rather than any guess.
 *
 * `pools[team][11]` is the population counter and `pools[team][12 + gender]`
 * the per-gender one, both moved from one tribe to the other in the same
 * breath -- so an abduction is exactly a transfer, never a duplication.
 *
 * `R:I` (#49) and `S:I` (#51) are this method's cursors -- b's shared fields,
 * read later by other methods (oracle run 9, frame 19664: R = 54 after a
 * capture), so they are written through `fields`, not kept as locals.
 */
export type LegacyEntityAbductionInput = {
  readonly state: Int8Array;
  /** b.b:[S (#132) -- the 83 per-entity field rows copied wholesale. */
  readonly saveOffsets: Int16Array;
  /** b.a:[[[B (#70) -- LegacySubsystemArrays.a, the 2x101x80 route table. */
  readonly routes: readonly (readonly Int8Array[])[];
  /** b.a:[[S (#63) -- the per-team counter pools. */
  readonly pools: readonly Int16Array[];
  /** b.b:[[B (#129) -- gridC[y][x]. */
  readonly gridC: readonly Int8Array[];
  /** b.u:I (#222) -- the team doing the taking. */
  readonly team: number;
  /** b.R:I (#49) and b.S:I (#51), live. */
  readonly fields: { R: number; S: number };
  /** a[0][17] -- the player's chief. */
  readonly chief: number;
  /** f.e(int) (#377) -- releaseEntitySelection. */
  readonly onVictimE?: (id: number) => void;
  /** f.f(int) (#383) -- stepLegacyEntitySelectionDrop. */
  readonly onVictimF?: (id: number) => void;
  /** final void a(byte,int,int) (#274) -- triggerLegacyEntityMove. */
  readonly onMoveTrigger: (action: number, id: number, id2: number) => void;
  /** f.b(byte) (#348) -- indexLegacyEntityRecord. */
  readonly onRegister?: (id: number) => void;
  /** f.g(int) (#386) -- initializeLegacyEntityRecord. */
  readonly onRefresh?: (id: number) => void;
};

function toByte(value: number): number {
  return (value << 24) >> 24;
}

function toShort(value: number): number {
  return (value << 16) >> 16;
}

export function stepLegacyEntityAbduction(input: LegacyEntityAbductionInput, victim: number): void {
  const { state, saveOffsets, routes, pools, gridC, team } = input;

  const f = input.fields;
  for (f.R = team * 50 + 1; f.R <= (team + 1) * 50; f.R += 1) {
    const r = f.R;
    // Offsets 29..45.
    if ((state[UNIT_HP + r] ?? 0) !== 0) continue;

    // Offsets 48..87: only the enemy taking someone raises the alarm.
    if (team === 1) {
      input.onVictimE?.(victim);
      input.onVictimF?.(victim);
      input.onMoveTrigger(17, input.chief, victim);
    }

    // Offsets 88..160.
    state[UNIT_RECORD + victim] = 0;
    for (f.S = 0; f.S < 83; f.S += 1) {
      const row = saveOffsets[f.S] ?? 0;
      state[row + r] = state[row + victim] ?? 0;
    }

    // Offsets 161..245.
    for (f.S = 0; f.S < 80; f.S += 1) {
      const s = f.S;
      const from0 = routes[0]?.[victim];
      const to0 = routes[0]?.[r];
      if (from0 && to0) to0[s] = from0[s] ?? 0;
      const from1 = routes[1]?.[victim];
      const to1 = routes[1]?.[r];
      if (from1 && to1) to1[s] = from1[s] ?? 0;
    }

    // Offsets 246..345: the head count moves from one tribe to the other.
    const mine = pools[team];
    const theirs = pools[team ^ 1];
    const gender = state[UNIT_GENDER + r] ?? 0;
    if (mine) {
      mine[11] = toShort((mine[11] ?? 0) + 1);
      mine[12 + gender] = toShort((mine[12 + gender] ?? 0) + 1);
    }
    if (theirs) {
      theirs[11] = toShort((theirs[11] ?? 0) - 1);
      theirs[12 + gender] = toShort((theirs[12 + gender] ?? 0) - 1);
    }

    // Offsets 346..414.
    state[UNIT_HP + victim] = 0;
    const row = gridC[state[UNIT_Y + r] ?? 0];
    if (row) row[state[r] ?? 0] = toByte(r);
    input.onRegister?.(toByte(r));
    input.onRefresh?.(r);
    return;
  }
}
