/**
 * Direct translation of `private void i()` (bytecode/f-javap.txt offsets
 * 0..63, line 1923), NOT the unrelated `private void I()` (uppercase,
 * confirmed via direct bytecode read -- both exist in class f), NOR
 * `private void i(int)` (a third, unrelated overload ported separately as
 * `stepLegacySecondaryCellChain`). Resets a cluster of input-adjacent
 * transient flags to their idle state.
 *
 * CORRECTION (2026-08-22): every one of this method's 13 fields turned out
 * to already have a canonical, actively-wired `game.*` binding from
 * unrelated earlier work -- `e:Z`/`f:Z`/`g:Z`/`h:Z` are the SAME
 * `inputUp`/`inputDown`/`inputLeft`/`inputRight` `LegacyCameraFollow.ts`
 * already uses (confirmed via `keyPressed(int)`'s own bytecode), `i:Z` is
 * `iFlag` (confirmed via `V()`'s bytecode, offset 12), `v:Z` is `inputV`,
 * `E:B` is `game.E` (confirmed via `V()`'s own offset 123..125), `w:Z` is
 * `wFlag` (confirmed via `aL()`'s bytecode, offset 1), `i:B` is `iByte`,
 * `t:Z` is `inputT` (merged with a `tFlag` twin 2026-10-08), `n:I` is `nInt` (confirmed via `private void d(byte)`'s
 * own docblock), and static `l:Z`/`m:Z` are `staticL`/`staticM` (confirmed
 * via `keyPressed(int)`'s `*`/`#` cases, offsets 56/82). A first pass
 * (2026-08-21) invented 13 brand-new `zCursor*`/`zAfTrigger*`/`zScratch*`/
 * `zStatic*` fields instead of checking for these existing bindings first
 * -- the classic "verify before introducing a field" trap this project has
 * hit repeatedly, this time spanning 13 fields across one commit. All 13
 * were merged onto the canonical fields; see `docs/unknowns.md`'s
 * 2026-08-22 entry for the full site-by-site proof.
 *
 * `private void d(byte)` (`nInt`'s other real writer) also calls this
 * SAME method three times from within `f.h()`'s own body (offsets
 * 552..556, 655..656, 671..672) -- none of which were wired before this
 * fix either; see `stepLegacyGameplayTick`'s own updated docblock.
 */
export type LegacyZIState = {
  staticM: boolean;
  staticL: boolean;
  inputRight: boolean;
  inputLeft: boolean;
  inputDown: boolean;
  inputUp: boolean;
  inputV: boolean;
  iFlag: boolean;
  E: number;
  wFlag: boolean;
  digitKey: number;
  inputT: boolean;
  nInt: number;
};

export function resetLegacyZI(state: LegacyZIState): void {
  state.staticM = false;
  state.staticL = false;
  state.inputRight = false;
  state.inputLeft = false;
  state.inputDown = false;
  state.inputUp = false;
  state.inputV = false;
  state.iFlag = false;
  state.E = 4;
  state.wFlag = false;
  state.digitKey = -1;
  state.inputT = false;
  state.nInt = 0;
}
