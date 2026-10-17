/**
 * Fixed nested allocations made for the b subsystem by f.g().  These are
 * storage mirrors only; none of the dimensions imply a gameplay meaning.
 */
export class LegacySubsystemArrays {
  readonly a = byteCube(2, 101, 80);
  readonly b = byteCube(2, 22, 5);
  readonly c = byteCube(5, 6, 6);
  readonly aRows = byteMatrix(5, 50);
  readonly cByte = new Int8Array(2);
  readonly dByte = new Int8Array(6);
  readonly eByte = new Int8Array(3);
  readonly fByte = new Int8Array(3);
  readonly d = byteCube(3, 2, 96);
  readonly g = new Int8Array(3);
  readonly e = byteCube(2, 3, 10);
  readonly h = new Int8Array(10);
  readonly cRows = byteMatrix(6, 10);
  readonly aFlags = [false, false, false];
  readonly dRows = byteMatrix(2, 50);
  readonly dShort = new Int16Array(6);
  readonly i = new Int8Array(8);
  readonly eRows = byteMatrix(4, 8);
  readonly fRows = byteMatrix(2, 10);
  readonly gRows = byteMatrix(3, 20);
  /**
   * b.j:[B] (#191): b.a() sets j[i] = i; ae()/as()/at()/av() read it, as() swaps entries.
   * MERGED 2026-10-13 (oracle run 13, play10 frame 30006): the team-1 AI read an all-zero
   * twin (game.jobTable), so at() handed every raider the wrong weapon slot.
   */
  readonly j = Int8Array.from({ length: 50 }, (_, index) => index);
  readonly k = new Int8Array(4);
  readonly iInts = new Int32Array(6);
  readonly jInts = new Int32Array([56, 55, 51, 57, 49]);

  // Field-numbered scalar mirrors written by b.a().  The numeric suffixes
  // preserve bytecode identity until their gameplay meanings are proven.
  // NOTE (2026-08-25): b.f:B(#167)/b.I:B(#23)/b.Q:B(#46) used to be modeled
  // here too (bField167/bField23/bField46), but were disconnected
  // duplicates of the already-canonical, actively-read
  // game.subsystemGFFlagByte/subsystemGCurrentI/subsystemBQByte (same
  // constant-pool indices, confirmed via direct bytecode read of `final
  // void a()`, offsets 7/64/120) -- removed; `initializeOriginal`'s two
  // call sites now write those three fields directly on `game` instead.
  // Same for b.R:B (#48), removed 2026-09-23 as `bField48`: it is
  // game.subsystemRByte, which never saw b.a()'s q-2/4 seed of -128.
  bField16 = 0;
  bField32 = 0;
  bField50 = 0;
  /**
   * b.K:B (#28). MERGED (2026-09-10): `LegacyGameState.subsystemSchedulerByte`
   * used to be a SECOND copy of this same field -- the entity loop's
   * `if (K < 50) K += 1` tail (b.e() offsets 756..772) incremented that one
   * while `b.a()`'s `K:B = 50` (offset 33) seeded this one, and the two never
   * synced. b.h(int)'s `!f.N:Z && K < 50 && ...` gate (offsets 256..292) reads
   * it, so an order issued while the stale copy was still climbing from 0 got
   * dropped. Constructor default stays 0 (the JVM field default); b.a() sets
   * 50 in initializeOriginal below.
   */
  bField28 = 0;
  bJCursor = 0;

  // Newly-discovered (2026-09-04, LegacyEntityMoveTrigger.ts) -- class b's
  // own A:B(#6)/z:B(#235). Read by `final void a(byte,int,int)`(#274) but
  // NOT written by b.a() (the constructor); their real writers are other,
  // not-yet-ported methods (b-javap.txt:16254/16275, :32327/32332,
  // :35251/35255, :45295/45320). Defaulting to 0 (the JVM field default)
  // until one of those writers is ported.
  bField6 = 0;
  bField235 = 0;

