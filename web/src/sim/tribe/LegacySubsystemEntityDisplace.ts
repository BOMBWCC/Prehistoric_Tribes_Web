import { deriveLegacyEntityStateCode } from "./LegacySubsystemEntityStateCode";
import { UNIT_DIRECTION, UNIT_HOME_X, UNIT_HOME_Y, UNIT_MODE, UNIT_TARGET_X, UNIT_TARGET_Y, UNIT_Y } from "../../core/DenseLayout";

/**
 * Direct translation of `private void a(byte)` (constant pool #285),
 * bytecode/b-javap.txt offsets 0..461 (line 17473). Its ONLY call site in
 * the whole class is `private boolean c()` offset 594
 * (`LegacySubsystemEntityPathStep.ts`'s `onDisplace`): when the next waypoint
 * is held by an entity in the mover's own team range, the two swap tiles.
 *
 * Previously dismissed as dead code together with c()'s offsets 180..818;
 * both were restored on 2026-09-10 (see that file's retraction note) and
 * this callee was the last piece left unported.
 *
 * Field identities, each checked by constant-pool index:
 *  - `u:B`(#223) -- the mover's id, saved from `v:I` at offset 6. All 15
 *    references in the class are inside this method, so it is a local
 *    (`mover` below). NOT `u:I`(#222), the team index.
 *  - `t:B`(#221) -- the swap temporary. All 4 references are here.
 *  - `v:I`(#225) -- switched to the occupant at offset 11 and restored at
 *    458. This port threads ids explicitly, so the two callees that run in
 *    between simply receive `occupant`.
 *  - `E:I`(#14) -- `scalars.bField14`. Set to 2 when #284 turns the swap
 *    down, 1 after a swap; c() (offsets 614, 794) and u() (135) read it.
 *  - `a:(BZ)Z`(#284) -- `stepLegacyEntityActionCommit`, `onActionCommit`.
 *  - `b:(I)B`(#340) -- `deriveLegacyEntityStateCode`, called directly.
 *  - `D:()V`(#240) -- `stepLegacySubsystemEntityMoveApply`, `onMoveApply`.
 *
 * Control flow:
 *
 *   u = (byte) v; v = arg;                                        // 0..11
 *   if (a((byte)(arg >= u ? -1 : 0), false)) { E = 2; v = u; return; }  // 14..33 -> 448
 *   e[808+arg] = 0;                                               // 36..46
 *   swap(e[0+arg], e[0+u]); swap(e[101+arg], e[101+u]);           // 47..142 (via t:B)
 *   if (e[6262+arg] == e[0+u] && e[6363+arg] == e[101+u]) {       // 143..189
 *     e[6262+arg] = e[0+arg];   e[6363+arg] = e[101+arg];         // 192..228
 *     e[3131+arg] = e[0+arg];   e[3232+arg] = e[101+arg];         // 229..265
 *   }
 *   gridC[e[101+u]][e[0+u]] = u;                                  // 266..298
 *   gridC[e[101+arg]][e[0+arg]] = arg;                            // 299..322
 *   e[606+arg] = (byte)((e[606+u] + 4) & 7);                      // 323..351 (reverse heading)
 *   e[1111+arg] = (byte)(e[1111+arg] & 240);                      // 352..368
 *   e[4848+arg] = 120; e[4848+u] = 120;                           // 369..395
 *   e[2929+arg] = b(arg);                                         // 396..410 (#340)
 *   D();                                                          // 411..414 (#240, v = arg)
 *   if (arg > u) e[1111+arg] = (byte)(e[1111+arg] & 240);         // 415..439 (if_icmple 440)
 *   E = 1;                                                        // 440..445
 *   v = u;                                                        // 453..461
 *
 * The 6262 test at 143..189 runs AFTER the swap, so `e[0+u]` there is the
 * occupant's OLD tile: it asks "was the occupant standing on its own
 * destination?", and if so moves that destination (and its target) along
 * with it.
 *
 * No exception table. A throw from gridC at 266..322 propagates through c()
 * and u() to `final void e()`'s blanket catch, which is what JS does too.
 */
export type LegacySubsystemEntityDisplaceInput = {
  readonly state: Int8Array;
  /** `v:I` at the call -- the entity that is stepping. Saved into `u:B`. */
  readonly id: number;
  readonly gridC: readonly Int8Array[];
  readonly scalars: { bField14: number };
  /** `private boolean a(byte, boolean)` (#284), run for the occupant. */
  readonly onActionCommit: (occupant: number, actionCode: number) => boolean;
  /** `private void D()` (#240), run for the occupant. */
  readonly onMoveApply: (occupant: number) => void;
};

function toByte(value: number): number {
  return (value << 24) >> 24;
}

export function stepLegacySubsystemEntityDisplace(input: LegacySubsystemEntityDisplaceInput, occupant: number): void {
  const { state, gridC, scalars } = input;
  const mover = toByte(input.id);

  if (input.onActionCommit(occupant, occupant >= mover ? -1 : 0)) {
    scalars.bField14 = 2;
    return;
  }

  state[808 + occupant] = 0;
  let t = state[occupant]!;
  state[occupant] = state[mover]!;
  state[mover] = t;
  t = state[UNIT_Y + occupant]!;
  state[UNIT_Y + occupant] = state[UNIT_Y + mover]!;
  state[UNIT_Y + mover] = t;

  if (state[UNIT_HOME_X + occupant] === state[mover] && state[UNIT_HOME_Y + occupant] === state[UNIT_Y + mover]) {
    state[UNIT_HOME_X + occupant] = state[occupant]!;
    state[UNIT_HOME_Y + occupant] = state[UNIT_Y + occupant]!;
    state[UNIT_TARGET_X + occupant] = state[occupant]!;
    state[UNIT_TARGET_Y + occupant] = state[UNIT_Y + occupant]!;
  }

  gridC[state[UNIT_Y + mover]!]![state[mover]!] = mover;
  gridC[state[UNIT_Y + occupant]!]![state[occupant]!] = occupant;

  state[UNIT_DIRECTION + occupant] = toByte(((state[UNIT_DIRECTION + mover] ?? 0) + 4) & 7);
  state[1111 + occupant] = toByte((state[1111 + occupant] ?? 0) & 240);
  state[4848 + occupant] = 120;
  state[4848 + mover] = 120;
  state[UNIT_MODE + occupant] = deriveLegacyEntityStateCode(state, occupant);
  input.onMoveApply(occupant);
  if (occupant > mover) state[1111 + occupant] = toByte((state[1111 + occupant] ?? 0) & 240);
  scalars.bField14 = 1;
}
