import { ANIMAL_HP } from "../../core/DenseLayout";
export type LegacySubsystemHState = {
  u: number;
  v: number;
  w: number;
};

export type LegacySubsystemHInput = {
  readonly state: Int8Array;
  readonly bBytes: Int8Array;
  readonly bShorts: Int16Array;
  readonly frame: number;
  readonly q: number;
  readonly fT: Int8Array;
  readonly raw: LegacySubsystemHState;
  readonly randomRemainder: (mask: number, divisor: number) => number;
  /** final boolean a(int,int,int,int) (#270, checkLegacySpiralPlacementGate) -- mode=1, scanLimit=10, originX=x, originY=y. Return value discarded (matches every other known caller); this method's own exception table (offset 0..658) swallows any throw, reproduced by wrapping this call. */
  readonly onFootprint?: (mode: number, scanLimit: number, x: number, y: number) => void;
  /** f.b(int,int,int,int) (allocateLegacySubsystemRecord) -- first=w (raw.w), x=state[3131], y=state[3232], counterIndex=raw.u. */
  readonly onSubsystemRecord?: (first: number, x: number, y: number, counterIndex: number) => void;
  readonly onTailMaintenance?: (index: number) => void;
};

/**
 * Direct raw control flow of final b.h(); opaque callees remain callbacks.
 *
 * CORRECTION (2026-08-24): removed two speculative callbacks with no real
 * bytecode basis -- `onResetAuxiliary` (never referenced anywhere in this
 * function's own body) and `onResetScriptByte` (the real bytecode's
 * "reset" at this point is a plain `f.t[0] = 0` array store, already
 * modeled directly as `input.fT[0] = 0` right below where the callback
 * used to fire -- no separate method call exists there). Same pattern as
 * `LegacyFrameCommandDraw.ts`'s removed `onNumericText`.
 */
export function stepLegacySubsystemH(input: LegacySubsystemHInput): void {
  stepSpawn(input);

  // Offsets 604..658, the animal maintenance loop. BUG FIX (2026-09-22): this
  // used to sit behind the spawn gates above, because the port turned them
  // into `return`s. Every one of them is a `goto 604` in the real bytecode
  // (offsets 21, 58, 82 and 175), and 604 is this loop -- so af()/ah() run on
  // EVERY frame and only the spawn half is throttled. With the old shape the
  // loop only ran on the one frame in `t204[q] * 40` that could spawn, so
  // animals updated a few times per thousand ticks and never moved.
  for (let index = 0; index < 22; index += 1) {
    if (input.state[ANIMAL_HP + index] > 0) input.onTailMaintenance?.(index);
  }
}

/** Offsets 0..603 -- the throttled spawn half; every early exit is `goto 604`. */
function stepSpawn(input: LegacySubsystemHInput): void {
  const { state, bBytes, bShorts, raw } = input;
  const bByte = (shortIndex: number, add: number): number => {
    const index = (bShorts[shortIndex] ?? 0) + add;
    return bBytes[index] ?? 0;
  };

  const scheduleCount = bByte(202, input.q);
  if (scheduleCount <= 0) return;
  const period = bByte(204, input.q) * 40;
  if (period === 0 || input.frame % period !== 10) return;
  if (input.q === 4 && input.frame <= 5000) return;

  raw.u = input.randomRemainder(0xffffff, scheduleCount);
  // Offsets 85..150: `if (f.t[u] >= t205[q])` -- the drawn kind is already at its cap, so take the
  // first kind below it. BUG FIX (2026-10-09, oracle run 3 frame 6323): compared t205[q] with u.
  if (input.fT[raw.u] >= bByte(205, input.q)) {
    raw.u = 0;
    while (raw.u < scheduleCount && input.fT[raw.u] >= bByte(205, input.q)) raw.u += 1;
    if (raw.u >= scheduleCount) return;
  }

  raw.v = input.randomRemainder(0xffffff, 100);
  raw.w = 0;
  // BUG FIX (2026-09-22): the real index is
  // `a_s[185] + (b[a_s[201] + f.q] + u) * 3 + w` (offsets 299..345). The port
  // had `b[a_s[185]] + b[a_s[201] + q] + u * 3 + w`, i.e. it used the VALUE at
  // row 185 as if it were the row's base address, and multiplied `u` alone
  // instead of `t201[q] + u`. t185 holds cumulative percentages in groups of
  // three ending in 100, so with `v` a random 0..99 the loop must always break
  // with `w` in 0..2 -- the animal's kind. The wrong index let it run off the
  // end and leave `w === 3`, one past the three-entry kind tables, so every
  // spawned animal got its hit points from `t180[3]` (which is `t181[0]`, 5)
  // instead of 30/50/20, and its animation base from `t184[3]` likewise.
  while (raw.w < 3) {
    const threshold = (bShorts[185] ?? 0) + (bByte(201, input.q) + raw.u) * 3 + raw.w;
    if (raw.v < (bBytes[threshold] ?? 0)) break;
    raw.w += 1;
  }

  raw.v = 0;
  const typeBase = bByte(201, input.q) + raw.u;
  const x = bByte(199, typeBase);
  const y = bByte(200, typeBase);
  input.onFootprint?.(1, 10, x, y);
  // CORRECTION (2026-08-24): was `bBytes[3131]`/`bBytes[3232]` (the packed
  // resource table) and omitted `raw.w` entirely -- confirmed via direct
  // bytecode read the real call is `f.b(w, state[3131], state[3232], u)`,
  // i.e. `state` (dense entity array), not `bBytes`, and `w` (raw.w) is
  // the real first argument.
  input.onSubsystemRecord?.(raw.w, state[3131] ?? 0, state[3232] ?? 0, raw.u);

  if (input.q === 4 && input.fT[0] > 1 && input.randomRemainder(0xffffff, 10) < input.fT[0]) {
    for (let index = 0; index < 22; index += 1) {
      if (state[9469 + index] === 0) state[9469 + index] = 2;
    }
    input.fT[0] = 0;
  }
}
