import { RES_X, RES_Y, UNIT_CARRY_AMOUNT, UNIT_RECORD, UNIT_TARGET_X, UNIT_TARGET_Y, UNIT_TYPE } from "../../core/DenseLayout";
export type LegacySubsystemAmInput = {
  readonly state: Int8Array;
  readonly bBytes: Int8Array;
  readonly bShorts: Int16Array;
  /** b.aM:I (#88), the resource-node slot aj() just processed. */
  readonly aM: number;
  /** b.u:I (#222) / b.v:I (#225): am() loops on the fields; a(IB)'s C() and N() read them. */
  readonly fields: { u: number; v: number };
  readonly onEntityAction?: (id: number, value: number) => void;
  readonly onN?: (id: number, team: number) => void;
};

/** Exact raw control flow of b.am(); its private action/N calls stay callbacks. */
export function stepLegacySubsystemAm(input: LegacySubsystemAmInput): void {
  const { state, bBytes, bShorts } = input;
  const bByte = (shortIndex: number, add: number): number =>
    bBytes[(bShorts[shortIndex] ?? 0) + add] ?? 0;

  const { fields, aM } = input;
  // BUG FIX (2026-10-09, oracle run 4 frame 8936): offsets 56..92 compare the unit's target with
  // node aM's position (9733/9783 + aM); the port indexed them with the team, so no gatherer was
  // ever released when its bush ran out.
  for (fields.u = 0; fields.u < 2; fields.u += 1) {
    const team = fields.u;
    for (fields.v = team * 50 + 1; fields.v <= (team + 1) * 50; fields.v += 1) {
      const id = fields.v;
      if (state[UNIT_TARGET_Y + id] !== state[RES_Y + aM]) continue;
      if (state[UNIT_TARGET_X + id] !== state[RES_X + aM] && state[UNIT_TYPE + id] !== 13) continue;
      const type = state[UNIT_TYPE + id];
      if (type < 10 || type > 16) continue;
      if (state[UNIT_RECORD + id] >= 0) {
        state[UNIT_RECORD + id] = -1;
        state[808 + id] = 0;
      }
      if ((type === 16 || type === 12) && state[UNIT_CARRY_AMOUNT + id] > 0) {
        input.onEntityAction?.(id, bByte(160, type));
        input.onN?.(id, team);
      }
    }
  }
}
