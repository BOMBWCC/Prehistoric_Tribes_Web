import type { LegacySubsystemArrays } from "../../core/LegacySubsystemArrays";
import { checkLegacyCellCompatibility, type LegacyCellCompatibilityCheckInput } from "../world/LegacyCellCompatibilityCheck";

/**
 * Raw port of class b's `private void a(boolean)` (constant pool #265),
 * bytecode/b-javap.txt offsets 0..836 (lines 4006..4536), and `private void
 * f(int)` (constant pool #380), offsets 0..1052 (lines 3344..4006).
 *
 * Both are `LegacySubsystemScore.ts`'s `onFlagToggle`/`onFCall` callback
 * boundaries -- ported here as real functions and wired below.
 *
 * **Framing check (handoff note verified against the bytecode, and found
 * wrong)**: the task handoff for this file asserted "#265 also mutates
 * `k:B` (#197) internally". It does not -- `grep -n "#197 " bytecode/b-javap.txt`
 * shows exactly 7 references in the whole class, all inside `private void
 * e(int,int,int)` (#379, lines 4006 is NOT that method) and `private byte
 * a()` (#276, line 50468+) -- i.e. `LegacySubsystemEntityTransform.ts`'s own
 * cluster and its `onComputeL` callback. `#265`'s own offset range
 * (4006..4536) contains zero references to constant-pool index #197 (double
 * checked with `awk 'NR==4006,NR==4536' bytecode/b-javap.txt | grep "#19[67] "`,
 * zero hits). The two methods share nothing except both being named `a(...)`
 * overloads in the same class -- easy to conflate, but distinct bytecode.
 * The toggle-then-call-then-untoggle pattern around `localFlags` in
 * `computeLegacySubsystemPairScore` (#268) IS real and already ported
 * there (`localFlags[m&1]=true; onFlagToggle(false); localFlags[m&1]=false`).
 *
 * -----------------------------------------------------------------------
 * `private void f(int)` (#380), offsets 0..1052. Exception table:
 * `[0,1050]->1051`, `Class java/lang/Exception`, handler `pop; return;` --
 * wraps the ENTIRE body, so any thrown exception (this port has no
 * individually-throwing array access here, matching this codebase's
 * existing #267/#268 precedent of not adding speculative bounds-check
 * scaffolding for a state the port cannot currently reach -- the loops
 * below are gated by `bField144`(#144), which stays 0 until the
 * still-unported #264 runs) silently aborts the remaining body. Reproduced
 * at that scope with a `try`/`catch` wrapping the whole function.
 *
 * Field identities (constant-pool indices are class b's own; each checked
 * for a same-letter twin via `grep -n "#N " bytecode/b-javap.txt`):
 *  - `g:I`(#178), `e:I`(#164), `h:I`(#183), `a:I`(#68) -- see
 *    `LegacySubsystemArrays.ts`'s own docblock for the full cross-method
 *    derivation (shared with #265 below and the still-unported #264).
 *  - `b:B`(#136) -- a NEW field, distinct from `b:[B]`(#130, packedBytes)
 *    and `b:I`(#135, bField135). All 27 references to #136 fall inside
 *    THIS method's own offset range (confirmed via
 *    `grep -n "#136 " bytecode/b-javap.txt`), so it is a genuine JS local
 *    here (`bScratch`).
 *  - `f:I`(#170) -- distinct from `f:[B]`(#169, fByte). All 8 references
 *    fall inside this method's own range -- genuine local (`localF`), reset
 *    to 0 at the top of every middle-loop iteration.
 *  - `c:I`(#147) -- distinct from `c:B`(#144, bField144) and `c:[S]`(#142,
 *    sectionOffsets). Shared with the still-unported #264, but within THIS
 *    method it is written (offset 361) before ever read (offset 379) --
 *    genuine local here (`localC`).
 *  - `d:[B]`(#157) -- a SIXTH-ish `d`-named field, distinct from
 *    `d:[[[B]`(#153, dCube), `d:[[B]`(#154, dRows), `d:I`(#155, the #267
 *    cursor local) and `d:[S]`(#152, dShort). `f.g()` allocates it as
 *    `new byte[6]` (`f-javap.txt:508`); already this port's
 *    `LegacySubsystemArrays.dByte`, the SAME array `LegacyPathE.ts`'s
 *    `dScratch` already reads/writes (confirmed shared, not a duplicate).
 *  - `b:[[B]`(#129) -- `gridC` (established, see
 *    `LegacySubsystemEntityTransform.ts`).
 *  - `f.b:[[B]`(#133 via `a:Lf;`#60) -- `gridB` (established, same file).
 *  - `f.c:S`(#145 via `a:Lf;`) / `f.d:S`(#156 via `a:Lf;`) -- `mapWidth`/
 *    `mapHeight` (`f`'s own #254/#266, established in
 *    `LegacyCameraFollow.ts`/`LegacyGameplayCellLoop.ts`).
 *  - `invokespecial #272`, `Method a:(III)B` -- `private byte a(int,int,int)`
 *    (b-javap.txt:4536+), ALREADY ported as `checkLegacyCellCompatibility`
 *    (`LegacyCellCompatibilityCheck.ts`). Called for real below (not a
 *    callback), args `(x, y, arg1)` matching the callee's own `(x, y, mode)`.
 *  - `invokestatic #334`, `Method b:(III)I` -- the clamp helper this
 *    codebase already ports repeatedly under the name `clampToRange`
 *    (`LegacySubsystemAn.ts`, `LegacySubsystemEntityOccupancyCheck.ts`) --
 *    NOT called by #380 (double-checked, zero `#334` references in this
 *    method's own offset range); #265 below calls it twice.
 *
 * Control flow (`h` = `bField183`, `bScratch` = local `b:B`#136, `localF` =
 * local `f:I`#170, `localC` = local `c:I`#147):
 *
 *   bField178 = 1;
 *   for (bField164 = 1; bField164 < 3; bField164++) {
 *     h = bField183 = gArr[bField164];
 *     fByte[h] = 0;
 *     localFlags[bField164-1] = false;
 *     bScratch = packedBytes[ packedOffsets[3]
 *       + dCube[gArr[0]][0][eCube[0][2][bField68]+1] - eCube[0][0][bField68]
 *       + (dCube[gArr[0]][1][eCube[0][2][bField68]+1] - eCube[0][1][bField68]) * 3
 *       + 4 ];
 *     dScratch[h*2]   = eCube[0][0][bField68];
 *     dScratch[h*2+1] = eCube[0][1][bField68];
 *
 *     for (bField135 = 0; bField135 < 80; ) {          // middle loop
 *       for (localF = 0; localF < 8; ) {                // inner loop
 *         x = dScratch[h*2]   + packedBytes[po[1]  +bScratch];
 *         y = dScratch[h*2+1] + packedBytes[po[1]+8+bScratch];
 *         localC = (x>=mapWidth||y>=mapHeight||x<0||y<0) ? 2
 *                : (gridC[y][x]===0) ? 0
 *                : checkLegacyCellCompatibility(x,y,arg1) ? 1 : 0;
 *         if (localC === 2) { bField135 = 130; break; }       // offset 375
 *         if (localC !== 0) {                                  // offset 382
 *           // localC===1 (compat check accepted): try the next of the 8
 *           // directions, WITHOUT touching dScratch/eByte/dCube.
 *           bScratch = (bScratch + bField178) & 7;
 *           localF++;
 *           continue;
 *         }
 *         // localC === 0: candidate direction, process it.
 *         if ((bScratch & 1) !== 0) {
 *           xv = gridB[ dScratch[h*2+1] + packedBytes[po[1]+8+((bScratch+bField178)&7)] ]
 *                     [ dScratch[h*2]   + packedBytes[po[1]  +((bScratch+bField178)&7)] ];
 *           if (xv < -bField68 && xv >= -10) {
 *             eByte[h] = (byte)-(xv+1); localFlags[bField164-1] = true;
 *             bField135 = 130; break;                          // offset 529
 *           }
 *           if (dScratch[h*2]  +packedBytes[po[1]  +((bScratch+bField178)&7)] === eCube[0][0][bField68]
 *            && dScratch[h*2+1]+packedBytes[po[1]+8+((bScratch+bField178)&7)] === eCube[0][1][bField68]) {
 *             bField135 = 130; break;                          // offset 648
 *           }
 *         }
 *         dScratch[h*2]   += packedBytes[po[1]  +bScratch];     // offset 651
 *         dScratch[h*2+1] += packedBytes[po[1]+8+bScratch];
 *         break;                                                // offset 718
 *       }
 *       // offset 751: post-inner-loop
 *       if (localF < 8) {
 *         if (dScratch[h*2]===eCube[0][0][bField68] && dScratch[h*2+1]===eCube[0][1][bField68]) {
 *           break;                                    // offset 822, goto 1027 (no change)
 *         }
 *         if (bField135 > 127) break;                 // offset 844 -- a break-from-inner sentinel
 *         // offset 847: attempt to commit the newly found position
 *         xv2 = gridB[dScratch[h*2+1]][dScratch[h*2]];
 *         if (xv2 < -bField68 && xv2 >= -10) {
 *           eByte[h] = (byte)-(xv2+1); localFlags[bField164-1] = true;
 *           break;                                    // offset 922
 *         }
 *         dCube[h][0][bField135] = dScratch[h*2];
 *         dCube[h][1][bField135] = dScratch[h*2+1];
 *         fByte[h] = (byte)(fByte[h]+1);
 *         bScratch = (bScratch - bField178*2) & 7;
 *         bField135++;
 *         continue;                                    // offset 1024, goto 215
 *       } else {
 *         localFlags[2] = false;
 *         break;                                        // offset 832
 *       }
 *     }
 *     bField178 = -bField178;                            // offset 1027..1034
 *   }
 *
 * -----------------------------------------------------------------------
 * `private void a(boolean)` (#265), offsets 0..836. NO exception table
 * (confirmed -- no "Exception table:" between this method's own `Code:`
 * header and the next method).
 *
 * Field identities beyond the shared ones documented in
 * `LegacySubsystemArrays.ts`:
 *  - `i:I`(#187) -- already `bField187` (`LegacySubsystemScore.ts`'s own
 *    derivation: written once by #268, read here and nowhere else besides
 *    #268 itself).
 *  - `c:B`(#144) -- already `bField144`, the #267/#268/#264 shared loop
 *    bound, used here (offset 770..778) as the tail loop's own bound.
 *  - `invokestatic #334` (`clampToRange`) -- called twice (offsets 406,
 *    740), both as `clampToRange(<sum>, 0, bField187)`.
 *
 * Control flow (`h` = `bField183`, using the same swap-via-scratch idiom
 * twice with `bField164` as the temporary):
 *
 *   // offset 0..78: conditional swap of gArr[1]/gArr[2]
 *   if (!localFlags[0] || (localFlags[0] && fByte[gArr[1]]>fByte[gArr[2]] && localFlags[1])) {
 *     bField164 = gArr[1]; gArr[1] = gArr[2]; gArr[2] = (byte)bField164;
 *   }
 *   bField164 = 0;
 *
 *   while (bField164 <= eCube[0][2][bField68]) {               // offset 81..186
 *     j = bField164;
 *     dCube[gArr[2]][0][j] = dCube[gArr[0]][0][j];
 *     dCube[gArr[2]][1][j] = dCube[gArr[0]][1][j];
 *     bField164++;
 *   }
 *   fByte[gArr[2]] = (byte)(eCube[0][2][bField68]+1);           // offset 186..212
 *   bField164 = 0;
 *
 *   while (bField164<=fByte[gArr[1]] && bField164+fByte[gArr[2]]<bField187) {  // offset 218..368
 *     j = bField164;
 *     dCube[gArr[2]][0][j+fByte[gArr[2]]] = dCube[gArr[1]][0][j];
 *     dCube[gArr[2]][1][j+fByte[gArr[2]]] = dCube[gArr[1]][1][j];
 *     bField164++;
 *   }
 *   fByte[gArr[2]] = (byte)clampToRange(fByte[gArr[2]]+fByte[gArr[1]], 0, bField187);  // offset 368..410
 *
 *   // offset 411..443: unconditional swap gArr[0]/gArr[2]
 *   bField164 = gArr[0]; gArr[0] = gArr[2]; gArr[2] = (byte)bField164;
 *
 *   if (!flag || fByte[gArr[0]] >= bField187) return;           // offset 444..466
 *
 *   bField178 = eCube[1][2][eByte[gArr[1]]];                    // offset 467..488
 *   bField183 = fByte[gArr[1]] - bField178 + eCube[0][2][bField68] + 1;  // offset 491..524
 *   bField164 = 0;                                              // offset 527..529
 *
 *   while (bField164<=fByte[gArr[2]]-bField178 && bField164+fByte[gArr[0]]<bField187) { // 532..697
 *     j = bField164;
 *     dCube[gArr[0]][0][j+fByte[gArr[0]]] = dCube[gArr[2]][0][j+bField178];
 *     dCube[gArr[0]][1][j+fByte[gArr[0]]] = dCube[gArr[2]][1][j+bField178];
 *     bField164++;
 *   }
 *   fByte[gArr[0]] = (byte)clampToRange(fByte[gArr[0]]+fByte[gArr[2]]-bField178, 0, bField187); // 697..744
 *
 *   bField68 = eByte[gArr[1]];                                  // offset 745..757
 *   bField164 = bField68 + 1;                                   // offset 760..767
 *
 *   while (bField164 < bField144) {                             // offset 770..836
 *     j = bField164;
 *     eCube[0][2][j] = (byte)(eCube[0][2][j] + bField183);
 *     eCube[1][2][j] = (byte)(eCube[1][2][j] + bField183);
 *     bField164++;
 *   }
 */

