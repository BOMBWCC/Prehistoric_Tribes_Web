import { BLD_LEVEL, UNIT_DIRECTION, UNIT_FLAGS, UNIT_HELD_ITEM, UNIT_MELEE_SKILL, UNIT_MODE, UNIT_OFFSET_X, UNIT_OFFSET_Y, UNIT_RECORD, UNIT_SAVED_TYPE, UNIT_THOUGHT, UNIT_TYPE } from "../../core/DenseLayout";
export type LegacyEntityIUpdateInput = {
  readonly state: Int8Array;
  /** b.v:I (#225) -- the current entity index; `i(int)` never takes it as a parameter. */
  readonly entityId: number;
  /** The method's only real parameter (`iload_1`). */
  readonly argument: number;
  readonly readPacked: (row: number, index: number) => number;
  /**
   * b.B:I (#8), read at offset 278. Deliberately a FUNCTION, not a scalar:
   * the offset-198 `a(int,byte)` call (`onChangeType`) rewrites `B:I` as
   * its own side effect (see `b.a(int,byte)` offsets 52..95, already ported
   * as `changeLegacyEntityType`/`deriveLegacyEntityB`), so a value captured
   * before the call would be stale by the time offset 278 reads it.
   */
  readonly readBValue: () => number;
  /** f.q:B (#211). */
  readonly qValue: number;
  /** b.u:I (#222), "the current team". */
  readonly uValue: number;
  /**
   * The four cross-call scalars this method touches. `x` is READ-ONLY here
   * (its only producer is `f():Z`, see `onF`); `H` and `y` are written by
   * the eligible branch only; `p` is written by the offset-738 tail only.
   */
  readonly raw: { x: number; H: number; y: number; p: number };
  /**
   * private boolean f() (#381, bytecode/b-javap.txt line 13687, offsets
   * 0..872) -- 873 bytes with its own sizable sub-tree (`f.d(int)` etc.),
   * left unported. NOTE for callers: the method has exactly four `ireturn`s
   * (offsets 55/472/854 push `iconst_1`, offset 872 pushes `iconst_0`), so
   * its ONE AND ONLY `false` path runs offsets 855..871 first, which
   * unconditionally assigns `x:I = f.a(0xffffff,100)`. Any caller that
   * wires this as a stub returning `false` must therefore also freshly
   * randomize `raw.x` -- see LegacyRuntimeState.ts's own wiring.
   */
  readonly onF?: () => boolean;
  /**
   * private void M() (#249, line 27625, offsets 0..155). Small and fully
   * decoded, but deliberately NOT wired (session policy: downstream helpers
   * stay callbacks). Its body is
   * `a[3939+v]=a[2828+v]; a(v,83); R=b[shorts[169]+a[3939+v]];
   *  a[1313+v]=(byte)(b[shorts[168]+R] + f.a(0xffffff,
   *    b[shorts[168]+2+R]-b[shorts[168]+R]+1))`.
   * Confirmed NOT to affect this method's own control flow: its `a(v,83)`
   * changes `a[2828+v]` from 69 to 83, and both 69 and 83 fail the offset
   * 201..270 eligibility test identically.
   */
  readonly onM?: () => void;
  /**
   * private void a(int,byte) (#275) at offset 198, called with `(v, 85)`.
   * ALREADY PORTED as `changeLegacyEntityType` (`changeEntityType`) --
   * verified instruction-by-instruction against b-javap.txt line 5985.
   */
  readonly onChangeType?: (id: number, type: number) => void;
  /**
   * f.a(int,int):int (#269) at offset 348, called as `f.a(0xffffff, addend)`.
   * CONFIRMED (f-javap.txt line 34579) to be exactly
   * `random.nextInt() & mask % divisor` -- the same RNG helper already
   * exposed as `randomRemainder`, NOT a coordinate lookup (the previous
   * port's `onCoordinate` name was misleading).
   */
  readonly onRandomRemainder?: (mask: number, divisor: number) => number;
  /**
   * f.a(int,byte):byte (#277) at offset 509, called with `(v, 1)`, return
   * value discarded (`pop`). ALREADY PORTED as `writeLegacyEntityLinkByte`
   * (f-javap.txt line 30316) -- the xSlotTable slot writer.
   */
  readonly onLinkByte?: (id: number, value: number) => void;
  /**
   * private boolean b(int) (#345) at offset 409 -- line 14160, offsets
   * 0..~670, and `i(int)` offset 409 is its ONLY call site in the whole
   * class. Left unported; a `false` result (the unwired default) falls
   * through to the common tail exactly as the original does.
   */
  readonly onBInt?: (value: number) => boolean;
  /**
   * private void b(int,int,int) (#342) at offset 708, called with
   * `(v, 0, 1)`. b-javap.txt line 22380, offsets 0..234.
   */
  readonly onSubsystemB?: (first: number, second: number, third: number) => void;
  /** f.b(int):V (#343) at offset 735 -- already ported as `runSceneDispatch`. */
  readonly onFByte?: (value: number) => void;
};

