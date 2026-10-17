import { RES_AMOUNT, RES_KIND, RES_LOOK, RES_X, RES_Y } from "../../core/DenseLayout";
/** Raw state passed through b.i(); field names remain bytecode-oriented. */
export type LegacySubsystemTailState = {
  lByte: number;
  kByte: number;
};

export type LegacySubsystemTailInput = {
  readonly state: Int8Array;
  /** b's raw byte[] field used by the high-offset tail methods. */
  readonly bBytes: Int8Array;
  /** b's raw short[] indirection table. */
  readonly bShorts: Int16Array;
  readonly frame: number;
  readonly q: number;
  readonly tail: LegacySubsystemTailState;
  readonly onAj?: (index: number) => void;
  readonly onT?: () => boolean;
  readonly onU?: () => boolean;
  readonly onV?: () => boolean;
  readonly onAk?: () => void;
  readonly onAl?: () => void;
  readonly onJ?: () => void;
  readonly onSubsystemB?: (x: number, y: number, mode: number) => void;
  readonly onFByte?: (value: number) => void;
  readonly onRepairCell?: (x: number, y: number, mode: number, flag: number) => void;
  /**
   * b.v:I (#225) write at offset 478, `v = t302[q] + L:B`. Added 2026-10-09: the port kept v local,
   * so the field still held h()'s 22 between frames where the original has 0 (tutorial).
   */
  readonly setV?: (v: number) => void;
};

/**
 * Direct raw port of final b.i().
 *
 * The helper intentionally accepts b's byte/short tables instead of using
 * f's /a tables: the bytecode accesses the two arrays owned by b here.
 */
export function stepLegacySubsystemI(input: LegacySubsystemTailInput): void {
  const { state, bBytes, bShorts, tail } = input;
  const bByte = (shortIndex: number, add: number): number => {
    const index = (bShorts[shortIndex] ?? 0) + add;
    return bBytes[index] ?? 0;
  };

  for (let aM = 0; aM < 50; aM += 1) {
    const type = state[RES_KIND + aM];
    if (type === 0) continue;

    let amount = state[RES_AMOUNT + aM];
    if ((input.frame & 127) === 1 && type === 6 && amount > 0) {
      amount = toByte(amount - 1);
      state[RES_AMOUNT + aM] = amount;
    } else if (
      (input.frame & 511) === 1 &&
      type !== 7 &&
      amount < bByte(110, type)
    ) {
      amount = toByte(amount + 1);
      state[RES_AMOUNT + aM] = amount;
    }

    if ((input.frame & 7) === (aM & 7)) input.onAj?.(aM);

    for (let w = 0; w <= 3; w += 1) {
      // Offsets 233..292: `if (dense[9883+aM] > t110[kind] * t85[w] / 10) continue;`
      // CORRECTED 2026-09-21: this was `(amount * t110[kind]) / 10 > t85[w]`,
      // multiplying the wrong pair, so the comparison was true for every w and
      // the loop never assigned a stage -- `9933 + aM` stayed 0 for every node,
      // which is what `c(byte)` (#360) reads to decide whether a bush still
      // looks harvestable. See docs/unknowns.md's 2026-09-21 entry.
      const rate = bByte(110, type);
      const threshold = bByte(85, w);
      if (amount > Math.trunc((rate * threshold) / 10)) continue;
      if (state[RES_LOOK + aM] !== w) {
        input.onRepairCell?.(state[RES_X + aM], state[RES_Y + aM], 1, 1);
        state[RES_LOOK + aM] = toByte(w);
      }
      break;
    }
  }

  if (input.onT?.()) return;
  if (input.q === 4 ? input.onU?.() : input.onV?.()) return;

  input.onAk?.();
  input.onAl?.();
  if (input.q > 4) return;

  // BUG FIX: the three `if_icmpXX ... 635` checks below (bytecode offsets
  // 487/517/548, all targeting the method's shared `635: return`) gate the
  // ENTIRE rest of the method -- the L-byte advance AND the onJ/onSubsystemB/
  // onFByte calls -- not just the L-byte advance. The previous port only
  // wrapped the L-byte write in this condition and called onJ/onSubsystemB/
  // onFByte unconditionally every tick once q<=4. That made onFByte (f.b(int),
  // the scene/dialogue-state command) fire every single tick regardless of
  // whether `v` was even inside q's configured [table302[q], table302[q+1])
  // range. For q values with an empty range (table302[q] === table302[q+1],
  // e.g. q===0, confirmed via the real packed resource data), `v < table302[
  // q+1]` is never true, so the real bytecode returns immediately at offset
  // 517 without ever reaching onFByte -- but the old port still called
  // onFByte every tick with the out-of-range `v` anyway. That spurious call
  // (onFByte(table301[0])) forces `ai` back to a fixed value via S() every
  // single vByte===1 tick, permanently overriding any real scene-paging
  // progress (confirmed live: this is exactly what kept the intro cutscene's
  // Q looping between 17 and 14 forever, see docs/unknowns.md).
  const v = bByte(302, input.q) + tail.lByte;
  input.setV?.(v);
  if (
    tail.kByte >= 50 &&
    v < bByte(302, input.q + 1) &&
    input.frame >= bByte(299, v) * 100
  ) {
    // BUG FIX: this comparison (bytecode offsets 556..586) reads `f.c:I`
    // (input.frame), not the L-byte being written -- confirmed by manual
    // JVM stack simulation (frame is pushed at offset 560, immediately
    // before the table299[v+1]*100 threshold, and `if_icmplt` at offset 586
    // compares the two topmost stack values, i.e. frame vs threshold). The
    // previous port compared `tail.lByte` (the field being incremented, a
    // completely different value) against the same threshold instead.
    tail.lByte = toByte(tail.lByte + (input.frame >= bByte(299, v + 1) * 100 ? 2 : 1));
    input.onJ?.();
    input.onSubsystemB?.(0, 0, 3);
    input.onFByte?.(bByte(301, v));
  }
}

function toByte(value: number): number {
  const narrowed = value & 0xff;
  return narrowed >= 0x80 ? narrowed - 0x100 : narrowed;
}