export type LegacySubsystemFlagPassInput = {
  /** b's own a:[Z] (#69), indices 0/1/2. Same array #267/#268 mutate. */
  readonly localFlags: boolean[];
  /** b.f:[B] (#169) -- LegacySubsystemArrays.fByte. */
  readonly fByte: Int8Array;
  /** b.g:[B] (#177) -- LegacySubsystemArrays.g. */
  readonly gArr: Int8Array;
  /** b.e:[B] (#162) -- LegacySubsystemArrays.eByte. Used by BOTH #265 and #380 (offsets 496..509/896..909). */
  readonly eByte: Int8Array;
  /** b.d:[[[B] (#153) -- LegacySubsystemArrays.d. */
  readonly dCube: readonly Int8Array[][];
  /** b.e:[[[B] (#161) -- LegacySubsystemArrays.e. */
  readonly eCube: readonly Int8Array[][];
  /** b.a:[B] (#61) / f.e:[B -- the shared dense entity bank, forwarded to checkLegacyCellCompatibility. Only #380 uses this. */
  readonly dense: Int8Array;
  /** b.d:[B] (#157) -- LegacySubsystemArrays.dByte, the SAME array LegacyPathE.ts's dScratch uses. Only #380 uses this. */
  readonly dScratch: Int8Array;
  /** f.b:[[B] (#133 via a:Lf;) -- gridB. Only #380 uses this. */
  readonly gridB: readonly Int8Array[];
  /** b.b:[[B] (#129) -- gridC. Only #380 uses this. */
  readonly gridC: readonly Int8Array[];
  /** b.b:[B (#130) -- packedBytes. Only #380 uses this. */
  readonly packedBytes: Int8Array;
  /** b.a:[S (#66) -- packedOffsets. Only #380 uses this. */
  readonly packedOffsets: Int16Array;
  /** b.b:[S] (#132) -- saveOffsets, forwarded to checkLegacyCellCompatibility. Only #380 uses this. */
  readonly saveOffsets: Int16Array;
  /** f.a:[[[I] (#72 via a:Lf;) -- mainArrays.aInt, forwarded to checkLegacyCellCompatibility. Only #380 uses this. */
  readonly visibilityBits: readonly (readonly Int32Array[])[];
  /** f.c:S (#145 via a:Lf;) -- game.mapWidth. Only #380 uses this. */
  readonly mapWidth: number;
  /** f.d:S (#156 via a:Lf;) -- game.mapHeight. Only #380 uses this. */
  readonly mapHeight: number;
  /** b.v:I (#225) -- the ambient entity id, forwarded to checkLegacyCellCompatibility. Only #380 uses this. */
  readonly entityId: number;
  /** b.u:I (#222) -- game.bTeam, forwarded to checkLegacyCellCompatibility. Only #380 uses this. */
  readonly team: number;
  readonly scalars: Pick<
    LegacySubsystemArrays,
    "bField68" | "bField135" | "bField144" | "bField164" | "bField178" | "bField183" | "bField187"
  >;
};

