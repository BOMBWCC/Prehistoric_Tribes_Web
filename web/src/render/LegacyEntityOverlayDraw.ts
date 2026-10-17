import type { Graphics } from "../platform/Graphics";
import { UNIT_FLAGS, UNIT_HP, UNIT_MAX_HP, UNIT_MELEE_SKILL, UNIT_RANGED_SKILL, UNIT_RECORD, UNIT_SCOUT_SKILL, UNIT_SELECTION, UNIT_SLOT, UNIT_THOUGHT, UNIT_TIMER, UNIT_TYPE } from "../core/DenseLayout";

/**
 * Raw port of `private void q()`, bytecode/f-javap.txt offsets 0..1590
 * (lines 6034..6923). Called from `private void a(int,int,int,int,byte)`
 * (#443, `LegacyEntityAction.ts`'s `stepLegacyEntityAction`, exposed there
 * as the `onQ` callback) right after `p()`, gated on `v:B !== 0`.
 *
 * **Finding worth flagging**: the caller only checks `v:B !== 0` before
 * invoking this method, but `q()`'s OWN first guard re-checks `v:B === 1`
 * specifically (offset 21..26) -- so if `v` is ever some other nonzero
 * value, the caller still calls in, and this method immediately returns.
 * Not a bug in either port; just two different conditions on the same
 * field, confirmed against the same constant-pool index (#376) at both
 * sites.
 *
 * **Zero `putfield`s**: this method performs no writes at all (confirmed
 * by scanning every instruction between offsets 0 and 1590) -- every field
 * below is read-only from this method's point of view, and `local1`/
 * `local2` are pure locals. Unlike `LegacySpriteLayerLoop.ts`'s `p()`
 * sibling, there is no persistent output state to carry between calls.
 *
 * **No exception table** (confirmed -- no `Exception table` section
 * appears between this method's `return` at offset 1590 and the next
 * method header), unlike its caller, whose own try/catch-all (offsets
 * 0..445 of `a(IIIIB)`) DOES wrap both the `onP`/`onQ` calls. Two Java
 * `idiv`s here (offsets 1412 and 1509) divide by a variable
 * (`dense[6767+aq]`), which throws `ArithmeticException` on zero in the
 * original -- reproduced here via a small `idiv()` helper that throws,
 * relying on the caller's already-ported try/catch to swallow it exactly
 * as the original does. (The other two `idiv`s, offsets 936 and 1018,
 * divide by the compile-time constants 3 and 20 and can never throw; the
 * one `irem`, offset 407, divides by the constant 15 and also can't.)
 *
 * Shape, region by region:
 *  - offsets 0..26: guard -- return unless `!s && ao>=0 && ap>=0 && v===1`.
 *  - offsets 29..92: unconditional `c.a(int,int,int)` (#445) call --
 *    `this.a` (field `a:Lc;` #143, a companion `c` instance, already known
 *    from `LegacyRuntimeState.ts`'s `f.a:Lc;` docblock as the same object
 *    `c.a(int)` (#459) is called on elsewhere) with args
 *    `(Y===29 ? aq : 101+aq, ar+j[12][ao]+4, as+j[13][ao])`. `c`'s own
 *    `a(int,int,int)` (bytecode/c-javap.txt lines 1518..1786) is NOT
 *    ported here -- exposed as `onCScanDraw`. (A concurrent effort is
 *    porting it separately as `LegacyCScanDraw.ts`; this file does not
 *    import or reference that.)
 *  - offsets 95..109: second, independent gate -- return unless `Y===29`,
 *    then return unless `at>=0`. (The `Y===29` ternary at offset 33..49
 *    above is only used to pick the `c.a()` arg1 value; this is a wholly
 *    separate use of the same field.)
 *  - offsets 112..230: `for (local1=0; local1<30; local1++)`, scanning
 *    `xSlotTable[0][2][local1]===aq && xSlotTable[0][1][local1]!==3`; on
 *    the first match fires one `d(IIII)` call (record
 *    `65 + (1-xSlotTable[0][4][local1])*5 + xSlotTable[0][1][local1]`,
 *    `ar+j[12][ap]`, `as+j[13][ap]`, `fCounter`) and stops (bytecode
 *    `goto 230` skips the loop's own `iinc`, i.e. `break`, not `continue`).
 *  - offsets 230..626: five independent, unconditionally-checked guards,
 *    each firing at most one more `d(IIII)` call if its own condition
 *    holds (see inline comments for each literal/field).
 *  - offsets 626..1514: everything here is gated on `aq<=50`:
 *    - offsets 635..826: `f.a(III)` (#439) composite draw #1
 *      (record `577+dense[2222+aq]`, `...ao`), gated by a
 *      `frameLayoutAq`-keyed (the `aq:B`#215 twin of `aq:I`#216) chain of
 *      id/grid-cell match checks.
 *    - offsets 826..1370: gated on `!entityFocusFlag && dense[1919+aq]>0`
 *      plus the SAME 4-leg id/grid-cell chain as draw #1, PLUS a fifth
 *      `dense[6767+aq]/3*2 > dense[1919+aq]` threshold leg (all still
 *      OR'd together, plus the same XByte fallback after): if it fires,
 *      - offsets 1003..1074: `local1 = dense[6767+aq]/20`; `local2` stays
 *        0 unless at least one of `dense[1616+aq]`/`dense[1717+aq]` is
 *        `>=5` or `dense[7575+aq]` is `>5`, in which case `local2=2` AND
 *      - offsets 1075..1322: composite draw #2 fires, at a record derived
 *        from a 3-way max-with-tiebreak of those same three `dense` reads
 *        (see the inline proof that the bytecode's two structurally
 *        identical sub-branches collapse to one `if/else`).
 *      - offsets 1325..1367: composite draw #3 ALWAYS fires next (record
 *        `607+local1`, `...ao+local2`), whether or not draw #2 did.
 *      - offsets 1370..1511: `Graphics[N].setColor(colorTable[idiv((dense
 *        [1919+aq]-1)*3, dense[6767+aq])])`, then the decoded static
 *        helper `a(Graphics,int,int,int,int)` (#437, confirmed by direct
 *        bytecode read to be exactly `graphics.fillRect(11+x, 8+y, w, h)`
 *        -- reproduced inline as `fillRect(11+x, 8+y, w, 2)` since callers
 *        passing literal 0 do NOT collapse the offsets away).
 *  - offsets 1514..1590 (reached whether or not `aq<=50`): return unless
 *    `entityFocusFlag || zAfCursorVFlag`; then return unless `aq===frameLayoutL`;
 *    then one final `d(41, ar+j[12][ap]-1, as+j[13][ap]-21, timingCounterE)`.
 *
 * Field identities, each confirmed via its own constant-pool index (see
 * task instructions for the standing twin-pair list; every twin below was
 * re-checked with `grep -n "#<index> " bytecode/f-javap.txt`):
 *   - `s:Z`#365 -- `sFlag`, same field as `LegacyCameraScroll.ts`'s
 *     `sFlag` / `LegacyGameState.ts`'s `cameraSFlag`.
 *   - `ao:I`#211, `ap:I`#213 -- the `:I` twins (distinct from `ao:B`#212,
 *     `ap:B`#214), same fields `LegacySpriteLayerLoop.ts` writes.
 *   - `v:B`#376 -- distinct from `v:I`#375; same field
 *     `LegacyEntityAction.ts`'s `vByte` reads.
 *   - `Y:B`#117, `aq:I`#216, `ar:I`#217, `as:I`#220, `at:I`#221 -- the same
 *     fields `LegacyEntityAction.ts`/`LegacySpriteLayerLoop.ts` already
 *     track under these exact names (all confirmed `:I`/`:B` twins where
 *     relevant, matching the standing list).
 *   - `aq:B`#215 -- `frameLayoutAq`, distinct from `aq:I`#216; already
 *     named in `LegacyGameState.ts` ("constructor default 2") and
 *     `LegacyRuntimeState.ts`.
 *   - `k:B`#333 -- `kByte`, same field `LegacySpriteLayerPredicates.ts`
 *     tracks.
 *   - `W:B`#110 -- `cWByte`, same field `LegacySpriteLayerPredicates.ts`
 *     tracks.
 *   - `F:B`#50 -- `FByte`; DISTINCT from `F:Z`#49 (`entityFocusFlag`,
 *     `LegacyGameState.ts`), both of which this method reads at different
 *     points -- confirmed separately via their own constant-pool indices.
 *   - `K:B`#68, `A:B`#34, `I:B`#60, `y:B`#387 -- `viewportOriginK`/
 *     `scrollA`/`viewportOriginI`/`scrollY`, the same names
 *     `LegacyCameraFrame.ts` already uses for these exact fields.
 *   - `X:B`#113 -- `XByte`. No prior port names this field; it has no
 *     `putfield` anywhere in class `f`'s own disassembly, but per this
 *     week's codebase-wide correction (see docs/goal.md's 2026-09-04
 *     entries) that alone does not mean permanently null/zero for a
 *     PRIMITIVE byte field (only reference-typed fields can be
 *     "permanently null") -- a byte field defaults to 0 and class `e`'s
 *     constructor cluster plausibly writes it like it does everything
 *     else; not re-derived here since it is read, not written, by this
 *     method.
 *   - `V:Z`#109 -- `zAfCursorVFlag`, same field `LegacyGameState.ts`/
 *     `LegacyFrameCommandChanged.ts` already track.
 *   - `l:B`#337 -- `frameLayoutL`, same field `LegacyEntityRecordLifecycle.ts`
 *     tracks as `game.selectedId`.
 *   - `N:B`#79 -- `targetSlot`, same offscreen-Graphics-slot index
 *     `LegacyGameplayPaintTriggers.ts`/`LegacyGameState.ts` already track;
 *     modeled the same way `LegacyGameplayPaintTriggers.ts`'s `stepLegacyR`
 *     does, as a `graphics: readonly Graphics[]` param indexed by this
 *     field, not a callback.
 *   - `c:I`#260 -- `c`, the same field `LegacyGameState.ts` declares
 *     literally as `c` (confirmed there via three independent bytecode
 *     reads); distinct from `c:[[B]`#262 below (different descriptor).
 *   - `e:I`#284 -- `timingCounterE`, same field `LegacyGameState.ts`/
 *     `LegacyGameplayPaintTriggers.ts`/`LegacyCameraFrame.ts` already
 *     track; distinct from `e:[B]`#286 and `e:[I]`#279 below (three
 *     different fields share the bare letter `e`, confirmed separate by
 *     constant-pool index, same pattern as this class's `z` cluster).
 *   - `f:I`#294 -- `fCounter`, same field `LegacyGameState.ts`/
 *     `LegacyMapMarkerScan.ts` already track (and the same field
 *     `LegacyMapMarkerScan.ts` independently confirmed is the "phase"
 *     argument to this exact `d(IIII)` method).
 *   - `e:[B]`#286 -- `dense`, this port's usual dense-state array.
 *   - `e:[I]`#279 -- `colorTable`, the same 3-entry health-bar palette
 *     `LegacyGameplayNegativeEntityBranch.ts` already tracks under this
 *     name.
 *   - `b:[[[B]`#237 -- `xSlotTable`, the same 3D array (`new
 *     byte[2][5][30]`) `LegacyMapMarkerScan.ts` already tracks under this
 *     name as `game.xSlotTable`; NOT the unrelated 2D `b:[[S]`#244 or
 *     `b:[[[B]`-shaped map grids also named `b` elsewhere.
 *   - `j:[[B]`#326 -- `byteTables`, this port's usual packed byte-table
 *     array.
 *   - `c:[[B]`#262 -- `gridC`, the 96x96 map grid `LegacyEntityRecordCancel.ts`
 *     already tracks under this name. **RETRACTED-PREMISE note**: an
 *     earlier pass over a DIFFERENT method
 *     (`LegacyEntityRecordCancel.ts`'s own subject) briefly declared this
 *     field permanently null on the strength of a class-`f`-only grep; that
 *     was itself retracted 2026-09-04 once `e.i()`'s cross-class
 *     `new byte[96][96]` allocation was found. This port relies on the
 *     retraction, not the original claim -- `gridC` reads here are real,
 *     bounds-safe (`?? 0`) reads of a live array, not simulated throws.
 *   - `a:[B]`#137, `a:[S]`#138 -- `packedBytes`/`packedOffsets`, this
 *     port's usual packed-resource tables.
 *   - `a:[Ljavax/microedition/lcdui/Graphics;]`#142 (static) -- modeled as
 *     the `graphics` parameter, same as `LegacyGameplayPaintTriggers.ts`.
 *
 * Callees exposed as callbacks (none ported here):
 *   - `onCScanDraw` -- `c.a(int,int,int)` (#445), 1 call site (offset 92).
 *   - `onSubrecordDraw` -- `f.d(int,int,int,int)` (#572), 7 call sites
 *     (offsets 218, 322, 408, 490, 558, 623, 1587); reachable live as
 *     `LegacyRuntimeState.stepZSubrecordDraw(index, x, y, phase, cb)`.
 *   - `onDrawComposite` -- `f.a(int,int,int)` (#439), 3 call sites (offsets
 *     823, 1322, 1367); reachable live as
 *     `LegacyPackedSpriteRenderer.drawComposite(index, x, y)`.
 * `Graphics.setColor`/`fillRect` (offsets 1414/1511) are called directly
 * on the `graphics[targetSlot]` parameter rather than as callbacks, per
 * `LegacyGameplayPaintTriggers.ts`'s existing convention for this exact
 * static-array-of-`Graphics`/`targetSlot` pattern; `Graphics.ts` already
 * implements both real methods.
 *
 * Everything above was resolved directly from the bytecode; nothing here
 * required external interpretation beyond opcode semantics.
 */

