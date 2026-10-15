import { legacySubsystemNGate } from "./LegacySubsystemNGate";
import { stepLegacySubsystemNDecision, type LegacySubsystemNDecisionInput } from "./LegacySubsystemNDecision";

export type LegacySubsystemNOrchestratorInput = Omit<LegacySubsystemNDecisionInput, "state" | "packedBytes" | "packedOffsets"> & {
  readonly state: Int8Array;
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
  readonly q: number;
  readonly N: boolean;
  readonly L: boolean;
  readonly onO?: () => boolean;
  readonly onAFalse?: () => boolean;
};

/** Bytecode-order composition of b.n() offsets 0..104 and 104..936. */
export function stepLegacySubsystemNOrchestrator(input: LegacySubsystemNOrchestratorInput): boolean {
  if (!legacySubsystemNGate({
    q: input.q,
    N: input.N,
    L: input.L,
    u: input.u,
    v: input.v,
    state: input.state,
  })) return false;

  if (input.u === 0) {
    if (input.onO?.() === true) return true;
    if (input.onAFalse?.() === true) return true;
  }
  return stepLegacySubsystemNDecision(input);
}
