/** Raw port of private b.a(int,int,int,int,int), bytecode offsets 0..595. */
export type LegacyPathPreparationInput = {
  readonly arg1: number;
  readonly arg2: number;
  readonly arg3: number;
  readonly arg4: number;
  readonly mode: number;
  readonly pathData: Int8Array[][];
  readonly eRows: Int8Array[][];
  readonly eValues: Int8Array;
  readonly f: Int8Array;
  readonly g: Int8Array;
  readonly h: Int8Array;
  readonly map: Int8Array[];
  readonly mapMirror: Int8Array[];
  readonly state: { d: number; c: number; b: number; e: number };
  readonly onRelativePreparation: (dx: number, dy: number) => void;
  readonly onE: (mode: number) => void;
  readonly onCellValue: (x: number, y: number, mode: number) => number;
};

function javaByte(value: number): number {
  const narrowed = value & 0xff;
  return narrowed >= 0x80 ? narrowed - 0x100 : narrowed;
}

export function prepareLegacyPath(input: LegacyPathPreparationInput): void {
  try {
    input.onRelativePreparation(input.arg3 - input.arg1, input.arg4 - input.arg2);
    for (let index = 0; index < 3; index += 1) {
      input.pathData[0][0][index] = javaByte(input.arg1);
      input.pathData[0][1][index] = javaByte(input.arg2);
    }
    input.onE(input.mode);

    let minimum = 1000;
    for (let index = 0; index < 3; index += 1) {
      if ((input.eValues[index] ?? 0) < minimum) {
        minimum = input.eValues[index] ?? 0;
        input.g[0] = javaByte(index);
      }
    }
    input.g[1] = javaByte(((input.g[0] ?? 0) + 1) % 3);
    input.g[2] = javaByte(((input.g[0] ?? 0) + 2) % 3);
    input.state.d = 0;
    input.state.c = 0;

    if ((input.eValues[input.g[0] ?? 0] ?? 0) <= 0) return;
    let a = 0;
    while (a < (input.f[input.g[0] ?? 0] ?? 0)) {
      input.state.e = input.state.d;
      const x = input.pathData[input.g[0] ?? 0][0][a] ?? 0;
      const y = input.pathData[input.g[0] ?? 0][1][a] ?? 0;
      const mapCell = input.map[y]?.[x] ?? 0;
      input.state.d = mapCell === 0 ? 0 : javaByte(input.onCellValue(x, y, input.mode));

      if (input.state.e === 0 && input.state.d !== 0) {
        if (input.state.c >= 10) return;
        const row = input.state.c;
        input.eRows[0][0][row] = javaByte(a === 0 ? input.arg1 : (input.pathData[input.g[0] ?? 0][0][a - 1] ?? 0));
        input.eRows[0][1][row] = javaByte(a === 0 ? input.arg2 : (input.pathData[input.g[0] ?? 0][1][a - 1] ?? 0));
        input.eRows[0][2][row] = javaByte(a - 1);
        input.eRows[1][0][row] = -1;
        input.state.c = javaByte(row + 1);
      } else if (input.state.e !== 0 && input.state.d === 0) {
        const row = input.state.c - 1;
        input.eRows[1][0][row] = javaByte(x);
        input.eRows[1][1][row] = javaByte(y);
        input.eRows[1][2][row] = javaByte(a);
        input.h[row] = javaByte(input.mapMirror[y]?.[x] ?? 0);
        if (input.mapMirror[y]) input.mapMirror[y][x] = javaByte(256 - input.state.c);
      }
      a += 1;
    }
  } catch {
    // The original method swallows the broad Exception and returns.
  }
}
