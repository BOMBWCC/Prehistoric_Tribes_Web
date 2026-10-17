import { UNIT_HELD_ITEM, UNIT_MELEE_SKILL, UNIT_MODE, UNIT_OFFSET_X, UNIT_OFFSET_Y, UNIT_RECORD, UNIT_SLOT, UNIT_TYPE } from "../../core/DenseLayout";
/**
 * Direct port of `private void c(int, int, int)` (bytecode/b-javap.txt,
 * `grep -n "private void c(int, int, int);"` -> line 34230, offsets 0..292).
 * `b.w()`'s own `onC` callback target (see `LegacyEntityWUpdate.ts`, whose
 * `onC?: (x, y, value) => void` calls this with its own computed `x`/`y`
 * and `jRows[6][mode]`).
 *
 * **CORRECTION (2026-09-07)**: the framing this file previously carried --
 * that `c()` itself reads `b.b:[S]`(#132) and crashes -- does not hold up
 * against the actual bytecode of `c()`. `c()`'s own 293 bytes (offsets
 * 0..292) never reference `b:[S]` at all. What actually happens: `c()`
 * computes 8 int arguments and makes exactly one call,
 * `invokespecial #298 // Method a:(IIIIIIII)Z` (offset 101), then branches
 * on its boolean result (`ifeq 292` -- false skips straight to `return`).
 * The `b:[S]`/saveOffsets read a previous agent attributed to "category
 * !==0 and !==2" lives *inside that callee*, `private boolean
 * a(int,int,int,int,int,int,int,int)` (#298, b-javap.txt lines
 * 34401..35269, offsets 0..1435 -- confirmed via direct read, its own
 * `iload 4`/`arg4` gate at offsets 22..40 matches the "category" shape
 * described here previously). That method is enormous (1436 bytes, bigger
 * than `af()`+`ag()`+`ah()`+`ai()` combined) and has not been examined
 * beyond its first ~180 bytes -- per this investigation's own scoping rule
 * ("any callee not already ported becomes an optional callback"), it is
 * *not* derived here. `c()` itself is now ported exactly as written, with
 * the call to `#298` left as `onGate`.
 *
 * `c()`'s real control flow:
 *
 *  1. Offsets 0..100: build the 8 args for `#298` --
 *     `(x, y, this.u, packedBytes[packedOffsets[79]+dense[2828+id]],
 *     dense[4444+id], value, packedBytes[packedOffsets[124]+dense[1717+id]]
 *     + packedBytes[packedOffsets[102]+dense[6565+id]], 0)`, where `x`/`y`/
 *     `value` are `c()`'s own 3 formal parameters (`iload_1`/`iload_2`/
 *     `iload_3`) and `id` is class b's shared "current entity" register
 *     (`v:I` #225, `game.bUnit` -- but see note below, this loop
 *     context guarantees `v === id`).
 *  2. Offset 101..106: `invokespecial #298`; `ifeq 292` -- if it returns
 *     false, `return` immediately (offset 292). Nothing below this point
 *     runs.
 *  3. Offset 107..126: `if ((dense[2929+id]&0xff) < 31) return;` (masked).
 *  4. Offset 129..146: `if (dense[6565+id] === 9) return;`
 *  5. Offset 147..292 (the "accept" tail, all keyed by `k:[B]`(#196),
 *     `game.subsystemKBytes` -- CORRECTED 2026-08-27, confirmed real, not
 *     `id`-scoped):
 *     - `if (k[0] !== 1) return;`
 *     - `slot = k[2]`
 *     - `if (dense[202+slot] !== 0) return;`
 *     - `if (dense[303+slot] !== 0) return;`
 *     - `marker = dense[2929+slot]` -- **UNMASKED** (offset 193..207 has no
 *       `iand`, unlike step 3's check -- CORRECTED here; the previous port
 *       applied `&0xff` to this read too, which is wrong per bytecode and
 *       changes behavior for negative byte values).
 *     - `if (marker >= 106 && marker <= 108) return;` (offsets 208..230:
 *       `if_icmplt 233` then `if_icmple 292` -- reject only the closed
 *       range `[106,108]`, accept otherwise).
 *     - `dense[2929+slot] = 42; dense[3030+slot] = 0;
 *       dense[4646+slot] = -(62 + (subsystemX & 1));`
 *
 * `v`/`id` identity: `LegacyRuntimeState.ts`'s own docblocks (offset-1787
 * and offset-4041 comments) already establish that class b's team-1..50
 * sweep (`b.e()`, this method's ultimate caller chain) reuses `v:I`(#225)
 * as its literal loop variable -- i.e. `v === id` for every entity
 * processed by this call chain, so reading `dense[...+id]` here is
 * faithful, not a shortcut.
 *
 * **Wiring bug found and fixed alongside this correction**: `onC` at
 * `LegacyRuntimeState.ts` (`stepEntityWUpdate`'s `onW`) was previously
 * `onC: () => stepLegacyEntityCWatch({...})` -- a zero-arg arrow that
 * silently discarded the `(x, y, value)` `LegacyEntityWUpdate.ts` passes
 * it. Fixed to thread them through.
 */
