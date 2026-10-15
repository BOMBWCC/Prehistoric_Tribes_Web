/** Raw state needed by the deterministic prefix of b.n(). */
export type LegacySubsystemNGateInput = {
  readonly q: number;
  readonly N: boolean;
  readonly L: boolean;
  readonly u: number;
  readonly v: number;
  readonly state: Int8Array;
};

/**
 * Exact b.n() early-return gate from bytecode/b-javap.txt.
 *
 * The later action/AI branches are intentionally not folded into this helper;
 * their private callees still require separate bytecode-backed ports.
 */
export function legacySubsystemNGate(input: LegacySubsystemNGateInput): boolean {
  const { q, N, L, u, v, state } = input;
  if (q === 3 || N) return false;
  if ((L || u === 1) && (state[7979 + v] & 64) !== 0) return false;
  if (state[1414 + v] < 12) return false;
  return true;
}
