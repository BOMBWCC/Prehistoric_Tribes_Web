import { ANIMAL_HIT_BY, ANIMAL_TARGET, BLD_X, BLD_Y, UNIT_AGE, UNIT_FLAGS, UNIT_HP, UNIT_ORDER, UNIT_TYPE, UNIT_WORK_TARGET, UNIT_Y } from "../../core/DenseLayout";
import { T_BUILDING } from "../../core/DataTables";
/**
 * `private boolean a(int,int,int,int,int,int,int,int)` (#298),
 * bytecode/b-javap.txt line 34401, offsets 0..1435 -- the method this
 * project has carried as "the ~1436-byte entity-sprite-registration gate,
 * never examined past its first ~180 bytes". It is not a registration
 * gate: **it is where a blow actually lands.** Its three callers are
 * `c(int,int,int)` (`LegacyEntityCWatch.ts`, which builds the damage
 * argument as `t124[1717[v]] + t102[6565[v]]`), `S()` and `af()`.
 *
 * Wiring it is what ends a fight. Until 2026-09-22 `LegacyEntityCWatch`
 * left it as an omitted `onGate` callback treated as `false`, so no hit
 * ever resolved: nobody's hit points moved, nobody died, and a unit that
 * `H()` had sent at a rival chased it forever. Because `q()` keeps such a
 * unit pointed at `dense[4444]` -- and for types 0/1/5/6 `t26` selects the
 * **entity** hit-point row (1919), so `4444` legitimately holds an entity
 * id there -- the release only happens via `r()` once the target's hit
 * points reach 0. No death meant no release, and `b()`'s pre-action gate
 * (`!reached && 4444 !== -1 -> return`, and `reached` is unreachable for
 * type 1 since `t31[1] = 19`) then locked the whole needs system out.
 *
 * Parameters, as `c(int,int,int)` passes them: `(x, y, team, t79[type],
 * 4444[v], value, damage, 0)`.
 *
 *  - 0..19: `ax:I = t78[14 + p4]` -- picks the coordinate row pair.
 *  - 22..109: `ay:I`, the distance score. `p4 === 0` -> 10, `p4 === 2` -> 0,
 *    otherwise the same 25x25 table centred on 12 that the marker scan
 *    uses: `t53[(12 + rowY - p2) * 25 + 12 + rowX - p1] / 10`.
 *  - 112..165: within `p8` (and nonzero), the blow is relocated onto the
 *    target's own cell.
 *  - 166..173: `c(p1, p2, p3 & 1, 1)` classifies that cell into `k[0..3]`.
 *    Note `arg4 === 1`, so unlike `a(int,int,boolean)`'s call this one
 *    really does read `gridC[p2][p1]`.
 *  - 176..275: three refusals -- `f.ag:Z` with a team-0 unit under `k[0] 1`,
 *    a `t78` row of 127, and a target already at or below 0.
 *  - 276..311: below `p3 2`, a same-team (`k[3] === 0`) unit or record is
 *    never hit.
 *  - 312..456: `p3 === 0` and within 4 cells of the chief (`a[0][17]`)
 *    multiplies the damage by 3/2.
 *  - 458..673: a record target wakes up (`9054 |= 128`), re-scans from its
 *    own centre with the team bit flipped, `f.a(record, true)` re-filters
 *    its workers, and the damage halves.
 *  - 674..720: a target carrying `7979 & 8` halves it again.
 *  - 721..738: `p7 /= ay + 1`; under 1 the blow misses.
 *  - 739..920: **retaliation** -- a live adult entity target that is not
 *    busy and not type 59/87/50 gets `6161 = 4` and `4747 = v`, i.e. it
 *    turns on its attacker. This is the boar that fights back.
 *  - 921..980: `c.f[k[2] (+101 for k[0] 5)] -= p7`, the hit-point mirror.
 *  - 981..1036: an animal (`k[0] === 5`) outside mission 2 records who hit
 *    it in `9447`.
 *  - 1037..1078: **the hit**: `dense[saveOffsets[t78[k[0]]] + k[2]] -= p7`.
 *  - 1079..1150: at or below 0 the target is vacated (`a(t78[k[0]], p1, p2,
 *    k[2])`, #283) and the method returns false.
 *  - 1151..1262: the hit sprite -- `f.a(k[2], t178[k[0]], p6, clamp(52 +
 *    p7/4*3 + rand(255,3), 52, 61))` (#301), with `p6` recomputed as a
 *    packed offset from the record's origin for a record target.
 *  - 1263..1433: a team-0 entity that was hit raises the alarm -- a child
 *    alerts the chief (`a(16, chief, k[2])`), otherwise the first hit of
 *    the game queues `f.a(7, x, y, 0)`, and in mission 2 a non-2/7 type
 *    gets `a(5, k[2], k[2])` with `z:B`/`A:B` set to the blow's cell.
 *  - 1434: true.
 */
