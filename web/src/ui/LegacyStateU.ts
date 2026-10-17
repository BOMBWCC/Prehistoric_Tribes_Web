import { ANIMAL_TARGET, UNIT_SLOT, UNIT_TYPE } from "../core/DenseLayout";
import { T_TUTORIAL_STEPS } from "../core/DataTables";
/**
 * Raw port of private f.U(), preserving selector branches and callback
 * seams. CORRECTION (2026-08-25): the `advance` condition was fully
 * inverted, the advance/non-advance branches were wrongly merged into a
 * shared tail (only the non-advance branch reaches it in the real
 * bytecode -- the advance branch returns immediately), `dFlags[3]` had a
 * stray negation, and the advance branch's `ai===47` sub-case was missing
 * an `o:B` write. All four fixed via direct bytecode re-derivation; see
 * `docs/unknowns.md`'s 2026-08-25 entry for the full offset-level trace.
 */
export type LegacyStateUInput = {
  readonly state: {
    ai: number;
    ao: number;
    s: boolean;
    u: number;
    pByte: number;
    bI: number;
    bF: number;
    bG: number;
    bJ: number;
    am: number;
    I: number;
    J: number;
    JFlag: boolean;
    K: number;
    L: number;
    v: number;
    Q: number;
    R: number;
    A: boolean;
    /**
     * f.o:B (#349), written here in the `ai===47` advance sub-case
     * (bytecode offset 702). RENAMED 2026-08-31 from the old shared `o`
     * slot: `LegacyStateTransitionCommand.ts` used to conflate o:I(#348)
     * and o:B(#349) into that one name, and this write shared it. Both are
     * now split, so this targets the same real field as that method's own
     * `oByte` write with no ambiguity.
     */
    oByte: number;
    dFlags: boolean[];
    p: Int8Array;
  };
  readonly dense: Int8Array;
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
  readonly onSubsystemReset?: () => void;
  /** Offset 22: f.c() (#560), the mission transition. */
  readonly onMapSession?: () => void;
  /** Offset 34..43: `ao == 9` calls b.f(), the end-of-event party restore (restoreLegacyAuxiliary). */
  readonly onSpecialGuard?: () => void;
  readonly onRecordCommand?: (first: number, second: number, third: number) => void;
  readonly onRecordAction?: (first: number, second: number) => void;
  readonly onResourceReset?: () => void;
  /** b.d:[S (#273 via f) -- subsystemArrays.dShort. */
  readonly onShortWrite?: (index: number, value: number) => void;
  readonly onViewportNormalize?: () => void;
  readonly onB?: (value: number) => void;
  readonly onSelectionFlags?: (flags: readonly boolean[]) => void;
  /** f.c:I, and b.F:I (#16 via b, #51 in f) -- the mission script's timer. */
  readonly frame: number;
  readonly onScriptTimer?: (value: number) => void;
};

function byte(value: number): number {
  const narrowed = value & 0xff;
  return narrowed >= 0x80 ? narrowed - 0x100 : narrowed;
}

function tableByte(input: LegacyStateUInput, table: number, index: number): number {
  return input.packedBytes[(input.packedOffsets[table] ?? 0) + index] ?? 0;
}

