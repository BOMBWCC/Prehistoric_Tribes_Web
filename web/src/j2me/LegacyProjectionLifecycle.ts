import { prepareLegacyProjectionDraw, type LegacyProjectionDrawPreparationInput, type LegacyProjectionDrawPreparationState } from "./LegacyProjectionDrawPreparation";
import { runLegacyProjectionP, type LegacyProjectionPInput, type LegacyProjectionPState } from "./LegacyProjectionP";

export type LegacyProjectionLifecycleInput = {
  readonly preparation: LegacyProjectionDrawPreparationInput;
  readonly makePInput: (state: LegacyProjectionDrawPreparationState) => Omit<LegacyProjectionPInput, "allowA" | "allowB">;
  readonly allowA: (state: LegacyProjectionPState, preparation: LegacyProjectionDrawPreparationState) => boolean;
  readonly allowB: (state: LegacyProjectionPState, preparation: LegacyProjectionDrawPreparationState) => boolean;
  readonly onQ: (state: LegacyProjectionDrawPreparationState) => void;
};

/** Connects exact a(IIIIB) preparation to its p()/q() boundaries. */
export function runLegacyProjectionLifecycle(input: LegacyProjectionLifecycleInput): LegacyProjectionDrawPreparationState {
  return prepareLegacyProjectionDraw({
    ...input.preparation,
    onP: (preparation) => {
      const pInput = input.makePInput(preparation);
      runLegacyProjectionP({
        ...pInput,
        allowA: (state) => input.allowA(state, preparation),
        allowB: (state) => input.allowB(state, preparation),
      });
    },
    onQ: input.onQ,
  });
}
