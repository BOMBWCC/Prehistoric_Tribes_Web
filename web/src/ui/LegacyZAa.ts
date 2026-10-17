import { BLD_KIND, BLD_LEVEL, UNIT_CARRY_AMOUNT } from "../core/DenseLayout";
export type LegacyZAaState = {
  readonly e: Int8Array;
  readonly packed: Int8Array;
  readonly packedOffsets: Int16Array;
  readonly tiles: Int8Array[][];
  readonly a2dByte: Int8Array[];
  readonly a2dShort: Int16Array[];
  readonly s: Int8Array;
  readonly r: Int8Array;
  readonly q: number;
  k: number;
  F: number;
  au: number;
  av: number;
  at: number;
  ar: number;
};

/**
 * Direct mirror of private f.aa(), javap offsets 0..604.
 *
 * The mode===0 branch (offsets 16..264) was re-derived from raw bytecode on
 * 2026-08-21 and found to disagree with BOTH pre-existing translations of
 * this same method: this file's own earlier version, and the separately
 * wired `fillLegacyZChoiceRows` (`LegacyZChoiceRows.ts`, only mode===0,
 * still missing the `at=9` write; that file was deleted 2026-09-03 once
 * this confirmed-superseded, unreferenced-outside-its-own-test status was
 * re-verified). Confirmed via exact offset-by-offset reading:
 *  - The threshold check (offset 114..133) is `row >= 6` (`row` being the
 *    table-143 lookup), not `value + row >= 6`.
 *  - `av` (offset 144..163) is `value - sectionStart`, where `sectionStart`
 *    is `packedBytes[packedOffsets[144]+section]` -- the SAME expression
 *    used to initialize `value` before the loop, i.e. the loop's own start
 *    boundary. Not `row - section` and not `value - sectionEnd`.
 *  - The `s[]` write index (offset 190..210) is also `value - sectionStart`
 *    (matching `av`'s formula exactly, not `ar` and not `row - section`).
 *  - The `s[]` write value (offset 211..238) is a direct `tiles[0][au][row]`
 *    lookup, not `row - sectionEnd + tiles[0][au][row]`.
 * mode===6 (offset 265..531) and mode===8 (offset 532..604) were re-checked
 * against the same bytecode and are unchanged -- both already matched.
 *
 * BOUNDS FACT (2026-09-03, array-bounds-loop-terminator sweep, `1d926c8`'s
 * class of bug): the mode===0 `au`-scan loop (offset 16..53) increments
 * `au` -- `f`'s own `au:B` field, constant-pool #224, confirmed `byte` via
 * `bytecode/f-javap.txt:21248`'s raw `getfield #224 // Field au:B` --
 * as `au=(byte)(au+1)` (`i2b` right after `iadd`), but unlike `aj()`'s
 * `l:B` loop (see `LegacyZAj.ts`), this index has NO added base offset:
 * the raw bytecode is `tiles[0][au][11]` (`aaload` directly on `au`).
 * Java array indices can never be negative, so the instant `au` wraps to
 * -128 (after 128 iterations), the very next `tiles[0][au]` throws
 * `ArrayIndexOutOfBoundsException` -- and it throws even sooner if
 * `tiles[0].length` (the real row count) is below 128, which it always is
 * for real map/tile data. `aa()` itself has no try/catch of its own
 * (confirmed: no `Exception table` entry anywhere in its disassembly),
 * but its sole caller `f.Z()` wraps its ENTIRE body (offsets 0..348,
 * covering the `aa()`/`ab()`/`ac()`/`ai()` call cluster) in
 * `try { ... } catch (Exception e) { }` (see `bytecode/f-javap.txt`'s
 * `Z()` listing) -- so real Java aborts just this frame's `Z()` step and
 * silently continues. Plain JS `Int8Array[]`/array indexing has neither
 * guarantee: an out-of-bounds `tiles[0][au]` read returns `undefined`,
 * `?.[11]` degrades that to `undefined`, and `undefined !== state.q` is
 * true forever -- an infinite spin with no exception and no console
 * output (composeLegacyC's exact bug signature). Fixed the same way
 * `1d926c8` fixed `composeLegacyC`: `checkArrayIndex()` throws exactly
 * where Java's `aaload` would, and `stepFrameSelectionTransition()`
 * (`LegacyRuntimeState.ts`, the TS mirror of `Z()`+`ai()`) now wraps its
 * body in the matching `try/catch` that Z() has and this port was
 * missing -- without that companion fix the throw here would have
 * escaped further up the call stack than real Java ever lets it (see
 * that method's own docblock for the full writeup).
 */
