import { BLD_KIND, UNIT_RECORD, UNIT_TARGET_X, UNIT_TARGET_Y, UNIT_TYPE } from "../../core/DenseLayout";
import { T_BUILDING } from "../../core/DataTables";
/**
 * Direct port of class b's `private int a(int, int, int)` (bytecode/b-javap.txt
 * offsets 0..499, header at line 7280) -- `as()`'s and `aw()`'s shared
 * "occupancy/placement score" helper (both real call sites pass the
 * trailing arg, `arg3`, as the literal `0`).
 *
 * **RETRACTED (2026-09-07)** -- this file previously threw immediately
 * past the first real guard, on the finding that class b's own `b:[S]`
 * (#132) is "confirmed permanently null: one `putfield`, the constructor's
 * already-null alias copy from `f.b:[S]`". That premise is false: `b:[S]`
 * is allocated by `e.f()` (`e-javap.txt:1115`, `new short[570]`) and
 * copied into `b.b:[S]` at `b.a(f)` (`b-javap.txt:550`); this port already
 * has it decoded and live as `LegacyRuntimeState.saveOffsets`. The
 * previous docblock also under-counted the method itself -- it is 499
 * bytes end to end, not the "offsets 0..48+" a first pass derived before
 * stopping at the first `getfield #132`. The whole method is real,
 * reachable arithmetic, ported below in full.
 *
 * Control flow (offsets against `bytecode/b-javap.txt:7280`; `v` is `this`'s
 * own `v:I`#225, the entity currently being processed -- ambient, not a
 * parameter in the original, but threaded through explicitly here as `id`,
 * matching the existing `LegacySubsystemAs.ts`/`LegacySubsystemAw.ts`
 * `onCheckOccupancy` callback convention):
 *  - 0..22: `if (arg3===0 && dense[4444+id] < -1) return 0;`.
 *  - 23..53: `local4 = dense[ saveOffsets[arg3!==0?110:44] + id ]` (when
 *    `arg3===0`, `saveOffsets[44]` is the SAME `4444` stride the guard
 *    above uses directly -- confirmed by the arithmetic; this port's
 *    `saveOffsets` values run `i*101` at least through the indices this
 *    method touches). Branches on `local4 < 1`.
 *  - 56..90 (only when `local4>=1`): looks up
 *    `packedBytes[packedOffsets[28]+dense[2828+id]]` (a type-keyed table;
 *    `dense[2828+id]` is this port's established "type" field). If that
 *    equals `43`, OR `arg3!==0`, falls through to the 91..151 branch
 *    below; otherwise (only when `arg3===0` and the table value isn't 43)
 *    takes the 154..421 branch.
 *  - 91..151 branch: `q = dense[saveOffsets[arg3!==0?112:31]+id]`,
 *    `r = dense[saveOffsets[arg3!==0?113:32]+id]`, then joins at 422.
 *  - 154..421 branch: re-reads the same type-keyed table value (`tv`),
 *    sets `q = dense[saveOffsets[tv]+local4]` and
 *    `r = dense[saveOffsets[tv+1]+local4]`. If `tv===83`: reclamps both
 *    through the SAME `clampToRange` static helper (constant pool #334,
 *    already known in this port from `LegacySubsystemAn.ts`/
 *    `LegacyEntitySelectionNibble.ts`) against a packed-table-138 spread
 *    keyed by `dense[8749+local4]` (this port's "level" field), THEN --
 *    only when `dense[2828+id] <= 9` -- writes the clamped pair back into
 *    `dense[3131+id]`/`dense[3232+id]` (the same cells
 *    `LegacySubsystemAs.ts` already reads as "last known position").
 *    Joins at 422.
 *  - 422..499 (join): `d1 = (byte)(q-x)`, `d2 = (byte)(r-y)` (`x`/`y` are
 *    the method's real `arg1`/`arg2`, likewise threaded through
 *    explicitly); if either is outside `[-12,12]`, returns the literal
 *    `200`; otherwise returns `packedBytes[packedOffsets[53] +
 *    (12+d2)*25 + 12+d1]` -- the SAME table-53 formula
 *    `LegacyCellCompatibilityCheck.ts` uses for its own delta-clamped scan
 *    lookup (independently confirmed identical).
 *
 * `q`/`r` here stand in for class b's own instance fields `q:B`(#212)/
 * `r:B`(#215) -- genuine side effects in the original: `private void
 * d(int)` (`b-javap.txt:1508`) calls this method and then reads them back
 * (`getfield #212`/`#215` immediately after the `invokespecial #266`,
 * offsets 32..44). That caller is not ported in this codebase yet, so
 * `q`/`r` are kept as locals here rather than plumbed out as an output
 * channel nothing currently reads -- flagging this explicitly rather than
 * silently dropping the side effect: whoever ports `b.d(int)` next will
 * need `q`/`r` exposed from here.
 *
 * The previous stub's own parameter list was also incomplete -- it never
 * carried `arg1`/`arg2` (the method's real `x`/`y`), because nothing past
 * the guaranteed-throw needed them. The real body does, so this port now
 * takes `x`/`y` too, matching the existing `onCheckOccupancy?: (id, x, y,
 * arg) => number` callback shape already declared (but never fully wired)
 * in `LegacySubsystemAs.ts`/`LegacySubsystemAw.ts`.
 */
