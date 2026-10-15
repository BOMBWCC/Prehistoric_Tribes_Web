import { Graphics } from "./Graphics";

export class LogicalCanvas {
  readonly element: HTMLCanvasElement;
  readonly graphics: Graphics;

  constructor(width = 240, height = 320) {
    this.element = document.createElement("canvas");
    this.element.width = width;
    this.element.height = height;
    this.element.setAttribute("role", "img");
    const context = this.element.getContext("2d");
    if (!context) throw new Error("Canvas 2D context is unavailable");
    context.imageSmoothingEnabled = false;
    this.graphics = new Graphics(context);
  }

  clear(color = "#000000"): void {
    const context = this.element.getContext("2d");
    if (!context) return;
    context.fillStyle = color;
    context.fillRect(0, 0, this.element.width, this.element.height);
  }
}