function checkArrayIndex(index: number, length: number, arrayName: string): number {
  if (index < 0 || index >= length) {
    throw new RangeError(`f's ${arrayName} is length ${length}; index ${index} is out of bounds`);
  }
  return index;
}

function toJavaByte(value: number): number {
  const narrowed = value & 0xff;
  return narrowed >= 0x80 ? narrowed - 0x100 : narrowed;
}

export function stepLegacyZAa(state: LegacyZAaState): void {
  const mode = state.e[BLD_KIND + state.q] ?? 0;
  if (mode === 0) {
    state.au = 0;
    const rows = state.tiles[0];
    while (rows[checkArrayIndex(state.au, rows.length, "tiles[0]")]?.[11] !== state.q) {
      state.au = toJavaByte(state.au + 1);
    }

    state.av = -1;
    const section = (state.e[BLD_LEVEL + state.q] ?? 0) - 1;
    const sectionStart = state.packed[state.packedOffsets[144] + section] ?? 0;
    const sectionEnd = state.packed[state.packedOffsets[144] + section + 1] ?? 0;
    let value = sectionStart;
    while (value < sectionEnd) {
      const row = state.packed[state.packedOffsets[143] + value] ?? 0;
      if (row >= 6 && state.av === -1) {
        state.av = value - sectionStart;
      }
      state.r[state.ar] = row;
      state.s[value - sectionStart] = state.tiles[0][state.au]?.[row] ?? 0;
      state.ar += 1;
      value += 1;
    }
    state.at = 9;
    return;
  }

  if (mode === 6) {
    if (state.k > 0) {
      if ((state.e[UNIT_CARRY_AMOUNT + state.k] ?? 0) > 0) {
        state.r[state.ar] = 29;
        state.ar += 1;
      }
    } else if (state.F !== -1) {
      // TERMINATES BY VALUE, not by exception (verified 2026-09-03,
      // bytecode/f-javap.txt offset 339..408): real Java's `i` is a
      // genuine (non-byte) int local incremented by a plain `i2b`-free
      // `iinc`, and the loop condition is the raw `a[F][i] != 0` baload --
      // i.e. this candidate-id row is expected to be a real 0-terminated
      // list, and Java finds that terminator by value before `i` could
      // ever walk past the row's real length. There is no bytecode
      // try/catch around this loop, so if the row were ever NOT properly
      // 0-terminated, real Java would throw ArrayIndexOutOfBoundsException
      // uncaught here. This port's `?? 0` fallback for an out-of-bounds
      // read happens to equal the same terminator value the loop is
      // already testing for, so it matches real Java for every row that
      // is (as intended) 0-terminated, and merely exits quietly instead of
      // throwing for the same malformed-row case Java itself doesn't
      // defend against either -- not the composeLegacyC/LegacyZAa-au class
      // of "?? 0 keeps the condition permanently true" hang.
      let i = 0;
      while ((state.a2dByte[state.F]?.[i] ?? 0) !== 0) {
        const candidate = state.a2dByte[state.F][i] ?? 0;
        if ((state.e[UNIT_CARRY_AMOUNT + candidate] ?? 0) > 0) {
          state.r[state.ar] = 29;
          state.ar += 1;
          break;
        }
        i += 1;
      }
    }

    const row = state.a2dShort[0];
    row[6] = Math.trunc(row[3] / 5);
    if (row[6] > state.at) row[6] = state.at;
    for (let i = 0; i < 6; i += 1) {
      const value = row[5 + i] ?? 0;
      if (value > 0) {
        state.r[state.ar] = i;
        state.s[state.ar] = value;
        state.ar += 1;
      }
    }
    return;
  }

  if (mode === 8) {
    const count = (state.e[BLD_LEVEL + state.q] ?? 0) * 2;
    for (let i = 0; i < count; i += 1) {
      state.r[state.ar] = 19 + i;
      state.ar += 1;
    }
  }
}