export type LegacyEntityStrikeGateScratch = {
  /** b.ax:I (#126). */
  ax: number;
  /** b.ay:I (#127). */
  ay: number;
  /** b.D:B (#13) -- read back by a(byte,byte,byte) (#291). */
  D: number;
  /** b.z:B (#235) / b.A:B (#6). */
  z: number;
  A: number;
  /** b.u:I (#222) -- XORed with 1 around the #291 rescan, so it is live. */
  team: number;
};

export type LegacyEntityStrikeGateInput = {
  readonly state: Int8Array;
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
  /** b.b:[S (#132). */
  readonly saveOffsets: Int16Array;
  /** b.k:[B (#196) -- filled by the c(IIII) call at offset 173. */
  readonly k: Int8Array;
  /** b.v:I (#225). */
  readonly v: number;
  /** b.a:[[S (#63) row 0 index 17 -- the chief. */
  readonly chief: number;
  /** b.d:[S (#152). */
  readonly dShort: Int16Array;
  /** c.f:[B (#171) -- the hit-point mirror. */
  readonly cHitPoints: Int8Array;
  /** f.ag:Z (#108). */
  readonly agFlag: boolean;
  readonly scratch: LegacyEntityStrikeGateScratch;
  /** private void c(int,int,int,int) (#355) -- fills k[0..3]. */
  readonly onClassifyCell: (x: number, y: number, arg3: number, arg4: number) => void;
  /** private void a(byte,byte,byte) (#291) -- clamp bounds, aj = u, rescan. */
  readonly onMarkerRescan: (x: number, y: number, range: number) => void;
  /** f.a(int,boolean) (#286) -- filterEntityLifecycle. */
  readonly onFilterWorkers: (record: number, flag: boolean) => void;
  /** private void a(int,int,int,byte) (#283) -- the shared vacate helper. */
  readonly onVacate: (kind: number, x: number, y: number, target: number) => void;
  /** f.a(int,int,int,int) (#301) -- the hit sprite; NOT ported. */
  readonly onHitSprite?: (target: number, kind: number, offset: number, frame: number) => void;
  /** final void a(byte,int,int) (#274) -- triggerLegacyEntityMove. */
  readonly onMoveTrigger: (action: number, id: number, id2: number) => void;
  /** f.a(byte,byte,byte,byte) (#290) -- runByteActionQueue. */
  readonly onByteAction: (type: number, x: number, y: number, value: number) => void;
  /** f.a(int,int) (#269) -- the shared random. */
  readonly random: (mask: number, divisor: number) => number;
  /** Not in the original: told of every blow that lands (kind k[0], target k[2], cell), for the
   *  web alerts (phase 3). Only observes. */
  readonly onHitLanded?: (kind: number, target: number, x: number, y: number) => void;
};

function toByte(value: number): number {
  return (value << 24) >> 24;
}

/** static int b(int,int,int) (#334) -- clamp. */
function clamp(value: number, low: number, high: number): number {
  return value < low ? low : value > high ? high : value;
}

