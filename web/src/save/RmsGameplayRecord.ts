/**
 * Raw slot-1/2 RMS record schema copied from f.e(int)/f.d(int).
 *
 * The names below describe the bytecode owner/shape, not gameplay semantics.
 * In particular, `a50[0]` is not known to be a unit list and `denseState`
 * is not known to contain HP. Keeping this as a wire schema prevents a later
 * port from silently dropping state while those meanings are still researched.
 */
export type RmsGameplayRecord = {
  readonly qByte: number;
  readonly pByte: number;
  readonly dByte: number;
  readonly denseState: Int8Array;
  readonly q2: Int8Array;
  readonly a50: readonly Int8Array[];
  readonly aShort2x26: readonly Int16Array[];
  readonly e30: readonly Int8Array[];
  readonly a2x10x12: readonly (readonly Int8Array[])[];
  readonly f30: readonly Int8Array[];
  readonly b2x5x30: readonly (readonly Int8Array[])[];
  readonly c2x5x5: readonly (readonly Int8Array[])[];
  readonly aq: number;
  readonly y: number;
  readonly A: number;
  readonly I: number;
  readonly K: number;
  readonly h: number;
  readonly ai: number;
  readonly cInt: number;
  readonly L: boolean;
  readonly N: boolean;
  /** The writer stores only f.a[0], three rows of 96 ints. */
  readonly intLayers0x3x96: readonly Int32Array[];
  readonly bC6x10: readonly Int8Array[];
  readonly bFByte: number;
  readonly bKByte: number;
  readonly bRByte: number;
  readonly bLByte: number;
  readonly bAQ: number;
  readonly bF2x10: readonly Int8Array[];
  readonly bG3x20: readonly Int8Array[];
  readonly bJ50: Int8Array;
  readonly bN: number;
  readonly bO: number;
  readonly bg: number;
  readonly bJ: number;
  readonly bI: number;
  readonly t3: Int8Array;
  readonly sparseLocations: readonly SparseLocationGroup[];
};

export type SparseLocationGroup = {
  readonly value: number;
  readonly locations: readonly SparseLocation[];
};

export type SparseLocation = {
  readonly x: number;
  readonly y: number;
};

const DENSE_STATE_LENGTH = 9983;
const SPARSE_FIRST_VALUE = -111;
const SPARSE_LAST_VALUE = -122;
const SPARSE_TERMINATOR = 127;

export function encodeGameplayRecord(record: RmsGameplayRecord): Uint8Array {
  const writer = new ByteWriter();
  writer.byte(record.qByte);
  writer.byte(record.pByte);
  writer.byte(record.dByte);
  writer.bytes(record.denseState, DENSE_STATE_LENGTH, "denseState");
  writer.bytes(record.q2, 2, "q2");
  writer.rows(record.a50, 4, 50, "a50");
  writer.shortRows(record.aShort2x26, 2, 26);
  writer.rows(record.e30, 3, 30, "e30");

  for (let x = 0; x < 10; x += 1) {
    for (let y = 0; y < 12; y += 1) {
      writer.byte(record.a2x10x12[0][x][y]);
      writer.byte(record.a2x10x12[1][x][y]);
    }
  }

  writer.rows(record.f30, 4, 30, "f30");
  writer.rows3(record.b2x5x30, 2, 5, 30, "b2x5x30");
  writer.rows3(record.c2x5x5, 2, 5, 5, "c2x5x5");
  writer.byte(record.aq);
  writer.byte(record.y);
  writer.byte(record.A);
  writer.byte(record.I);
  writer.byte(record.K);
  writer.byte(record.h);
  writer.byte(record.ai);
  writer.int(record.cInt);
  writer.boolean(record.L);
  writer.boolean(record.N);
  writer.rowsInt(record.intLayers0x3x96, 3, 96, "intLayers0x3x96");
  writer.rows(record.bC6x10, 6, 10, "bC6x10");
  writer.byte(record.bFByte);
  writer.byte(record.bKByte);
  writer.byte(record.bRByte);
  writer.byte(record.bLByte);
  writer.int(record.bAQ);
  writer.rows(record.bF2x10, 2, 10, "bF2x10");
  writer.rows(record.bG3x20, 3, 20, "bG3x20");
  writer.bytes(record.bJ50, 50, "bJ50");
  writer.byte(record.bN);
  writer.byte(record.bO);
  writer.byte(record.bg);
  writer.byte(record.bJ);
  writer.byte(record.bI);
  writer.byte(record.t3[0]);
  writer.byte(record.t3[1]);
  writer.byte(record.t3[2]);

  for (let value = SPARSE_FIRST_VALUE; value >= SPARSE_LAST_VALUE; value -= 1) {
    const group = record.sparseLocations.find((candidate) => candidate.value === value);
    if (group) {
      for (const location of group.locations) {
        writer.byte(location.x);
        writer.byte(location.y);
      }
    }
    writer.byte(SPARSE_TERMINATOR);
  }
  return writer.finish();
}

