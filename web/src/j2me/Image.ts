export type DrawableImage = {
  readonly element: CanvasImageSource;
  readonly width: number;
  readonly height: number;
};

export class ImageResource implements DrawableImage {
  private constructor(public readonly element: HTMLImageElement) {}

  static async create(url: string): Promise<ImageResource> {
    const element = new Image();
    element.decoding = "async";
    element.src = url;
    await element.decode();
    return new ImageResource(element);
  }

  get width(): number {
    return this.element.naturalWidth;
  }

  get height(): number {
    return this.element.naturalHeight;
  }
}
