import { BLD_KIND, BLD_LEVEL, BLD_OWNER, BLD_WORK, RES_AMOUNT, UNIT_CARRY_AMOUNT, UNIT_CARRY_CAPACITY, UNIT_MODE, UNIT_RECORD, UNIT_SLOT, UNIT_TYPE, UNIT_WORK_PROGRESS } from "../../core/DenseLayout";
import { T_SKILL_ATTR, T_SKILL_CAP, T_SKILL_CHANCE, T_SKILL_STEP } from "../../core/DataTables";
/**
 * Direct translation of `private boolean j()` (constant pool #395, a
 * distinct overload from `private void j(int)`), bytecode/b-javap.txt
 * offsets 0..1261 (line 23642).
 *
 * **RETRACTED (2026-09-04/2026-09-07)**: this docblock used to conclude
 * this method's only call site (`i()`'s offset 595,
 * `LegacySubsystemEntityProbe.ts`) is unreachable because it sits beneath
 * `i()`'s own call to `J()` (#246, offset 192), which was believed a
 * guaranteed throw. `J()` was restored 2026-09-04 (`subsystemEntityJTrigger`)
 * and returns normally, so `i()`'s offset 595 -- and this method -- ARE
 * reachable; `LegacySubsystemEntityProbe.ts` now calls this via
 * `onAssociationScan`. See docs/unknowns.md's 2026-09-04/09-07 entries.
 *
 * Real structure:
 *  - `dense[2929+id]===-116 && dense[404+id]>=table(49,type)`: dispatches
 *    on type -- calls `K()` (`LegacySubsystemEntityTypeReaction.ts`, `onK`,
 *    wired 2026-09-23) for types `94..97`, or (type `===55`)
 *    `j(int)`(#394, `onJInt`, wired 2026-09-21) with `dense[404+id]` reset to
 *    `0`; always returns `false` on this branch.
 *  - Otherwise, a long real tail gated on `table(33,type)===4` and
 *    `dense[404+id]>=table(49,type)`, containing two sites this project
 *    previously misjudged as guaranteed throws via permanently-null
 *    fields -- both fields are real and allocated (see the RETRACTED-PREMISE
 *    markers below), and both are now ported for real:
 *    - `dense[8627+assoc]!==0` (offset 449..547): a bucket-scan loop over
 *      class `b`'s own `g:[[B]`(#176, `LegacySubsystemArrays.gRows`,
 *      `byte[3][20]`, `f.g()`-allocated) -- `for (s=0; s<20; s++) { if
 *      (gRows[0][s]===assoc) break; }` then `gRows[1][s] += 1` (byte
 *      narrow). Reuses the SAME `S:I`(#51, `game.subsystemS`) scratch as
 *      `LegacySubsystemEntityProbe.ts`'s own use of it -- threaded the same
 *      way, via a mutable `{value}` ref.
 *    - `table(31,type)!==13` (offset 703..792): `dense[saveOffsets[table(31,type)]
 *      + dense[3838+id]] += A:I` (`#7`, `game.subsystemA`) -- a
 *      read-modify-write (`i2b`-narrowed), NOT an overwrite, indexed
 *      through `b:[S]`(#132)/`saveOffsets` (alias of `f.b:[S]`(#245),
 *      allocated by `e.f()`, e-javap.txt:1115 -- the SAME field this
 *      project's whole 2026-09-04 sweep started from).
 *  - `type in {11,14}` and `dense[3636+id]<dense[3737+id]` calls `N()`
 *    (already ported, `LegacySubsystemN.ts`) and returns `true` -- the
 *    method's ONLY `return true` besides the `K()`-dispatch-adjacent path.
 *    Every other tail (`dense[9883+assoc]` decrement, `mainShort[team][0]`
 *    bump for type `54`) falls through to `return false`.
 *
 * **Bug fixed alongside this restoration (found while re-tracing the
 * method's tail to reach the two RETRACTED-PREMISE sites, offset 864..890,
 * already within this file's scope, not a separate site)**: the
 * `type===107 && zValue>=20` branch was ported as `state[4444 + id] = id`.
 * The real bytecode is `dense[4444 + dense[4444+id]] = (byte) id` --
 * offset 864 pushes `dense` and `4444` for the STORE base, then a SEPARATE
 * nested read of `dense[4444+id]` (offset 868..883, added to the `4444`
 * base) before pushing `id` as the value (offset 885..889). The port had
 * dropped the inner indirection and stored directly at `4444+id`.
 */
