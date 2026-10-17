import { BLD_KIND, BLD_LEVEL, BLD_OWNER, BLD_WORK, BLD_WORKERS, UNIT_RECORD, UNIT_SLOT } from "../../core/DenseLayout";
import { T_BUILDING } from "../../core/DataTables";
/**
 * Direct port of `final byte b.a(int)`, bytecode/b-javap.txt offsets
 * 0..144 (of the disassembly listing; ~110 real instructions). This is
 * the previously-unresolved `nibbleSource` callback
 * `LegacyGameplayNegativeEntityBranch.ts`'s selection-indicator section
 * calls (as `callbacks.nibbleSource?.(-id)`, i.e. always with a POSITIVE
 * argument -- this function's own `+id` offset arithmetic matches that
 * convention directly, confirmed by the offsets here being identical to
 * the negative branch's own `[NNNN - id]` reads with the original
 * negative id).
 *
 * Class `b`'s field #61 (`a:[B]`) is the same shared dense-state array as
 * `f.e:[B]` (#286) -- confirmed by every offset here (8749, 8627, 8810)
 * being byte-for-byte identical to fields the already-ported, independently
 * tested `LegacyGameplayNegativeEntityBranch.ts` reads via `[NNNN - id]`
 * with the original negative id, which lands on the same array index as
 * `[NNNN + (-id)]` here. Likewise `b:[B]` (#130) and `a:[S]` (#66) match
 * the `packedBytes`/`packedOffsets[138]` convention used throughout this
 * whole cluster.
 *
 * The static helper this method calls (constant pool #334,
 * `private static int b(int,int,int)`) is a plain three-way clamp
 * (`value<min -> min`, `value>=max -> max`, else `value`), opened and
 * inlined directly rather than left as a callback -- confirmed by reading
 * its own six-instruction body, not assumed from the argument shape.
 */
export function legacyEntitySelectionNibble(
  id: number,
  dense: Int8Array,
  packedBytes: Int8Array,
  packedOffsets: Int16Array,
): number {
  let local2 = dense[BLD_WORKERS + id] ?? 0;

  const tableVal = packedBytes[packedOffsets[T_BUILDING] + 156 + (dense[BLD_KIND + id] ?? 0)] ?? 0;
  if (tableVal > -1 || (dense[BLD_WORK + id] ?? 0) !== 0) {
    const marker = dense[BLD_OWNER + id] ?? 0;
    // Offsets 66..111: `iflt 114` -- a negative e[4646 + marker] counts straight away; otherwise it
    // counts unless e[4444 + marker] is this building. CORRECTED 2026-10-15 (pixel comparison,
    // play26 frame 37500): this required e[4646 + marker] >= 0, so a building's first pip stayed dark.
    if (marker > 0 && ((dense[UNIT_SLOT + marker] ?? 0) < 0 || (dense[UNIT_RECORD + marker] ?? 0) !== id)) {
      local2 = toJavaByte(local2 + 1); // bytecode offset 117's explicit i2b.
    }
  }

  let tableResult: number;
  if ((dense[BLD_WORK + id] ?? 0) !== 0) {
    tableResult = packedBytes[packedOffsets[T_BUILDING] + 494 + (dense[BLD_KIND + id] ?? 0)] ?? 0;
  } else if ((dense[BLD_KIND + id] ?? 0) === 3) {
    tableResult = 1;
  } else {
    const markerIndex = dense[BLD_LEVEL + id] ?? 0;
    tableResult = packedBytes[packedOffsets[T_BUILDING] + (markerIndex - 1) * 26 + (dense[BLD_KIND + id] ?? 0)] ?? 0;
  }

  const clamped = clampByte(tableResult - local2, 0, 7);
  return toJavaByte(local2 + (clamped << 4));
}

function clampByte(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value >= max) return max;
  return value;
}

function toJavaByte(value: number): number {
  const narrowed = value & 0xff;
  return narrowed >= 0x80 ? narrowed - 0x100 : narrowed;
}