  // Newly-discovered (2026-09-05, LegacySubsystemNearbyMarkerLookup.ts) --
  // class b's own y:B(#232)/an:I(#115)/F:B(#17). All three are read/written
  // by `private void a(byte,byte,byte,byte)`(b-javap.txt offsets 0..900,
  // now ported as stepLegacySubsystemNearbyMarkerLookup) as a "best
  // candidate found so far" tracker carried across repeated calls from
  // that method's own caller, `private boolean p()` (LegacySubsystemBBoolean2.ts,
  // not fully ported). `F:B`(#17) has exactly ONE putfield in the entire
  // class (b-javap.txt:32337, inside this same method) -- this port is its
  // only writer. `an:I`(#115) has a second writer, `private void
  // b(byte,byte,byte)` (LegacySubsystemClampBounds.ts, offset 0..1, which
  // resets it to 0 before computing the bounding box -- NOT modeled there
  // yet, see that file's own docblock). `y:B`(#232) has a third writer at
  // b-javap.txt:20073 (inside the still-unexamined `final boolean
  // a(int,int,int,int)` (#298), the entity-sprite-registration method
  // named in docs/unknowns.md's 2026-09-03 entry) and is also reset to 0
  // by `p()` itself (offset 82) before its own per-layer scan loop --
  // neither of those is modeled here either. Defaulting to 0 (the JVM
  // field default) until those writers are ported.
  bField232 = 0;
  bField115 = 0;
  bField17 = 0;

  // Newly-discovered (2026-09-07, LegacyRuntimeState.ts's subsystemEntityJTrigger,
  // `private void J()` #246) -- class b's own C:I(#10). Genuine cross-method
  // scratch (~48 references spread across ~10 other, not-yet-ported methods
  // in the class, confirmed via `grep -n "#10 " bytecode/b-javap.txt`), so
  // it belongs here rather than as a local -- J() itself both writes and
  // reads it multiple times within its own body (fully modeled), but its
  // value going INTO J() (from whichever unported caller ran before it) and
  // coming OUT of it (read by unported callers afterward) is not modeled by
  // this port yet. Defaulting to 0 (the JVM field default) until those
  // other methods are ported.
  bField10 = 0;

  // Newly-discovered (2026-09-10, LegacySubsystemEntityPathStep.ts, restoring
  // `private boolean c()` #356 from its retracted "guaranteed throw" premise)
  // -- class b's own D:I(#12), E:I(#14) and b:Z(#137). Each checked by
  // constant-pool index, not by letter:
  //  - `D:I`(#12) -- the y half of the `C:I`(#10) pair above; 28 references
  //    across c()/g()/o()/t()/au(). Same treatment as bField10.
  //  - `E:I`(#14) -- exactly 6 references in the whole class: `u()` resets it
  //    to 0 at its offset 102 and gates `D()` on `E:I < 2` at 135..140, c()
  //    reads it at 615 and 794, and `private void a(byte)`(#285, c()'s own
  //    displacement callee at offset 594, LegacySubsystemEntityDisplace.ts)
  //    writes it: 2 when #284 turns the swap down, 1 after a swap.
  //    So it is the displacement-recursion counter for one u() call chain --
  //    shared between three methods, hence a field here rather than a local.
  //  - `b:Z`(#137) -- a boolean, NOT `b:[B`(#130, packedBytes), `b:[[B`(#129,
  //    gridC), `b:[[[B`(#134) or `b:I`(#135). Written by `final void e()`
  //    (twice), `k()` and `r()`; c() is its only reader. None of its writers
  //    are ported, so it stays at the JVM default until one of them is.
  // Defaulting all three to 0/false (the JVM field defaults).
  bField12 = 0;
  bField14 = 0;
  bField137 = false;
  /** b.a:Z (#73): written by e(), k(), p() and r(); read by p() and H(). */
  bField73 = false;
  /**
   * b.E:B (#15) -- the direction a fleeing animal runs in.
   * `final boolean a(int,int,int,int)` (#270) computes it at its offsets
   * 191..232 as `((t53[(12+dy)*25 + 12+dx] % 10) + 4) & 7`, i.e. the
   * direction to the cell it is scanning rotated by 4 (the opposite way),
   * and `private void e(boolean)` (#376, LegacyAnimalRoam.ts) reads it twice
   * to index the 8-direction step table `t1`. RETRACTED 2026-09-22: the
   * gate's own docblock used to say this field "has no reader anywhere at
   * all" and discarded the computed value; those two reads are its readers.
   */
  /** b.C:B (#11) -- the distance half of the same t53 byte; read only by the gate's unmodeled mode>4 region. */
  bField11 = 0;
  bField15 = 0;
  /**
   * b.B:I (#8). Written by `a()Z` (each unit's turn), `a(int,byte)` (type
   * change) and `e(boolean)` (`t203[f.q]`, an animal's home-range radius);
   * every reader in the port reads this field (2026-10-12).
   */
  bField8 = 0;
  /**
   * b.D:B (#13) -- exactly three sites in the whole class: `H()` writes it
   * (`D:B = F:B`, offset 1138) immediately before calling `private void
   * a(byte,byte,byte)` (#291), whose offset 19 reads it back as that
   * rescan's `mode` argument; one further writer sits at b-javap.txt:34712.
   * A genuine cross-method field, so it lives here rather than as a local.
   */
  bField13 = 0;

