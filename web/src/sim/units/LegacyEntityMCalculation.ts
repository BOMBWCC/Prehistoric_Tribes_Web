import { BLD_HP, BLD_PLANNED_KIND, UNIT_AGE, UNIT_CARRY_AMOUNT, UNIT_CARRY_KIND, UNIT_HELD_ITEM } from "../../core/DenseLayout";
import { T_BUILDING, T_TYPE_JOB } from "../../core/DataTables";
/**
 * Raw m-field calculation from b.a(int,int,boolean), javap offsets 54..429
 * (bytecode/b-javap.txt:5796..5985).
 *
 * CORRECTED 2026-09-07: this file was written while `a(int,int,boolean)`
 * was believed a 100%-guaranteed throw (see `LegacyRuntimeState.
 * subsystemEntityTransform`'s own now-corrected docblock), so this code
 * path was never exercised end to end. Restoring the entry point for real
 * (`LegacySubsystemEntityTransform.ts`) surfaced three real bugs, found by
 * re-tracing every offset against the raw bytecode instead of trusting the
 * existing `relative()` helper:
 *
 *  1. **Wrong table base for 5 of 6 lookups.** `relative()` unconditionally
 *     read `packedBytes[packedOffsets[138] + offset + index]` for every
 *     call. Only ONE of the six real lookups actually uses that `po[138]`
 *     base (the offset-214..262 `packedBytes[po[138]+182+dense[9237+k2]]`
 *     threshold, which really does `sipush 138; saload` before adding
 *     182). The other five (`po[16]`, `po[17]`, `po[121]`, `po[19]`,
 *     `po[18]`, `po[41]`) are direct `bipush N; saload` on `packedOffsets`
 *     with NO `138` anywhere nearby -- confirmed by grepping every
 *     `bipush`/`sipush` in the method's raw bytecode. Fixed by giving the
 *     `po[138]+182` case its own explicit computation and using a plain
 *     `packedOffsets[N]` lookup (`table()`) for the rest.
 *  2. **`currentK===4` selector branches were swapped.** Offsets 97..110:
 *     `if (currentK===4) goto 109 (push 2) else push 1`, then `k[index]`.
 *     So `currentK===4` selects `k[2]`, everything else selects `k[1]` --
 *     the OPPOSITE of the previous `selector = currentK===4 ? 1 : 2`.
 *  3. **Missing outer `k3`-gate around the second m-assignment.** The real
 *     control flow is `if (k3===0) { m = po16/po17 lookup; if (currentK===2)
 *     {...two more possible overwrites...} } else { m = po19-lookup-or-107
 *     }` (offsets 60/116/274 in the raw bytecode). The previous version
 *     used a flat `if (currentK===2) {...} else if (...) {...} else {m=107}`
 *     with no `k3` gate at all, so it wrongly re-ran the po19/107 branch
 *     whenever `k3===0 && currentK!==2` (clobbering the po16/po17 result
 *     that offsets 63..113 unconditionally compute in that case), and
 *     wrongly took the `currentK===2` sub-adjustments whenever
 *     `k3!==0 && currentK===2` (a case the real bytecode never even visits
 *     that region for -- offset 60's `ifne 274` skips 63..271 entirely).
 *
 * RETRACTED 2026-09-14: this docblock used to say every `k[0]` read here is
 * really `k:B`, so `k0` was dropped. Offsets 295..299 are `getfield k:[B;
 * iconst_0; baload` -- the array -- while 87/98/117/317 read `k:B`. They
 * differ once `private byte a()` (#276, ported 2026-09-14) rewrites `k:B` to
 * 7 or 8, so both are inputs again.
 */
export type LegacyEntityMCalculationInput = {
  readonly state: Int8Array;
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
  readonly entityId: number;
  /** k[0] -- read only at offsets 295..299. */
  readonly k0: number;
  readonly k1: number;
  readonly k2: number;
  readonly k3: number;
  /** k:B (#197), after a() -- see the module docblock. */
  readonly currentK: number;
  readonly flag: boolean;
  readonly fQ: number;
};

function table(input: LegacyEntityMCalculationInput, tableId: number, index: number): number {
  return input.packedBytes[(input.packedOffsets[tableId] ?? 0) + index] ?? 0;
}

export function calculateLegacyEntityM(input: LegacyEntityMCalculationInput): number {
  const { state, entityId: id, currentK } = input;
  let m: number;

  if (input.k3 === 0) {
    // Offsets 63..113: m = packedBytes[po[16] + packedBytes[po[17]+currentK] + k[currentK===4?2:1]].
    const inner = table(input, 17, currentK);
    const kSelected = currentK === 4 ? input.k2 : input.k1;
    m = table(input, 16, inner + kSelected);

    if (currentK === 2) {
      // Offsets 124..200.
      if (
        input.k1 === 6 &&
        (state[UNIT_CARRY_AMOUNT + id] ?? 0) > 0 &&
        (state[UNIT_CARRY_KIND + id] ?? 0) <= 13 &&
        !input.flag
      ) {
        m = table(input, 121, state[UNIT_CARRY_KIND + id] ?? 0);
      }
      // Offsets 203..271: independent of the check above (both can fire in sequence).
      if (input.k1 >= 12) {
        // Confirmed real po[138]+182 base -- the one lookup in this method
        // that genuinely reads a literal `sipush 138` (offset 237).
        const threshold = input.packedBytes[
          (input.packedOffsets[T_BUILDING] ?? 0) + 182 + (state[BLD_PLANNED_KIND + input.k2] ?? 0)
        ] ?? 0;
        if ((state[BLD_HP + input.k2] ?? 0) >= threshold) m = 69;
      }
    }
  } else if ((state[UNIT_AGE + input.k2] ?? 0) >= 12 || input.k0 === 2) {
    // Offsets 304..335.
    m = table(input, 19, currentK - 1) + (input.flag ? 1 : 0);
  } else {
    // Offsets 341..344.
    m = 107;
  }

  // Shared tail, offsets 347..429.
  if (m <= 9) m += table(input, 18, state[UNIT_HELD_ITEM + id] ?? 0);
  if (input.fQ === 3 && table(input, T_TYPE_JOB, m) !== 0) m = 69;
  return toByte(m);
}

function toByte(value: number): number {
  const narrowed = value & 0xff;
  return narrowed >= 0x80 ? narrowed - 0x100 : narrowed;
}
