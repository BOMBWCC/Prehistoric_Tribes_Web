import { UNIT_HOME_X, UNIT_HOME_Y, UNIT_ORDER, UNIT_TIMER, UNIT_TYPE } from "../core/DenseLayout";
/** Raw selector branches of private f.T(); opaque b/f/c owners stay callbacks. */
export type LegacyStateTInput = {
  readonly state: {
    ai: number;
    aw: number;
    q: number;
    bF: number;
    p: Int8Array;
  };
  readonly dense: Int8Array;
  readonly shortRows: Int16Array[];
  readonly onSubsystemL?: () => void;
  /** final f.b(int,int), distinct from f.b(int) state command and b.b(...). */
  readonly onFPairCommand?: (first: number, second: number) => void;
  readonly onRecordCommand?: (first: number, second: number, third: number) => void;
  readonly onEntityCreate?: (team: number, x: number, y: number, type: number, flags: number) => void;
  readonly onBCreate?: (first: number, second: number, third: number, fourth: number, fifth: number) => void;
  /** f.a(byte,int,int,int,int,boolean,int) (#462): team, type, x, y, ... (names fixed 2026-09-27). */
  readonly onPlace?: (team: number, type: number, x: number, y: number, flags: number, special: boolean, existingId: number) => void;
  readonly onSubsystemM?: () => void;
  /**
   * f.b(int,int,int,int) (#540, allocateLegacySubsystemRecord), the 22-slot
   * auxiliary record initializer. Distinct from `onBCreate` (b.a(IIIBB),
   * #460) despite both being "b(...)" calls in the decompiled source --
   * confirmed via direct constant-pool read (offset 428..467 of the real
   * ai===45 branch invokes `#540 Method b:(IIII)V` directly on `this`, not
   * on the `b`-typed field `a:Lb;` that #460 targets).
   */
  readonly onSubsystemRecordAllocate?: (first: number, x: number, y: number, counterIndex: number) => void;
  readonly onMapReset?: (q: number) => void;
  readonly onMapLoad?: (q: number) => void;
  readonly onResourceReset?: () => void;
  readonly onRecordAction?: (first: number, second: number) => void;
};

export function stepLegacyStateT(input: LegacyStateTInput): void {
  const { state, dense, shortRows } = input;
  if (state.ai === 3) {
    input.onRecordCommand?.(5, 20, 2);
    const id = state.p[2] ?? 0;
    dense[UNIT_ORDER + id] = 3;
    dense[UNIT_TYPE + id] = 105;
    dense[UNIT_HOME_X + id] = 5;
    dense[UNIT_HOME_Y + id] = 10;
    dense[UNIT_TIMER + id] = 3;
    dense[5050 + id] = -1;
    return;
  }
  if (state.ai === 37) {
    input.onSubsystemL?.();
    state.aw = 1;
    input.onBCreate?.(4, 46, 9, 0, 9);
    input.onEntityCreate?.(0, 48, 9, 3, 0);
    dense[2934] = 14; dense[611] = 2;
    state.aw = 2;
    input.onBCreate?.(1, 44, 9, 1, 2);
    input.onBCreate?.(1, 45, 11, 1, 2);
    dense[658] = 7;
    input.onBCreate?.(1, 48, 11, 1, 2);
    dense[659] = 5;
    input.onBCreate?.(2, 48, 9, 1, 2);
    if (shortRows[0]) shortRows[0][17] = 0;
    return;
  }
  if (state.ai === 38) {
    input.onSubsystemL?.();
    input.onPlace?.(0, 2, 52, 18, 2, true, -1);
    input.onPlace?.(0, 2, 54, 16, 2, true, -1);
    input.onPlace?.(0, 2, 55, 19, 2, true, -1);
    input.onPlace?.(0, 2, 58, 19, 2, true, -1);
    state.aw = 0;
    input.onBCreate?.(5, 60, 12, 0, 0);
    state.aw = 2;
    input.onRecordCommand?.(57, 17, 1);
    input.onResourceReset?.();
    return;
  }
  if (state.ai === 43) {
    input.onFPairCommand?.(52, 7);
    return;
  }
  if (state.ai === 45) {
    input.onSubsystemM?.();
    input.onFPairCommand?.(57, 30);
    // BUG FIX (2026-08-31): these four calls used to go through `onBCreate`
    // (b.a(IIIBB), a batch-allocate on the `b`-typed field) with an
    // invented fifth argument of 0. Direct bytecode read (offset 428..467)
    // shows the real target is `this.b(int,int,int,int)` (#540) -- a
    // completely different, already-ported method (see
    // `onSubsystemRecordAllocate`'s own docblock).
    input.onSubsystemRecordAllocate?.(1, 54, 30, 5);
    input.onSubsystemRecordAllocate?.(1, 54, 31, 5);
    input.onSubsystemRecordAllocate?.(1, 55, 31, 5);
    input.onSubsystemRecordAllocate?.(1, 55, 32, 5);
    return;
  }
  if (state.ai === 48) {
    state.q = 2;
    input.onMapReset?.(state.q);
    state.bF = 6;
    input.onMapLoad?.(state.q);
    state.q = 3;
    input.onPlace?.(0, 24, 18, 67, 2, true, -1);
    input.onPlace?.(0, 25, 19, 69, 2, true, -1);
    input.onPlace?.(0, 25, 21, 71, 2, true, -1);
    if (shortRows[0]) shortRows[0][12] = 0;
    input.onEntityCreate?.(0, 26, 69, 60, 0);
    if (shortRows[0]) shortRows[0][17] = 1;
    input.onBCreate?.(7, 26, 69, 0, 2);
    input.onRecordCommand?.(23, 69, 1);
    input.onBCreate?.(2, 1, 69, 1, 3);
    input.onEntityCreate?.(1, 21, 69, 60, 0);
    dense[659] = 0; dense[2982] = 42;
    input.onRecordAction?.(53, -2);
    dense[657] = 0;
  }
}
