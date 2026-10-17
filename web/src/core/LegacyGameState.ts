import type { LegacyAkState } from "../ui/LegacyStateMachine";
import type { LegacyProjectionDrawPreparationState } from "../render/LegacyProjectionDrawPreparation";

/** Raw state fields established by f.run() before its first loop iteration. */
export class LegacyGameState {
  // The original field names/types are retained until their consumers are mapped.
  screen = 14;
  /**
   * f.v:B (#376) -- CONFIRMED (2026-08-20) as the field driving `f.h()`'s
   * own `v===0`/`v===1` entry gate and its `v=0` reset once a mode load
   * completes (bytecode offsets 79..103/246, `LegacyGameplayTick.ts`).
   * Also read/written by `S()`, `f.j()`, and several other methods; two
   * disconnected duplicates (`vByteScreen`, `vTransitionByte`) existed
   * before being merged into this field 2026-08-20 -- see docs/unknowns.md's
   * "f.j()/LegacyFrameStep duplicate-field cluster".
   */
  loopMode = 0;
  vInt = 59;
  H = true;
  // BUG FIX (2026-08-31): f.U:B (#105) has ZERO putfield sites anywhere in
  // the entire class (confirmed via exhaustive grep of bytecode/f-javap.txt
  // -- only 4 getfield reads, no writes at all), so the real game's U is
  // permanently Java's default 0. This port defaulted it to 5, which
  // silently poisoned f.run()'s own `R = U` boot write (bytecode/
  // f-javap.txt offset ~50) and every f.ar()/f.aq()/f.ay() `Q = U`/`R = U`
  // branch downstream -- directly causing the previously-observed
  // "Q=16 --FIRE--> Q=5 dead end" (U=5 instead of U=0 made f.ar()'s
  // vInt===59 branch land on Q=5, a menu screen with no matching ao()
  // table branch, instead of Q=0 -> next tick's value===0 branch -> Q=2,
  // matching the confirmed real device Q sequence in reverse-engineering/
  // main-menu-cutscene-walkthrough.md §13).
  U = 0;
  R = 5;
  S = 0;
  /**
   * f.aa:I (#178): the cursor row to return to. Written by ao()/aw()/ax()/
   * az()/aA(), read by an() (Back). Added 2026-09-27: ao() and an() each
   * kept a private copy, so Back always restored row 0.
   */
  aaInt = 0;
  x = 0;
  eByte = 0;
  /** f.h selects the pair in the original six-byte MIDI table. */
  audioH = 0;
  audioCurrentTrack = -1;
  /** Boolean f.ac; kept separate from the integer eByte audio mode. */
  acFlag = false;
  /**
   * f.c:I (#260) -- CONFIRMED (2026-08-20) via three independent bytecode
   * reads: `F()`'s own `c===-1` screen check (offset 1), `b.g()`'s
   * cross-class read (`Field f.c:I`, its own #148) used to gate the
   * `simulationCounter % 10`/`& 15` entity-update checks, and `f.j()`'s
   * unconditional per-tick increment. Was previously split across this
   * field and a second, disconnected `frameCounterC` (merged into this
   * field 2026-08-20) -- see docs/unknowns.md's "f.j()/LegacyFrameStep
   * duplicate-field cluster" for the full trace.
   */
  missionFrame = -1;
  /**
   * f.l:I (#334) -- new field, added 2026-09-04 while deriving `b.ax()`
   * (`LegacySubsystemAx.ts`), which reads it as its branch selector
   * (`game.l===1` vs `!==1`). Defaults to 1 in the constructor
   * (bytecode/f-javap.txt offset 20..22, `iconst_1; putfield #334`).
   * Exhaustively grepped: exactly 3 `putfield`s in the whole class -- the
   * constructor default above, `as()`'s own `Z:I===3` branch (toggles it
   * 0<->1, offset ~104..115, `as()` itself not otherwise ported here), and
   * an RMS-load path that overwrites it with a saved int
   * (`DataInputStream.readInt()`, not yet ported). Not a duplicate of any
   * existing field -- no other tracked field maps to constant pool #334.
   */
  lInt = 1;
  readonly k = new Int8Array(56);
  readonly a0 = new Int32Array(4);
  aa = true;
  b = true;

  // f.ak() fields whose consumers remain unresolved.
  iFlag = false;
  staticL = false;
  jFlag = false;
  // f.aR:I (#167): Java default 0 until P()/Q() write it (oracle frame 0, 2026-10-08).
  aR = 0;
  /**
   * f.aP:I (#164) is `aPInt`. This name was a second copy that nothing wrote, so f.ak() saw 0 and
   * took a key while a dialog was still sliding in (oracle run 5, frame 12854). Kept as an alias.
   */
  get aP(): number { return this.aPInt; }
  set aP(value: number) { this.aPInt = value; }
  /** f.aS:I (#168) -- unrelated to the aS()/wait-phase method below despite the shared name. */
  aS = 0;
  /** f.al:B (#206). */
  al = 0;
  /** f.am:B (#208). */
  am = 0;
  /** f.an:B (#210). */
  an = 0;
  /** f.an:I (#209), distinct from an:B (#210) above: p()/b()'s image-family remap, -1 = none
   *  (constructor offset 175). SPLIT 2026-10-08 (oracle): both lived in `an`, so p() clobbered
   *  the scene's an:B. */
  anInt = -1;
  /** f.ao:B (#212). */
  ao = 0;
  /** f.ai:B (#200) -- the T()/S() scene-dispatch key, set by b(int). */
  ai = 0;
  /** f.aQ:I (#165). */
  aQ = 0;
  /**
   * New fields for `private void c(int,int)` (bytecode/f-javap.txt offsets
   * 0..966), the cursor/selection-overlay method `f.m()` calls twice for
   * viewport translation. Producers not traced beyond this method's own
   * reads/writes -- flagged for future verification, not guessed at.
   */
  cAaByte = 0;
  cAbByte = 0;
  cAcByte = 0;
  // f.A:B (#34) and f.y:B (#387) are ALREADY tracked as `AByte`/`yByte`
  // (confirmed: LegacyGameplayFramePrep.ts's existing `scrollA`/`scrollY`
  // -- which feed f.m()'s own two calls into THIS method -- already read
  // them from `game.cursorRow`/`game.cursorColumn`; reused directly rather than
  // duplicated, matching this session's established fix pattern).
  /** f.q:Z (#355): set by a(byte,byte) on a double tap, cleared by h(). */
  cQFlag = false;
  cSInt = 0;
  cRFlag = false;
  cRInt = 0;
  cTInt = 0;
  cUInt = 0;
  boxUnitCount = 0;
  hoverUnit = 0;
  /** f.E:Z (#46): set by V() after an order, cleared by h(). */
  cEFlag = false;
  /** f.N:B (#79) -- offscreen Graphics/Image slot index; distinct from the
   *  entity-record N field (#80, int) used by a(int,byte) (LegacyMapMarkerDispatch.ts).
   *  The f(tribes) constructor sets it to 1 (offset 105). */
  targetSlot = 1;
  /** f.bc/bd/be/bf:I (#250..253) -- clip-rect scratch fields, output only. */
  bc = 0;
  bd = 0;
  be = 0;
  bf = 0;
  /**
   * f.ba:I (#248) / f.bb:I (#249) / f.ax:B (#229) -- CONFIRMED (2026-08-15)
   * the SAME fields `f.a(ZZZZZZZZZ)` (`LegacySelectionFlags.ts`) already
   * models as `selectionBa`/`selectionBb`/`selectionAx` (verified by
   * checking that method's own bytecode range for these exact constant-
   * pool indices, not just the letter names). f.m() reuses those existing
   * fields directly -- do NOT add separate `ba`/`bb`/`ax` fields here,
   * that would silently desync the two methods' shared state (a mistake
   * this file's own history briefly made and reverted the same day).
   */
  /** f.ad:I (#185) -- distinct from `adFlag` (f.aS()'s boolean) AND from `f.ad:B` (a different index `LegacySelectionFlags.ts`'s `ad` models); read by f.m() for the first c(int,int) call. */
  ad = 0;
  /** f.ae:I (#188) -- read by f.m() for the first c(int,int) call. */
  ae = 0;

