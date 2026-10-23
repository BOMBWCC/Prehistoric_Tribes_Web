import { Graphics } from "../platform/Graphics";
import type { DrawableImage } from "../platform/Image";

export class LegacyOffscreenImage implements DrawableImage {
  readonly element: HTMLCanvasElement;
  readonly graphics: Graphics;

  /** `scale` > 1 (the HD wide view): the canvas is that many times larger; drawing still uses the
   *  original's coordinates (width x height). */
  constructor(readonly width: number, readonly height: number, readonly scale = 1) {
    this.element = document.createElement("canvas");
    this.element.width = width * scale;
    this.element.height = height * scale;
    const context = this.element.getContext("2d");
    if (!context) throw new Error("Canvas 2D context is unavailable");
    context.imageSmoothingEnabled = false;
    if (scale !== 1) context.scale(scale, scale);
    this.graphics = new Graphics(context);
  }
}

/** The four mutable Image slots allocated by the original e.c(). */
export class LegacyOffscreenTargets {
  readonly images = [
    new LegacyOffscreenImage(264, 352),
    new LegacyOffscreenImage(264, 304),
    new LegacyOffscreenImage(79, 63),
    new LegacyOffscreenImage(264, 304),
  ] as const;

  readonly graphics = this.images.map((image) => image.graphics) as [Graphics, Graphics, Graphics, Graphics];

  constructor() {
    for (const graphics of this.graphics) graphics.shown = true; // the frame is made of them
  }

  clear(index: 0 | 1 | 2 | 3, color: number, x: number, y: number, width: number, height: number): void {
    const graphics = this.graphics[index];
    graphics.setColor(color);
    graphics.fillRect(x, y, width, height);
  }

  copy(index: 0 | 1 | 2 | 3, sourceIndex: 0 | 1 | 2 | 3, x: number, y: number, anchor: number): void {
    this.graphics[index].drawImage(this.images[sourceIndex], x, y, anchor);
  }

  drawRegion(
    index: 0 | 1 | 2 | 3,
    sourceIndex: 0 | 1 | 2 | 3,
    sourceX: number,
    sourceY: number,
    sourceWidth: number,
    sourceHeight: number,
    x: number,
    y: number,
    anchor: number,
  ): void {
    this.graphics[index].drawRegion(this.images[sourceIndex], sourceX, sourceY, sourceWidth, sourceHeight, 0, x, y, anchor);
  }
}
