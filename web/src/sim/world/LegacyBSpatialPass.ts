import { BLD_HP, BLD_KIND, BLD_X, BLD_Y, UNIT_HP, UNIT_MODE, UNIT_TYPE, UNIT_VISION, UNIT_Y } from "../../core/DenseLayout";
import { T_BUILDING } from "../../core/DataTables";
/**
 * The portions of b.d() whose behavior is fully visible without decoding its
 * private entity helpers. Array names intentionally follow the original
 * storage roles rather than assigning gameplay meanings.
 */
export function clearSecondIntLayers(layers: Int32Array[][]): void {
  if (layers.length < 2 || layers[1].length < 3) {
    throw new RangeError("b.d() requires int[2][3][96] layers");
  }
  for (let layer = 0; layer < 3; layer += 1) {
    if (layers[1][layer].length < 96) throw new RangeError("b.d() requires 96-entry rows");
    for (let cell = 0; cell < 96; cell += 1) layers[1][layer][cell] = 0;
  }
}

/** The final b.d() merge: first-layer cells are ORed with second-layer cells. */
export function mergeIntLayers(layers: Int32Array[][]): void {
  if (layers.length < 2 || layers[0].length < 3 || layers[1].length < 3) {
    throw new RangeError("b.d() requires int[2][3][96] layers");
  }
  for (let layer = 0; layer < 3; layer += 1) {
    if (layers[0][layer].length < 96 || layers[1][layer].length < 96) {
      throw new RangeError("b.d() requires 96-entry rows");
    }
    for (let cell = 0; cell < 96; cell += 1) {
      layers[0][layer][cell] |= layers[1][layer][cell];
    }
  }
}

export type LegacySpatialPassInput = {
  readonly state: Int8Array;
  readonly packedBytes: Int8Array;
  readonly packedOffsets: Int16Array;
  readonly layers: Int32Array[][];
  /** Original b.a(x,y,mode) call used for primary records. */
  readonly onPrimarySpatialUpdate?: (x: number, y: number, mode: number) => void;
  /** Original b.a(x,y,width,height) call used for larger records. */
  readonly onRectSpatialUpdate?: (x: number, y: number, width: number, height: number) => void;
};

/**
 * Structural port of the complete b.d() pass. The callbacks are deliberately
 * raw call boundaries: the bytecode identifies the coordinate/footprint
 * arguments, but not whether the callee is movement, collision, or combat.
 */
export function runLegacySpatialPass(input: LegacySpatialPassInput): void {
  clearSecondIntLayers(input.layers);

  for (let id = 1; id <= 50; id += 1) {
    if (input.state[UNIT_HP + id] === 0) continue;
    input.onPrimarySpatialUpdate?.(
      input.state[id],
      input.state[UNIT_Y + id],
      input.state[UNIT_VISION + id],
    );
  }

  for (let id = 51; id <= 100; id += 1) {
    if (input.state[UNIT_HP + id] === 0) continue;
    const stage = input.state[UNIT_MODE + id];
    const mode = input.state[UNIT_TYPE + id];
    if (stage < 23 || stage > 36 || mode > 9 || mode === 2 || mode === 7) continue;
    input.onPrimarySpatialUpdate?.(input.state[id], input.state[UNIT_Y + id], 0);
  }

  const tableBase = input.packedOffsets[T_BUILDING];
  for (let id = 1; id <= 30; id += 1) {
    if (input.state[BLD_HP + id] === 0) continue;
    const type = input.state[BLD_KIND + id];
    const width = input.packedBytes[tableBase + 104 + type];
    const height = input.packedBytes[tableBase + 130 + type];
    if (type >= 12) {
      input.onRectSpatialUpdate?.(input.state[BLD_X + id], input.state[BLD_Y + id], width, height);
    } else {
      input.onPrimarySpatialUpdate?.(
        input.state[BLD_X + id] + Math.floor(width / 2),
        input.state[BLD_Y + id] + Math.floor(height / 2),
        input.state[8688 + id] & 15,
      );
    }
  }

  mergeIntLayers(input.layers);
}