  // f.n() (camera pixel-scroll) / f.Y() (camera-follow) shared fields.
  // Confirmed via direct bytecode reads of both methods (2026-08-13), not
  // reused from any pre-existing same-letter field -- see
  // reverse-engineering/gameplay-paint-cluster.md for the full derivation.
  /** f.ag:I (#194) -- pending row scroll delta. */
  rowScrollDelta = 0;
  /** f.af:I (#192) -- pending column scroll delta. */
  columnScrollDelta = 0;
  /** f.aj:I (#201) -- output sub-tile pixel column offset. */
  pixelColumnOffset = 0;
  /** f.ak:I (#203) -- output sub-tile pixel row offset. */
  pixelRowOffset = 0;
  /** f.al:I (#205) -- scroll target column fed to o(); distinct from the
   *  existing `al` field (#206, byte, f.P()'s unrelated al:B). */
  scrollTargetColumn = 0;
  /** f.am:I (#207) -- scroll target row fed to o(); distinct from the
   *  existing `am` field (#208, byte, f.P()'s unrelated am:B). */
  scrollTargetRow = 0;
  /** f.C:Z (#41) -- f.n()'s one-shot fixed-3-row scroll-back trigger. */
  cameraCFlag = false;
  /** f.B:Z (#39) -- one-shot full-window redraw trigger, SHARED between f.n() and f.Y() (confirmed same index in both). */
  cameraBFlag = false;
  /** f.D:Z (#44) -- transient flag held true only during f.n()'s B-branch o() call. */
  cameraDFlag = false;
  /** f.ai:I (#199) -- reset to 0 by f.n(); also f.o()'s/f.u()'s own outer-loop row counter (shared field, not reentrant). */
  aiScratch = 0;
  /**
   * f.s:Z (#365) -- shared skip/fade flag also read by paint()'s v!=1
   * branch. CORRECTION 2026-08-18: this IS also aK()'s own `sFlag` input
   * (confirmed via aK()'s raw bytecode, offset 44-48) -- an earlier note
   * here claiming a separate, unrelated `game.viewportSFlag` field was
   * itself the bug (an unverified placeholder, since removed). Wired
   * 2026-08-31: this is one of the three letterbox-gate reads in
   * `LegacyPaintScreen.stepLegacyPaintScreen` (paint()'s v!=1 branch,
   * offsets 502..523).
   */
  cameraSFlag = false;
  /**
   * f.z:Z (#389) -- a synchronization flag between `run()`'s main loop and
   * `paint()`: `run()` busy-waits `while (z:Z && !Z:Z) Thread.yield();`
   * after triggering a repaint (offsets 141..158/198..215), and `paint()`
   * clears it to `false` at the very end of EITHER branch (offset 600..602,
   * the shared tail both `v==1` and `v!=1` fall through to). This port's
   * render loop is synchronous (no separate paint thread to wait on), so
   * `run()`'s busy-wait has no equivalent here and is deliberately not
   * ported -- this field is tracked only so `paint()`'s own write is
   * faithfully represented, not because anything currently reads it.
   * Distinct from `zByte` (f.z:B #390) and `frameGenCounterZ` (f.z:I #391)
   * -- three different fields share the bare letter `z`, confirmed
   * separate by constant-pool index.
   */
  paintSyncFlag = false;
  /**
   * f.F:Z (#49) -- distinct from `FByte` (f.F:B #50), a different, widely-
   * shared field that happens to share the letter (verify by constant-pool
   * index before ever assuming same-letter fields are the same, per this
   * project's established convention -- confirmed different here).
   *
   * CORRECTION (2026-08-22): the original docblock here cited `f.a(byte)`
   * as this field's reader/writer, but that method's own bytecode
   * (offset 27986) never touches #49 at all -- a stale/incorrect
   * attribution. Directly re-verified via FIVE independent real call
   * sites instead: `f.ah()`/`f.aj()`(lowercase)/`f.af()`'s own writes
   * (offsets confirmed while porting `LegacyZAh.ts`/`LegacyZAj.ts`/
   * `LegacyZAf.ts`), `f.h()`'s `kFlag`-reset block (offset 598),
   * `f.aM()`'s allocation reset (offset 549), `f.ad()`'s own leading
   * guard (offset 1), and `final byte a(byte,byte,byte,byte,byte)`'s
   * (the record allocator) own `framePending` gate (offset 57) -- all
   * five are `getfield`/`putfield #49`. This ALSO means a separate,
   * undocumented `FFlag` field used to exist here tracking the exact
   * same original field independently (a genuine duplicate-field bug:
   * `stepLegacyGameplayTick`'s kFlag-reset and `resetLegacyAM` wrote to
   * `FFlag` while `ah()`/`aj()`/`af()` wrote to `entityFocusFlag`, so
   * whichever ran last silently clobbered the other's effect) -- merged
   * onto this single field, `FFlag` removed.
   */
  entityFocusFlag = false;
  // entityFocusPFlag (f.P:Z #88) merged into the top-level `pendingP` field
  // 2026-08-20 -- confirmed the same field via f.h()'s own bytecode
  // (offset 585, the kFlag-reset block `pendingP` already tracks). See
  // docs/unknowns.md's "f.j()/LegacyFrameStep duplicate-field cluster".
  /** f.w:I (#380) -- reset to -1 unconditionally at the top of c.a(int); f.a(byte,int,int) compares it with
   *  v:I and stores v:I into it when a new text starts. MERGED 2026-10-08 (oracle): the renderer used a
   *  separate `frameCommandW`, so c.a(int)'s reset never forced a fresh layout. Unused `frameCommandV` removed. */
  resourceSectionW = -1;
  /** f.C:B (#42) -- cursor target column f.Y() pans the cursor toward. */
  cursorTargetColumn = 0;
  /** f.D:B (#45) -- cursor target row f.Y() pans the cursor toward. */
  cursorTargetRow = 0;
  // f.A:I (#35) -- LegacyCameraScroll's `heightArg`, also read by
  // f.paint()'s compositing blit (stepGameplayPaintComposite). Was
  // duplicated as its own dead `cameraHeightArg` field (2026-08-18,
  // removed): `selectionAInt` below is the SAME field, actually kept live
  // by `stepLegacySelectionFlags` (`state.AInt = state.P*16+16`, matching
  // this field's own `putfield #35` bytecode exactly), so both readers now
  // share it directly instead of duplicating.
  E = 4;
  staticM = false;
  /** Raw f.t/f.v/f.p input-transition flags. */
  inputT = false;
  inputV = false;
  inputP = false;
  inputI = 0;
  wFlag = false;
  /**
   * f.q:B (#357) -- pervasively read/written (30+ call sites: `stepDefaultAm`,
   * `finalizeEntity`, `stepMapEntry`, map-entry allocation, etc.). A
   * disconnected duplicate (`numericQ`, used only by `acceptNumericSequence`/
   * `f.m(int)` and `stepDefaultAd`/`f.aD()`) existed before being merged
   * into this field 2026-08-20 -- see docs/unknowns.md's "f.j()/
   * LegacyFrameStep duplicate-field cluster".
   *
   * CORRECTION (2026-08-24): a SECOND disconnected duplicate, `subsystemQ`,
   * was found and merged too. It was fed exclusively by
   * `hydrateGameplayRecord`'s one-time save-load hydration (right next to
   * an already-correct `qByte = record.qByte` assignment, so it always
   * started in sync but then froze -- never updated again). Used as the
   * `q` input across the entire b-subsystem cluster
   * (`stepLegacySubsystemAk`/`Al`/`I`/`H`, `runSubsystemPrepass`,
   * `runSubsystemEntityLoop`, `runSubsystemJ`, `LegacyEntityMoveTrigger.ts`'s
   * `fQByte`) -- confirmed via direct bytecode read that ALL of these read
   * the identical `f.q:B` field (`getfield #211 // Field f.q:B` in class
   * b, matching this field's own #357 in class f) instead of some
   * b-local field. Since these are all already-shipped, already-tested
   * methods, this was a real live bug: they'd been reading a value frozen
   * at load time (or 0) instead of the actual live `f.q:B`. Merged onto
   * this field; `subsystemQ` deleted.
   */
  mission = 0;
  /** Raw f.am() selector fields (#103/#372/#112); kept separate from timing flags. */
  actionT = 0;
  // actionUCounter (f.u:B #372) merged into the top-level `uByte` field 2026-08-20.
  /**
   * f.W:Z (#112): a saved custom game exists. Java's default false -- the constructor never sets it;
   * d(int) reads it from the store and e(int) sets it when a custom game is saved. CORRECTED
   * 2026-10-15 (oracle, custom-mode script): it started true, so a fresh install could enter CUSTOM
   * GAME, where the original says PASS THE TUTORIAL FIRST! (f.aw() -> Q 21).
   */
  actionWFlag = false;
  // placementAsByte (a never-written copy of f.as:B #219) merged into frameLayoutAS 2026-09-15.
  /** Raw f.b byte copied into aP() create-record coordinates. */
  difficulty = 0;
  // f.aw:B (#227): the constructor sets 2 (f-javap offsets 388..390), so new
  // villagers alternate genders unless a script forces 0 or 1. CORRECTED
  // 2026-09-15: was 0, which made every tutorial villager the same gender.
  levelAwByte = 2;
  // BUG FIX (2026-08-31): f.t:B (#366) and f.s:B (#362) are both explicitly
  // initialized to -1 in the real constructor (bytecode/f-javap.txt offset
  // ~59..77, right next to the language-code string array), and nothing in
  // f.run()'s own initializeOriginalLoop() (which DOES overwrite Q/vByte/H/
  // R/vInt/c/k[55]/a0[3]/aa/b/iByte/wByte/timingCounterE/nCounter) ever
  // resets them -- so a genuinely fresh save (no f.d(0)/f.d(1) record) sees
  // s=-1/t=-1, not 0. This port defaulted both to 0, which made f.ao()'s
  // value===12 branch's `state.s > -1` check silently skip the difficulty/
  // tutorial/cutscene new-game flow (Q=13) and jump straight to Q=3/28 as
  // if a save already existed -- confirmed by direct comparison against
  // the real device Q sequence in reverse-engineering/
  // main-menu-cutscene-walkthrough.md §13 (which shows Q=13 right after
  // the first Q=16, on what was confirmed to be a fresh install).
  tByte = -1;
  sByte = -1;
  XFlag = false;
  ayByte = 0;
  /**
   * f.aK() viewport inputs. REMOVED 2026-08-18: `viewportC`/`viewportD`/
   * `viewportSFlag`/`viewportCSize`/`viewportDSize` used to live here as
   * placeholder fields whose own docblock admitted "source table aliases
   * remain unresolved" -- direct bytecode reads of `aK()`, `aO()`, `W()`,
   * and the standalone `f(int,int)` derivation confirm aK()'s real C/D/
   * sFlag/c/d inputs are the already-tracked `cursorTargetColumn`/
   * `cursorTargetRow`/`cameraSFlag`/`mapWidth`/`mapHeight` -- all four
   * call sites (`normalizeEntityViewport`, `stepEntityCoordinateUpdate`,
   * `stepMapEntry`'s `onAO`, `stepLegacyGameplayCommand`'s
   * `onViewportReset`) fixed to use those instead. See docs/unknowns.md.
   */
  viewColumns = 0;
  viewRows = 0;
  /** f.W:I (#111) -- `private void E()`'s own output, a clamped horizontal viewport-window origin. */
  exitPrepWInt = 0;
  /** f.X:I (#114) -- `private void E()`'s own output, a clamped vertical viewport-window origin. */
  exitPrepXInt = 0;
  /** f.aL:I (#160) -- `private void E()`'s own output, the alternate (`ah:B>d:S`) vertical-window branch result. */
  exitPrepALInt = 0;
  /**
   * f.Q:Z (#92) -- one of four viewport-edge gate flags read by
   * `f.d(2,row)` (`LegacyZKind2.ts`'s `stepLegacyZKind2`, javap offsets
   * 53..131). T:Z/U:Z are `frameLayoutT`/`frameLayoutU` below (ai() writes
   * them too -- the card pager's arrows; merged 2026-10-01, they were twin
   * `zAd14TFlag`/`zAd14UFlag` fields). Q/R are written by `private boolean c()`
   * (bytecode/f-javap.txt offsets 836..925), itself gated behind
   * `aD===14`: `Q = (exitPrepXInt === 0)`. That `aD===14` branch is not
   * wired -- `LegacyFrameCommandChanged.ts`'s `onAd14` callback is still
   * its own documented "not yet confirmed reachable" stub -- so these
   * stay at their Java default `false` (a faithful reading, not a guess:
   * an unwritten instance boolean field IS `false` in Java) until that
   * follow-up lands. See docs/unknowns.md's 2026-08-31 entry.
   */
  zAd14QFlag = false;
  /** f.R:Z (#95) -- same producer as `zAd14QFlag`: `R = (exitPrepXInt + 60 >= mapHeight)`. */
  zAd14RFlag = false;
  /**
   * f.x:Z (#383) -- a shared one-shot flag written by
   * `LegacyMapMarkerDetail.ts`'s `onXFlag` and read/cleared by `f.a(int,
   * int,int,int,byte)` (#443, `stepLegacyEntityAction`). CONFIRMED
   * (2026-08-18) that read site is unreachable dead code: the SAME
   * permanently-null `b:[S]`(#245)/`bShort` field this method's own
   * docblock already establishes throws on the method's very first real
   * instruction, before the `x:Z` read is ever reached -- so this flag
   * has no observable effect in the original game either way. Tracked
   * faithfully anyway (matching this project's convention for
   * confirmed-inert-but-real fields), not inlined away.
   */
  xZFlag = false;
  /** Raw f.e/f.g/f.h directional flags not consumed by f.ak() itself. */
  inputUp = false;
  inputDown = false;
  inputLeft = false;
  inputRight = false;
  /** f.aS()'s distinct boolean fields Z/Y/ad (not the numeric map Z field). */
  ZWaitFlag = false;
  YWaitFlag = false;
  adFlag = false;
  playerExists = false;
  playerDuration = 0;
  /**
   * f.Z:I (#120) -- raw selector field consumed by f.aB()/f.aC() (both
   * `getfield #120`, confirmed via direct bytecode read), reset to 0 by
   * S(), and the SAME field f.ao() reads as its live menu-dispatch index
   * (`getfield #120` at ao() offset 32, mirrored into `aoState.Z`). MERGED
   * (2026-08-31, while unifying S()'s duplicate ports): this used to also
   * be tracked separately as `zInt` (own docblock said "distinct from f.Z()
   * the selection-boundary method", true but irrelevant -- #120 is a field,
   * not the same slot as any method), a second name for this identical
   * field written by `beginEntityAction`'s port of `final void
   * a(byte,byte,byte)` (offset 43..45). Same twin-field pattern as commit
   * 2f72f3a ("Merge persistedAq/Y/A/Ai/L/N into their live field twins").
   */
  Z = 0;
  // f.y:I / f.Q:Z / f.R:Z twins (y, QFlag, RFlag) merged 2026-09-30 into
  // frameGenCounterY / zAd14QFlag / zAd14RFlag: aB()/aC()/ae() scrolled a
  // copy the dialogue never read.
  ab = 0;
  /** Exact f.m(int) cheat/sequence side-effect fields (#190/#193/#196/#372/#357). */
  numericAe = false;
  numericAf = false;
  numericAg = false;
  // numericU (f.u:B #372) merged into the top-level `uByte` field 2026-08-20.
  // numericQ (f.q:B #357) merged into the top-level `qByte` field 2026-08-20.
  // entityQ/entityW/entityK/entityAs/entityR0 (DEAD 2026-08-20, DELETED
  // 2026-08-25): only ever read/written by selectCurrentEntity/
  // LegacyEntityCurrentSelection.ts, itself a superseded, buggy
  // re-derivation of private void f(byte) -- the real, live port is
  // stepLegacyF, which correctly writes qCounter/wByte/kByte/frameLayoutAS
  // instead. See docs/unknowns.md for the full trace.