export function decodeGameplayRecord(
  bytes: Uint8Array,
  mapWidth: number,
  mapHeight: number,
): RmsGameplayRecord {
  const reader = new ByteReader(bytes);
  const qByte = reader.byte();
  const pByte = reader.byte();
  const dByte = reader.byte();
  const denseState = reader.bytes(DENSE_STATE_LENGTH);
  const q2 = reader.bytes(2);
  const a50 = reader.rows(4, 50);
  const aShort2x26 = reader.shortRows(2, 26);
  const e30 = reader.rows(3, 30);
  const a2x10x12 = byte3(2, 10, 12);
  for (let x = 0; x < 10; x += 1) {
    for (let y = 0; y < 12; y += 1) {
      a2x10x12[0][x][y] = reader.byte();
      a2x10x12[1][x][y] = reader.byte();
    }
  }
  const f30 = reader.rows(4, 30);
  const b2x5x30 = reader.rows3(2, 5, 30);
  const c2x5x5 = reader.rows3(2, 5, 5);
  const aq = reader.byte();
  const y = reader.byte();
  const A = reader.byte();
  const I = reader.byte();
  const K = reader.byte();
  const h = reader.byte();
  const ai = reader.byte();
  const cInt = reader.int();
  const L = reader.boolean();
  const N = reader.boolean();
  const intLayers0x3x96 = reader.rowsInt(3, 96);
  const bC6x10 = reader.rows(6, 10);
  const bFByte = reader.byte();
  const bKByte = reader.byte();
  const bRByte = reader.byte();
  const bLByte = reader.byte();
  const bAQ = reader.int();
  const bF2x10 = reader.rows(2, 10);
  const bG3x20 = reader.rows(3, 20);
  const bJ50 = reader.bytes(50);
  const bN = reader.byte();
  const bO = reader.byte();
  const bg = reader.byte();
  const bJ = reader.byte();
  const bI = reader.byte();
  const t3 = reader.bytes(3);

  const sparseLocations: SparseLocationGroup[] = [];
  for (let value = SPARSE_FIRST_VALUE; value >= SPARSE_LAST_VALUE; value -= 1) {
    const locations: SparseLocation[] = [];
    while (reader.peekUnsigned() !== SPARSE_TERMINATOR) {
      const x = reader.byte();
      const yLocation = reader.byte();
      if (x < 0 || x >= mapWidth || yLocation < 0 || yLocation >= mapHeight) {
        throw new RangeError(`Sparse RMS location (${x},${yLocation}) is outside ${mapWidth}x${mapHeight}`);
      }
      locations.push({ x, y: yLocation });
    }
    reader.byte();
    sparseLocations.push({ value, locations });
  }
  reader.assertFinished();

  return {
    qByte, pByte, dByte, denseState, q2, a50, aShort2x26, e30,
    a2x10x12, f30, b2x5x30, c2x5x5, aq, y, A, I, K, h, ai, cInt, L, N,
    intLayers0x3x96, bC6x10, bFByte, bKByte, bRByte, bLByte, bAQ,
    bF2x10, bG3x20, bJ50, bN, bO, bg, bJ, bI, t3,
    sparseLocations,
  };
}

class ByteWriter {
  private readonly output: number[] = [];

  byte(value: number): void {
    this.output.push(value & 0xff);
  }

  boolean(value: boolean): void {
    this.byte(value ? 1 : 0);
  }

  int(value: number): void {
    this.byte(value >>> 24);
    this.byte(value >>> 16);
    this.byte(value >>> 8);
    this.byte(value);
  }

