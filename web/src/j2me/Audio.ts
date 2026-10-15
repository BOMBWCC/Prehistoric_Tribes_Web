import { loadBinaryResource } from "./BinaryResource";

// f.f is the cumulative offset array used by class a; f.e stores slice lengths.
export const SA_OFFSETS = [0, 8014, 14329, 19977, 23382] as const;
export const SA_LENGTHS = [8014, 6315, 5648, 3405, 3234] as const;

export type MidiResource = {
  readonly bytes: Uint8Array;
  readonly offsets: readonly number[];
  readonly lengths: readonly number[];
};

export type MidiNoteEvent = {
  readonly startSeconds: number;
  readonly durationSeconds: number;
  readonly channel: number;
  readonly note: number;
  readonly velocity: number;
};

export type ParsedMidi = {
  readonly format: number;
  readonly division: number;
  readonly durationSeconds: number;
  readonly notes: readonly MidiNoteEvent[];
};

/** Loads the original /sa byte stream and its confirmed f.f/f.e slices. */
export async function loadMidiResource(): Promise<MidiResource> {
  const resource = await loadBinaryResource("assets/sa", 26616);
  return { bytes: resource.bytes, offsets: SA_OFFSETS, lengths: SA_LENGTHS };
}

function u16(bytes: Uint8Array, offset: number): number {
  return (bytes[offset] << 8) | bytes[offset + 1];
}

function u32(bytes: Uint8Array, offset: number): number {
  return (bytes[offset] * 0x1000000) + (bytes[offset + 1] << 16) + (bytes[offset + 2] << 8) + bytes[offset + 3];
}

function variableLength(bytes: Uint8Array, cursor: { value: number }): number {
  let value = 0;
  let next: number;
  do {
    next = bytes[cursor.value++] ?? 0;
    value = (value << 7) | (next & 0x7f);
  } while ((next & 0x80) !== 0);
  return value;
}

/** Decodes the original standard-MIDI slices without changing their events. */
export function parseStandardMidi(bytes: Uint8Array): ParsedMidi {
  if (bytes.length < 14 || String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]) !== "MThd") {
    throw new RangeError("MIDI header is missing");
  }
  const format = u16(bytes, 8);
  const trackCount = u16(bytes, 10);
  const division = u16(bytes, 12);
  if ((division & 0x8000) !== 0) throw new RangeError("SMPTE MIDI division is unsupported");
  type RawEvent = { tick: number; kind: "on" | "off" | "tempo"; channel: number; note: number; velocity: number; tempo: number };
  const allEvents: RawEvent[] = [];
  let cursor = 14;
  for (let track = 0; track < trackCount; track += 1) {
    if (String.fromCharCode(bytes[cursor], bytes[cursor + 1], bytes[cursor + 2], bytes[cursor + 3]) !== "MTrk") {
      throw new RangeError(`MIDI track ${track} header is missing`);
    }
    const end = cursor + 8 + u32(bytes, cursor + 4);
    cursor += 8;
    let tick = 0;
    let running = 0;
    const events: RawEvent[] = [];
    while (cursor < end) {
      const deltaCursor = { value: cursor };
      tick += variableLength(bytes, deltaCursor);
      cursor = deltaCursor.value;
      let status = bytes[cursor++] ?? 0;
      if (status < 0x80) {
        cursor -= 1;
        status = running;
      } else if (status < 0xf0) {
        running = status;
      }
      if (status === 0xff) {
        const metaType = bytes[cursor++] ?? 0;
        const lengthCursor = { value: cursor };
        const length = variableLength(bytes, lengthCursor);
        cursor = lengthCursor.value;
        if (metaType === 0x51 && length === 3) {
          const tempo = (bytes[cursor] << 16) | (bytes[cursor + 1] << 8) | bytes[cursor + 2];
          events.push({ tick, kind: "tempo", channel: 0, note: 0, velocity: 0, tempo });
        }
        cursor += length;
        if (metaType === 0x2f) break;
        continue;
      }
      if (status === 0xf0 || status === 0xf7) {
        const lengthCursor = { value: cursor };
        cursor = lengthCursor.value;
        const length = variableLength(bytes, lengthCursor);
        cursor = lengthCursor.value + length;
        continue;
      }
      if (status < 0x80 || status >= 0xf0) break;
      const kind = status & 0xf0;
      const channel = status & 0x0f;
      const first = bytes[cursor++] ?? 0;
      const second = kind === 0xc0 || kind === 0xd0 ? 0 : (bytes[cursor++] ?? 0);
      if (kind === 0x90 && second !== 0) events.push({ tick, kind: "on", channel, note: first, velocity: second, tempo: 0 });
      else if (kind === 0x80 || (kind === 0x90 && second === 0)) events.push({ tick, kind: "off", channel, note: first, velocity: second, tempo: 0 });
    }
    allEvents.push(...events);
    cursor = end;
  }
  allEvents.sort((a, b) => a.tick - b.tick);
  let tempo = 500000;
  let previousTick = 0;
  let elapsed = 0;
  const active = new Map<string, { startSeconds: number; velocity: number; channel: number; note: number }>();
  const notes: MidiNoteEvent[] = [];
  for (const event of allEvents) {
    elapsed += ((event.tick - previousTick) * tempo) / (division * 1_000_000);
    previousTick = event.tick;
    if (event.kind === "tempo") { tempo = event.tempo; continue; }
    const key = `${event.channel}:${event.note}`;
    if (event.kind === "on") active.set(key, { startSeconds: elapsed, velocity: event.velocity, channel: event.channel, note: event.note });
    else {
      const start = active.get(key);
      if (start) {
        notes.push({ ...start, durationSeconds: Math.max(0, elapsed - start.startSeconds) });
        active.delete(key);
      }
    }
  }
  return { format, division, durationSeconds: elapsed, notes };
}

/** Browser player for a selected original `/sa` MIDI slice. */
export class OriginalMidiPlayer {
  private context?: AudioContext;
  private oscillators: OscillatorNode[] = [];

  constructor(readonly resource: MidiResource, readonly contentType: string, readonly trackIndex = 0) {}

  start(): void {
    if (this.contentType !== "audio/midi" || typeof window === "undefined") return;
    const AudioContextCtor = window.AudioContext;
    if (!AudioContextCtor) return;
    const slice = this.resource.bytes.slice(
      this.resource.offsets[this.trackIndex] ?? 0,
      (this.resource.offsets[this.trackIndex + 1] ?? this.resource.bytes.length),
    );
    const sequence = parseStandardMidi(slice);
    this.context = this.context ?? new AudioContextCtor();
    const start = this.context.currentTime + 0.02;
    for (const note of sequence.notes) {
      const oscillator = this.context.createOscillator();
      const gain = this.context.createGain();
      oscillator.type = "triangle";
      oscillator.frequency.value = 440 * 2 ** ((note.note - 69) / 12);
      gain.gain.setValueAtTime(Math.min(0.16, note.velocity / 1270), start + note.startSeconds);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + note.startSeconds + Math.max(0.01, note.durationSeconds));
      oscillator.connect(gain).connect(this.context.destination);
      oscillator.start(start + note.startSeconds);
      oscillator.stop(start + note.startSeconds + Math.max(0.01, note.durationSeconds));
      this.oscillators.push(oscillator);
    }
  }

  stop(): void {
    for (const oscillator of this.oscillators) oscillator.stop();
    this.oscillators = [];
  }
}