export type LegacyEntityOverlayDrawState = {
  /** f.s:Z (#365). */
  readonly sFlag: boolean;
  /** f.ao:I (#211). */
  readonly ao: number;
  /** f.ap:I (#213). */
  readonly ap: number;
  /** f.v:B (#376). */
  readonly vByte: number;
  /** f.Y:B (#117). */
  readonly Y: number;
  /** f.aq:I (#216). */
  readonly aq: number;
  /** f.ar:I (#217). */
  readonly ar: number;
  /** f.as:I (#220). */
  readonly as: number;
  /** f.at:I (#221). */
  readonly at: number;
  /** f.aq:B (#215) -- distinct from aq:I (#216); game.frameLayoutAq. */
  readonly frameLayoutAq: number;
  /** f.k:B (#333) -- game.kByte. */
  readonly kByte: number;
  /** f.W:B (#110) -- game.hoverUnit. */
  readonly cWByte: number;
  /** f.F:B (#50) -- game.selectionGroup, distinct from F:Z (#49) below. */
  readonly FByte: number;
  /** f.F:Z (#49) -- game.entityFocusFlag, distinct from F:B (#50) above. */
  readonly entityFocusFlag: boolean;
  /** f.K:B (#68). */
  readonly viewportOriginK: number;
  /** f.A:B (#34). */
  readonly scrollA: number;
  /** f.I:B (#60). */
  readonly viewportOriginI: number;
  /** f.y:B (#387). */
  readonly scrollY: number;
  /** f.X:B (#113) -- newly named here, no prior port referenced it. */
  readonly XByte: number;
  /** f.V:Z (#109) -- game.zAfCursorVFlag. */
  readonly zAfCursorVFlag: boolean;
  /** f.l:B (#337) -- game.selectedId. */
  readonly frameLayoutL: number;
  /** f.N:B (#79) -- offscreen Graphics/Image slot index, game.targetSlot. */
  readonly targetSlot: number;
  /** f.c:I (#260) -- game.missionFrame. */
  readonly c: number;
  /** f.e:I (#284) -- game.animStep. */
  readonly timingCounterE: number;
  /** f.f:I (#294) -- game.animPhase. */
  readonly fCounter: number;
  /** f.e:[B] (#286), dense state. */
  readonly dense: Int8Array;
  /** f.e:[I] (#279) -- health-bar color palette, game.colorTable. */
  readonly colorTable: Int32Array;
  /** f.b:[[[B] (#237) -- game.xSlotTable[0..1][0..4][0..29]. */
  readonly xSlotTable: readonly (readonly Int8Array[])[];
  /** f.j:[[B] (#326). */
  readonly byteTables: readonly Int8Array[];
  /** f.c:[[B] (#262) -- game.gridC, the 96x96 map grid. */
  readonly gridC: readonly Int8Array[];
  /** f.a:[B] (#137). */
  readonly packedBytes: Int8Array;
  /** f.a:[S] (#138). */
  readonly packedOffsets: Int16Array;
};