export type LegacySubsystemEntityAssociationScanInput = {
  readonly state: Int8Array;
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
  /** b.b:[S] (#132), alias of f.b:[S] (#245) -- saveOffsets, 570 entries. */
  readonly saveOffsets: Int16Array;
  /** b.g:[[B] (#176) -- LegacySubsystemArrays.gRows, byte[3][20]. */
  readonly gRows: readonly Int8Array[];
  readonly mainShort: Int16Array[];
  readonly entityId: number;
  readonly team: number;
  /** b.z:I (#234), same field as game.subsystemEntityZ elsewhere. */
  readonly zValue: number;
  /** b.A:I (#7) -- game.subsystemA, read-only here. */
  readonly aValue: number;
  /**
   * b.S:I (#51) -- game.subsystemS, written by the gRows bucket scan
   * (offset 474..528). Mutable ref, same convention as
   * `LegacySubsystemEntityProbe.ts`'s own use of this field.
   */
  readonly s: { value: number };
  /** private void K() (#247) -- LegacySubsystemEntityTypeReaction.ts. */
  readonly onK?: () => void;
  /** private void j(int) (#394) -- confirmed real call, not derived. */
  readonly onJInt?: (arg: number) => void;
  /** private boolean b(int,int) (#347) -- confirmed real call, not derived. */
  readonly onCheckSlotProgress?: (kind: number, index: number) => boolean;
  /** private boolean a(byte,byte,byte,byte) (#293) -- SAME method K()'s own onCheckQuad target. */
  readonly onCheckQuad?: (arg1: number, arg2: number, arg3: number, arg4: number) => boolean;
  /** b.f:Z (#172), live -- i()Z reads it back at offset 917 (LegacySubsystemEntityProbe.ts). */
  readonly f: { value: boolean };
  /** private void N() (#250) -- already ported, LegacySubsystemN.ts. */
  readonly onN?: () => void;
};

function table(bytes: Int8Array, offsets: Int16Array, row: number, index: number): number {
  return bytes[(offsets[row] ?? 0) + index] ?? 0;
}

