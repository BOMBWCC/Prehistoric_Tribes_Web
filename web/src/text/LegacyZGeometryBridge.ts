export type LegacyZGeometrySink = {
  readonly decodeRecord: (x: number, mode: number, width: number, record: number, value: number) => number;
  readonly decodeSegments: (x: number, mode: number, width: number, first: number, second: number, third: number, value: number) => void;
};

/** Adapter for c.a(IIIII), whose bytecode is mirrored by decodeRecord(). */
export function applyLegacyZFiveIntGeometry(sink: LegacyZGeometrySink, x: number, mode: number, width: number, record: number, value: number): number {
  return sink.decodeRecord(x, mode, width, record, value);
}

/** Adapter for c.a(IIIIIII), whose bytecode is mirrored by decodeSegments(). */
export function applyLegacyZSevenIntGeometry(sink: LegacyZGeometrySink, x: number, mode: number, width: number, first: number, second: number, third: number, value: number): void {
  sink.decodeSegments(x, mode, width, first, second, third, value);
}