export type LegacyEntityOverlayDrawCallbacks = {
  /** class c's final void a(int,int,int) (#445) -- LegacyCScanDraw.ts, wired as LegacyRuntimeState.drawCScan. */
  readonly onCScanDraw?: (arg1: number, x: number, y: number) => void;
  /** private void d(int,int,int,int) (#572) -- LegacyRuntimeState.stepZSubrecordDraw. */
  readonly onSubrecordDraw?: (index: number, x: number, y: number, phase: number) => void;
  /** final void a(int,int,int) (#439) -- LegacyPackedSpriteRenderer.drawComposite. */
  readonly onDrawComposite?: (index: number, x: number, y: number) => void;
};

/** Java `idiv` semantics: truncate toward zero, throw on divide-by-zero. */
function idiv(a: number, b: number): number {
  if (b === 0) throw new Error("f.q(): / by zero");
  return Math.trunc(a / b);
}

export function stepLegacyEntityOverlayDraw(
  state: LegacyEntityOverlayDrawState,
  graphics: readonly Graphics[],
  callbacks: LegacyEntityOverlayDrawCallbacks = {},
): void {
  // Offsets 0-26.
  if (state.sFlag || state.ao < 0 || state.ap < 0 || state.vByte !== 1) return;

  // Offsets 29-92: unconditional c.a(III) scan/draw call.
  callbacks.onCScanDraw?.(
    state.Y === 29 ? state.aq : 101 + state.aq,
    state.ar + (state.byteTables[12]?.[state.ao] ?? 0) + 4,
    state.as + (state.byteTables[13]?.[state.ao] ?? 0),
  );

  // Offsets 95-109: second, independent gate.
  if (state.Y !== 29) return;
  if (state.at < 0) return;

  // Offsets 112-230: scan xSlotTable[0] for the first slot whose column-2
  // equals aq and column-1 is NOT 3; fire one d() call and stop (`goto 230`
  // skips the loop's own increment -- this is a `break`, not `continue`).
  for (let local1 = 0; local1 < 30; local1 += 1) {
    if ((state.xSlotTable[0]?.[2]?.[local1] ?? 0) !== state.aq) continue;
    if ((state.xSlotTable[0]?.[1]?.[local1] ?? 0) === 3) continue;
    const recordIndex =
      65 +
      (1 - (state.xSlotTable[0]?.[4]?.[local1] ?? 0)) * 5 +
      (state.xSlotTable[0]?.[1]?.[local1] ?? 0);
    callbacks.onSubrecordDraw?.(
      recordIndex,
      state.ar + (state.byteTables[12]?.[state.ap] ?? 0),
      state.as + (state.byteTables[13]?.[state.ap] ?? 0),
      state.fCounter,
    );
    break;
  }

  // Offsets 230-244.
  if (
    (state.dense[UNIT_SLOT + state.aq] ?? 0) === 1 &&
    (state.dense[UNIT_TYPE + state.aq] ?? 0) === 51 &&
    (state.dense[UNIT_TIMER + state.aq] ?? 0) > 0
  ) {
    callbacks.onSubrecordDraw?.(
      65,
      state.ar + (state.byteTables[12]?.[state.ap] ?? 0),
      state.as + (state.byteTables[13]?.[state.ap] ?? 0),
      state.fCounter,
    );
  }

  // Offsets 325-411.
  {
    const v3333 = state.dense[UNIT_THOUGHT + state.aq] ?? 0;
    if (v3333 >= 0) {
      callbacks.onSubrecordDraw?.(
        77 + v3333,
        state.ar + (state.byteTables[12]?.[state.ao] ?? 0),
        state.as + (state.byteTables[13]?.[state.ao] ?? 0),
        (state.c - (state.aq & 7)) % 15,
      );
    }
  }

  // Offsets 411-493.
  {
    const v4646 = state.dense[UNIT_SLOT + state.aq] ?? 0;
    if (v4646 < -1) {
      callbacks.onSubrecordDraw?.(
        -v4646,
        state.ar + (state.byteTables[12]?.[state.ap] ?? 0),
        state.as + (state.byteTables[13]?.[state.ap] ?? 0),
        state.dense[3030 + state.aq] ?? 0,
      );
    }
  }

  // Offsets 493-561.
  if (((state.dense[UNIT_FLAGS + state.aq] ?? 0) & 4) === 4) {
    callbacks.onSubrecordDraw?.(
      73,
      state.ar + (state.byteTables[12]?.[state.ao] ?? 0),
      state.as + (state.byteTables[13]?.[state.ao] ?? 0),
      state.fCounter + state.aq,
    );
  }

  // Offsets 561-626.
  if (((state.dense[UNIT_FLAGS + state.aq] ?? 0) & 8) === 8) {
    callbacks.onSubrecordDraw?.(
      69,
      state.ar + (state.byteTables[12]?.[state.ap] ?? 0),
      state.as + (state.byteTables[13]?.[state.ap] ?? 0),
      state.fCounter,
    );
  }

  // Offsets 626-1514: everything below is gated on aq<=50.
  if (state.aq <= 50) {
    // Offsets 635-826: composite draw #1.
    let fire1 = false;
    if (state.frameLayoutAq === 0) {
      fire1 = true;
    } else if (state.frameLayoutAq === 1) {
      const cellKI =
        state.gridC[state.viewportOriginK + state.scrollA]?.[state.viewportOriginI + state.scrollY] ?? 0;
      if (
        state.aq === state.kByte ||
        state.aq === state.cWByte ||
        (state.dense[UNIT_SELECTION + state.aq] ?? 0) === state.FByte ||
        state.aq === cellKI
      ) {
        fire1 = true;
      } else if (state.XByte !== 0 && -cellKI === (state.dense[UNIT_RECORD + state.aq] ?? 0)) {
        fire1 = true;
      }
    }
    if (fire1) {
      callbacks.onDrawComposite?.(
        577 + (state.dense[2222 + state.aq] ?? 0),
        state.ar + (state.byteTables[12]?.[state.ao] ?? 0),
        state.as + (state.byteTables[13]?.[state.ao] ?? 0),
      );
    }

    // Offsets 826-1370: composite draws #2/#3 plus the setColor/fillRect
    // pair, all gated on !entityFocusFlag && dense[1919+aq]>0 && (an
    // id/grid-cell match OR the dense[6767+aq]/3*2>dense[1919+aq]
    // threshold OR the XByte fallback).
    if (!state.entityFocusFlag && (state.dense[UNIT_HP + state.aq] ?? 0) > 0) {
      const cellKI =
        state.gridC[state.viewportOriginK + state.scrollA]?.[state.viewportOriginI + state.scrollY] ?? 0;
      let fire2 =
        state.aq === state.kByte ||
        state.aq === state.cWByte ||
        (state.dense[UNIT_SELECTION + state.aq] ?? 0) === state.FByte ||
        state.aq === cellKI ||
        idiv(state.dense[UNIT_MAX_HP + state.aq] ?? 0, 3) * 2 > (state.dense[UNIT_HP + state.aq] ?? 0);
      if (!fire2 && state.XByte !== 0 && -cellKI === (state.dense[UNIT_RECORD + state.aq] ?? 0)) {
        fire2 = true;
      }

      if (fire2) {
        // Offsets 1003-1074.
        const local1 = idiv(state.dense[UNIT_MAX_HP + state.aq] ?? 0, 20);
        let local2 = 0;
        const d1616 = state.dense[UNIT_RANGED_SKILL + state.aq] ?? 0;
        const d1717 = state.dense[UNIT_MELEE_SKILL + state.aq] ?? 0;
        const d7575 = state.dense[UNIT_SCOUT_SKILL + state.aq] ?? 0;
        if (!(d1616 < 5 && d1717 < 5 && d7575 <= 5)) {
          local2 = 2;

          // Offsets 1075-1322: composite draw #2. The bytecode's two
          // structurally-identical sub-branches (offsets 1153..1195 and
          // 1216..1258, both "if (B<C) result=C-1 else result=B") collapse
          // to: A wins outright only when A>B AND A>C; otherwise the
          // B-vs-C comparison alone decides (proved by exhaustive case
          // split over the three original if_icmple/if_icmplt branches).
          let maxResult: number;
          if (d1616 > d1717 && d1616 > d7575) {
            maxResult = d1616;
          } else if (d1717 < d7575) {
            maxResult = d7575 - 1;
          } else {
            maxResult = d1717;
          }
          const recordArg = 602 + maxResult - 5;
          const xArg = state.ar + (state.byteTables[12]?.[state.ao] ?? 0) + 2 - local1 + 2 - 10;
          const yArg = state.as + (state.byteTables[13]?.[state.ao] ?? 0);
          callbacks.onDrawComposite?.(recordArg, xArg, yArg);
        }

        // Offsets 1325-1367: composite draw #3, unconditional here.
        callbacks.onDrawComposite?.(
          607 + local1,
          state.ar + (state.byteTables[12]?.[state.ao] ?? 0) + local2,
          state.as + (state.byteTables[13]?.[state.ao] ?? 0),
        );

        // Offsets 1370-1414: setColor.
        const colorIndex = idiv(
          ((state.dense[UNIT_HP + state.aq] ?? 0) - 1) * 3,
          state.dense[UNIT_MAX_HP + state.aq] ?? 0,
        );
        graphics[state.targetSlot]?.setColor(state.colorTable[colorIndex] ?? 0);

        // Offsets 1417-1511: the decoded static helper a(Graphics,x,y,w,h)
        // == graphics.fillRect(11+x, 8+y, w, h) -- reproduced inline,
        // +11/+8 kept explicit even though this call's own x/y are never
        // literal 0.
        const rectX = state.ar + (state.byteTables[12]?.[state.ao] ?? 0) + 2 - local1 + local2;
        const rectY = state.as + (state.byteTables[13]?.[state.ao] ?? 0) - 4;
        const rectW = idiv(
          (state.packedBytes[(state.packedOffsets[128] ?? 0) + local1] ?? 0) *
            (state.dense[UNIT_HP + state.aq] ?? 0),
          state.dense[UNIT_MAX_HP + state.aq] ?? 0,
        );
        graphics[state.targetSlot]?.fillRect(11 + rectX, 8 + rectY, rectW, 2);
      }
    }
  }

  // Offsets 1514-1590 (reached whether or not aq<=50).
  if (state.entityFocusFlag || state.zAfCursorVFlag) {
    if (state.aq === state.frameLayoutL) {
      callbacks.onSubrecordDraw?.(
        41,
        state.ar + (state.byteTables[12]?.[state.ap] ?? 0) - 1,
        state.as + (state.byteTables[13]?.[state.ap] ?? 0) - 16 - 5,
        state.timingCounterE,
      );
    }
  }
}
