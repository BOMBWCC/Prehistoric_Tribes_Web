/** Exact slot-0 RMS record from f.d(0)/f.e(0). */
export type Slot0Record = {
  readonly l: number;
  readonly W: boolean;
  readonly r: number;
  readonly s: number;
  readonly t: number;
  readonly c: number;
  readonly p: number;
};

export type DecodedSlot0Record = Slot0Record & {
  /** Derived by the original loader as V = 4 + r. */
  readonly V: number;
};

const SLOT0_LENGTH = 10;

export function encodeSlot0Record(record: Slot0Record): Uint8Array {
  const bytes = new Uint8Array(SLOT0_LENGTH);
  const view = new DataView(bytes.buffer);
  view.setInt32(0, record.l, false);
  view.setUint8(4, record.W ? 1 : 0);
  view.setInt8(5, record.r);
  view.setInt8(6, record.s);
  view.setInt8(7, record.t);
  view.setInt8(8, record.c);
  view.setInt8(9, record.p);
  return bytes;
}

export function decodeSlot0Record(bytes: Uint8Array): DecodedSlot0Record {
  if (bytes.length !== SLOT0_LENGTH) {
    throw new RangeError(`RMS slot 0 record length ${bytes.length} does not match ${SLOT0_LENGTH}`);
  }
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const r = view.getInt8(5);
  return {
    l: view.getInt32(0, false),
    W: view.getUint8(4) !== 0,
    r,
    s: view.getInt8(6),
    t: view.getInt8(7),
    c: view.getInt8(8),
    p: view.getInt8(9),
    V: 4 + r,
  };
}
