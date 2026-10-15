export type BinaryResource = {
  readonly bytes: Uint8Array;
  readonly expectedLength: number;
};

export async function loadBinaryResource(url: string, expectedLength: number): Promise<BinaryResource> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Unable to load binary resource ${url}: ${response.status}`);
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.length !== expectedLength) {
    throw new Error(`${url} length ${bytes.length} does not match ${expectedLength}`);
  }
  return { bytes, expectedLength };
}

export const MA_OFFSETS = [0, 2545, 6965, 10649, 15487, 22633, 27261, 31708, 35466, 39214] as const;

export type MaResource = BinaryResource & {
  readonly offsets: readonly number[];
  readonly section: (index: number) => Uint8Array;
};

export async function loadMaResource(): Promise<MaResource> {
  const resource = await loadBinaryResource("assets/ma", 42381);
  return {
    ...resource,
    offsets: MA_OFFSETS,
    section(index: number): Uint8Array {
      if (index < 0 || index >= MA_OFFSETS.length) throw new RangeError(`Invalid /ma section ${index}`);
      const start = MA_OFFSETS[index];
      const end = index + 1 < MA_OFFSETS.length ? MA_OFFSETS[index + 1] : resource.bytes.length;
      return resource.bytes.slice(start, end);
    },
  };
}

export type AReadDiagnostic = {
  readonly record: number;
  readonly length: number;
  readonly offset: number;
  readonly end: number;
};

export type AResourceDiagnostic = BinaryResource & {
  readonly firstInvalidRead?: AReadDiagnostic;
  /** Exact bytes/offsets copied before e.f() reaches its first invalid read. */
  readonly prefix: AResourcePrefixReplay;
  /** Exact f.b[S] table (570 little-endian shorts) loaded by e.f() after the 312 byte-table records. */
  readonly shortTableB: Int16Array;
  readonly shortTableBOffsets: Int16Array;
};

export type AResourcePrefixReplay = {
  /** Bytes that a Java ByteArrayInputStream could copy before the first invalid read. */
  readonly bytes: Uint8Array;
  /** The same cumulative short offsets e.f() had written before failing. */
  readonly offsets: Int16Array;
  readonly loadedRecords: number;
  readonly firstInvalidRead?: AReadDiagnostic;
};

/** Replays the destination-buffer bounds of e.f() without interpreting /a records. */
export function findTableAReadFailure(bytes: Uint8Array, destinationLength = 17638): AReadDiagnostic | undefined {
  let cursor = 0;
  let offset = 0;
  for (let record = 0; record < 312; record += 1) {
    if (cursor + 2 > bytes.length) break;
    // e.f() reads the low byte first, then shifts the second byte by 8.
    const length = bytes[cursor] | (bytes[cursor + 1] << 8);
    cursor += 2;
    const payloadOffset = offset;
    const end = payloadOffset + length;
    if (payloadOffset < 0 || end > destinationLength) {
      return { record, length, offset: payloadOffset, end };
    }
    offset = javaShort(end);
    cursor += length;
  }
  return undefined;
}

/**
 * Replays only the provable prefix of e.f() against an ordinary in-memory
 * stream. This is intentionally not a repaired parser: it stops before any
 * source/destination-invalid read and leaves later offsets at Java's initial
 * zero values.
 */
export function replayTableAPrefix(bytes: Uint8Array, destinationLength = 17638, recordCount = 312): AResourcePrefixReplay {
  const destination = new Uint8Array(destinationLength);
  const offsets = new Int16Array(recordCount);
  let cursor = 0;
  let offset = 0;
  let loadedRecords = 0;
  for (let record = 0; record < recordCount; record += 1) {
    if (cursor + 2 > bytes.length) break;
    // e.f() stores /a record lengths as little-endian unsigned shorts.
    const length = bytes[cursor] | (bytes[cursor + 1] << 8);
    cursor += 2;
    const end = offset + length;
    const invalid = offset < 0 || end > destinationLength || cursor + length > bytes.length;
    if (invalid) {
      return {
        bytes: destination,
        offsets,
        loadedRecords,
        firstInvalidRead: { record, length, offset, end },
      };
    }
    destination.set(bytes.subarray(cursor, cursor + length), offset);
    cursor += length;
    loadedRecords += 1;
    if (record < recordCount - 1) offsets[record + 1] = javaShort(end);
    offset = javaShort(end);
  }
  return { bytes: destination, offsets, loadedRecords };
}

/**
 * Replays only the visible e.f() bounds behavior. It deliberately does not repair or
 * reinterpret /a, whose original bytecode/resource pair is currently inconsistent.
 */
export async function diagnoseTableA(): Promise<AResourceDiagnostic> {
  const resource = await loadBinaryResource("assets/a", 18842);
  const firstInvalidRead = findTableAReadFailure(resource.bytes);
  const prefix = replayTableAPrefix(resource.bytes);
  const { shortTableB, shortTableBOffsets } = decodeShortTableB(resource.bytes);
  return firstInvalidRead
    ? { ...resource, firstInvalidRead, prefix, shortTableB, shortTableBOffsets }
    : { ...resource, prefix, shortTableB, shortTableBOffsets };
}

/**
 * Exact e.f() replay for the five short sections after /a's 312 records
 * (bytecode/e-javap.txt offsets 189..316).
 *
 * BUG FIX (2026-09-04): the element values were read big-endian while e.f()
 * reads them LITTLE-endian -- `lo = read() & 255;` then
 * `f.b[f.c[i] + n] = (short)(((read() & 255) << 8) + lo)` (offsets 260..303).
 * The section *lengths* two lines up were already little-endian and stayed
 * correct, which is why the byte order slipped through. Byte-swapped, the
 * table decoded as noise (index 1..5 came out 25856/-13824/12033/-27647/-1791);
 * corrected it reads 0, 101, 202, 303, 404, 505, ... -- the dense-array stride
 * table this codebase uses everywhere (`dense[101+id]`, `dense[202+id]`,
 * `dense[2929+id]`, ...), which is what `f.b:[S]` is for.
 */
export function decodeShortTableB(bytes: Uint8Array, recordCount = 312): {
  shortTableB: Int16Array;
  shortTableBOffsets: Int16Array;
  sourceCursor: number;
} {
  const shortTableB = new Int16Array(570);
  const shortTableBOffsets = new Int16Array(5);
  let cursor = tableAPayloadEnd(bytes, recordCount);
  for (let section = 0; section < 5; section += 1) {
    if (cursor + 2 > bytes.length) break;
    const length = bytes[cursor] | (bytes[cursor + 1] << 8);
    cursor += 2;
    if (section < 4) shortTableBOffsets[section + 1] = javaShort(shortTableBOffsets[section] + length);
    for (let index = 0; index < length; index += 1) {
      if (cursor + 1 >= bytes.length) break;
      const value = bytes[cursor] | (bytes[cursor + 1] << 8);
      shortTableB[shortTableBOffsets[section] + index] = javaShort(value);
      cursor += 2;
    }
  }
  return { shortTableB, shortTableBOffsets, sourceCursor: cursor };
}

/** Source cursor after e.f() has consumed the 312 little-endian records. */
function tableAPayloadEnd(bytes: Uint8Array, recordCount: number): number {
  let cursor = 0;
  for (let record = 0; record < recordCount; record += 1) {
    if (cursor + 2 > bytes.length) return bytes.length;
    const length = bytes[cursor] | (bytes[cursor + 1] << 8);
    cursor += 2 + length;
  }
  return cursor;
}

function javaShort(value: number): number {
  const narrowed = value & 0xffff;
  return narrowed >= 0x8000 ? narrowed - 0x10000 : narrowed;
}
