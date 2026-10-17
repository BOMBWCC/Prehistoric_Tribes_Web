import type { Graphics } from "../platform/Graphics";
import {
  stepLegacyPositiveEntityBranch,
  type LegacyPositiveEntityBranchState,
  type LegacyPositiveEntityBranchCallbacks,
} from "./LegacyGameplayPositiveEntityBranch";
import {
  stepLegacyNegativeEntityBranch,
  type LegacyNegativeEntityBranchState,
  type LegacyNegativeEntityBranchCallbacks,
} from "./LegacyGameplayNegativeEntityBranch";
import {
  stepLegacyNegativeEntityBranchTail,
  type LegacyNegativeEntityBranchTailState,
  type LegacyNegativeEntityBranchTailCallbacks,
} from "./LegacyGameplayNegativeEntityBranchTail";
import { legacyEntitySelectionNibble } from "../sim/units/LegacyEntitySelectionNibble";

/**
 * Routes f.u()'s entity-ID body (bytecode offsets 225..1791) to whichever of
 * the three already-ported sub-ranges the raw bytecode itself would reach,
 * confirmed by reading the actual dispatch gates at offsets 225..240 and
 * 525..555 rather than assumed from each sub-file's own precondition
 * docstring:
 *
 *   offset 225: if (occupancyClass >= 1) goto 525
 *   offset 230: if (id < 1)  goto 525
 *   offset 236: if (id > 100) goto 525
 *   ... positive branch (225..522), always ends `goto 1791` ...
 *
 *   offset 525: if (id > -1) goto 1584
 *   offset 531: if (id < -60) goto 1584
 *   offset 538..555: if (occupancyClass>=2 && e[9176-id]<=0) goto 1584
 *   ... negative branch (525..1581) ...
 *
 *   offset 1584: ... tail branch (1584..1791) ...
 *
 * i.e. the positive branch is reached only when occupancyClass===0 AND id in
 * [1,100]; anything else falls to the negative branch's own entry gates,
 * which in turn fall to the tail branch when id is outside [-60,-1] (or via
 * the one exception documented in LegacyGameplayNegativeEntityBranch.ts's
 * `fallThroughToTail` result). This module intentionally has no dedicated
 * verify-*.mjs of its own testing NEW logic -- it is pure routing over three
 * already independently-tested functions, integration-tested by
 * verify-gameplay-cell-body-dispatch.mjs instead (using real imports rather
 * than this codebase's usual standalone-vm-transpile convention, since that
 * convention exists specifically to test each *leaf* port in isolation).
 */

export type LegacyGameplayCellBodyState = LegacyPositiveEntityBranchState &
  Omit<LegacyNegativeEntityBranchState, "rowPixelBase"> &
  Omit<LegacyNegativeEntityBranchTailState, "columnPixelX" | "row" | "column" | "ai" | "ah" | "rowPixelBase">;

export type LegacyGameplayCellBodyCallbacks = LegacyPositiveEntityBranchCallbacks &
  LegacyNegativeEntityBranchCallbacks &
  LegacyNegativeEntityBranchTailCallbacks;

export type LegacyGameplayCellBodyResult = {
  readonly ahDecrement: number;
  /** The negative branch's re-derived local3 (offsets 634..682), when it reached that point. */
  readonly occupancyClass?: number;
};

export function dispatchLegacyGameplayCellBody(
  id: number,
  columnPixelX: number,
  row: number,
  column: number,
  ai: number,
  ah: number,
  occupancyClass: number,
  /** bytecode local2, confirmed `ai * 16` (see LegacyGameplayCellLoop.ts's header correction). */
  rowPixelBase: number,
  state: LegacyGameplayCellBodyState,
  graphics: Graphics | undefined,
  callbacks: LegacyGameplayCellBodyCallbacks = {},
): LegacyGameplayCellBodyResult {
  if (occupancyClass === 0 && id >= 1 && id <= 100) {
    return stepLegacyPositiveEntityBranch(id, columnPixelX, row, column, ai, ah, rowPixelBase, state, callbacks);
  }

  if (id >= -60 && id <= -1) {
    const negativeBranchCallbacks: LegacyGameplayCellBodyCallbacks = {
      ...callbacks,
      nibbleSource:
        callbacks.nibbleSource ??
        ((negatedId) => legacyEntitySelectionNibble(negatedId, state.dense, state.packedBytes, state.packedOffsets)),
    };
    const result = stepLegacyNegativeEntityBranch(
      id,
      occupancyClass,
      { ...state, rowPixelBase },
      graphics,
      negativeBranchCallbacks,
    );
    if (result.fallThroughToTail) {
      stepLegacyNegativeEntityBranchTail(
        id,
        occupancyClass,
        { ...state, columnPixelX, row, column, ai, ah, rowPixelBase },
        callbacks,
      );
    }
    return { ahDecrement: 0, occupancyClass: result.occupancyClass };
  }

  stepLegacyNegativeEntityBranchTail(
    id,
    occupancyClass,
    { ...state, columnPixelX, row, column, ai, ah, rowPixelBase },
    callbacks,
  );
  return { ahDecrement: 0 };
}
