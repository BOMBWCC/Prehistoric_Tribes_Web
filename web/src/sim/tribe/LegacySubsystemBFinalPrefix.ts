import { UNIT_RECORD, UNIT_TYPE, UNIT_Y } from "../../core/DenseLayout";
export type LegacySubsystemBFinalPrefixInput = {
  readonly state: Int8Array;
  readonly id: number;
  /** f.c:I (#148, via a:Lf;) -- the frame counter, the same one the entry gate reads. */
  readonly frame: number;
  /**
   * b.B:I (#8), read at offset 1431. a(int,byte) rewrites it on every type change, so it is read
   * when the gate runs: a unit that changed type earlier in this b() call compares against its
   * new type's B. CORRECTED 2026-10-09 (oracle run 4, frame 9454): a snapshot taken on entry let
   * a gatherer going back to work run p() and lose its mode.
   */
  readonly B: () => number;
  /** Original private a(x,y,0) lookup -- a(III)I (#266), whose result IS z:I (#234). */
  readonly onCellValue?: (x: number, y: number, layer: number) => number;
  /** Original b.c[row][column] occupancy lookup. */
  readonly entityAt?: (row: number, column: number) => number;
  /** private void q() (#411) -- LegacyEntityRecordDoorRetarget.ts (wired 2026-09-21). */
  readonly onQ?: () => void;
  /** private void an() (#321). */
  readonly onAn?: () => void;
  /** private void N() (#250) -- LegacySubsystemN.ts. */
  readonly onN?: () => void;
  /** private void p() (#408). */
  readonly onP?: () => void;
};

/**
 * `private boolean b()`'s tail, bytecode/b-javap.txt offsets 1185..1477
 * (b() itself starts at line 9482). b() returns `false` on every path
 * through this range (offset 1477 is `iconst_0; ireturn`, and every branch
 * here is a `goto` into it), which is why this function is `void`.
 *
 * **TWO BUGS FIXED (2026-09-10)**, both found while tracing why an ordered
 * unit never moves:
 *
 *  1. Offsets 1346..1375 -- `z:I = a(e[0+v], e[101+v], 0)` (#266) -- are
 *     UNCONDITIONAL, and they run BEFORE the `e[5050+v]` and
 *     `e[808+v] > e[707+v]` gates at 1378 and 1394. This port had the call
 *     after both gates, as if it only existed to feed the `z/10 <= B`
 *     comparison at 1423. It does not: `z:I` is a real shared field, and
 *     `u()` (offsets 49..57, `LegacySubsystemEntityUpdateTail.ts`) and
 *     `final void e()` (offset 480) both read back whatever b() last left
 *     in it. Measured consequence: an ordered unit has `e[808+id] = 4`
 *     against `e[707+id] = 0`, so the 1394 gate fired, `onCellValue` was
 *     never called, `game.subsystemEntityZ` stayed 0 for every entity every
 *     tick, and u()'s own `z/10 <= B` gate then skipped its entire main
 *     body -- including the `c()` call that advances `e[707+id]`, which is
 *     the only thing that could ever have re-opened the 1394 gate.
 *  2. Offsets 1185..1345 were not modeled at all (the old docblock claimed
 *     the range but the body started at 1378). That block dispatches
 *     `q()`(#411) / `an()`(#321) / `N()`(#250) off `e[4444+v]` whenever the
 *     entity is standing on its own grid cell or is one of types 93/92/106.
 *
 * Control flow, instruction by instruction:
 *
 *   if (gridC[e[101+v]][e[0+v]] == v                     // 1185..1218
 *       || e[2828+v] == 93 || e[2828+v] == 92            // 1221..1254
 *       || e[2828+v] == 106) {                           // 1257..1272
 *     if (e[4444+v] >= 0) q();                           // 1275..1295 (#411)
 *     else if (e[4444+v] < -1) N();                      // 1298..1312, 1342 (#250)
 *     else if ((f.c & 63) == (v & 63)) an();             // 1315..1339 (#321)
 *   }
 *   z:I = a(e[0+v], e[101+v], 0);                        // 1346..1375 (#266)
 *   if (e[5050+v] != 0) return;                          // 1378..1391
 *   if (e[808+v] > e[707+v]) return;                     // 1394..1420
 *   if (z:I / 10 <= B:I) return;                         // 1423..1434
 *   if (gridC[e[101+v]][e[0+v]] != v) return;            // 1437..1470
 *   p();                                                 // 1473..1476 (#408)
 *
 * Both `gridC` reads and both `e[0+v]`/`e[101+v]` reads are re-done from
 * the arrays at their own offsets rather than hoisted, because the
 * q()/an()/N() dispatch in between can move the entity.
 */
export function stepLegacySubsystemBFinalPrefix(input: LegacySubsystemBFinalPrefixInput): void {
  const { state, id } = input;

  // 1185..1272.
  const type = state[UNIT_TYPE + id] ?? 0;
  const standingOnOwnCell = input.entityAt?.(state[UNIT_Y + id] ?? 0, state[id] ?? 0) === id;
  if (standingOnOwnCell || type === 93 || type === 92 || type === 106) {
    // 1275..1342. `iflt 1298` at 1288 splits on the sign, then `if_icmplt
    // 1342` at 1312 separates -1 from anything below it.
    const sparse = state[UNIT_RECORD + id] ?? 0;
    if (sparse >= 0) input.onQ?.();
    else if (sparse < -1) input.onN?.();
    else if ((input.frame & 63) === (id & 63)) input.onAn?.();
  }

  // 1346..1375: unconditional, and the ONLY writer of z:I inside b().
  const z = input.onCellValue?.(state[id] ?? 0, state[UNIT_Y + id] ?? 0, 0) ?? 0;

  if ((state[5050 + id] ?? 0) !== 0) return;
  if ((state[808 + id] ?? 0) > (state[707 + id] ?? 0)) return;
  if (Math.trunc(z / 10) <= input.B()) return;
  if (input.entityAt?.(state[UNIT_Y + id] ?? 0, state[id] ?? 0) !== id) return;
  input.onP?.();
}