export type LegacyEntityCWatchInput = {
  readonly dense: Int8Array;
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
  readonly id: number;
  readonly x: number;
  readonly y: number;
  readonly value: number;
  /** b.u:I (#222), game.bTeam. */
  readonly u: number;
  /** b.k:[B] (#196), game.subsystemKBytes -- CORRECTED 2026-08-27, confirmed real. */
  readonly kBytes: Int8Array;
  /** b.x:I (#230), game.subsystemX. */
  readonly subsystemX: number;
  /**
   * private boolean a(int,int,int,int,int,int,int,int) (#298,
   * b-javap.txt offsets 0..1435 / lines 34401..35269) -- NOT derived here,
   * see docblock above. Undefined/omitted behaves as "returns false"
   * (the conservative, honestly-unmodeled default), matching this
   * project's convention for un-ported callees.
   */
  readonly onGate?: (
    arg1: number,
    arg2: number,
    arg3: number,
    arg4: number,
    arg5: number,
    arg6: number,
    arg7: number,
    arg8: number,
  ) => boolean;
};

export function stepLegacyEntityCWatch(input: LegacyEntityCWatchInput): void {
  const { dense, packedBytes, packedOffsets, id, kBytes } = input;

  const gateArg4 = packedBytes[(packedOffsets[79] ?? 0) + (dense[UNIT_TYPE + id] ?? 0)] ?? 0;
  const gateArg5 = dense[UNIT_RECORD + id] ?? 0;
  const gateArg7 =
    (packedBytes[(packedOffsets[124] ?? 0) + (dense[UNIT_MELEE_SKILL + id] ?? 0)] ?? 0) +
    (packedBytes[(packedOffsets[102] ?? 0) + (dense[UNIT_HELD_ITEM + id] ?? 0)] ?? 0);

  const accepted =
    input.onGate?.(input.x, input.y, input.u, gateArg4, gateArg5, input.value, gateArg7, 0) ?? false;
  if (!accepted) return;

  if (((dense[UNIT_MODE + id] ?? 0) & 0xff) < 31) return;
  if ((dense[UNIT_HELD_ITEM + id] ?? 0) === 9) return;

  if ((kBytes[0] ?? 0) !== 1) return;
  const slot = kBytes[2] ?? 0;
  if ((dense[UNIT_OFFSET_X + slot] ?? 0) !== 0) return;
  if ((dense[UNIT_OFFSET_Y + slot] ?? 0) !== 0) return;
  const marker = dense[UNIT_MODE + slot] ?? 0;
  if (marker >= 106 && marker <= 108) return;

  dense[UNIT_MODE + slot] = 42;
  dense[3030 + slot] = 0;
  dense[UNIT_SLOT + slot] = -(62 + (input.subsystemX & 1));
}