export function stepLegacyEntityStrikeGate(
  input: LegacyEntityStrikeGateInput,
  p1: number,
  p2: number,
  p3: number,
  p4: number,
  p5: number,
  p6: number,
  p7: number,
  p8: number,
): boolean {
  const { state, packedBytes, packedOffsets, saveOffsets, k, v, scratch } = input;
  const table = (row: number, index: number) => packedBytes[(packedOffsets[row] ?? 0) + index] ?? 0;
  const row = (index: number) => saveOffsets[index] ?? 0;

  // Offsets 0..19.
  scratch.ax = table(78, 14 + p4);
  const ax = scratch.ax;

  // Offsets 22..109.
  if (p4 === 0) {
    scratch.ay = 10;
  } else if (p4 === 2) {
    scratch.ay = 0;
  } else {
    const rowX = state[row(ax) + p5] ?? 0;
    const rowY = state[row(ax + 1) + p5] ?? 0;
    scratch.ay = Math.trunc(table(53, (12 + rowY - p2) * 25 + 12 + rowX - p1) / 10);
  }
  const ay = scratch.ay;

  // Offsets 112..165.
  if (ay <= p8 && ay > 0) {
    p1 = state[row(ax) + p5] ?? 0;
    p2 = state[row(ax + 1) + p5] ?? 0;
  }

  // Offsets 166..173 -- note arg4 is 1 here, so gridC[p2][p1] really is read.
  input.onClassifyCell(p1, p2, p3 & 1, 1);

  const k0 = () => k[0] ?? 0;
  const k1 = () => k[1] ?? 0;
  const k2 = () => k[2] ?? 0;
  const k3 = () => k[3] ?? 0;

  // Offsets 176..208.
  if (input.agFlag && k0() === 1 && k2() <= 50) return false;

  // Offsets 209..234.
  const targetRow = table(78, k0());
  if (targetRow === 127) return false;

  // Offsets 235..275.
  if ((state[row(targetRow) + k2()] ?? 0) <= 0) return false;

  // Offsets 276..311.
  if (p3 < 2 && k3() === 0 && (k0() === 1 || k0() === 2)) return false;

  // Offsets 312..456.
  if (p3 === 0) {
    const dx = (state[v] ?? 0) - (state[input.chief] ?? 0);
    const dy = (state[UNIT_Y + v] ?? 0) - (state[UNIT_Y + input.chief] ?? 0);
    if (dx >= -4 && dx <= 4 && dy >= -4 && dy <= 4) p7 = Math.trunc((p7 * 3) / 2);
  }

  // Offsets 458..673.
  if (k0() === 2) {
    if (((state[9054 + k2()] ?? 0) & 128) === 0) {
      scratch.D = toByte(v + (p3 === 2 ? 101 : 0));
      scratch.team ^= 1;
      input.onMarkerRescan(
        toByte((state[BLD_X + k2()] ?? 0) + Math.trunc(table(T_BUILDING, 104 + k1()) / 2)),
        toByte((state[BLD_Y + k2()] ?? 0) + Math.trunc(table(T_BUILDING, 130 + k1()) / 2)),
        8,
      );
      scratch.team ^= 1;
    }
    state[9054 + k2()] = toByte((state[9054 + k2()] ?? 0) | 128);
    input.onFilterWorkers(k2(), true);
    p7 = Math.trunc(p7 / (p7 > 1 ? 2 : 1));
  }

  // Offsets 674..720.
  if (k0() === 1 && ((state[UNIT_FLAGS + k2()] ?? 0) & 8) !== 0) {
    p7 = Math.trunc(p7 / (p7 > 1 ? 2 : 1));
  }

  // Offsets 721..738.
  p7 = Math.trunc(p7 / (ay + 1));
  if (p7 < 1) return false;

  // Offsets 739..920: the target turns on its attacker.
  if (k0() === 1) {
    const targetType = state[UNIT_TYPE + k2()] ?? 0;
    if (
      (state[UNIT_HP + k2()] ?? 0) > 0 &&
      (state[UNIT_AGE + k2()] ?? 0) >= 12 &&
      (state[UNIT_ORDER + k2()] ?? 0) === 0 &&
      targetType > 9 && targetType !== 59 && targetType !== 87 && targetType !== 50
    ) {
      state[UNIT_ORDER + k2()] = 4;
      state[UNIT_WORK_TARGET + k2()] = toByte(v);
    }
  }

  // Offsets 921..980.
  if (k0() === 1 || k0() === 5) {
    const index = k2() + (k0() === 5 ? 101 : 0);
    input.cHitPoints[index] = toByte((input.cHitPoints[index] ?? 0) - p7);
  }

  // Offsets 981..1036.
  if (k0() === 5 && p3 !== 2 && (state[ANIMAL_TARGET + k2()] ?? 0) <= 0) {
    state[ANIMAL_HIT_BY + k2()] = toByte(19 + v);
  }

  // Offsets 1037..1078: the hit.
  const hitIndex = row(targetRow) + k2();
  state[hitIndex] = toByte((state[hitIndex] ?? 0) - p7);
  input.onHitLanded?.(k0(), k2(), p1, p2);

  // Offsets 1079..1150.
  if ((state[hitIndex] ?? 0) <= 0) {
    input.onVacate(targetRow, p1, p2, toByte(k2()));
    return false;
  }

  // Offsets 1151..1199.
  if (k0() === 2) {
    p6 = (p1 - (state[BLD_X + k2()] ?? 0)) + (((p2 - (state[BLD_Y + k2()] ?? 0)) << 4));
  }

  // Offsets 1200..1262.
  input.onHitSprite?.(
    k2(),
    table(178, k0()),
    p6,
    clamp(52 + Math.trunc(p7 / 4) * 3 + input.random(255, 3), 52, 61),
  );

  // Offsets 1263..1433.
  if (k0() === 1 && k2() <= 50) {
    if ((state[UNIT_AGE + k2()] ?? 0) < 12) {
      input.onMoveTrigger(16, input.chief, k2());
    } else if ((input.dShort[0] ?? 0) < 0) {
      input.dShort[0] = 0;
      input.onByteAction(7, toByte(p1), toByte(p2), 0);
    } else if (p3 === 2 && (state[UNIT_TYPE + k2()] ?? 0) !== 2 && (state[UNIT_TYPE + k2()] ?? 0) !== 7) {
      scratch.z = toByte(p1);
      scratch.A = toByte(p2);
      input.onMoveTrigger(5, k2(), k2());
    }
  }

  return true;
}
