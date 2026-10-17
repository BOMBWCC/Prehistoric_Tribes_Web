import { BLD_HP, BLD_KIND, UNIT_HP, UNIT_TYPE } from "../../core/DenseLayout";
import { T_TUTORIAL_COMMAND, T_TUTORIAL_DELAY, T_TUTORIAL_STEPS, T_TUTORIAL_WAIT_ARG, T_TUTORIAL_WAIT_KIND, T_TYPE_JOB } from "../../core/DataTables";
export type LegacySubsystemAlInput = {
  pByte: number;
  q: number;
  bG: number;
  bF: number;
  fK: boolean;
  /** f.F:Z (#18): the kind-1 building scan skips every record while it is set (offset 154). */
  fF: boolean;
  fN: boolean;
  J: number;
  cByte: number;
  aQ: number;
  readonly state: Int8Array;
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
  readonly shortRows: Int16Array[];
  readonly onSubsystemAction?: (x: number, y: number, mode: number) => void;
  readonly onStateCommand?: (value: number) => void;
};

/** Direct raw port of b.al(); gameplay meanings remain outside this helper. */
export function stepLegacySubsystemAl(input: LegacySubsystemAlInput): void {
  const tableByte = (table: number, index: number): number => {
    const offset = input.packedOffsets[table] ?? 0;
    return input.packedBytes[offset + index] ?? 0;
  };
  const row1 = input.shortRows[1] ?? new Int16Array(0);
  if ((input.pByte & 1) !== 1 || input.q >= 2 ||
      input.bG >= tableByte(T_TUTORIAL_STEPS, input.bF) || input.fK) return;

  const threshold = 120 - tableByte(T_TUTORIAL_DELAY, input.bG);
  if (input.J < threshold) {
    const kind = tableByte(T_TUTORIAL_WAIT_KIND, input.bG);
    if (kind === 1) {
      let found = false;
      for (let id = 1; id <= 30; id += 1) {
        if (!input.fF && input.state[BLD_HP + id] > 0 &&
            input.state[BLD_KIND + id] === tableByte(T_TUTORIAL_WAIT_ARG, input.bG)) {
          input.J = threshold;
          found = true;
          break;
        }
      }
      if (!found && input.J < threshold) input.J = 0;
    } else if (kind === 2) {
      for (let id = 1; id <= 50; id += 1) {
        if (input.state[UNIT_HP + id] > 0 &&
            tableByte(T_TYPE_JOB, input.state[UNIT_TYPE + id]) === tableByte(T_TUTORIAL_WAIT_ARG, input.bG)) {
          input.J = threshold;
          break;
        }
      }
    } else if (kind === 4 && row1[11] === 0 && input.fN) {
      input.J = threshold;
    }
  }

  if ((input.cByte & 7) === 0) input.J = toByte(input.J + 1);
  const limit = tableByte(T_TUTORIAL_WAIT_KIND, input.bG) === 0 ? tableByte(T_TUTORIAL_DELAY, input.bG) : 120;
  if (input.J < limit) return;

  input.J = 0;
  input.onSubsystemAction?.(0, 0, 3);
  input.onStateCommand?.(tableByte(T_TUTORIAL_COMMAND, input.bG));
  input.bG = toByte(input.bG + 1);
  if (input.bG === 11) input.aQ = input.cByte + 500;
}

function toByte(value: number): number {
  const narrowed = value & 0xff;
  return narrowed >= 0x80 ? narrowed - 0x100 : narrowed;
}
