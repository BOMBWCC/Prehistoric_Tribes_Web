import { deriveLegacyEntityStateCode } from "./LegacySubsystemEntityStateCode";
import { stepLegacySubsystemEntityPathStep, type LegacySubsystemEntityPathStepInput } from "./LegacySubsystemEntityPathStep";
import { stepLegacySubsystemEntityMoveApply } from "./LegacySubsystemEntityMoveApply";
import { stepLegacySubsystemEntityRevertIdle } from "./LegacySubsystemEntityRevertIdle";
import { UNIT_MODE, UNIT_NEXT_WORKER, UNIT_OFFSET_X, UNIT_OFFSET_Y, UNIT_TIMER, UNIT_Y } from "../../core/DenseLayout";

/**
 * Direct translation of `private void u()` (constant pool #418),
 * bytecode/b-javap.txt offsets 0..422 (line 10260). This is `b.e()`'s own
 * `offset 697..700` call (`onEntityLoopTail`'s `onU`), reached whenever the
 * `p()`(boolean) crash gate (see `LegacySubsystemBBoolean2.ts`) is NOT
 * satisfied for a given entity -- the "normal", non-crashing tail of the
 * entity loop.
 *
 * Structure (offset 0..78, an outer gate BEFORE the state-code recompute):
 *  - If `dense[202+id]!==0 || dense[303+id]!==0 || dense[1313+id]===-1`,
 *    jump straight to the offset-79 main body (below) -- one of those three
 *    already-dirty signals means the "am I still paced/resting" check is
 *    skipped outright.
 *  - Otherwise (a genuinely idle/settled entity), gate on the shared
 *    `z:I`(#234)/`B:I`(#8) pair (already modeled elsewhere as `z.value`/
 *    `bValue`, see `LegacyEntityESelection.ts`) and `dense[808+id]`: if
 *    `Math.trunc(z.value/10)<=bValue` OR `dense[808+id]<=0`, skip the ENTIRE
 *    main body (including the `dense[2929+id]=this.b(id)` recompute) and go
 *    straight to the small offset-349 tail.
 *
 * Main body (offset 79..348, `dense[2929+id]` freshly recomputed):
 *  `dense[2929+id]=this.b(id)`; `E:I = 0` (offset 100..102);
 *  `if (this.c()) return` (`c()`, whose "guaranteed throw" premise was
 *  RETRACTED 2026-09-10 -- it is the real per-tick path walker, see
 *  `LegacySubsystemEntityPathStep.ts`); when `(dense[2929+id]&255)<=7`
 *  AND `E:I < 2` (offset 135..140), calls `D()`
 *  (`LegacySubsystemEntityMoveApply.ts`), then -- only when
 *  `dense[202+id]===0 && dense[303+id]===0 &&` the saved position
 *  (`dense[4545+id]`) is in `[-122,-111]` -- OVERWRITES `dense[2929+id]`
 *  again (a real, deliberate repurpose of the same field within one method)
 *  with `(-5-(team^1)*6)-dense[4545+id]`, resets the action/duration
 *  fields, and marks the entity's own tile visible via `f.c(x,y,1,1)`
 *  (kept as `onMarkVisible`, a rendering/fog concern out of this
 *  investigation's scope). For team 0 only, also decrements `R:B`#48
 *  (`game.subsystemRByte`). **CORRECTED (2026-09-10)**: that was wired to
 *  `Q:B`#46 (`subsystemBQByte`); offset 339 is `getfield #48 // Field R:B`,
 *  a different field that happens to share neither letter nor index -- the
 *  same twin-field trap as `b.Q:B`#46 vs `f.q:B`#357.
 *
 * Offset-349 tail (skips the state-code recompute -- reads whatever
 * `dense[2929+id]` already held from a previous tick): when
 * `(dense[2929+id]&255)<=7`, resets `dense[3030+id]`, clears the HIGH
 * nibble of `dense[1111+id]` -- offset 399 is `bipush 15; iand`, i.e.
 * `& 15`; this port had `& 0xf0`, which clears the low nibble instead
 * (CORRECTED 2026-09-10, the code contradicted its own comment) -- calls `P()`
 * (`LegacySubsystemEntityRevertIdle.ts`), and resets `dense[808+id]`.
 */
export type LegacySubsystemEntityUpdateTailInput = LegacySubsystemEntityPathStepInput & {
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
  readonly gridC: Int8Array[];
  readonly team: number;
  readonly onF: () => void;
  readonly onMarkVisible: (x: number, y: number, width: number, height: number) => void;
  /** b.z:I (#234), shared with LegacyEntityESelection.ts's own `z`. */
  readonly z: { value: number };
  /** b.B:I (#8), shared with LegacyEntityESelection.ts's own `bValue`. */
  readonly bValue: number;
  /** b.R:B (#48), `game.subsystemRByte`, live: the callbacks can change it first. */
  readonly rByte: { value: number };
  /** b.E:I (#14) -- reset at offset 102, re-read at 136; see the docblock. */
  readonly scalars: { bField14: number };
};

function tailAt349(state: Int8Array, id: number): void {
  if (((state[UNIT_MODE + id] ?? 0) & 255) > 7) return;
  state[3030 + id] = 0;
  state[1111 + id] = (state[1111 + id] ?? 0) & 15;
  stepLegacySubsystemEntityRevertIdle(state, id);
  state[808 + id] = 0;
}

export function stepLegacySubsystemEntityUpdateTail(
  input: LegacySubsystemEntityUpdateTailInput,
): void {
  const { state, packedBytes, packedOffsets, gridC, id, team } = input;

  const skipCancelGate = (state[UNIT_OFFSET_X + id] ?? 0) !== 0 || (state[UNIT_OFFSET_Y + id] ?? 0) !== 0 || (state[UNIT_TIMER + id] ?? 0) === -1;
  if (!skipCancelGate) {
    if (Math.trunc(input.z.value / 10) <= input.bValue || (state[808 + id] ?? 0) <= 0) {
      tailAt349(state, id);
      return;
    }
  }

  state[UNIT_MODE + id] = deriveLegacyEntityStateCode(state, id);

  // Offsets 100..102: `E:I = 0`, before c() -- c() reads it, and c()'s own
  // displacement callee (a(byte), #285) is its only writer.
  input.scalars.bField14 = 0;

  if (stepLegacySubsystemEntityPathStep(input)) return;

  // Offsets 130..140: BOTH the state-code test and `E:I < 2` gate D().
  if (((state[UNIT_MODE + id] ?? 0) & 255) <= 7 && input.scalars.bField14 < 2) {
    stepLegacySubsystemEntityMoveApply({ state, packedBytes, packedOffsets, gridC, id, onF: input.onF });

    if ((state[UNIT_OFFSET_X + id] ?? 0) !== 0) return;
    if ((state[UNIT_OFFSET_Y + id] ?? 0) !== 0) return;
    const saved = state[UNIT_NEXT_WORKER + id] ?? 0;
    if (saved > -111 || saved < -122) return;

    const otherTeam = team ^ 1;
    state[UNIT_MODE + id] = (-5 - otherTeam * 6) - saved;

    state[3030 + id] = 0;
    state[808 + id] = 0;
    state[UNIT_TIMER + id] = 1;
    input.onMarkVisible(state[id] ?? 0, state[UNIT_Y + id] ?? 0, 1, 1);

    if (team !== 0) return;
    // Offsets 337..345: `R:B = (byte)(R:B - 1)`.
    input.rByte.value = (((input.rByte.value - 1) << 24) >> 24);
  }
}