  // Newly-discovered (2026-09-07, LegacyEntityActionScoreGate.ts, restoring
  // `private void a(byte,byte,int,int)`) -- class b's own ax:I(#126)/
  // ay:I(#127). Both are fully written and read within that method (which
  // resets `ay` to 0 unconditionally at entry, so it never observes a stale
  // cross-call value there either) -- but they are ALSO read by the
  // separate, still-unexamined `private boolean a(int,int,int,int,int,int,
  // int,int)` (#298, the entity-sprite-registration "gate" method named in
  // docs/unknowns.md's 2026-09-03 entry), so unlike that method's other
  // scratch fields (aA/aB/aC/aD/az, all provably local -- see that file's
  // own docblock) these two are modeled here rather than as locals, ready
  // for whenever #298 is ported. Defaulting to 0 (the JVM field default).
  bField126 = 0;
  bField127 = 0;

  // Newly-discovered (2026-09-07, LegacySpiralPlacementGate.ts, restoring
  // `final boolean a(int,int,int,int)` #270) -- class b's own ae:I(#105).
  // Read-only in that method (mode===3's cRows lookups), but has real
  // putfield/getfield sites in ~4 other, not-yet-ported methods elsewhere
  // in the class (confirmed via `grep -n "#105 " bytecode/b-javap.txt`), so
  // it's genuine cross-method scratch, not a local. Defaulting to 0 (the
  // JVM field default) until those other methods are ported.
  bField105 = 0;

  // Newly-discovered (2026-09-07, LegacySubsystemEntityTransform.ts,
  // restoring `private void a(int,int,boolean)` #273) -- class b's own
  // k:B(#197)/l:B(#199), both SINGULAR-byte fields distinct from the
  // `k:[B]`(#196) array despite the shared "k" name. `k:B` is also
  // touched by the not-yet-ported `private byte a()` (#276,
  // bytecode/b-javap.txt:50561/50670), so this port's own write (`=k[0]`)
  // does not capture that callee's side effect. `l:B` is read by two
  // already-ported real callers, `g(int)` (LegacyEntityGPrefix.ts) and
  // `t()` (LegacyEntityTargetStep.ts) -- both now wired to read this
  // field. Defaulting to 0 (the JVM field default).
  bField197 = 0;
  bField199 = 0;