function toByte(value: number): number {
  return (value << 24) >> 24;
}

/** `private static int b(int, int, int)` (#334) -- see the module docblock. */
function clampToRange(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

/**
 * `private void a(boolean)` (#265), b-javap.txt offsets 0..836. See the
 * module docblock for the full derivation.
 */
export function stepLegacySubsystemFlagPass(input: LegacySubsystemFlagPassInput, flag: boolean): void {
  const { localFlags, fByte, gArr, eByte, dCube, eCube, scalars } = input;

  // Offset 0..78: conditional swap of gArr[1]/gArr[2], using bField164 as
  // the scratch temporary (mirroring the bytecode's own branch order).
  let doSwap: boolean;
  if (!localFlags[0]) {
    doSwap = true;
  } else if ((fByte[gArr[1]] ?? 0) <= (fByte[gArr[2]] ?? 0)) {
    doSwap = false;
  } else if (!localFlags[1]) {
    doSwap = false;
  } else {
    doSwap = true;
  }
  if (doSwap) {
    scalars.bField164 = gArr[1] ?? 0;
    gArr[1] = gArr[2] ?? 0;
    gArr[2] = scalars.bField164;
  }
  scalars.bField164 = 0;

  // Offset 81..186: copy dCube[gArr[0]] columns into dCube[gArr[2]].
  while (scalars.bField164 <= (eCube[0]?.[2]?.[scalars.bField68] ?? 0)) {
    const j = scalars.bField164;
    dCube[gArr[2]]![0]![j] = dCube[gArr[0]]?.[0]?.[j] ?? 0;
    dCube[gArr[2]]![1]![j] = dCube[gArr[0]]?.[1]?.[j] ?? 0;
    scalars.bField164 += 1;
  }
  fByte[gArr[2]!] = (eCube[0]?.[2]?.[scalars.bField68] ?? 0) + 1;
  scalars.bField164 = 0;

  // Offset 218..368: copy dCube[gArr[1]] columns into dCube[gArr[2]], offset by fByte[gArr[2]].
  while (
    scalars.bField164 <= (fByte[gArr[1]!] ?? 0) &&
    scalars.bField164 + (fByte[gArr[2]!] ?? 0) < scalars.bField187
  ) {
    const j = scalars.bField164;
    const base = fByte[gArr[2]!] ?? 0;
    dCube[gArr[2]!]![0]![j + base] = dCube[gArr[1]!]?.[0]?.[j] ?? 0;
    dCube[gArr[2]!]![1]![j + base] = dCube[gArr[1]!]?.[1]?.[j] ?? 0;
    scalars.bField164 += 1;
  }
  fByte[gArr[2]!] = clampToRange((fByte[gArr[2]!] ?? 0) + (fByte[gArr[1]!] ?? 0), 0, scalars.bField187);

  // Offset 411..443: unconditional swap gArr[0]/gArr[2].
  scalars.bField164 = gArr[0] ?? 0;
  gArr[0] = gArr[2] ?? 0;
  gArr[2] = scalars.bField164;

  // Offset 444..466.
  if (!flag || (fByte[gArr[0]!] ?? 0) >= scalars.bField187) return;

  // Offset 467..529.
  scalars.bField178 = eCube[1]?.[2]?.[eByte[gArr[1]!] ?? 0] ?? 0;
  scalars.bField183 = (fByte[gArr[1]!] ?? 0) - scalars.bField178 + (eCube[0]?.[2]?.[scalars.bField68] ?? 0) + 1;
  scalars.bField164 = 0;

  // Offset 532..697: copy dCube[gArr[2]] columns (offset by bField178) into dCube[gArr[0]] (offset by fByte[gArr[0]]).
  while (
    scalars.bField164 <= (fByte[gArr[2]!] ?? 0) - scalars.bField178 &&
    scalars.bField164 + (fByte[gArr[0]!] ?? 0) < scalars.bField187
  ) {
    const j = scalars.bField164;
    const destBase = fByte[gArr[0]!] ?? 0;
    const srcBase = scalars.bField178;
    dCube[gArr[0]!]![0]![j + destBase] = dCube[gArr[2]!]?.[0]?.[j + srcBase] ?? 0;
    dCube[gArr[0]!]![1]![j + destBase] = dCube[gArr[2]!]?.[1]?.[j + srcBase] ?? 0;
    scalars.bField164 += 1;
  }
  fByte[gArr[0]!] = clampToRange(
    (fByte[gArr[0]!] ?? 0) + (fByte[gArr[2]!] ?? 0) - scalars.bField178,
    0,
    scalars.bField187,
  );

  // Offset 745..767.
  scalars.bField68 = eByte[gArr[1]!] ?? 0;
  scalars.bField164 = scalars.bField68 + 1;

  // Offset 770..836.
  while (scalars.bField164 < scalars.bField144) {
    const j = scalars.bField164;
    eCube[0]![2]![j] = toByte((eCube[0]?.[2]?.[j] ?? 0) + scalars.bField183);
    eCube[1]![2]![j] = toByte((eCube[1]?.[2]?.[j] ?? 0) + scalars.bField183);
    scalars.bField164 += 1;
  }
}

/**
 * `private void f(int)` (#380), b-javap.txt offsets 0..1052. See the module
 * docblock for the full derivation. `mode` is the method's own int
 * parameter (`arg1`), threaded straight into `checkLegacyCellCompatibility`.
 */
export function stepLegacySubsystemFCall(input: LegacySubsystemFlagPassInput, mode: number): void {
  const {
    localFlags,
    fByte,
    gArr,
    eByte,
    dCube,
    eCube,
    dense,
    dScratch,
    gridB,
    gridC,
    packedBytes,
    packedOffsets,
    mapWidth,
    mapHeight,
    entityId,
    team,
    saveOffsets,
    visibilityBits,
    scalars,
  } = input;

  const compatInput: LegacyCellCompatibilityCheckInput = {
    state: dense,
    id: entityId,
    team,
    gridC,
    packedBytes,
    packedOffsets,
    saveOffsets,
    visibilityBits,
  };

  // Exception table [0,1050]->1051, Class java/lang/Exception, `pop; return;`
  // -- wraps the whole body. See the module docblock's own note on why no
  // per-access bounds-check scaffolding is added (matches this codebase's
  // existing #267/#268 precedent for currently-unreachable state -- the
  // outer loops here are gated by bField144, which stays 0 until #264 is
  // ported).
  try {
    scalars.bField178 = 1;

    for (scalars.bField164 = 1; scalars.bField164 < 3; scalars.bField164 += 1) {
      const h = (scalars.bField183 = gArr[scalars.bField164] ?? 0);
      fByte[h] = 0;
      localFlags[scalars.bField164 - 1] = false;

      const b68 = scalars.bField68;
      const dirIndexBase =
        (packedOffsets[3] ?? 0) +
        (dCube[gArr[0]!]?.[0]?.[(eCube[0]?.[2]?.[b68] ?? 0) + 1] ?? 0) -
        (eCube[0]?.[0]?.[b68] ?? 0);
      const dirIndexRow =
        (dCube[gArr[0]!]?.[1]?.[(eCube[0]?.[2]?.[b68] ?? 0) + 1] ?? 0) - (eCube[0]?.[1]?.[b68] ?? 0);
      let bScratch = toByte(packedBytes[dirIndexBase + dirIndexRow * 3 + 4] ?? 0);

      dScratch[h * 2] = eCube[0]?.[0]?.[b68] ?? 0;
      dScratch[h * 2 + 1] = eCube[0]?.[1]?.[b68] ?? 0;

      scalars.bField135 = 0;
      middle: while (scalars.bField135 < 80) {
        let localF = 0;

        inner: while (localF < 8) {
          const x0 = toByte((dScratch[h * 2] ?? 0) + (packedBytes[(packedOffsets[1] ?? 0) + bScratch] ?? 0));
          const y0 = toByte(
            (dScratch[h * 2 + 1] ?? 0) + (packedBytes[(packedOffsets[1] ?? 0) + 8 + bScratch] ?? 0),
          );

          let localC: number;
          if (x0 >= mapWidth || y0 >= mapHeight || x0 < 0 || y0 < 0) {
            localC = 2;
          } else if ((gridC[y0]?.[x0] ?? 0) === 0) {
            localC = 0;
          } else {
            localC = checkLegacyCellCompatibility(compatInput, x0, y0, mode) ? 1 : 0;
          }

          if (localC === 2) {
            // offset 368..375
            scalars.bField135 = 130;
            break inner;
          }

          if (localC !== 0) {
            // offset 382: localC===1 (checkLegacyCellCompatibility accepted
            // this cell) -- rotate to the next of the 8 directions WITHOUT
            // touching dScratch/eByte/dCube (offset 721..748).
            bScratch = toByte((bScratch + scalars.bField178) & 7);
            localF += 1;
            continue inner;
          }

          // localC === 0 (out of map bounds, or an already-empty cell): offset 385..718.
          if ((bScratch & 1) !== 0) {
            const rotated = (bScratch + scalars.bField178) & 7;
            const row = (dScratch[h * 2 + 1] ?? 0) + (packedBytes[(packedOffsets[1] ?? 0) + 8 + rotated] ?? 0);
            const col = (dScratch[h * 2] ?? 0) + (packedBytes[(packedOffsets[1] ?? 0) + rotated] ?? 0);
            const xv = gridB[row]?.[col] ?? 0;
            if (xv < -scalars.bField68 && xv >= -10) {
              // offset 496..529
              eByte[h] = toByte(-(xv + 1));
              localFlags[scalars.bField164 - 1] = true;
              scalars.bField135 = 130;
              break inner;
            }

            const matchX =
              (dScratch[h * 2] ?? 0) + (packedBytes[(packedOffsets[1] ?? 0) + rotated] ?? 0) ===
              (eCube[0]?.[0]?.[scalars.bField68] ?? 0);
            const matchY =
              (dScratch[h * 2 + 1] ?? 0) + (packedBytes[(packedOffsets[1] ?? 0) + 8 + rotated] ?? 0) ===
              (eCube[0]?.[1]?.[scalars.bField68] ?? 0);
            if (matchX && matchY) {
              // offset 641..648
              scalars.bField135 = 130;
              break inner;
            }
          }

          // offset 651..718: commit the drift (plain bScratch, no rotation) and stop scanning directions.
          dScratch[h * 2] = toByte((dScratch[h * 2] ?? 0) + (packedBytes[(packedOffsets[1] ?? 0) + bScratch] ?? 0));
          dScratch[h * 2 + 1] = toByte(
            (dScratch[h * 2 + 1] ?? 0) + (packedBytes[(packedOffsets[1] ?? 0) + 8 + bScratch] ?? 0),
          );
          break inner;
        }

        // offset 751..845: post-inner-loop.
        if (localF < 8) {
          if (
            (dScratch[h * 2] ?? 0) === (eCube[0]?.[0]?.[scalars.bField68] ?? 0) &&
            (dScratch[h * 2 + 1] ?? 0) === (eCube[0]?.[1]?.[scalars.bField68] ?? 0)
          ) {
            // offset 784/813/816/822: no change from the last accepted position -- goto 1027 as-is.
            break middle;
          }
          if (scalars.bField135 > 127) {
            // offset 835/841/844: an inner-loop early exit already set the sentinel.
            break middle;
          }

          // offset 847..922: attempt to commit the newly found position.
          const xv2 = gridB[dScratch[h * 2 + 1] ?? 0]?.[dScratch[h * 2] ?? 0] ?? 0;
          if (xv2 < -scalars.bField68 && xv2 >= -10) {
            eByte[h] = toByte(-(xv2 + 1));
            localFlags[scalars.bField164 - 1] = true;
            break middle;
          }

          // offset 925..1024: commit and keep trying to improve within the same 80-iteration budget.
          dCube[h]![0]![scalars.bField135] = dScratch[h * 2] ?? 0;
          dCube[h]![1]![scalars.bField135] = dScratch[h * 2 + 1] ?? 0;
          fByte[h] = (fByte[h] ?? 0) + 1;
          bScratch = toByte((bScratch - scalars.bField178 * 2) & 7);
          scalars.bField135 += 1;
          continue middle;
        }

        // offset 816..832: localF >= 8, none of the 8 directions worked this pass.
        localFlags[2] = false;
        break middle;
      }

      scalars.bField178 = -scalars.bField178;
    }
  } catch {
    // offset 1051: pop; return.
  }
}