export function stepLegacySubsystemEntityAssociationScan(
  input: LegacySubsystemEntityAssociationScanInput,
): boolean {
  const { state, packedBytes, packedOffsets, entityId: id, team } = input;
  const mode = state[UNIT_MODE + id] ?? 0;
  const type = state[UNIT_TYPE + id] ?? 0;

  if (mode === -116 && (state[UNIT_WORK_PROGRESS + id] ?? 0) >= table(packedBytes, packedOffsets, 49, type)) {
    if (type >= 94 && type <= 97) {
      input.onK?.();
      return false;
    }
    if (type !== 55) return false;
    input.onJInt?.(1);
    state[UNIT_WORK_PROGRESS + id] = 0;
    return false;
  }

  if (table(packedBytes, packedOffsets, 33, type) !== 4) return false;
  if ((state[UNIT_WORK_PROGRESS + id] ?? 0) < table(packedBytes, packedOffsets, 49, type)) return false;

  const assoc = state[UNIT_RECORD + id] ?? 0;

  if ((state[UNIT_SLOT + id] ?? 0) >= 0) {
    const bit2 = table(packedBytes, packedOffsets, 70, state[BLD_KIND + assoc] ?? 0) & 2;
    // Direct jumps to the b(int,int) call (offset 365) bypass the
    // dense[8627+assoc] check entirely; everything else (including the
    // bit2!==0 path) funnels through that same check (offset 340..362)
    // before deciding.
    let reachSlot365Directly = false;
    if (bit2 === 0) {
      if ((state[BLD_OWNER + assoc] ?? 0) === id) {
        reachSlot365Directly = true;
      } else {
        const bit1 = table(packedBytes, packedOffsets, 70, state[BLD_KIND + assoc] ?? 0) & 1;
        reachSlot365Directly = bit1 > 0;
      }
    }
    if (reachSlot365Directly || (state[BLD_WORK + assoc] ?? 0) !== 0) {
      const kind = (state[BLD_WORK + assoc] ?? 0) !== 0 ? 16 : (state[BLD_KIND + assoc] ?? 0);
      input.f.value = input.onCheckSlotProgress?.(kind, (state[BLD_LEVEL + assoc] ?? 0) - 1) ?? false; // offset 446
    }
  } else {
    const bit2 = table(packedBytes, packedOffsets, 48, type) & 2;
    if (bit2 === 0) {
      const arg1 = table(packedBytes, packedOffsets, T_SKILL_ATTR, type);
      const arg2 = table(packedBytes, packedOffsets, T_SKILL_CHANCE, type);
      const arg3 = table(packedBytes, packedOffsets, T_SKILL_CAP, type);
      const arg4 = table(packedBytes, packedOffsets, T_SKILL_STEP, arg1);
      input.onCheckQuad?.(arg1, arg2, arg3, arg4); // offset 699..702: result popped (CORRECTED 2026-09-14, was stored)
    }
  }

  if ((state[UNIT_SLOT + id] ?? 0) >= 0 && (state[BLD_WORK + assoc] ?? 0) !== 0) {
    // offset 449..547: bucket-scan gRows[0] for `assoc`; the loop
    // condition (`S<20`) is checked BEFORE the match check, so an
    // exhausted scan leaves S===20 and offset 531's `gRows[1][S] += 1`
    // then indexes one past gRows[1]'s real length-20 capacity. Real Java
    // throws ArrayIndexOutOfBoundsException there (uncaught by this
    // method, propagating to whatever caught it further up -- same
    // convention as LegacyCComposition.ts's `checkArrayIndex`); plain JS
    // typed-array access would silently no-op instead, so this is checked
    // explicitly rather than left to fall through.
    const { gRows } = input;
    let s = 0;
    while (s < 20 && (gRows[0]?.[s] ?? 0) !== assoc) s += 1;
    input.s.value = s;
    if (s >= 20) {
      throw new RangeError(`b's gRows[1] is length 20; index ${s} is out of bounds`);
    }
    if (gRows[1]) gRows[1][s] = (gRows[1][s] ?? 0) + 1;
  }

  if (table(packedBytes, packedOffsets, 31, type) !== 13) {
    // offset 703..792: dense[saveOffsets[table(31,type)] + dense[3838+id]]
    // += A:I (read-modify-write, i2b-narrowed) -- NOT an overwrite.
    const idx = (input.saveOffsets[table(packedBytes, packedOffsets, 31, type)] ?? 0) + (state[3838 + id] ?? 0);
    state[idx] = (state[idx] ?? 0) + input.aValue;
  }

  state[UNIT_WORK_PROGRESS + id] = 0;

  if (type === 111) input.f.value = true; // offset 826
  if (type === 107) {
    if (input.zValue < 20) {
      input.f.value = true; // offset 858
    } else {
      // offset 864..890: dense[4444 + dense[4444+id]] = (byte) id -- NOT
      // dense[4444+id] = id (bug fixed 2026-09-07, see docblock).
      state[UNIT_RECORD + (state[UNIT_RECORD + id] ?? 0)] = id;
    }
  }
  if (
    table(packedBytes, packedOffsets, 31, type) === 36 &&
    table(packedBytes, packedOffsets, 30, type) === 99 &&
    (state[UNIT_CARRY_AMOUNT + id] ?? 0) >= (state[UNIT_CARRY_CAPACITY + id] ?? 0)
  ) {
    // offset 984: carry full. CORRECTED 2026-09-14: this was a discarded local;
    // i()Z reads it at offset 917 to send the unit home (k()Z / I()).
    input.f.value = true;
  }

  if (type === 11 || type === 14) {
    if ((state[UNIT_CARRY_AMOUNT + id] ?? 0) < (state[UNIT_CARRY_CAPACITY + id] ?? 0)) {
      input.onN?.();
      return true;
    }
  }

  if (type === 10 || type === 15 || type === 12 || type === 16 || type === 13) {
    state[RES_AMOUNT + assoc] = (state[RES_AMOUNT + assoc] ?? 0) - 1;
    if ((state[RES_AMOUNT + assoc] ?? 0) < 0) state[RES_AMOUNT + assoc] = 0;
    return false;
  }

  if (type === 54) {
    const row = input.mainShort[team];
    if (row) row[0] = (row[0] ?? 0) + 1;
  }
  return false;
}
