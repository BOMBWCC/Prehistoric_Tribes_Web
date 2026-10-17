import { BLD_HP, BLD_KIND, BLD_PLANNED_KIND, BLD_WORK, BLD_WORKERS, BLD_X, BLD_Y, UNIT_AGE, UNIT_GENDER, UNIT_HAPPINESS, UNIT_HP, UNIT_TYPE } from "../../core/DenseLayout";
/**
 * `private boolean a(boolean)` (#295), bytecode/b-javap.txt line 30162,
 * offsets 0..765: a villager pairs with a partner and they head for a free hut.
 * n()Z calls it with `false` for team 0; K() (type 96) with `true`.
 *
 *  - 0..56, `!flag`: needs `a[u][18] < 0`, `rand(10) >= 4` and `505 >= 75`.
 *  - 57..311: partner `ad` -- the `rand(a[u][11]/2 + 1)`-th unit of team u,
 *    wrapping around once, that is happy (505 >= 75, or any with `flag`,
 *    skipping R:I then), of the other gender, alive, adult, below type 109
 *    and not already paired (8282 & 127 == 0).
 *  - 312..764: for the first free pair slot `x` (c[4][x] == 0), hut `ae` --
 *    the `rand(a[u][14]/2 + 1)`-th team record that is a live, unbuilt,
 *    unreserved (9237 == 0) hut with at most one worker, again wrapping once.
 *    Found: a[u][18] = 0; c[0..5][x] = v, ad, hut door x+1, y+2, 1, ae;
 *    8282 += (x+1)<<1 for v and ((x+1)<<1)+1 for ad; 9237[ae] = 1;
 *    a(v, 110 - 1515[v]); N(); true.
 *
 * `ad:I` (#104) is only used here, so it is a local; `ae:I` (#105) and
 * `x:I` (#230) are read later by other methods, so they are written through.
 */
export type LegacyEntityCourtshipInput = {
  readonly state: Int8Array;
  /** b.a:[[S (#63). */
  readonly pool: readonly Int16Array[];
  /** b.c:[[B (#143), 6 x 10. */
  readonly cRows: readonly Int8Array[];
  /** b.v:I (#225). */
  readonly v: number;
  /** b.u:I (#222). */
  readonly team: number;
  /** b.R:I (#49). */
  readonly R: number;
  /** ae:I (#105) and x:I (#230). */
  readonly scratch: { ae: number; x: number };
  /** f.a(int,int) (#269). */
  readonly randomRemainder: (mask: number, divisor: number) => number;
  /** a(int,byte) (#275). */
  readonly onChangeType: (id: number, type: number) => void;
  /** N() (#250). */
  readonly onN: () => void;
};

function toByte(value: number): number {
  return (value << 24) >> 24;
}

export function stepLegacyEntityCourtship(input: LegacyEntityCourtshipInput, flag: boolean): boolean {
  const { state, v, team: u, scratch: s } = input;
  const pool = input.pool[u]!;

  if (!flag) {
    if ((pool[18] ?? 0) >= 0) return false;
    if (input.randomRemainder(65535, 10) < 4) return false;
    if ((state[UNIT_HAPPINESS + v] ?? 0) < 75) return false;
  }

  let wanted = input.randomRemainder(65535, Math.trunc((pool[11] ?? 0) / 2) + 1);
  let ad = u * 50 + 1;
  let count = 0;
  for (;;) {
    if (((state[UNIT_HAPPINESS + ad] ?? 0) >= 75 || flag) && !(flag && ad === input.R) &&
        (state[UNIT_GENDER + v] ?? 0) !== (state[UNIT_GENDER + ad] ?? 0) &&
        (state[UNIT_HP + ad] ?? 0) > 0 &&
        (state[UNIT_AGE + ad] ?? 0) >= 12 &&
        (state[UNIT_TYPE + ad] ?? 0) < 109 &&
        ((state[8282 + ad] ?? 0) & 127) === 0) {
      count += 1;
      if (count > wanted) break;
    }
    if (ad > (u + 1) * 50) {
      if (count === 0) break;
      ad = u * 50;
    }
    ad += 1;
  }
  if (ad > (u + 1) * 50) return false;

  const c = input.cRows;
  for (s.x = 0; s.x < 10; s.x += 1) {
    if ((c[4]![s.x] ?? 0) !== 0) continue;
    wanted = input.randomRemainder(65535, Math.trunc((pool[14] ?? 0) / 2) + 1);
    s.ae = u * 30 + 1;
    count = 0;
    for (;;) {
      const ae = s.ae;
      if ((state[BLD_HP + ae] ?? 0) >= 0 && (state[BLD_KIND + ae] ?? 0) === 2 && (state[BLD_WORK + ae] ?? 0) === 0 &&
          (state[BLD_PLANNED_KIND + ae] ?? 0) === 0 && (state[BLD_WORKERS + ae] ?? 0) <= 1) {
        count += 1;
        if (count > wanted) break;
      }
      if (s.ae > (u + 1) * 30) {
        if (count === 0) return false;
        s.ae = u * 30;
      }
      s.ae += 1;
    }

    const x = s.x;
    const ae = s.ae;
    pool[18] = 0;
    c[4]![x] = 1;
    c[0]![x] = toByte(v);
    c[1]![x] = toByte(ad);
    state[8282 + v] = toByte((state[8282 + v] ?? 0) + ((x + 1) << 1));
    state[8282 + ad] = toByte((state[8282 + ad] ?? 0) + ((x + 1) << 1) + 1);
    c[5]![x] = toByte(ae);
    state[BLD_PLANNED_KIND + ae] = 1;
    c[2]![x] = toByte((state[BLD_X + ae] ?? 0) + 1);
    c[3]![x] = toByte((state[BLD_Y + ae] ?? 0) + 2);
    input.onChangeType(v, 110 - (state[UNIT_GENDER + v] ?? 0));
    input.onN();
    return true;
  }
  return false;
}