  bytes(values: ArrayLike<number>, expectedLength: number, name = "bytes"): void {
    if (values.length !== expectedLength) throw new RangeError(`${name} length ${values.length} != ${expectedLength}`);
    for (let index = 0; index < values.length; index += 1) this.byte(values[index]);
  }

  rows(values: readonly ArrayLike<number>[], rowCount: number, rowLength: number, name: string): void {
    if (values.length !== rowCount) throw new RangeError(`${name} row count ${values.length} != ${rowCount}`);
    for (const row of values) this.bytes(row, rowLength, name);
  }

  shortRows(values: readonly ArrayLike<number>[], rowCount: number, rowLength: number): void {
    if (values.length !== rowCount) throw new RangeError(`short row count ${values.length} != ${rowCount}`);
    for (const row of values) {
      if (row.length !== rowLength) throw new RangeError(`short row length ${row.length} != ${rowLength}`);
      for (let index = 0; index < row.length; index += 1) {
        const value = row[index] & 0xffff;
        this.byte(value >>> 8);
        this.byte(value);
      }
    }
  }

  rows3(values: readonly (readonly ArrayLike<number>[])[], layerCount: number, rowCount: number, rowLength: number, name: string): void {
    if (values.length !== layerCount) throw new RangeError(`${name} layer count ${values.length} != ${layerCount}`);
    for (const layer of values) this.rows(layer, rowCount, rowLength, name);
  }

  rowsInt(values: readonly ArrayLike<number>[], rowCount: number, rowLength: number, name = "int rows"): void {
    if (values.length !== rowCount) throw new RangeError(`${name} row count ${values.length} != ${rowCount}`);
    for (const row of values) {
      if (row.length !== rowLength) throw new RangeError(`${name} row length ${row.length} != ${rowLength}`);
      for (let index = 0; index < row.length; index += 1) this.int(row[index]);
    }
  }

  finish(): Uint8Array {
    return Uint8Array.from(this.output);
  }
}

class ByteReader {
  private cursor = 0;

  constructor(private readonly input: Uint8Array) {}

  byte(): number {
    if (this.cursor >= this.input.length) throw new RangeError("Unexpected end of RMS record");
    const value = this.input[this.cursor];
    this.cursor += 1;
    return value >= 0x80 ? value - 0x100 : value;
  }

  peekUnsigned(): number {
    if (this.cursor >= this.input.length) throw new RangeError("Missing sparse group terminator");
    return this.input[this.cursor];
  }

  boolean(): boolean {
    return this.byte() !== 0;
  }

  int(): number {
    const a = this.byte() & 0xff;
    const b = this.byte() & 0xff;
    const c = this.byte() & 0xff;
    const d = this.byte() & 0xff;
    return (a * 0x1000000) + (b << 16) + (c << 8) + d;
  }

  bytes(length: number): Int8Array {
    const values = new Int8Array(length);
    for (let index = 0; index < length; index += 1) values[index] = this.byte();
    return values;
  }

  rows(rowCount: number, rowLength: number): Int8Array[] {
    return Array.from({ length: rowCount }, () => this.bytes(rowLength));
  }

  shortRows(rowCount: number, rowLength: number): Int16Array[] {
    return Array.from({ length: rowCount }, () => {
      const row = new Int16Array(rowLength);
      for (let index = 0; index < rowLength; index += 1) {
        const high = this.byte() & 0xff;
        const low = this.byte() & 0xff;
        const value = (high << 8) | low;
        row[index] = value >= 0x8000 ? value - 0x10000 : value;
      }
      return row;
    });
  }

  rows3(layerCount: number, rowCount: number, rowLength: number): Int8Array[][] {
    return Array.from({ length: layerCount }, () => this.rows(rowCount, rowLength));
  }

  rowsInt(rowCount: number, rowLength: number): Int32Array[] {
    return Array.from({ length: rowCount }, () => {
      const row = new Int32Array(rowLength);
      for (let index = 0; index < rowLength; index += 1) row[index] = this.int();
      return row;
    });
  }

  assertFinished(): void {
    if (this.cursor !== this.input.length) {
      throw new RangeError(`Trailing bytes in RMS record: ${this.input.length - this.cursor}`);
    }
  }
}

function byte3(layers: number, rows: number, columns: number): Int8Array[][] {
  return Array.from({ length: layers }, () =>
    Array.from({ length: rows }, () => new Int8Array(columns)),
  );
}
