export type FixedLoopOptions = {
  readonly tickMs?: 50 | 120;
  readonly update: (tick: number) => void;
  readonly render: (alpha: number) => void;
};

/** Fixed-delay loop matching f.run: j=120, or 50 in its special mode. */
export class FixedLoop {
  private readonly tickMs: number;
  private readonly update: (tick: number) => void;
  private readonly render: (alpha: number) => void;
  private accumulator = 0;
  private previous = 0;
  private tick = 0;
  private frameHandle = 0;
  private running = false;

  constructor(options: FixedLoopOptions) {
    this.tickMs = options.tickMs ?? 120;
    this.update = options.update;
    this.render = options.render;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.previous = performance.now();
    this.frameHandle = requestAnimationFrame((now) => this.frame(now));
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.frameHandle);
  }

  private frame(now: number): void {
    if (!this.running) return;
    const elapsed = Math.min(now - this.previous, this.tickMs * 5);
    this.previous = now;
    this.accumulator += elapsed;
    // f.run paints once per loop iteration (l() after m()), and paint() draws
    // from Random, so render exactly once after each update -- never on a
    // display frame without one (the canvas keeps the last picture). It used
    // to render every animation frame, ~7 paints per tick (2026-10-08).
    while (this.accumulator >= this.tickMs) {
      this.update(this.tick);
      this.tick += 1;
      this.accumulator -= this.tickMs;
      this.render(0);
    }
    this.frameHandle = requestAnimationFrame((next) => this.frame(next));
  }
}