  // Raw fields consumed by the proven I/J/K/L/N/P frame handlers.
  I = false;
  J = false;
  abFlag = false;
  xInt = 0;
  mByte = 0;
  /** f.aP:I (#164) -- shared with the `aP` field `stepLegacyP` reads directly. */
  aPInt = 0;
  /** f.ak:B (#204) -- reset to 0 by S(); distinct from f.ak() the method. */
  akByte = 0;
  /** f.aM:I (#161) / f.aN:I (#162): the map overview's column/row count, written by C(). */
  readonly mapOverviewSize = { aM: 0, aN: 0 };
  /** f.aT:I (#169) -- S()'s section-relative scratch offset. */
  aTInt = 0;
  /** f.aj:B (#202) -- S()'s computed section-length byte. */
  ajByte = 0;
  /** f.J:Z (#66) -- S()'s "long transition" flag (ao:B >= 27). */
  jSceneFlag = false;
  // vByteScreen (f.v:B #376) merged into the top-level `vByte` field 2026-08-20.
  /** f.c:Z (#261) -- shared with the `c` field `stepLegacyP` reads directly. */
  cFlag = false;
  AFlag = false;
  /**
   * f.b:[Z] (#234). CONFIRMED (2026-09-02): this project used to also
   * carry a separate `selectionMirrorFlags` array for the same field
   * (constant-pool index cross-checked identical -- `f.a(ZZZZZZZZZ)`,
   * `O()`, `l(int)` and `ai()` all write it, `a(byte,int,int)`'s own
   * `selection` gate and several other sites read it) -- the two arrays
   * were never kept in sync, so every write landed in the orphan while
   * the gameplay HUD's `a(byte,int,int)` dispatch kept reading this one
   * and always saw it false. Merged back into this single field; see
   * docs/unknowns.md's 2026-09-02 entry.
   */
  readonly frameFlags = Array.from({ length: 20 }, () => false);
  /** Original f.a:[Z, used by the delayed-action queue and k-reset paths. */
  readonly selectionFlags = Array.from({ length: 20 }, () => false);
  /**
   * f.d:[B] (#277): written only by e.c() (e-javap offsets 519..588) and never
   * changed after; a(ZZZZZZZZZ) reads d[2]/d[3] into ax.
   */
  readonly selectionDBytes = new Int8Array([0, 0, 6, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);
  /** f.bb:I (#249): e.c()'s last write (e-javap offsets 721..734) is bb = f.b:[I][2] = 22
   *  (frameRecordHeights[2]). Was 0 until 2026-10-08 (oracle), so the first a(ZZZZ) on a map
   *  saw the HUD "grow" from 0 to 22 and scrolled the camera down two rows. */
  selectionBb = 22;
  selectionAx = 0;
  /**
   * f.ad:B (#186). Its only writer in the class is `a(ZZZZZZZZZ)` (#464,
   * offsets 490..562: 1/2/5/6/9 from flags 1/2/5/6/9), ported as
   * stepLegacySelectionFlags. Readers: ai() (offsets 8, 190), B() (181..202),
   * j(int) (`ad != 6`) and Z() (`b[ad] = true`, offsets 280..288).
   * CONSOLIDATED (2026-09-14): those four readers had been wired to two
   * never-written copies, `frameCommandAd` and `zBAdByte`; both removed.
   */
  selectionAd = 0;
  selectionBa = 0;
  /** f.A:I (#35) -- see the removed `cameraHeightArg` field's note above. */
  selectionAInt = 0;

  // Additional fields used by the bytecode-backed f.j() frame step.
  // frameCounterC/frameSweepCounter merged into c/tailHCounter 2026-08-20
  // (see those fields' own docblocks) -- do not re-add.
  mapWidth = 96;
  mapHeight = 96;
  pendingP = false;
  barMode = 0;
  /**
   * f.u:B (#372) -- CONFIRMED (2026-08-20) as the canonical field via
   * direct bytecode reads of `f.j()`, `f.am()` (offsets 94/101), `f.m(int)`
   * (offset 336), `f.a(byte,byte,byte,byte)` (#433, offset 8), and `f.aM()`,
   * all sharing this exact constant-pool index. Two disconnected
   * duplicates (`actionUCounter`, `numericU`) existed before being merged
   * into this field 2026-08-20 -- see
   * docs/unknowns.md's "f.j()/LegacyFrameStep duplicate-field cluster".
   */
  uByte = 0;
  // vTransitionByte (f.v:B #376) merged into the top-level `vByte` field 2026-08-20.
  oByte = 0;
  /** f.o:I (#348): h() counts it up to 4 (calling i() at 3); j()/b(int)/a(byte,byte,byte)/ap()/
   *  W() reset it. MERGED 2026-10-08: h()'s counter was a separate `oCounter` copy, so resets never re-ran i(). */
  oInt = 0;
  /** f.ao:I (#211) / f.ap:I (#213): written by p() (LegacySpriteLayerLoop), read by q() right after. */
  aoInt = 0;
  apInt = 0;
  subsystemGByte = 0;
  // subsystemLByte/subsystemKByte removed 2026-09-23: b.L:B (#32) and
  // b.K:B (#28) are LegacySubsystemArrays.bField32/bField28.
  /**
   * f.t:[B] (#368) -- `new byte[3]`, already tracked here as `subsystemT`
   * (read by `LegacySubsystemH.ts`'s `b.h()` as `fT`). Also the `counters`
   * param `LegacySubsystemRecord.ts` (`f.b(int,int,int,int)`) indexes by
   * `counterIndex`; at least one real call site (T()'s `ai===45` branch)
   * passes `counterIndex=5`, out of bounds for this 3-element array -- in
   * the original this throws `ArrayIndexOutOfBoundsException`, caught by
   * `f.ak()`'s already-modeled try/catch; JS typed arrays don't bounds-
   * check numeric-index writes, so this silently no-ops here instead.
   */
  readonly subsystemT = new Int8Array(3);
  bTeam = 0;
  bUnit = 0;
  /**
   * b.k:[B] (#196), `new byte[4]`. CORRECTED 2026-08-27: previously
   * assumed permanently null (zero `putfield` sites found *within class
   * b's own bytecode*) -- that check missed that `f.g()` (bytecode/
   * f-javap.txt:1004, called unconditionally from `run()`) writes
   * `this.a.k = new byte[4]` cross-class into a real, already-constructed
   * `b` instance (`f.f()` allocates it just before `g()` runs). Read 90+
   * times within class b's own bytecode with confirmed real `bastore`
   * writes elsewhere (e.g. `bytecode/b-javap.txt:50462`, `k[3]=0`) -- a
   * real, actively-used scratch array, not dead. Its own producer(s)
   * beyond that one write site are not yet traced; this port only reads
   * it so far (`LegacyEntityCWatch.ts`). See docs/unknowns.md's
   * 2026-08-27 entry for the full derivation.
   */
  readonly subsystemKBytes = new Int8Array(4);
  /**
   * b.x:I (#230) -- read by `b.c(int,int,int)`'s `k[0]===1` tail
   * (LegacyEntityCWatch.ts) and by `b.i(int)` (LegacyEntityIUpdate.ts).
   * **PRODUCER TRACED 2026-08-31**: `private boolean f()` (#381,
   * bytecode/b-javap.txt line 13687) assigns
   * `x = f.a(0xffffff, 100)` at offsets 855..868 -- a fresh 0..99 random.
   * That assignment sits on the method's ONLY `iconst_0/ireturn` path
   * (offset 871..872; the other three `ireturn`s at 55/472/854 all push
   * `iconst_1`), so every caller that observes `f()===false` has just had
   * `x` re-randomized. `f()` itself is still unported; see
   * LegacyEntityIUpdate.ts's `onF` note and this file's `i(int)` wiring
   * in LegacyRuntimeState.ts.
   */
  subsystemX = 0;
  /** b.B:B (#9) -- occupancy-check scratch used by b.a(IIII)/b.a(IIIBB). */
  subsystemB = 0;
  /**
   * b.y:I (#233, distinct from b.y:B #232 -- verify by index) -- read by
   * b.a(IIIBB) as a placement y-offset. **PRODUCER TRACED AND WIRED
   * 2026-08-31**: `private void i(int)`'s eligible branch is the real
   * write site (`y = f.a(0xffffff, addend)` at offsets 301..351), now live
   * through LegacyEntityIUpdate.ts.
   */
  subsystemY = 0;
  /**
   * b.H:I (#21) -- a class-b singleton scalar (NOT an entity/dense[]
   * field), added 2026-08-31. All 30 of its references in class b sit in
   * exactly two methods: `private void i(int)` (line 13281, the sole
   * writer on any live path -- `H = dense[6565+id]` at offset 298, gated
   * behind that method's eligibility test) and the still-unported
   * `private boolean b(int)` (#345, line 14160) -- which is itself only
   * ever called from `i(int)`'s own offset-409 not-eligible branch. It is
   * genuinely cross-call state: `i(int)`'s tail at offsets 416..767 reads `H`
   * even on the calls where the eligibility gate failed, i.e. it reads
   * whatever a PREVIOUS call left behind.
   */
  subsystemH = 0;
  /** b.aU:I (#96) -- written by av() (offsets 2 and 734, LegacySubsystemAv.ts), read by b.a(IIIBB). */
  subsystemAU = 0;
  /** b.b:I (#135) -- last allocateRecord() result id, cached by b.a(IIIBB). */
  subsystemLastRecordId = 0;
  subsystemW = 0;
  /**
   * b.m:B (#202). Its only writer is a(int,int,boolean) (subsystemEntityTransform);
   * read by d(int), h(int), t() and b(). Distinct from b.M:B (#36, subsystemM).
   */
  subsystemMByte = 0;
  /**
   * b.R:I (#49) -- genuinely cross-call scratch, not a pure loop-local:
   * `K()`'s type===96 branch reads its ENTERING value (`dense[505+R]=99`)
   * before overwriting it, and the method's own type===97 branch reuses it
   * as a plain loop counter with no external dependency. Producer of its
   * entering value not yet traced.
   */
  subsystemR = 0;
  /**
   * b.S:I (#51) -- only ever touched as a tight loop counter within `K()`'s
   * own type===97 branch (always reset to 0 before use, never read after);
   * exposed here defensively in case another unported method also touches
   * it, matching this project's "don't assume locality" precedent (see
   * `subsystemR` above).
   */
  subsystemS = 0;
  /**
   * b.f:Z (#172) -- a general "last check succeeded" boolean, distinct
   * from b.f:B (`subsystemGFFlagByte`, a different field and type). Written unconditionally by `K()`'s shared prologue, then
   * possibly overwritten by its type===94 branch.
   */
  subsystemFFlag = false;
  // REMOVED (2026-09-10): `subsystemSchedulerByte` was a duplicate of
  // b.K:B (#28), already tracked as `LegacySubsystemArrays.bField28` -- see
  // that field's own docblock for the merge.

  // Raw scalar fields serialized by f.d(int)/f.e(int).  They are kept
  // separate from the state-machine Q and timing fields until their callers
  // are fully mapped. CORRECTION (2026-08-25): persistedI/persistedK, and
  // (same day, continued) persistedAq/Y/A/Ai/L/N (removed) were all
  // disconnected duplicates of already-canonical live fields
  // (frameLayoutAq/yByte/AByte/IByte/KByte/ai/outerLoopLFlag/
  // outerLoopNFlag) -- see LegacyRuntimeState.ts's hydrateGameplayRecord
  // docblock. persistedH merged into audioH (f.h:B #313) 2026-09-27.
  // persistedQByte removed 2026-09-24: f.e(int)/f.d(int) save and load f.q:B
  // (#357), i.e. `qByte`; the copy was never updated, so every load went
  // back to the tutorial map.
  persistedPByte = 0;
  persistedDByte = 0;
  readonly persistedQ2 = new Int8Array(2);

  // f.d(0)'s other slot-0 fields: r:B #361, V, c:B #265. (l/W/s/t/p load
  // straight into lInt/actionWFlag/sByte/tByte/persistedPByte.)
  progressR = 0;
  progressV = 4;
  progressC = 0;

  // Raw fields written by f.h()/f.i(); meanings remain tied to original names.
  timingFast = false;
  baseTickDelay = 120;
  tickDelay = 120;
  tickDivisor = 1;
  animStep = 0;
  digitKey = -1;
  /** f.d:I (#274), h()'s v == 1 counter (every 6th tick allocates a(100,0,0,0)); not f.d:B. */
  dByte = 0;
  /** f.ac:I (#182): k()'s best hover distance; the f(tribes) constructor sets 1000 (offset 170). */
  acInt = 1000;
  /** f.j:B (#325): frames since the last key (h() +1, keyPressed/keyReleased = 0), read by ae(). */
  jByte = 0;
  /**
   * f.f:I (#294) -- incremented every tick in f.h(), wraps to 0 at 120
   * (confirmed via direct bytecode read, offsets ~486-505 of h()). This is
   * the "phase" argument `P()`, `u()`'s own row-end draw, and
   * `a(int,byte,byte,int,int,byte)` (map-marker detail) all read --
   * confirmed via direct bytecode reads of each (2026-08-18), correcting
   * three call sites in LegacyRuntimeState.ts that had been using the
   * DIFFERENT `e:I`(#284)/`timingCounterE` field instead (the two fields
   * only share the letter-adjacent "e"/"f" naming, not an actual
   * relationship -- `e:I` is genuinely the right field for `f.c()`'s 1137
   * composition and the negative-entity branch's own sprite draw, just
   * not for these three).
   */
  animPhase = 0;
  /**
   * f.S:I (#98) / f.T:I (#101) -- the projection origin `f.a(int,byte)`'s
   * `resourceId >= 1000` arm reads (offsets 609..619). Written by `G()` right
   * before each of its two `a(1118, mode)` calls (offsets 120..129 and
   * 681..690) and by `c(int,int)` (offsets 483/503).
   */
  projectionS = 0;
  projectionT = 0;
  gCounter = 0;
  nFlag = false;
  /** f.K:Z (#69) -- chief-pick mode: set by b.t(), cleared by af() once a unit is picked (and by aM()). */
  choosingChief = false;
  /**
   * f.k:Z (#332) -- a different, lowercase field: W() and aM() set it, f.h()
   * alone reads and clears it (its selection-reset block). SPLIT 2026-09-23
   * from `kFlag`, which made f.h() cancel every chief-pick on the next frame.
   */
  kResetFlag = false;
  /**
   * f.p:Z (#351) -- keyReleased(int)'s deferred-release flag, set when a
   * release lands while the repeat-guard (`o:Z`, LegacyInputState's oGuard) is still held
   * (offset 226..230). CORRECTION (2026-08-22): set via
   * `LegacyInputState`'s `onPendingRelease` hook now (was never written by
   * anything); consumed the same tick-boundary way as always by
   * `stepLegacyGameplayTick`'s own `pFlag` block (offset 660..674 of
   * `private void h()`), which clears it and re-invokes the real
   * `i()`(#610) reset.
   */
  pFlag = false;
  kByte = 0;
  /** f.q:I (#356) -- distinct from q:B (#357, unmapped) and q:Z/q:[B. */
  qCounter = 0;
  sCounter = 0;
  pCounter = 0;
  // f.F:B: Java default 0 until h()/d(byte)/aE() write it (oracle frame 0, 2026-10-08).
  selectionGroup = 0;
  /**
   * f.F:I (#52) -- aE()/V()'s own five-tick cooldown counter. Distinct from
   * FByte (f.F:B #50), a different, widely-shared field that happens to
   * share the source name "F" (confirmed via constant-pool index,
   * 2026-08-14, see gameplay-paint-cluster.md).
   */
  aeTimerF = 0;
  /** f.G:I (#53) -- written only by aE(); read by w()'s letterbox half. */
  boxAnchorColumn = 0;
  /** f.H:I (#58) -- written only by aE(); read by w()'s letterbox half. */
  boxAnchorRow = 0;
  /**
   * f.L:Z (#73) -- read by f.u()'s outer loop end-of-row draw condition
   * (`lFlag || nFlag`). 2026-08-18: its only confirmed producer, `private
   * void X()` (offsets 0..484), is now ported as `stepLegacyX()` -- see
   * `cRFlag` below for why it still stays `false` in practice.
   */
  formUpActive = false;
  /** f.N:Z (#81) -- same X()-produced field as outerLoopLFlag above. */
  callToArmsActive = false;
  /** f.q:[B (#354), a 2-element array read as q[0]/q[1] by f.u()'s outer
   *  loop, written by `stepLegacyX()`'s `s:I===100` branch. */
  readonly outerLoopRowEndMarker = new Int8Array(2);
  /**
   * f.r:Z (#359) -- `X()`'s own entry gate; the entire method is a no-op
   * unless this is true.
   *
   * **CORRECTION (2026-08-24)**: this docblock used to say "no producer
   * traced yet... stays `false`, so `X()`'s real field writes don't yet
   * fire from live gameplay" -- stale, contradicted by the very next
   * paragraph below (written the same day, 2026-08-18, just never used to
   * update this one). The producer WAS found and merged the same day:
   *
   * ALREADY TRACKED as `cRFlag` (added when `private void c(int,int)` --
   * offsets 0..966, `stepLegacyC2` -- was first ported): that method's own
   * `w:B===3` branch is `r:Z`'s (and `s:I`/`r:I`/`t:I`/`u:I`/`W:B`'s) real
   * producer. Self-caught 2026-08-18 while tracing this exact producer:
   * this session's own earlier `X()`/`a(byte,byte)` work had ALREADY added
   * duplicate fields for six of `stepLegacyC2`'s existing ones (`cRFlag`/
   * `cSInt`/`cRInt`/`cTInt`/`cUInt`/`cWByte`, plus `cAaByte`/`cAbByte`/
   * `cAcByte`/`cQFlag` from the `a(byte,byte)` work) under fresh `x`/`a2`-
   * prefixed names -- exactly the "verify before reusing a same-named
   * field" trap this project has hit repeatedly, this time self-inflicted
   * across two commits in the same session. Removed the duplicates here;
   * `stepLegacyX`/`stepLegacyA2`/`stepLegacyD`/`stepLegacyE`/`stepLegacyF`/
   * `stepLegacyL` now read/write the SAME `cRFlag`/`cSInt`/`cRInt`/`cTInt`/
   * `cUInt`/`cWByte`/`cAaByte`/`cAbByte`/`cAcByte`/`cQFlag` fields
   * `stepLegacyC2` already used, so both methods share live state again.
   */
  /** f.O:Z (#85) -- shared between `X()`'s branch-A gate and `stepLegacyZL`'s `state.O`. */
  xOFlag = false;
  /** f.M:Z (#77) -- shared between `X()`'s branch-A gate and `stepLegacyZL`'s `state.M`. */
  xMFlag = false;
  /** f.n:B (#345) -- `X()`'s own slot-scan cursor into `xSlotTable`. */
  xNByte = 0;
  /**
   * f.c:[[[B (#256) -- `new byte[2][5][5]` (confirmed via the constructor's
   * `multianewarray` right after `xSlotTable`'s own allocation, bytecode
   * offset 204..212). `[team][slot]` entries are `[x, y, type, flag]`
   * (columns 0..3 of the 5 allocated) per `LegacyMapMarkerScan.ts`'s own
   * derivation of `f.v()`. CONFIRMED PRODUCER (2026-08-22): `aM()`'s own
   * `[0][i][2]=-1` reset (bytecode offset 328..362) was already ported and
   * wired (`LegacyStateMachine.ts`'s `resetLegacyAM`, its `c3` param), but
   * pointed at a disconnected duplicate array (`mainArrays.c`, now
   * removed) instead of this field -- fixed, along with the same bug's
   * twin in `xSlotTable` below. `d(int)`/`e(int)` (save/load stream
   * read/write) are the other two real producers/consumers, already
   * connected via the raw byte-array copy in `hydrateGameplayRecord`/
   * `snapshotGameplayRecord`.
   */
  readonly teamMarkerTable: Int8Array[][] = [
    Array.from({ length: 5 }, () => new Int8Array(5)),
    Array.from({ length: 5 }, () => new Int8Array(5)),
  ];
  /**
   * f.b:[[[B (#237) -- `new byte[2][5][30]` (confirmed via the constructor's
   * `multianewarray` at bytecode offset 192..201). `X()`'s branch C only
   * ever touches team-slice `[0]`, rows 0..3, columns 0..28. CORRECTION
   * (2026-08-22): `resetLegacyAM`'s `bPlanes` param, `resetGameplayLoadPrefix`
   * (a separate independent port of the same `aM()` reset), and the RMS
   * save-record hydrate/snapshot pair were all using a disconnected
   * duplicate (`mainArrays.b`) instead of this field -- a reset or loaded
   * save never affected what `X()`/`LegacyMapMarkerScan.ts` actually read.
   * Fixed: all four now use this field directly. **CORRECTION (2026-08-24)**:
   * one more consumer traced and fixed -- `b.O()`'s type-94..97 branch
   * (offsets 176/227/289/329/375/410/442, all `#139 // Field f.b:[[[B`,
   * the exact same constant-pool field) was reading `mainArrays.b`, a
   * disconnected duplicate of THIS field, the same bug pattern as the four
   * sites above just missed at the time. Fixed:
   * `stepLegacySubsystemOAdvanced`'s `auxiliary` input now uses this field
   * directly; `mainArrays.b` deleted (now fully unused).
   *
   * **CORRECTION (2026-08-24), investigation of the remaining 5 offsets**:
   * 2 of them (33139/34274, inside `private boolean d(int)`/`e(int)`) are
   * NOT untraced -- those are the RMS save/load stream read/write methods,
   * already round-tripped via `snapshotGameplayRecord`/
   * `hydrateGameplayRecord` since the 2026-08-22 merge (tested in
   * `verify-x-slot-team-marker-merge.mjs`'s own snapshot/hydrate case).
   * The other 3 are real, unported consumers, larger than a quick fix:
   * - Offset 30360 is inside `final byte a(int, byte)` (offsets 0..111,
   *   line 30316) -- a small, fully-decoded helper: given an id and a
   *   byte, scans `xSlotTable[team][0]` for a matching slot and writes
   *   `xSlotTable[team][4][slot] = value`. Has exactly 2 real callers,
   *   BOTH in class b, confirmed via cross-file grep for `f.a:(IB)B`:
   *   `private void i(int)` (`bytecode/b-javap.txt` offsets 0..770, line
   *   13281, calls with value=1, gated on `b`'s own `H:I`(#21) in range
   *   94..97 and a `state[7979+id]&16` flag bit) and `private void q()`
   *   (line 6343, calls with value=0, the mirror-image clear path, gated
   *   on `state[2828+id]` in range 94..97 and the same flag bit the
   *   opposite way). **SELF-CAUGHT ERROR, same day**: an earlier draft of
   *   this note wrongly identified `private void i(int)` as `b.i()`
   *   itself (already ported/wired as `stepLegacySubsystemI`) and claimed
   *   that port was missing a tail -- confirmed WRONG by direct bytecode
   *   check: the real `b.i()` is `final void i()` (NO-ARG, line 42463,
   *   uses field `aM:I`#88 and offsets 9833/9883/9933, exactly matching
   *   the existing port's structure end-to-end including its own real
   *   tail call to `b.b(0,0,3)`#342/`f.b(int)`#343 -- both already
   *   present as the port's `onSubsystemB`/`onFByte` callback boundaries,
   *   just unwired, not missing). `private void i(int)` is a completely
   *   different, unrelated, NOT-yet-ported method that merely happens to
   *   share the letter "i" with a different parameter list -- the exact
   *   "same name, different method" trap this project has hit several
   *   times before, this time self-inflicted. Both `private void i(int)`
   *   and `private void q()` remain genuinely unported. `b`'s own
   *   `H:I`(#21, 30 references in class b, all inside these two unrelated
   *   methods) is not traced anywhere in this codebase yet.
   * - Offsets 6099/10298 are inside class f's OWN `private void q()`
   *   (line 6034, unrelated to class b's same-named `q()` above -- pure
   *   name coincidence across classes) and `private void v()` (line
   *   10058), both apparently sizable and entirely unported. `q()`'s own
   *   usage (offsets 120..176) reads `xSlotTable[0][1/2/4]` in a 30-slot
   *   scan gated on `Y:B===29 && at:I>-1`.
   *
   * Net: `b.i()`/`stepLegacySubsystemI` itself is fine, IMPLEMENTED status
   * confirmed correct. Fully resolving this field's last 3 offsets needs
   * porting 3 unrelated, unexplored methods (`private void i(int)`,
   * `private void q()` in class b; class f's own `q()`/`v()`); deliberately
   * not attempted in this pass, see `docs/unknowns.md`'s 2026-08-24 entry
   * for the full writeup.
   *
   * **UPDATE (2026-08-31)**: two claims above are now stale.
   * `private void i(int)` HAS been ported and wired
   * (`LegacyEntityIUpdate.ts` / `LegacyRuntimeState.stepEntityIUpdate`),
   * and its offset-509 `f.a(int,byte)` call is wired to the real
   * `writeLegacyEntityLinkByte`, so offset 30360 has a live consumer now.
   * `b.a(int,byte)` was also already ported at the time this note was
   * written (`changeLegacyEntityType`); only class b's `q()` and class f's
   * `q()`/`v()` remain genuinely unported.
   */
  readonly xSlotTable: Int8Array[][] = [
    Array.from({ length: 5 }, () => new Int8Array(30)),
    Array.from({ length: 5 }, () => new Int8Array(30)),
  ];
  /**
   * f.Y:I (#118) -- `stepLegacyZL`'s own `state.Y`. **2026-08-22**: also
   * confirmed the same field `ae()` (`stepLegacyZAe`) increments/
   * decrements in its `inputUp`/`inputDown` counter branches and checks
   * against 3/4 in its trigger branch -- a duplicate `zScratchYInt` field
   * was merged onto this one.
   */
  zlYInt = 0;
  /** f.x:B (#385) -- `stepLegacyZL`'s own `state.x`, set from `w:B` on entry to its Y>-1 branch. */
  zlXByte = 0;
  /**
   * f.X:B (#113) -- UPPERCASE X, a different field from `zlXByte`
   * (`f.x:B` #385) above; twin-checked against the constant-pool index,
   * not the letter. Its only writer in the whole class is
   * `private void a(int,byte,byte,int,int,byte)` (#442, ported as
   * `stepLegacyMapMarkerDetail`) at offsets 4040 and 4877, and its only
   * readers are that method and `q()` (#446, `LegacyEntityOverlayDraw`,
   * offsets 6439/6563). Added 2026-09-04 for q()'s wiring; NOTE that
   * `stepLegacyMapMarkerDetail` does not model this field yet, so it is
   * currently only ever read, never written -- a real remaining gap, not
   * a claim that the original leaves it at 0.
   */
  unitInBuilding = 0;
  /**
   * f.d:[S (#269), `new short[107]`. CONFIRMED (2026-08-24): a scratch
   * table shared (at disjoint indices, no interference) by many real
   * methods, not exclusive to `stepLegacyZL` -- exhaustively grepped
   * every reference in class f and found 40, across `g()`, `a(byte,int,
   * int)`, `c()`, `x()`, `y()`, `z()`, `A()`, `B()`, `run()`, `G()`,
   * `H()`, `I()`, `N()`, and `l(int)` (`stepLegacyZL`, index 4). Merged
   * `mainArrays.dShort` (a disconnected duplicate wired into
   * `a(byte,int,int)`/`LegacyFrameCommandDraw.ts`'s already-live
   * `drawLegacyFrameCommand`, dynamic index) onto this field -- both
   * referenced the same constant-pool index. Confirmed indices:
   * `stepLegacyZL`=4. Most of the other 13 methods above remain
   * unported/untraced; this only closes the specific duplicate-field gap
   * between the two ALREADY-ported consumers.
   */
  readonly zlDShorts = new Int16Array(107);
  /**
   * f.k:[B (#330), `new byte[107]`. CONFIRMED (2026-08-24): same
   * multi-consumer scratch-table pattern as `zlDShorts` above (71 real
   * references across the same 14 methods). Merged TWO disconnected
   * duplicates onto this field: `game.frameK` (wrongly sized
   * `Int8Array(56)` -- the real array is 107, confirmed via this same
   * field's own constructor allocation -- wired into
   * `LegacySimpleFrameHandlers.ts`'s `I()`/`J()`/`K()`/`L()`/`N()`/`P()`
   * dispatch and `a(byte,int,int)`/`LegacyFrameCommandDraw.ts`, both
   * already-live) and `mainArrays.k` (confirmed completely unused
   * anywhere in the codebase, deleted outright). Confirmed indices:
   * `stepLegacyZL`=4, `G()`/`stepLegacyGFrame`=52/53/54,
   * `I()`/`LegacySimpleFrameHandlers`=55 (disjoint from each other, no
   * interference from the merge). The other ~10 methods referencing this
   * field remain unported/untraced.
   */
  readonly zlKBytes = new Int8Array(107);
  /**
   * f.c:[Z (#255), `new boolean[9]` -- `stepLegacyZL`'s own persisted
   * 9-flag snapshot: taken from `selectionFlags[0,1,2,4..9]` (skipping
   * index 3) whenever `l(int)` is called with `value>-1`, and read back
   * (consecutive indices 0..8 this time, NOT skipping 3) when `l(int)` is
   * called with `value===-1`. Re-verifying the pre-existing `stepLegacyZL`
   * port against full bytecode (2026-08-18, while wiring `X()`'s own
   * `l(-1)` calls) found this field was missing entirely -- the old code
   * read live `selectionFlags` with the wrong (skip-3) index pattern in
   * the `value===-1` branch instead of this persisted, consecutive-index
   * snapshot. Fixed in `LegacyZL.ts`.
   */
  readonly zlFlagSnapshot: boolean[] = new Array(9).fill(false);
  /**
   * f.W:B (#110) -- `V()`'s own "target id" argument for its movement/
   * target dispatch. ALREADY TRACKED as `cWByte` (see the `cRFlag`
   * docblock above) -- distinct from `frameLayoutAS`, the different,
   * unrelated `f.as:B` field despite superficially similar "selector byte"
   * roles.
   */
  /**
   * f.n:I (#343) -- `private void d(byte)`'s own reset-cooldown counter,
   * the SAME field `private void i()` (`resetLegacyZI`, `LegacyZI.ts`)
   * resets to 0, and `ae()` (`stepLegacyZAe`) independently checks with
   * the identical `>1` gate at its own entry point -- a shared,
   * input-adjacent cooldown multiple real callers read/write.
   */
  nInt = 0;
  /**
   * f.j:[B] (#322) -- `private void ab()`/`stepLegacyZAb`'s own scratch
   * buffer, `new byte[8]`. Confirmed via exhaustive grep to have exactly
   * ONE `putfield` (the constructor allocation) and zero uses outside
   * `ab()` itself, which fully clears it at its own entry (offsets 0..22)
   * before use -- self-contained, no cross-method producer to trace.
   */
  readonly zAbScratch = new Int8Array(8);
  /** b.I:B (#23) -- `b.g(int)`'s own `currentI` input; distinct from the class-`f` `I:B` (#60, `IByte`, camera origin column) despite the shared letter. */
  subsystemGCurrentI = 0;
  /**
   * b.f:B (#167) -- `b.g(int)`'s own `fFlag` input; a class-`b` scratch
   * byte, unrelated to the existing boolean `fFlag` (a different field on
   * class `f`). Also read by `p()` (`LegacySubsystemP.ts`'s `fByte` input)
   * -- confirmed the SAME field via its shared constant-pool index #167,
   * not just a name coincidence. Widely read/written across ~6 other
   * methods (`a()`'s own reset to 0, `Z()`, `ae()`, `aq()`, `as()`, `at()`,
   * 42 total references) that haven't been individually traced; treated as
   * shared singleton scratch state (this `b` instance processes one entity
   * at a time), matching this session's convention for under-derived
   * cross-method scratch fields.
   */
  subsystemGFFlagByte = 0;
  /**
   * b.Q:B (#46) -- another class-`b` singleton scratch byte, read by
   * `p()` (`LegacySubsystemP.ts`'s `qByte` input) and directly by
   * `private boolean b()` itself (offset 668..672, gating a different
   * branch than the one that calls `p()`). Java's implicit 0 until `final
   * void a()`'s entity-slot reset (offset 116..120) sets it to -1 on map
   * load (oracle frame 0 shows 0, 2026-10-08). Also read/written by
   * `m()`/`Z()`/`ae()`/`aq()`/`as()`/`at()` (9 methods, 14 total
   * references), none individually traced; treated as shared scratch
   * state, same convention as `subsystemGFFlagByte` above.
   */
  subsystemBQByte = 0;
  /**
   * b.z:I (#234) -- class-`b` singleton scratch int, same "one `b` instance
   * processes one entity at a time" convention as `subsystemBQByte`/
   * `subsystemGFFlagByte` above. Shared between `u()`
   * (`LegacySubsystemEntityUpdateTail.ts`, offset 49..57, the
   * `Math.trunc(z/10)<=B` cancel-gate) and `private boolean e()`
   * (`LegacyEntityESelection.ts`, its own `z.value` docblock note) --
   * both wired through this same field (FIXED 2026-08-29; `onE`'s wiring
   * used to create a fresh `{value:0}` per call instead).
   */
  subsystemEntityZ = 0;
  /**
   * b.a:[Z] (#69) -- class-`b` singleton scratch boolean array (same "one
   * `b` instance processes one entity at a time" convention as
   * `subsystemBQByte`/`subsystemGFFlagByte` above). 19+ references across
   * many not-yet-traced methods; only index 2 is currently wired (set by
   * `private void o()`/`stepLegacySubsystemBVoidO`, offset 31..37, called
   * unconditionally from `p()`'s own offset 0..3). Sized to 10 as a
   * generous over-provision -- observed literal indices top out at 8.
   */
  subsystemBLocalFlags: boolean[] = new Array(10).fill(false);
  /** b.M:B (#36) -- shared scratch, set by aq()'s own prologue, read by at()/av(). */
  subsystemM = 0;
  /** b.A:I (#7) -- shared scratch, set by aq()'s own prologue, read by av(). */
  subsystemA = 0;
  /**
   * b.R:B (#48) -- NOT the same field as `subsystemR` (b.R:I #49, a
   * different constant-pool index AND a different type). Read/written by
   * av()/aw()/ar().
   */
  subsystemRByte = 0;
  /** b.O:B (#40) -- av()/aw()/as() muster-batch readiness counter. */
  subsystemOByte = 0;
  /** b.N:B (#39) -- av()/aw() rally-point offset scratch. */
  subsystemNByte = 0;
  // b.aQ:I (#92) is subsystemArrays.bAQ (merged 2026-10-02).
  /** b.G:I (#19) -- at()'s territory-bounding-box table base; b.a() sets it to a:[S][219] + f.q:B*4. */
  subsystemGBase = 0;
  // f.b:B as class b reads it (b's constant #138) is f.b:B #243 -- game.difficulty. A twin
  // `subsystemFBByte` stayed 0 while at() wrote the difficulty into levelBByte, so HARD spawned
  // EASY enemies. MERGED 2026-10-16 (oracle, custom-mode HARD script, frame 57600).
  /** b.aR:I (#93) -- as()'s snapshot of aQ for av(), and aw()'s time-budget check. */
  subsystemAR = 0;
  /** b.P:B (#43) -- ar()'s own queued placement candidate row, or -1. */
  subsystemP = 0;
  // b.g:B (#175) is subsystemArrays.bgByte (merged 2026-10-02).
  // f.f:[[B (#173 via b, #291 in f) is mainArrays.f4 (merged 2026-10-13: aq() wrote a twin O() never read).
  /**
   * f.Z:B (#121, UPPERCASE) -- output-only, written by f.u()'s outer loop
   * when the camera-center cell is visited. Deliberately a SEPARATE field
   * from `zByte` (f.z:B #390, lowercase) -- confirmed via constant-pool
   * index these are two different fields that only share a name modulo
   * case; `zByte` already has established, unrelated writers (`zByte =
   * yByte` in LegacyGameplayTick.ts/LegacyGameplayCommand.ts, mirroring
   * V()'s own `z:B = y:B` snapshot pattern).
   */
  outerLoopZByte = 0;
  /**
   * f.e:[I (#279) -- a hardcoded 4-element health-bar color palette,
   * confirmed value-by-value against the constructor's `ldc_w`/`iastore`
   * sequence (bytecode/f-javap.txt offsets 118..146):
   * [0]=14680064 (0xE00000), [1]=14999808, [2]=55808, [3]=55808 (0xDA00).
   * Read by the negative-entity branch's health-bar rendering.
   * CORRECTION (2026-08-25): `LegacyMainArrays.ts`'s own `eColors` was a
   * zero-reader disconnected duplicate of this exact same field/literal --
   * removed.
   */
  readonly healthBarColorTable = new Int32Array([14680064, 14999808, 55808, 55808]);
  /**
   * f.h:I (#311) -- confirmed distinct from H:I (#58) by constant-pool
   * index; read by f.u()'s tail branch. Its producer is `private void j()`
   * (#613). **2026-08-20 CORRECTION**: `f.j()` was already fully wired
   * (`LegacyFrameStep.ts`'s `stepLegacyFrame`, run every tick via
   * `LegacyGameplayTick.ts`'s `onFrameUpdate`) well before this field was
   * added -- it just increments its OWN disconnected `frameSweepCounter`
   * copy instead of this field (merged into this field 2026-08-20; see
   * docs/unknowns.md's "f.j()/LegacyFrameStep duplicate-field cluster").
   * `LegacyFrameProgressionScan.ts`'s `stepLegacyFrameProgression` is a
   * redundant, unused second port of the same method -- do not wire it.
   */
  tailHCounter = 0;
  /**
   * f.S:Z (#97) -- written `false` unconditionally by f.m() (no-arg)'s
   * v==1 body. **2026-08-22**: also confirmed the same field `ae()`
   * (`stepLegacyZAe`) reads in its `inputUp`/`inputDown` gates -- a
   * duplicate `zScratchSFlag` field was merged onto this one.
   */
  gameplaySFlag = false;
  /**
   * f.c:[B] (#263), read at index 1 by f.m() as an image-group/offscreen-
   * target slot selector. 2026-08-18: `O()` (bytecode/f-javap.txt offsets
   * 0..232) reads/writes indices 8 and 9 too -- resized from 8 to 10 to
   * accommodate that new evidence.
   *
   * CONFIRMED (2026-08-24) index 1's real producer, closing out the
   * earlier "producer still not traced" note: it's not written anywhere
   * in class f (exhaustively grepped, only `getfield`), but class `e`
   * (`AssetBootstrap`)'s `private void c()` (`bytecode/e-javap.txt`
   * offsets 0..898, called once during asset bootstrap, not yet ported)
   * replaces the WHOLE array with a fresh `new byte[13]` literal:
   * `[0, 1, 0, 0, 0, 0, 2, 0, 2, 2, 0, 0, 0]` (offsets 456..516).
   * Exhaustively grepped `Field f.c:[B` across every bytecode file in
   * this project -- these are the array's ONLY writes anywhere,
   * confirming index 1 is a bootstrap-time constant (always `1`) for the
   * entire rest of the game; indices 0/8/9 (the only other indices this
   * port reads) are dynamically overwritten afterward by the
   * already-ported/wired paths above, so their bootstrap seed values
   * don't matter here. Resized to 13 and seeded with the real literal
   * values to match, rather than porting all of `e.c()` (a genuinely
   * large, unrelated asset-loading method) just for this one array.
   */
  readonly frameImageSlots = new Int8Array([0, 1, 0, 0, 0, 0, 2, 0, 2, 2, 0, 0, 0]);
  /**
   * f.a:[I] (#141) and f.b:[I] (#241), both `new int[13]` -- the width and
   * height columns of the same four-table set as `frameRecordInts` (#264) and
   * `oElementRecordInts` (#275) below. All four are filled by `e.c()` across
   * the `a:Lf;` back-reference (e-javap.txt offsets 112..201 and 204..284,
   * `putfield #33 // f.a:[I` and `putfield #46 // f.b:[I`), and all four are
   * read together by `paint()`'s v==1 HUD loop:
   *
   *   a(g, Image[c:[B][record]], 0, c:[I][record], a:[I][record] + 11,
   *     b:[I][record], a:S - 11, b:S + d:[I][record], 0)
   *
   * They were previously present only as `LegacyRenderTargets`' `x`/`y`
   * transcription, a class nothing reads.
   */
  readonly frameRecordWidths = Int32Array.from([264, 264, 240, 240, 240, 240, 68, 240, 68, 63, 240, 240, 240]);
  readonly frameRecordHeights = Int32Array.from([352, 304, 22, 48, 22, 48, 55, 86, 49, 55, 38, 0, 0]);
  /**
   * f.c:[I] (#264), `new int[13]`.
   *
   * RETRACTED (2026-09-09): this field's docblock used to read "exhaustively
   * grepped all 10 references to #264 in class f, all getfield, zero
   * putfield/putstatic anywhere. This array is permanently null in the
   * original", and everything reading it was written as a guaranteed throw.
   * The grep covered class `f` only. `e.c()` allocates and fills it across the
   * `a:Lf;` back-reference -- e-javap.txt offset 366, `putfield #52 // Field
   * f.c:[I` -- exactly like `f.O:B`/`f.P:B` (see applyLegacyFrameGeometry) and
   * the whole 2026-09-07 "permanently null" family this one and #275 were
   * missed by. The literals below are e.c() offsets 291..366.
   *
   * `f.m()`'s 20-slot HUD loop and `paint()`'s v==1 tail both read it, which is
   * why the gameplay screen had no top resource bar.
   *
   * Not constant: a(ZZZZZZZZZ) (offsets 666..778) rewrites c[2]/c[3] = A and
   * c[4]/c[5]/c[7]/c[10] = A + bb, c[11]. It used to write a separate
   * `selectionCInts` copy (removed 2026-09-29), so opening the unit panel left
   * it and the bottom bar overlapping in Image 0.
   */
  readonly frameRecordInts = Int32Array.from([0, 0, 304, 304, 326, 326, 0, 326, 0, 0, 326, 0, 0]);
  /**
   * f.d:[I] (#275), `new int[13]` -- a DIFFERENT field from `frameRecordInts`
   * (#264) despite the similar role: read by `O()`'s own 20-slot element-scan
   * loop (offset 88), indexed by `packedBytes[packedOffsets[195] + i]`.
   *
   * RETRACTED (2026-09-09) on the same evidence as #264 above: `e.c()` fills
   * it at e-javap.txt offset 447, `putfield #57 // Field f.d:[I`. The literals
   * below are e.c() offsets 373..447. The old note's "size unconfirmed; 300
   * chosen to match frameRecordInts' own (also unconfirmed) size" is settled --
   * both are 13.
   */
  readonly oElementRecordInts = Int32Array.from([0, 16, 0, 0, 298, 272, 0, 234, 0, 0, 282, 320, 0]);
  BCounter = 0;
  CCounter = 0;
  DCounter = 0;
  ECounter = 0;
  boxSelecting = false;
  cursorColumn = 0;
  zByte = 0;
  cursorRow = 0;
  BByte = 0;
  cameraColumn = 0;
  JByte = 0;
  cameraRow = 0;
  // `LByte` (f.l:B #337) was merged into `frameLayoutL` 2026-09-23: the same
  // field under two names, so d(byte)/f(int) and Z()/ai()/aj() never saw
  // each other's cursor. Three writes of the L:B (#72) camera save that had
  // landed here now go to `cameraSavedKByte`.
  /** f.L:B (#72) -- saved K:B, written by the private f(int,int) camera-jump method. */
  cameraSavedKByte = 0;
  entityJ = 0;
  /** Raw f.j(int) command-consumer fields; caller aliases remain unresolved. */
  frameCommandAI = 0;
  frameCommandAJ = 0;
  frameCommandAK = 0;
  frameCommandAF = 0;
  /** Raw f.a(byte,int,int) renderer fields (aE/aJ/aK-side state). */
  frameCommandAE = 0;
  frameCommandAG = 0;
  frameCommandAH = 0;
  /**
   * Exact private f.a(IIIIB) transient fields.  These are deliberately not
   * aliased to map, camera, entity, or resource fields until their callers
   * are proven from bytecode.
   */
  projectionAq = 0;
  projectionAr = 0;
  projectionAs = 0;
  projectionAt = 0;
  projectionAu = 0;
  projectionAv = 0;
  projectionAw = 0;
  projectionY = 0;
  // f.ao/ap/an are aoInt/apInt/anInt (their unused twins here were removed 2026-10-09).
  projectionAx = 0;
  projectionAy = 0;
  projectionAz = 0;
  // f.ai:I (#199) is aiScratch. A never-written twin `projectionAi` fed the 1118 helper until
  // 2026-10-16, so the title-screen scenery ran out of phase after a game had moved ai.
  /** Reads byte[shortTable[shortOffset] + add], preserving the original indirection. */
  resourceByte?: (shortOffset: number, add: number) => number;

  /** Raw f.aV/aU and f.r/s layout state used by the 1010 branch. */
  frameLayoutAV = 0;
  frameLayoutAv = -1;
  frameLayoutAU = 0;
  frameLayoutAW = 0;
  frameLayoutAX = 0;
  frameLayoutAY = 0;
  frameLayoutAZ = 0;
  frameLayoutAR = 0;
  /** f.as:B (#219): build/menu cursor; the constructor sets 3 (offset 385). f.a() reads r[as] for a new site's 9237. */
  menuCursor = 3;
  frameLayoutAT = 0;
  selectedId = 0;
  /** f.T:Z (#102) / f.U:Z (#106): written by ai() (pager arrows) and c() aD 14. */
  frameLayoutT = false;
  frameLayoutU = false;
  /**
   * f.aq:B (#215) -- constructor default 2 (confirmed via direct bytecode
   * read, not Java's implicit 0). Cycled 0->1->2->0 by `af()`'s own
   * `r[as]` in `[23,25]` branch (offset 952..973); `stepLegacyZAd`
   * (`LegacyZAd.ts`) reads it as its own `aq` input for the `!F` branch's
   * `r[ar]=aq+23` write. **2026-08-22**: `af()` itself is now fully
   * derived and wired (`LegacyZAf.ts`) -- this field's own cycling branch
   * is one of many it now covers.
   */
  frameLayoutAq = 2;

  /**
   * f.au:B (#224) -- the lowercase `f.ae()`/`f.af()` cluster's own scratch
   * "current tile row" index (a second, unrelated command-dispatch family
   * from the UPPERCASE `f.aE()`/`f.aF()` already ported as `stepLegacyAe`/
   * `stepLegacyAf` -- case-sensitive collision, confirmed via direct
   * bytecode read). The cluster's other 13 fields turned out to already be
   * canonical, actively-wired fields elsewhere in this file (`inputUp`/
   * `Down`/`Left`/`Right`, `iFlag`, `inputV`, `E`, `wFlag`, `iByte`,
   * `tFlag`, `nInt`, `zlYInt`, `gameplaySFlag`, `staticL`/`staticM`) -- see
   * `LegacyZI.ts`'s docblock and `docs/unknowns.md`'s 2026-08-22 entry for
   * the full site-by-site proof. This one is genuinely new, not
   * cross-referenced by any other already-ported method.
   */
  zScratchAuByte = 0;
  /**
   * f.V:Z (#109), UPPERCASE -- reset by both `ae()` and `ah()`
   * (`stepLegacyZAh`), distinct from lowercase `v:Z` (#377, `inputV`).
   * Also read (not yet wired) by a cursor/HUD draw method alongside `F:Z`
   * (offsets ~1521/184/149 in f-javap.txt) -- only the reset side is
   * derived so far.
   */
  zAfCursorVFlag = false; // V:Z (#109)
  // ah()'s own leading K:Z(#69) guard reuses the already-canonical `kFlag`
  // (same constant-pool index, confirmed 2026-08-21 -- see docs/unknowns.md
  // and docs/code-mapping.md's `f.ad()` row -- do not add a duplicate field).
  /**
   * f.y:I (#388), lowercase -- a generation counter compared as `z!==y` in
   * several `c()` branches (`aD===10/13/16/A()`) and updated by `f.a(byte,
   * int,int)`'s own tail (bytecode/f-javap.txt offsets 962..1013, see
   * reverse-engineering/frame-command-changed-cluster.md §4). NOT the same
   * field as `zlYInt` (`Y:I` #118, UPPERCASE) -- only shares the letter.
   * That tail step isn't ported yet, so nothing currently writes this
   * field; `frameGenCounterZ` (below) starts equal to it, making every
   * `z!==y` check permanently false until §4 is resolved -- a real,
   * documented gap, not invented "always false" behavior.
   */
  frameGenCounterY = 0;
  /** f.z:I (#391), lowercase -- the cached counterpart `frameGenCounterY` is compared against. See that field's own docblock. */
  frameGenCounterZ = 0;

  constructor() {
    this.k[55] = -1;
    this.a0[3] = -1000;
  }

  /** Raw writes at f.run() offsets 36..99, kept separate from construction. */
  initializeOriginalLoop(): void {
    this.screen = 14;
    this.loopMode = 0;
    this.H = true;
    this.R = this.U;
    this.vInt = 59;
    this.missionFrame = -1;
    this.k[55] = -1;
    this.a0[3] = -1000;
    this.aa = true;
    this.b = true;
    this.digitKey = -1;
    this.barMode = 0;
    this.animStep = 0;
    this.nInt = 0; // n:I (#343); a twin nCounter was merged 2026-10-08
  }

  stateMachineFields(): LegacyAkState {
    return this;
  }

  /** Preserve the result of the bytecode-backed projection preparation. */
  applyProjectionPreparation(state: LegacyProjectionDrawPreparationState): void {
    this.projectionAq = state.aq;
    this.projectionAr = state.ar;
    this.projectionAs = state.as;
    this.projectionAt = state.at;
    this.projectionAu = state.au;
    this.projectionAv = state.av;
    this.projectionAw = state.aw;
  }

  /** View of the original fields consumed by private f.aS(). */
  audioWaitFields() {
    return {
      ZFlag: this.ZWaitFlag,
      Q: this.screen,
      R: this.R,
      ac: this.acFlag,
      ab: this.abFlag,
      v: this.loopMode,
      S: this.S,
      z: this.zByte,
      B: this.BByte,
      J: this.JByte,
      I: this.cameraColumn,
      L: this.cameraSavedKByte, // aS() writes L:B (#72)
      K: this.cameraRow,
      y: this.cursorColumn,
      A: this.cursorRow,
      YFlag: this.YWaitFlag,
      n: this.nFlag,
      ad: this.adFlag,
      e: this.eByte,
      playerExists: this.playerExists,
      playerDuration: this.playerDuration,
    };
  }

  /** Copy the mutable aS() view back to the raw game fields. */
  applyAudioWaitFields(fields: ReturnType<LegacyGameState["audioWaitFields"]>): void {
    this.ZWaitFlag = fields.ZFlag;
    this.screen = fields.Q;
    this.R = fields.R;
    this.acFlag = fields.ac;
    this.abFlag = fields.ab;
    this.loopMode = fields.v;
    this.S = fields.S;
    this.zByte = fields.z;
    this.BByte = fields.B;
    this.JByte = fields.J;
    this.cameraColumn = fields.I;
    this.cameraSavedKByte = fields.L;
    this.cameraRow = fields.K;
    this.cursorColumn = fields.y;
    this.cursorRow = fields.A;
    this.YWaitFlag = fields.YFlag;
    this.nFlag = fields.n;
    this.adFlag = fields.ad;
  }
}
