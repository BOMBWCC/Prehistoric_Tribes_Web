import { ImageResource } from "./Image";
import { oldArt } from "./OldArt";

export type PackedImage = {
  readonly index: number;
  readonly bytes: Uint8Array;
  readonly image: ImageResource;
};

/** Decoder for the fixed-count, 16-bit big-endian PNG packs used by e.d(). */
export class ImagePack {
  private constructor(readonly records: readonly PackedImage[]) {}

  static async load(url: string, recordCount: number): Promise<ImagePack> {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Unable to load image pack ${url}: ${response.status}`);
    const bytes = new Uint8Array(await response.arrayBuffer());
    const records: PackedImage[] = [];
    let cursor = 0;

    for (let index = 0; index < recordCount; index += 1) {
      if (cursor + 2 > bytes.length) throw new Error(`Image pack ${url} ended at record ${index}`);
      const length = (bytes[cursor] << 8) | bytes[cursor + 1];
      cursor += 2;
      if (length === 0xff00 || bytes[cursor - 2] === 0xff) break;
      if (length === 0) continue;
      if (cursor + length > bytes.length) {
        throw new Error(`Image pack ${url} record ${index} exceeds the resource length`);
      }
      const payload = bytes.slice(cursor, cursor + length);
      cursor += length;
      if (!isPng(payload)) throw new Error(`Image pack ${url} record ${index} is not PNG data`);
      const objectUrl = URL.createObjectURL(new Blob([payload], { type: "image/png" }));
      try {
        const image = await ImageResource.create(objectUrl);
        oldArt.name(image, `${url.split("/").pop()}#${index}`);
        records.push({ index, bytes: payload, image });
      } finally {
        URL.revokeObjectURL(objectUrl);
      }
    }
    return new ImagePack(records);
  }

  get(index: number): PackedImage | undefined {
    return this.records.find((record) => record.index === index);
  }

  /** Preserve the original pack order for bytecode-driven image indexing. */
  all(): readonly PackedImage[] {
    return this.records;
  }
}

function isPng(bytes: Uint8Array): boolean {
  return bytes.length >= 8 &&
    bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47 &&
    bytes[4] === 0x0d && bytes[5] === 0x0a && bytes[6] === 0x1a && bytes[7] === 0x0a;
}