  // Newly-discovered (2026-09-08, LegacySubsystemScore.ts, porting
  // `private byte a(int,int,int,int)` #267 and `private byte
  // a(int,int,int,int,int,int)` #268) -- class b's own b:I(#135), c:B(#144),
  // i:I(#187), j:I(#192), l:I(#198) and m:I(#201). All six are single-letter
  // "same name as an array field, different type" twins (`b:[[[B]`#134 vs
  // `b:I`#135, `c:[[[B]`#... vs `c:B`#144, etc.) -- confirmed distinct
  // constant-pool entries, not the same field. Genuinely cross-method:
  //  - `c:B`(#144) is the shared loop bound for both #267 and #268; its ONLY
  //    writer in the whole class is `private void a(int,int,int,int,int)`
  //    (#264), called by both methods immediately before they loop on it.
  //    **UPDATE (2026-09-08)**: #264 is now ported for real
  //    (`LegacySubsystemPairSetup.ts`), so this loop bound can become
  //    nonzero and the #267/#268 loops are no longer a guaranteed no-op.
  //  - `m:I`(#201) has exactly 2 putfield sites in the whole class, both
  //    inside `private void d(int)` (#366); read by #267/#268 to pick which
  //    of two sources feeds a pair-write. **UPDATE (2026-09-08)**: #366 is
  //    now ported for real too (`LegacySubsystemPairSetup.ts`).
  //  - `i:I`(#187) has exactly 1 putfield in the whole class, inside #268
  //    itself; its only other reader is the still-unported `private void
  //    a(boolean)` (#265, this port's `onFlagToggle` callback). #268 writes
  //    it unconditionally at entry, so it never observes a stale cross-call
  //    value there, but is modeled here (not as a local) so a future port
  //    of #265 can read what #268 just wrote.
  //  - `j:I`(#192) is reset to 0 by #267 (twice, one per internal loop) and
  //    by #268 before each use, but is also read/written by `d(int)` (#366)
  //    elsewhere, so the shared field is kept live rather than shadowed by
  //    a JS local.
  //  - `l:I`(#198) is written (=0) once by #267, on its "loop completed
  //    without an early return" tail; also read/written independently
  //    inside `d(int)` (#366). Modeled here for the same reason as `j:I`.
  //  - `b:I`(#135) is computed and consumed entirely within #267's own body
  //    when `a[0]||a[1]` is true, but has ~30 further getfield/putfield
  //    sites spread across roughly a dozen other, not-yet-ported methods
  //    (confirmed via `grep -n "#135 " bytecode/b-javap.txt`), so it is
  //    genuine cross-method scratch, not a pure local.
  // Defaulting all six to 0 (the JVM field default).
  bField135 = 0;
  bField144 = 0;
  bField187 = 0;
  bField192 = 0;
  bField198 = 0;
  bField201 = 0;

  // Newly-discovered (2026-09-08, LegacySubsystemPairSetup.ts, porting
  // `private void d(int)` #366 and `private void a(int,int,int,int,int)`
  // #264) -- class b's own q:B(#212)/r:B(#215). NOT the same fields as
  // `f.q:B`(#211, game.mission, a different constant-pool index reached via
  // `a:Lf;`) or `b`'s own uppercase `R:B`(#48, game.subsystemRByte)
  // despite the shared letters -- confirmed distinct via each one's own
  // constant-pool index. Their only writer in the whole class is
  // `private int a(int,int,int)` (#266, LegacySubsystemEntityOccupancyCheck.ts,
  // via LegacyRuntimeState.occupancyCheck -- writing here since 2026-09-28);
  // their only reader is `d(int)` (#366).
  bField212 = 0;
  bField215 = 0;