function clampToRange(value: number, min: number, max: number): number {
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

function toJavaByte(value: number): number {
  const narrowed = value & 0xff;
  return narrowed >= 0x80 ? narrowed - 0x100 : narrowed;
}

export function stepLegacySubsystemEntityOccupancyCheck(
  state: Int8Array,
  packedBytes: Int8Array,
  packedOffsets: Int16Array,
  saveOffsets: Int16Array,
  id: number,
  x: number,
  y: number,
  arg3: number,
  /**
   * b.q:B (#212) / b.r:B (#215): the method stores q/r in these fields, which
   * d(int) (#366, LegacySubsystemPairSetup.ts) reads back. Passed since
   * 2026-09-28; before that q/r stayed locals and d(int) always saw 0/0.
   */
  fields?: { bField212: number; bField215: number },
): number {
  if (arg3 === 0 && (state[UNIT_RECORD + id] ?? 0) < -1) return 0;

  const type = state[UNIT_TYPE + id] ?? 0;
  const local4 = state[(saveOffsets[arg3 !== 0 ? 110 : 44] ?? 0) + id] ?? 0;
  const tableVal = packedBytes[(packedOffsets[28] ?? 0) + type] ?? 0;

  let q: number;
  let r: number;

  if (local4 >= 1 && tableVal !== 43 && arg3 === 0) {
    q = state[(saveOffsets[tableVal] ?? 0) + local4] ?? 0;
    r = state[(saveOffsets[tableVal + 1] ?? 0) + local4] ?? 0;

    if (tableVal === 83) {
      const level = state[BLD_KIND + local4] ?? 0;
      const spanQ = packedBytes[(packedOffsets[T_BUILDING] ?? 0) + 104 + level] ?? 0;
      q = toJavaByte(clampToRange(x, q, q + spanQ - 1));
      const spanR = packedBytes[(packedOffsets[T_BUILDING] ?? 0) + 130 + level] ?? 0;
      r = toJavaByte(clampToRange(y, r, r + spanR - 1));

      if (type <= 9) {
        state[UNIT_TARGET_X + id] = q;
        state[UNIT_TARGET_Y + id] = r;
      }
    }
  } else {
    q = state[(saveOffsets[arg3 !== 0 ? 112 : 31] ?? 0) + id] ?? 0;
    r = state[(saveOffsets[arg3 !== 0 ? 113 : 32] ?? 0) + id] ?? 0;
  }

  if (fields) {
    fields.bField212 = toJavaByte(q);
    fields.bField215 = toJavaByte(r);
  }
  const d1 = toJavaByte(q - x);
  const d2 = toJavaByte(r - y);
  if (d1 < -12 || d1 > 12 || d2 < -12 || d2 > 12) return 200;
  return packedBytes[(packedOffsets[53] ?? 0) + (12 + d2) * 25 + 12 + d1] ?? 0;
}
