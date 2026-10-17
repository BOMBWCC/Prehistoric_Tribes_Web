import type { Graphics } from "../platform/Graphics";
import type { DrawableImage } from "../platform/Image";

/**
 * Exact f.paint()'s `v != 1` branch, bytecode/f-javap.txt offsets 465..605
 * (the top-level `if (v:B != 1) goto 465` at offset 0..5 makes 465..605
 * everything menu/dialog/cutscene screens run -- offsets 8..462 are the
 * separate `v == 1` gameplay branch, ported elsewhere as
 * `LegacyRuntimeState.stepGameplayPaintComposite`/`renderGameplayTo`).
 *
 * Traced instruction-by-instruction:
 *
 *   465: a(g, images[M:B], 0, 0, 251, 328, a:S-11, b:S-8+0, 0)   // #435, UNCONDITIONAL
 *   502: if (s:Z == false) goto 600
 *   509: if (J:Z != false) goto 600
 *   516: if (aP:I >= 0)   goto 600
 *   523: g.setColor(0)
 *   528: a(g, a:S-11, b:S-8+0,               240, 16+(-aP:I))          // #437
 *   559: a(g, a:S-11, b:S-8+16+320-(-aP:I)+0, 240, -aP:I)               // #437
 *   600: z:Z = false
 *   605: return
 *
 * `a:S` (#140) and `b:S` (#240) are `short` fields with ZERO `putfield`
 * sites anywhere in f-javap.txt (exhaustively grepped) -- they stay at
 * Java's implicit default 0 for the entire game, same fact already relied
 * on by `stepGameplayPaintComposite`'s own docblock. That simplifies the
 * blit's dest position to the literal `(-11, -8)`.
 *
 * The two fillRects go through static helper #437 (`private static void
 * a(Graphics,int,int,int,int)`), confirmed by reading its own body: it
 * ADDS `11`/`8` back onto its x/y arguments before calling
 * `Graphics.fillRect` (`fillRect(11+x, 8+y, w, h)`). Combined with the
 * call-site's `a:S-11`/`b:S-8` (both 0), the two additions cancel exactly,
 * so with `a:S`/`b:S` at their proven-constant 0 the two rects reduce to:
 *   rect1: fillRect(0, 0,          240, 16 - aP:I)
 *   rect2: fillRect(0, 336 + aP:I, 240, -aP:I)
 * (only reached when `aP:I < 0`, so `-aP:I` is a positive height and
 * `336 + aP:I` sits above 336). This mirrors the shape of the already-
 * ported "opening" half of this same letterbox animation in
 * `LegacyGameplayPaintTriggers.ts`'s `stepLegacyP`
 * (`bar.fillRect(0, 0, 240, 16 + state.aP); bar.fillRect(0, 336 - state.aP,
 * 240, state.aP);`, for `aP > 0`) -- that call draws onto the OFFSCREEN
 * `Graphics[M:B]` target because `P()` has no `Graphics` parameter of its
 * own, whereas `paint()` draws directly onto its own `g` parameter (the
 * real on-screen surface, `aload_1` here vs `aload_0`+static array there)
 * -- confirmed by reading both bytecode bodies, not assumed from the
 * shared shape.
 */
export type LegacyPaintScreenState = {
  /** f.s:Z (#365) -- same field as `game.cameraSFlag`. */
  cameraSFlag: boolean;
  /** f.J:Z (#66) -- same field as `game.jSceneFlag`. */
  jSceneFlag: boolean;
  /** f.aP:I (#164) -- same field as `game.aPInt`. */
  aPInt: number;
};

/** Exact f.paint()'s `v != 1` branch. Draws directly into `graphics`. */
export function stepLegacyPaintScreen(state: LegacyPaintScreenState, graphics: Graphics, image: DrawableImage): void {
  // Offset 465: unconditional blit -- runs on every `v != 1` screen, no gate.
  graphics.drawRegion(image, 0, 0, 251, 328, 0, -11, -8, 0);

  // Offsets 502..600: letterbox bars, gated by s:Z && !J:Z && aP:I < 0.
  if (state.cameraSFlag && !state.jSceneFlag && state.aPInt < 0) {
    graphics.setColor(0);
    graphics.fillRect(0, 0, 240, 16 - state.aPInt);
    graphics.fillRect(0, 336 + state.aPInt, 240, -state.aPInt);
  }
}
