import { Anchor, type AnchorValue } from "./anchors";
import type { DrawableImage } from "./Image";
import { oldArt } from "./OldArt";

/** Canvas implementation of the J2ME Graphics operations used by the port. */
export class Graphics {
  private color = "#000000";
  private translation = { x: 0, y: 0 };
  private clipped = false;
  /** Draws here can reach the screen (OldArt: original pictures drawn into it are reported). */
  shown = false;

  constructor(private readonly context: CanvasRenderingContext2D) {}

  setColor(rgb: number): void {
    const value = rgb >>> 0;
    this.color = `#${value.toString(16).padStart(6, "0").slice(-6)}`;
    this.context.fillStyle = this.color;
    this.context.strokeStyle = this.color;
  }

  setColorRgb(red: number, green: number, blue: number): void {
    this.setColor(((red & 0xff) << 16) | ((green & 0xff) << 8) | (blue & 0xff));
  }

  translate(x: number, y: number): void {
    this.translation.x += x;
    this.translation.y += y;
  }

  /**
   * J2ME setClip REPLACES the clip (in translated coordinates); canvas clip()
   * only intersects, so the previous clip is dropped via restore() first.
   * restore() also resets the fill/stroke style, hence the setColor().
   */
  setClip(x: number, y: number, width: number, height: number): void {
    if (this.clipped) this.context.restore();
    this.context.save();
    this.clipped = true;
    this.context.beginPath();
    this.context.rect(x + this.translation.x, y + this.translation.y, width, height);
    this.context.clip();
    this.context.fillStyle = this.color;
    this.context.strokeStyle = this.color;
  }

  fillRect(x: number, y: number, width: number, height: number): void {
    this.context.fillRect(x + this.translation.x, y + this.translation.y, width, height);
  }

  /**
   * MIDP outlines cover (width + 1) x (height + 1) pixels, unantialiased. CORRECTED 2026-10-15:
   * canvas strokeRect/stroke on integer coordinates smear a 1 px line into two half-transparent
   * pixels, so the original's thin black lines (rope, poles, the order line) were nearly invisible.
   */
  drawRect(x: number, y: number, width: number, height: number): void {
    if (width < 0 || height < 0) return;
    const left = x + this.translation.x, top = y + this.translation.y;
    this.context.fillRect(left, top, width + 1, 1);
    this.context.fillRect(left, top + height, width + 1, 1);
    this.context.fillRect(left, top, 1, height + 1);
    this.context.fillRect(left + width, top, 1, height + 1);
  }

  /** A 1 px Bresenham line, both endpoints included, as MIDP draws it. */
  drawLine(x1: number, y1: number, x2: number, y2: number): void {
    let x = x1 + this.translation.x, y = y1 + this.translation.y;
    const endX = x2 + this.translation.x, endY = y2 + this.translation.y;
    const dx = Math.abs(endX - x), dy = -Math.abs(endY - y);
    const stepX = x < endX ? 1 : -1, stepY = y < endY ? 1 : -1;
    let error = dx + dy;
    for (;;) {
      this.context.fillRect(x, y, 1, 1);
      if (x === endX && y === endY) break;
      const twice = 2 * error;
      if (twice >= dy) { error += dy; x += stepX; }
      if (twice <= dx) { error += dx; y += stepY; }
    }
  }

  drawImage(image: DrawableImage, x: number, y: number, anchor: AnchorValue): void {
    if (this.shown && oldArt.where) oldArt.report(image, 0, 0, image.width, image.height);
    const point = this.resolveAnchor(x, y, image.width, image.height, anchor);
    this.context.drawImage(image.element, point.x + this.translation.x, point.y + this.translation.y);
  }

  drawRegion(
    image: DrawableImage,
    sourceX: number,
    sourceY: number,
    sourceWidth: number,
    sourceHeight: number,
    transform: number,
    x: number,
    y: number,
    anchor: AnchorValue,
  ): void {
    if (transform !== 0) throw new Error(`Unsupported J2ME transform ${transform}`);
    // MIDP (and KEmulator's Graphics.drawRegion) throws instead of clipping.
    if (sourceX < 0 || sourceY < 0 || sourceX + sourceWidth > image.width || sourceY + sourceHeight > image.height) {
      throw new RangeError("region exceeds the bounds of the source image");
    }
    if (this.shown && oldArt.where) oldArt.report(image, sourceX, sourceY, sourceWidth, sourceHeight);
    const point = this.resolveAnchor(x, y, sourceWidth, sourceHeight, anchor);
    this.context.drawImage(
      image.element,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      point.x + this.translation.x,
      point.y + this.translation.y,
      sourceWidth,
      sourceHeight,
    );
  }

  /** HD art (render/HdArt.ts): `image` stretched over (x, y, width, height). */
  drawScaled(image: CanvasImageSource, x: number, y: number, width: number, height: number): void {
    this.context.drawImage(image, x + this.translation.x, y + this.translation.y, width, height);
  }

  /** HD art: a region of an upscaled sheet over (x, y, width, height). */
  drawRegionScaled(image: CanvasImageSource, sx: number, sy: number, sw: number, sh: number, x: number, y: number, width: number, height: number): void {
    this.context.drawImage(image, sx, sy, sw, sh, x + this.translation.x, y + this.translation.y, width, height);
  }

  private resolveAnchor(
    x: number,
    y: number,
    width: number,
    height: number,
    anchor: AnchorValue,
  ): { x: number; y: number } {
    let resolvedX = x;
    let resolvedY = y;
    if (anchor & Anchor.HCENTER) resolvedX -= Math.floor(width / 2);
    else if (anchor & Anchor.RIGHT) resolvedX -= width;
    if (anchor & Anchor.VCENTER) resolvedY -= Math.floor(height / 2);
    else if (anchor & Anchor.BOTTOM) resolvedY -= height;
    else if (anchor & Anchor.BASELINE) resolvedY -= height;
    return { x: resolvedX, y: resolvedY };
  }
}
