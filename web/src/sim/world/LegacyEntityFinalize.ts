import { BLD_OWNER, UNIT_DIRECTION, UNIT_HP, UNIT_MODE, UNIT_NEXT_WORKER, UNIT_SPEED, UNIT_Y } from "../../core/DenseLayout";
/**
 * Raw port of `final void a(byte)`, bytecode/f-javap.txt offsets 0..325.
 *
 * Precisely stack-simulated instruction-by-instruction (not guessed): a
 * single entity id in, no return value. Computes a team index and an x/y
 * pair, conditionally writes a footprint sentinel into the `c:[[B]` map
 * grid, then unconditionally calls three already-ported cleanup methods
 * (`e(int)`/`releaseLegacyEntitySelection`, `f(int)`/
 * `finalizeLegacyEntitySelection`, `c(int)`/`clearLegacyEntityRecordTarget`
 * -- all found already correctly ported, with two real bugs fixed
 * elsewhere in this same investigation), marks the entity's #1919 counter
 * dead (-1), updates a focus flag, and -- gated on `!s:Z` -- queues a
 * type=3 byte-action (`f.a(byte,byte,byte,byte)`, already ported as
 * `stepLegacyByteActionQueue`) for team-0 entities and always increments a
 * per-team stat counter.
 *
 * This method's own callers were NOT found in class f -- they live in
 * class b (bytecode/b-javap.txt, `invokevirtual #300 // Method f.a:(B)V`,
 * 3 call sites), i.e. a still-unported different class. Wiring this to a
 * live trigger requires porting that class-b caller logic separately;
 * this module only ports the method itself.
 */
export type LegacyEntityFinalizeInput = {
  readonly dense: Int8Array;
  readonly grid: Int8Array[];
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
  readonly id: number;
  /** f.q:I (#356), read for the F/P focus-flag gate. */
  readonly q: number;
  /** f.F:Z (#49) -- read only, never written by this method. */
  readonly entityFocusFlag: boolean;
  /** f.P:Z (#88) -- write-only in this method (only ever set to true, never cleared here). */
  readonly entityFocusPFlag: boolean;
  /** f.s:Z (#365). */
  readonly cameraSFlag: boolean;
  readonly onRelease?: (id: number) => void;
  readonly onFinalize?: (id: number) => void;
  readonly onRecordClear?: (id: number) => void;
  /** f.a(byte,byte,byte,byte) type=3 insert: (type, x, y, value). */
  readonly onQueueInsert?: (type: number, x: number, y: number, value: number) => void;
  /** f.a:[[S] (#131) `[1-team][22] += 1` stat counter. */
  readonly onTeamCounter?: (teamRowIndex: number) => void;
};

function packedByte(input: LegacyEntityFinalizeInput, offset: number, index: number): number {
  return input.packedBytes[(input.packedOffsets[offset] ?? 0) + index] ?? 0;
}

export function finalizeLegacyEntity(input: LegacyEntityFinalizeInput): { entityFocusPFlag: boolean } {
  const { dense, grid, id } = input;
  const team = Math.trunc((id - 1) / 50);

  const x = (dense[id] ?? 0) + packedByte(input, 1, dense[UNIT_DIRECTION + id] ?? 0);
  const y = (dense[UNIT_Y + id] ?? 0) + packedByte(input, 1, 8 + (dense[UNIT_DIRECTION + id] ?? 0));

  if (((dense[UNIT_MODE + id] ?? 0) & 0xff) <= 7) {
    const packedIndex =
      (input.packedOffsets[15] ?? 0)
      + ((dense[UNIT_DIRECTION + id] ?? 0) & 1) * 9
      + (dense[UNIT_SPEED + id] ?? 0)
      - (dense[7777 + id] ?? 0);
    const threshold = Math.trunc(((input.packedBytes[packedIndex] ?? 0) + 1) / 2);
    if (((dense[1111 + id] ?? 0) & 0xf) < threshold) {
      const row = grid[y];
      if (row?.[x] === -128) {
        const marker = dense[UNIT_NEXT_WORKER + id] ?? 0;
        row[x] = marker >= 111 ? -marker : 0;
      }
    }
  }

  input.onRelease?.(id);
  input.onFinalize?.(id);
  dense[UNIT_HP + id] = -1;
  input.onRecordClear?.(id);

  let entityFocusPFlag = input.entityFocusPFlag;
  if (input.entityFocusFlag || id === (dense[BLD_OWNER + input.q] ?? 0)) {
    entityFocusPFlag = true;
  }

  if (!input.cameraSFlag) {
    if (team === 0) {
      input.onQueueInsert?.(3, dense[id] ?? 0, dense[UNIT_Y + id] ?? 0, id);
    }
    input.onTeamCounter?.(1 - team);
  }

  return { entityFocusPFlag };
}