/**
 * Direct translation of `private void i(int)` (bytecode/b-javap.txt line
 * 13281, javap offsets 0..770). Reached only through `y()`'s convergence
 * tail (`LegacyEntityFollowup.ts` step 5), plus `q()`/`m()`-side callers
 * not yet on a live path.
 *
 * NAMING TRAP: this is the ONE-ARG `i(int)`. The no-arg `final void i()`
 * (line 42463) is a completely unrelated method, already ported as
 * `stepLegacySubsystemI` in `LegacySubsystemTail.ts`.
 *
 * CORRECTED (2026-08-31). The pre-existing (unaudited) port of this method
 * had four real bugs, all found by hand-tracing every offset against a
 * fresh javap dump:
 *
 *  1. **The eligibility gate was inverted.** Offsets 201..283 are
 *     `if_icmple 273` (type<=9), `if_icmpeq 273` (type===93),
 *     `if_icmpeq 273` (type===92), `if_icmpne 407` (type!==106 leaves),
 *     then `if_icmpgt 407` (argument/10 > B leaves). So the eligible body
 *     needs `(type<=9 || type===93 || type===92 || type===106) &&
 *     argument/10 <= B`. The old port had it as
 *     `(type>9 && type!==93 && type!==92 && type!==106) || argument/10 <= B`
 *     -- the exact logical negation of the first clause OR-ed instead of
 *     AND-ed, i.e. it ran the eligible body in almost exactly the cases the
 *     original skips it, and vice versa.
 *  2. **`dense[2929+id]`'s value was a sum instead of a double lookup.**
 *     Offsets 354..403 compute `b[shorts[161] + b[shorts[163]+H] + y]` --
 *     one table read nested inside another. The old port wrote
 *     `table161(H) + table163(H) + H + y`, which is neither the same shape
 *     nor the same magnitude.
 *  3. **Two different methods were conflated into one callback.** The old
 *     `onAByte(value)` was fired both at offset 198 and at offset 509, but
 *     those are `b.a(int,byte):V` (#275, the entity TYPE CHANGE, already
 *     ported as `changeLegacyEntityType`) and `f.a(int,byte):B` (#277, the
 *     xSlotTable writer, already ported as `writeLegacyEntityLinkByte`) --
 *     unrelated methods in different classes that merely share a name and
 *     descriptor shape. They are now `onChangeType` and `onLinkByte`, and
 *     both are wired to their real, already-derived implementations.
 *  4. **A whole call was missing from the final block.** Offsets 701..735
 *     are TWO calls in sequence -- `b(v,0,1)` (#342) and only THEN
 *     `f.b(pHasFive?60:62)` (#343). The old port had only the second.
 *
 * Structure:
 *  - offset 0..7: `if (f()) return;` (`onF`).
 *  - offset 8..143: `type===69 && dense[202+id]===0 && dense[303+id]===0`
 *    -> `x<3` rotates `dense[606+id]`'s low 3 bits, else `x<5 &&
 *    argument===0 && !(dense[7979+id]&2)` calls `M()`.
 *  - offset 146..198: otherwise `type===84 && dense[3939+id]===69 && x<10`
 *    -> `a(id, 85)` (a real entity type change; note it also rewrites
 *    `B:I`, which is why `readBValue` is a function).
 *  - offset 201..283: the eligibility gate (bug 1 above).
 *  - offset 284..403: eligible body -- `H = dense[6565+id]`, `y =
 *    f.a(0xffffff, table18(H)!==0 ? 1 : 2+dense[1717+id])`, then
 *    `dense[2929+id] = table161(table163(H) + y)` (bug 2 above).
 *  - offset 407..415: not eligible -> `if (b(argument)) return;`.
 *  - offset 416..462: common tail -- `table38(H)!==0 && H!==105` ->
 *    `dense[606+id] = argument % 10`.
 *  - offset 463..542: `H in [94,97] && !(dense[7979+id]&16)` ->
 *    `f.a(id,1)` and set the 16 bit.
 *  - offset 543..619: `dense[2929+id]` in {39,104,105} ->
 *    `dense[3333+id] = 11 + (x&1)`.
 *  - offset 620..767: `H===57 && u===0 && f.q<7` and either `(p&5)===1` or
 *    (`(p&9)===1` and `dense[9115+dense[4444+id]]===2`) -> `b(id,0,1)`,
 *    `f.b((p&5)===1 ? 60 : 62)`, `f.p |= (p&5)===1 ? 4 : 8` (bug 4 above).
 *    `f.p` is deliberately re-read from `raw` at each of the three points
 *    the bytecode re-reads it (offsets 652/665, 719, 750), since the two
 *    calls in between are free to mutate it.
 *
 * Returns `true` when the original takes one of its two early `return`s
 * (offsets 7 and 415), `false` when it runs off the end at offset 770.
 */
