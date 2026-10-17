import type { LegacyGameState } from "./LegacyGameState";

export type LegacyFrameStepInput = {
  readonly game: LegacyGameState;
  /** Original f.c[y][x] map/status buffer. */
  readonly map: Int8Array[];
  /** Original b.g(), b.e(), b.h(), b.i() update sequence. */
  readonly updateSubsystem: () => void;
  /** Original f.c(x, y, 1, 1) repair/update call. */
  readonly repairCell?: (x: number, y: number, mode: number, flag: number) => void;
  /** Original f.Z() when P is set outside modes 3 and 4. */
  readonly flushPending?: () => void;
};

/** Direct raw control-flow port of private f.j(). */
export function stepLegacyFrame(input: LegacyFrameStepInput): void {
  const { game } = input;
  try {
    input.updateSubsystem();
  } catch {
    // f.j() catches exceptions from the four b update calls and continues.
  }

  game.missionFrame += 1;
  game.tailHCounter += 1;
  if (game.tailHCounter >= 100) {
    const row = game.tailHCounter - 100;
    if (row >= game.mapHeight - 1) game.tailHCounter = 0;
    for (let x = 0; x < game.mapWidth; x += 1) {
      const value = input.map[row][x];
      // Bytecode offsets 100..117: "if (value > -114) skip; if (value <= -117) skip"
      // i.e. the kept range is -116..-114 inclusive, NOT -116..-115 (confirmed
      // 2026-08-20 via direct read of f.j(), bytecode/f-javap.txt lines 2017-2019;
      // this file's own upper bound was off by one before this fix).
      if (value <= -114 && value > -117) {
        input.map[row][x] = 0;
        input.repairCell?.(x, row, 1, 1);
      }
    }
  }

  if (game.pendingP && game.barMode !== 4 && game.barMode !== 3) input.flushPending?.();
  game.pendingP = false;

  if (game.uByte > 0 && game.loopMode === 1) {
    game.uByte += 1;
    if (game.uByte === 41 || game.uByte === 90) {
      game.loopMode = 0;
      game.screen = 24;
      game.H = true;
      game.vInt = 56 + Math.floor(41 / game.uByte);
      game.oByte = 11 - Math.floor(41 / game.uByte);
      game.oInt = 0;
    }
  }
}