  // Newly-discovered (2026-09-08, LegacySubsystemFlagPass.ts, porting
  // `private void a(boolean)` #265 and `private void f(int)` #380) -- class
  // b's own a:I(#68), e:I(#164), g:I(#178) and h:I(#183). All four are
  // single-letter "same name as an array field, different type" twins
  // (`a:[Z]`#69/`a:[S]`#66/`a:[B]`#61/`a:[[[B]`#70 vs `a:I`#68; `e:[B]`#162/
  // `e:[[[B]`#161 vs `e:I`#164; `g:[B]`#177 vs `g:I`#178; `h:[B]`#181 vs
  // `h:I`#183) -- confirmed distinct constant-pool entries via
  // `grep -n "#N " bytecode/b-javap.txt`, not the same fields.
  //  - `a:I`(#68) is read (never written) by BOTH #265 and #380 before
  //    either method writes it -- #265 eventually writes it once (offset
  //    757, `= eByte[gArr[1]]`), #380 never writes it at all. Genuinely
  //    ambient/cross-method state, not a local reset-on-entry counter here
  //    (contrast `LegacySubsystemAx.ts`'s own `a:I` use, which IS a pure
  //    per-call local in THAT method -- same field, different methods,
  //    different answer, per this project's established pattern).
  //  - `e:I`(#164) is used as a scratch/loop-index scalar by #265, #380 AND
  //    the still-unported `private void a(int,int,int,int,int)` (#264, this
  //    port's `onPairSetup` callback) -- confirmed via
  //    `grep -n "#164 " bytecode/b-javap.txt`. Each of #265/#380 resets it
  //    near its own top before reading, so no method observes a stale
  //    cross-call value today, but it is modeled here (not as a JS local)
  //    so a future #264 port sees what #265/#380 leave behind.
  //  - `g:I`(#178) and `h:I`(#183): same cross-method spread as `e:I`(#164)
  //    (#264/#265/#380 all reference constant-pool index #178; #183 is
  //    written fresh at the top of both #265's and #380's own bodies before
  //    any read, so likewise no stale cross-call read today). `g:I`(#178)
  //    is `f(int)`'s own sign-flipping accumulator, unconditionally reset to
  //    `1` at #380's very first instruction -- but #265 both reads AND
  //    writes it without ever resetting it, so #265's own behavior depends
  //    on whatever #380 (or #264) last left there.
  // Defaulting all four to 0 (the JVM field default).
  bField68 = 0;
  bField164 = 0;
  bField178 = 0;
  bField183 = 0;

  // Raw b-side scalars serialized by f.d(int)/f.e(int). b.f/K/R/L:B are the
  // live game.subsystemGFFlagByte, bField28, game.subsystemRByte and bField32
  // (mirrors removed 2026-09-23: the save record read and wrote copies the
  // game never used).
  bAQ = 0;
  bN = 0;
  bO = 0;
  bgByte = 0;
  bJByte = 0;

  /** Exact allocation/constant writes from b.a() (the aM() load prefix). */
  initializeOriginal(): void {
    // g:B (#175), J:B (#26) and aQ:I (#92) are bgByte/bJByte/bAQ -- the
    // copies al()/as()/the save record use. CORRECTED 2026-10-02: b.a()
    // wrote unread twins (bField175/26/92, and bField40/93/43 for game's
    // subsystemOByte/AR/P), so aQ stayed 0 and as() ran av() -- a raid --
    // on frame 0.
    this.bgByte = 0;
    this.bField16 = 0;
    this.bJByte = 0;
    this.bField32 = 0;
    this.bField50 = 1;
    this.bField28 = 50;
    this.bAQ = -1;
    this.cRows[4].fill(0);
    this.dShort.fill(-1);
    // b.a() never writes the route scratch f:[B; its offset-7 `f:B` (#167) is
    // game.subsystemGFFlagByte. REMOVED 2026-10-12 (oracle run 12, play7 frame 21693).
    // Offsets 243..280 do clear the sites table f:[[B (#168) row 0, fRows[0][0..9]. ADDED
    // 2026-10-16 (oracle, custom-mode script, frame 62600): an unfinished site of the previous game
    // stayed listed in the next one.
    this.fRows[0].fill(0);
    this.gRows[0].fill(0);
    this.j.set(Int8Array.from({ length: 50 }, (_, index) => index));
  }

  /** Confirmed first phase of b.n(): c[5][6][6] is filled with -1. */
  resetNCube(): void {
    for (const layer of this.c) {
      for (const row of layer) row.fill(-1);
    }
  }
}

function byteMatrix(rows: number, columns: number): Int8Array[] {
  return Array.from({ length: rows }, () => new Int8Array(columns));
}

function byteCube(depth: number, rows: number, columns: number): Int8Array[][] {
  return Array.from({ length: depth }, () => byteMatrix(rows, columns));
}