export function stepLegacyEntityIUpdate(input: LegacyEntityIUpdateInput): boolean {
  const { state, entityId: id, argument, raw } = input;

  // offset 0..7
  if (input.onF?.() ?? false) return true;

  // offset 8..198
  if ((state[UNIT_TYPE + id] ?? 0) === 69 &&
    (state[UNIT_OFFSET_X + id] ?? 0) === 0 &&
    (state[UNIT_OFFSET_Y + id] ?? 0) === 0) {
    if (raw.x < 3) {
      // offset 66..106
      state[UNIT_DIRECTION + id] = ((state[UNIT_DIRECTION + id] ?? 0) + (raw.x % 3) + 7) & 7;
    } else if (raw.x < 5 && argument === 0 && ((state[UNIT_FLAGS + id] ?? 0) & 2) === 0) {
      // offset 109..143
      input.onM?.();
    }
  } else if ((state[UNIT_TYPE + id] ?? 0) === 84 &&
    (state[UNIT_SAVED_TYPE + id] ?? 0) === 69 && raw.x < 10) {
    // offset 146..198 -- b.a(int,byte), a real entity type change.
    input.onChangeType?.(id, 85);
  }

  // offset 201..283. `dense[2828+id]` is re-read here on purpose: the
  // offset-198 call above may have just changed it.
  const type = state[UNIT_TYPE + id] ?? 0;
  const eligible = (type <= 9 || type === 93 || type === 92 || type === 106) &&
    Math.trunc(argument / 10) <= input.readBValue();

  if (eligible) {
    // offset 284..403
    raw.H = state[UNIT_HELD_ITEM + id] ?? 0;
    const addend = input.readPacked(18, raw.H) !== 0 ? 1 : 2 + (state[UNIT_MELEE_SKILL + id] ?? 0);
    raw.y = input.onRandomRemainder?.(0xffffff, addend) ?? raw.y;
    state[UNIT_MODE + id] = input.readPacked(161, input.readPacked(163, raw.H) + raw.y);
  } else if (input.onBInt?.(argument) ?? false) {
    // offset 407..415
    return true;
  }

  // offset 416..462
  if (input.readPacked(38, raw.H) !== 0 && raw.H !== 105) {
    state[UNIT_DIRECTION + id] = argument % 10;
  }

  // offset 463..542
  if (raw.H >= 94 && raw.H <= 97 && ((state[UNIT_FLAGS + id] ?? 0) & 16) === 0) {
    input.onLinkByte?.(id, 1);
    state[UNIT_FLAGS + id] = (state[UNIT_FLAGS + id] ?? 0) | 16;
  }

  // offset 543..619
  const mode = state[UNIT_MODE + id] ?? 0;
  if (mode === 39 || mode === 104 || mode === 105) {
    state[UNIT_THOUGHT + id] = 11 + (raw.x & 1);
  }

  // offset 620..767
  if (raw.H === 57 && input.uValue === 0 && input.qValue < 7) {
    const gate = (raw.p & 5) === 1 ||
      ((raw.p & 9) === 1 && (state[BLD_LEVEL + (state[UNIT_RECORD + id] ?? 0)] ?? 0) === 2);
    if (gate) {
      input.onSubsystemB?.(id, 0, 1);
      input.onFByte?.((raw.p & 5) === 1 ? 60 : 62);
      raw.p = toByte(raw.p | ((raw.p & 5) === 1 ? 4 : 8));
    }
  }

  // offset 770
  return false;
}

function toByte(value: number): number {
  const narrowed = value & 0xff;
  return narrowed >= 0x80 ? narrowed - 0x100 : narrowed;
}
