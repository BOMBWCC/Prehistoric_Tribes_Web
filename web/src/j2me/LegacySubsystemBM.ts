/**
 * `private boolean m()` (#401), bytecode/b-javap.txt line 29197, offsets
 * 0..746 -- called by `private boolean b()` at offset 231 for every unit
 * aged 12 or more; a true result makes b() clear `3636` and return true.
 * This is what walks units to a rally point: CALL TO ARMS (f.N:Z, set by
 * X() from O:Z) and FORM UP (f.L:Z, from M:Z) both run b.b(), which sets
 * `7979 |= 96` on the team, and the target cell is f.q:[B (X() stores the
 * cursor there). Never ported or wired until 2026-10-02, so neither order
 * moved anyone.
 *
 *  - 0..185 (team 1): needs `7979 & 32` and `Q:B >= 1`; on its own cell the
 *    unit targets unit Q's cell, drops bit 5 and becomes type 69, otherwise
 *    it becomes type 87; `6161 = 3`, true.
 *  - 186..297: without bit 5, only a CALL TO ARMS unit standing on its
 *    target with `(f.c & 31) <= 1010` carries on; everyone else returns false.
 *  - 298..643 (on its own cell): CALL TO ARMS with bit 6 -- `3636 = 0`; a
 *    type-50 unit stops; if `a(6)` finds a store and `6565 == 9` it becomes
 *    type 50 (`6161 = 7777 = 3`, true), else bit 6 is dropped. Otherwise the
 *    target becomes f.q, bit 5 is dropped, and a unit not already there
 *    becomes type 69 with `6161 = 7777 = 3` (true).
 *  - 644..746 (off its cell): unless CALL TO ARMS, a unit with `2020 <= 30`
 *    whose record `4444` is a kind-4 building stays; then `1313 > 0` makes
 *    it type 87 with `6161 = 3` (true).
 */
export type LegacySubsystemBMInput = {
  readonly state: Int8Array;
  /** b.b:[[B (#129) -- gridC[y][x]. */
  readonly gridC: readonly Int8Array[];
  /** b.u:I (#222) / b.v:I (#225). */
  readonly team: number;
  readonly id: number;
  /** b.Q:B (#46). */
  readonly Q: number;
  /** f.N:Z (#37), f.c:I (#148), f.q:[B (#214). */
  readonly fN: boolean;
  readonly fC: number;
  readonly fQ: ArrayLike<number>;
  /** a(int,byte) (#275). */
  readonly onChangeType: (id: number, type: number) => void;
  /** final boolean a(int) (#288). */
  readonly onNearestBuilding: (kind: number) => boolean;
};

export function stepLegacySubsystemBM(input: LegacySubsystemBMInput): boolean {
  const { state, id: v } = input;
  const onOwnCell = (): boolean => (input.gridC[state[101 + v] ?? 0]?.[state[v] ?? 0] ?? 0) === v;

  if (input.team === 1) {
    if (((state[7979 + v] ?? 0) & 32) === 0 || input.Q < 1) return false;
    if (onOwnCell()) {
      state[3131 + v] = state[input.Q] ?? 0;
      state[3232 + v] = state[101 + input.Q] ?? 0;
      state[7979 + v] = (state[7979 + v] ?? 0) & 223;
      input.onChangeType(v, 69);
    } else {
      state[2828 + v] = 87;
    }
    state[6161 + v] = 3;
    return true;
  }

  if (((state[7979 + v] ?? 0) & 32) === 0) {
    if (!input.fN
      || (state[3131 + v] ?? 0) !== (state[v] ?? 0)
      || (state[3232 + v] ?? 0) !== (state[101 + v] ?? 0)
      || (input.fC & 31) > (state[1010 + v] ?? 0)) return false;
  }

  if (onOwnCell()) {
    if (input.fN && ((state[7979 + v] ?? 0) & 64) !== 0) {
      state[3636 + v] = 0;
      if ((state[2828 + v] ?? 0) === 50) return false;
      if (input.onNearestBuilding(6) && (state[6565 + v] ?? 0) === 9) {
        input.onChangeType(v, 50);
        state[6161 + v] = 3;
        state[7777 + v] = 3;
        return true;
      }
      state[7979 + v] = (state[7979 + v] ?? 0) & 191;
      return false;
    }
    state[3131 + v] = input.fQ[0] ?? 0;
    state[3232 + v] = input.fQ[1] ?? 0;
    state[7979 + v] = (state[7979 + v] ?? 0) & 223;
    if ((state[v] ?? 0) === (state[3131 + v] ?? 0) && (state[101 + v] ?? 0) === (state[3232 + v] ?? 0)) return false;
    input.onChangeType(v, 69);
    state[6161 + v] = 3;
    state[7777 + v] = 3;
    return true;
  }

  if (!input.fN && (state[2020 + v] ?? 0) <= 30 && (state[8749 + (state[4444 + v] ?? 0)] ?? 0) === 4) return false;
  if ((state[1313 + v] ?? 0) > 0) {
    state[2828 + v] = 87;
    state[6161 + v] = 3;
    return true;
  }
  return false;
}