export function stepLegacyStateU(input: LegacyStateUInput): void {
  const { state, dense } = input;
  input.onSubsystemReset?.();

  if (state.ai === 26) {
    state.s = false;
    input.onMapSession?.();
    state.s = true;
  }

  if (state.ao === 9) input.onSpecialGuard?.();
  else if (state.ai === 28) {
    input.onRecordCommand?.(5, 11, 0);
    state.bI = byte(state.bI & 0xfe);
    // Offsets 83..105: b.d:[S][ a[a_s[292] + 4] ] = 0 -- the index is the
    // table BYTE at that offset (corrected 2026-09-27; it passed the offset).
    input.onShortWrite?.(input.packedBytes[(input.packedOffsets[292] ?? 0) + 4] ?? 0, 0);
  } else if (state.ai === 34) {
    input.onRecordCommand?.(48, 15, 5);
    state.bI = 0;
  } else if (state.ai === 38) {
    input.onRecordCommand?.(65, 18, 1);
    state.u = 1;
  } else if (state.ai === 44) {
    // Offsets 173..198: animal slots 0..9 (9601 is the animal target row) all turn on unit `am`
    // -- mission 4's wolves. FIXED 2026-10-14 (oracle run 15, play22 frame 70752): the port wrote
    // 9601 + p[i] for the nonzero p[i].
    for (let index = 0; index < 10; index += 1) dense[ANIMAL_TARGET + index] = byte(state.am);
    input.onRecordCommand?.(53, 5, 0);
    input.onRecordAction?.(state.am, -2);
    input.onResourceReset?.();
  } else if (state.ai === 48) {
    state.u = 1;
    input.onRecordCommand?.(45, 69, 6);
  }

  for (let index = 0; index < state.p.length; index += 1) {
    // Offsets 253..349: no zero check on p[i].
    const id = state.p[index] ?? 0;
    if ((dense[UNIT_TYPE + id] ?? 0) === 105) {
      dense[UNIT_TYPE + id] = (dense[UNIT_SLOT + id] ?? 0) < 0 ? 69 : 57;
    }
    state.p[index] = 0;
  }

  if (state.bF >= 50) {
    // Offsets 364..387: b.F:I = ai == 15 ? 1000000 : f.c. ADDED 2026-09-23 --
    // the 1000000 sentinel makes b.v()'s opcode-3 step wait for the enemy to
    // be wiped out; without it that step fired the moment it was reached.
    input.onScriptTimer?.(state.ai === 15 ? 1000000 : input.frame);
    state.bF = byte(state.bF - 49);
    state.bG = tableByte(input, T_TUTORIAL_STEPS, state.bF - 1);
    state.bJ = 0;
  }

  if (state.ao !== 9) {
    state.J = state.I;
    // BUG FIX (2026-08-25): was `!state.dFlags[3]` -- confirmed via direct
    // bytecode read (offset 460..478: JFlag===false jumps straight to the
    // K+=1 branch; JFlag===true falls through to check dFlags[3], and ONLY
    // jumps to the "leave K alone" branch when dFlags[3] is false) that K
    // advances when dFlags[3] is TRUE, not false.
    if (!state.JFlag || state.dFlags[3]) state.K = byte(state.K + 1);
    state.L = state.K;
  } else {
    state.I = state.J;
    state.K = state.L;
  }
  state.s = false;
  input.onViewportNormalize?.();
  state.J = state.I;
  state.L = state.K;

  // BUG FIX (2026-08-25): this condition was fully inverted -- confirmed via
  // direct bytecode read (offset 543..642, an OR-chain of `if_icmpeq 645`
  // checks ending in `if_icmpne 706`) that `advance` is true when `ai` IS
  // one of these values (including `ai===2 && pByte!==0`, not `===0`), not
  // when it ISN'T.
  const advance = state.ai === 0 || state.ai === 1 ||
    (state.ai === 2 && state.pByte !== 0) ||
    state.ai === 32 || state.ai === 36 || state.ai === 37 ||
    state.ai === 39 || state.ai === 46 || state.ai === 47 ||
    state.ai === 49 || state.ai === 55;
  if (advance) {
    state.ai = byte(state.ai + 1);
    state.Q = 28;
    input.onB?.(state.ai);
    if (state.ai === 47) {
      state.Q = 18;
      // BUG FIX (2026-08-25): this o:B(#349) write (offset 685..702,
      // packedBytes[packedOffsets[154]+8]) was missing entirely.
      state.oByte = tableByte(input, 154, 8);
    }
    // BUG FIX (2026-08-25): the real bytecode `return`s here (offset 705)
    // -- the advance branch does NOT fall into the `A`/`onSelectionFlags`/
    // `Q=R` tail below. Only the non-advance branch reaches it. The old
    // code ran both branches through a shared if/else into that tail.
    return;
  }

  if (state.ai !== 59) state.v = 1;
  state.A = true;
  input.onSelectionFlags?.(state.dFlags);
  state.Q = state.R;
  // BUG FIX (2026-08-25): `onAdvanceState` removed -- the real bytecode tail
  // (offset 786..794) is just `Q=R;return`, confirmed the method's own last
  // instruction (bytecode/f-javap.txt line 18660, next line is a new method
  // declaration); there was never a bytecode basis for a call here.
}
