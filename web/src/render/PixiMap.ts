import { Application, Container, Sprite, Texture } from "pixi.js";
import type { LegacyRuntimeState } from "../core/LegacyRuntimeState";
import type { WideScreen } from "../WideScreen";
import { hdArt } from "./HdArt";
import { LegacyOffscreenImage } from "./LegacyOffscreenTargets";
import { LegacyPackedSpriteRenderer } from "./LegacyPackedSpriteRenderer";
import { drawLegacyMapMarkerPieces, prepareLegacyMapMarkerDispatch, type LegacyMapMarkerDispatchResult } from "./LegacyMapMarkerDispatch";
import { sceneIn, type Op, type Person, type Window } from "./MapScene";
import { stepZSubrecordDraw } from "./RenderRuntime";
import { drawMapMargin, loadMarginPictures, MARGIN_TILES } from "./MapMargin";
import { BLD_KIND, BLD_X, BLD_Y } from "../core/DenseLayout";
import { T_BUILDING } from "../core/DataTables";

const TILE_W = 22;
const TILE_H = 16;
/** Map tiles per chunk side: one texture each (16 x 16 tiles is 352 x 256 game pixels, x4 in HD). */
const CHUNK = 16;
/** gridB values below this are ground composites (f.o(): the rest are map objects). */
const GROUND_LIMIT = 175;

type Chunk = { sprite: Sprite; column: number; row: number; key: string };
/** A map marker's picture on the objects layer. */
type Placed = { sprite: Sprite; path: string };
type Point = { x: number; y: number };
/** A person or animal: its sprite and where it stood at the last two steps. */
type Mover = { sprite: Sprite; from: Point; to: Point; picture?: Picture | null };
/** A list of the original's drawing calls drawn once (HD through HdArt), trimmed: its texture and
 *  where its top-left corner is relative to the calls' origin, in game pixels. */
type Picture = { texture: Texture; x: number; y: number; width: number; height: number; used: number };

/** The scratch box a picture is drawn in (game pixels) and where in it the calls' origin goes. */
const PICTURE_SIZE = 96;
const PICTURE_X = 40;
const PICTURE_Y = 60;
/** Pictures kept; beyond it the ones not shown this step are dropped. */
const PICTURE_CACHE = 800;
/** One game step (FixedLoop's tickMs): the screen moves the movers over this long. */
const STEP_MS = 120;
/** Further than this in one step is a jump (into or out of a building, a new villager): no sliding. */
const JUMP = 2 * TILE_W;

/**
 * The map drawn with WebGL (PixiJS), modernization step 3 (docs/modernization-plan.md §4.3). Layers
 * so far, from the bottom:
 *
 * - ground: each 16 x 16-tile chunk drawn once into a texture -- gridB below 175 (the original's
 *   ground composites) and, under buildings and map objects, their ground pieces -- in HD through
 *   HdArt; again only when one of its tiles changes;
 * - objects: buildings, sites, map objects (trees, rocks ...), resource points (berry bushes,
 *   stones), each one sprite of its HD picture (by kind and level / look, at its place in the
 *   catalog: HdArt.markerPicture), swapped only when that changes; ordered by their bottom edge.
 *   Markers without an HD picture draw their original pieces into the ground;
 * - people and animals on the same layer (sorted with the objects by their feet), with their marks
 *   just above them: what f.u() would draw, read from the game state (render/MapScene.ts), each
 *   distinct picture made once (pictureOf); between two steps the screen slides a person from the
 *   last place to the new one;
 * - effects (render/MapScene.ts: hits, flying spears and stones, fire, smoke, dust, the cursor's),
 *   and the corners of the building under the cursor around its picture; over the rest;
 * - fog: one pixel per tile (clear in sight, the shade explored, black unexplored; the border takes
 *   its nearest edge tile's), stretched over the map with smooth edges; redrawn when it changes;
 * - while placing a building, the light green tiles it may cover (WideScreen.drawPlaceable's).
 *
 * The map's border (render/MapMargin.ts) is drawn once into chunks of its own on the ground layer.
 *
 * The camera is the world's position and scale, so a drag or zoom redraws nothing; only chunks in
 * view are drawn. The box select's frame is drawn here too (f.w()'s green rectangle). The screen's
 * map since 2026-10-28 (the old larger view drawn each step is gone). Not here: the units on rally
 * markers, the buildings' health bars, the frames without an HD picture (the cave's eyes, torches), the hand cursor and the
 * aimed item at it when played with keys (touch play shows neither; the HUD marks the aimed one).
 */
export class PixiMap {
  private readonly app = new Application();
  private readonly world = new Container();
  private readonly ground = new Container();
  private readonly objects = new Container({ sortableChildren: true });
  private readonly effects = new Container();
  /** The people's marks (selection, health bar, thought ...): a pool of sprites on the objects layer. */
  private readonly marks: Sprite[] = [];
  private readonly effectSprites: Sprite[] = [];
  /** The pictures drawn so far, by their calls (null: draws nothing); see pictureOf. */
  private readonly pictures = new Map<string, Picture | null>();
  /** Game steps drawn (a picture's `used`). */
  private step = 0;
  /** How many times larger than the game's pixels pictures are drawn: the screen's, at most HD. */
  private pictureScale = 1;
  /** Placing: one tinted white square per tile (a pool; PixiJS's vector Graphics would double the bundle). */
  private readonly hints = new Container();
  /** The box select's frame: four dark lines a pixel down-right, four green ones (f.w()). */
  private readonly box = new Container();
  private fog: { canvas: HTMLCanvasElement; context: CanvasRenderingContext2D; sprite: Sprite; classes: Uint8Array } | null = null;
  private chunks: Chunk[] = [];
  private placed = new Map<string, Placed>();
  private movers = new Map<string, Mover>();
  /** When the last game step's places were taken (performance.now()). */
  private stepAt = 0;
  private readonly textures = new Map<string, Texture>();
  private map: object | null = null;
  private ready = false;
  private under: HTMLElement | null = null;

  constructor(private readonly runtime: LegacyRuntimeState, private readonly screen: WideScreen) {}

  /** Starts PixiJS on a canvas under the screen's (same box) and loads the terrain pictures. */
  async start(parent: HTMLElement, before: HTMLElement): Promise<void> {
    await this.app.init({
      backgroundAlpha: 0,
      antialias: false,
      autoStart: false, // drawn from the page's own frame (render), in step with the screen
      resolution: window.devicePixelRatio || 1,
      autoDensity: true,
      resizeTo: before,
      preserveDrawingBuffer: false,
    });
    this.app.canvas.className = "pixi-map";
    parent.insertBefore(this.app.canvas, before);
    this.under = before;
    this.world.addChild(this.ground, this.objects, this.effects, this.hints, this.box);
    for (let i = 0; i < 8; i += 1) {
      const line = new Sprite(Texture.WHITE);
      line.tint = i < 4 ? 0x000000 : 0x10dd64;
      this.box.addChild(line);
    }
    this.app.stage.addChild(this.world);
    await Promise.all([hdArt.loadGround(), loadMarginPictures()]);
    this.ready = true;
  }

  /** Each game step: the chunks whose ground changed, the objects; a new map starts over. */
  update(): void {
    const rt = this.runtime;
    if (!this.ready || !rt.activeMap || !this.screen.onMap) return;
    if (this.map !== rt.activeMap) this.rebuild();
    // Exactly under the screen canvas (resizeTo keeps the size).
    const style = this.app.canvas.style;
    style.left = `${this.under!.offsetLeft}px`;
    style.top = `${this.under!.offsetTop}px`;
    for (const chunk of this.chunks) {
      const key = this.chunkKey(chunk);
      if (key !== chunk.key) { chunk.key = key; this.draw(chunk); }
    }
    this.placeObjects();
    this.step += 1;
    const view = this.screen.viewTransform();
    this.pictureScale = Math.min(hdArt.scale(), Math.max(1, Math.ceil(view.cssPerGame * (window.devicePixelRatio || 1))));
    const scene = sceneIn(rt, this.viewWindow(3), this.screen.touchPlay);
    this.drawMovers(scene.people);
    this.placeEffects(scene.effects);
    this.drawFog();
    this.drawHints();
    this.drawBox();
  }

  /** Each display frame: the camera, the chunks in view, then the picture. */
  render(): void {
    if (!this.ready) return;
    const on = (this.screen.onMap || this.screen.frozen) && this.chunks.length > 0;
    this.app.canvas.hidden = !on;
    // The game menu's still screen: the map stays as it was.
    if (!on || this.screen.frozen) return;
    const view = this.screen.viewTransform();
    const k = view.cssPerGame;
    this.world.scale.set(k);
    // Whole device pixels: the chunks' edges meet without a seam.
    const dpr = window.devicePixelRatio || 1;
    this.world.position.set(-Math.round(view.x * k * dpr) / dpr, -Math.round(view.y * k * dpr) / dpr);
    const width = this.app.screen.width / k;
    const height = this.app.screen.height / k;
    const t = Math.max(0, Math.min(1, (performance.now() - this.stepAt) / STEP_MS));
    for (const mover of this.movers.values()) {
      const { from, to } = mover;
      const slide = Math.abs(to.x - from.x) <= JUMP && Math.abs(to.y - from.y) <= JUMP;
      const picture = mover.picture;
      if (!picture) continue;
      mover.sprite.position.set((slide ? from.x + (to.x - from.x) * t : to.x) + picture.x, (slide ? from.y + (to.y - from.y) * t : to.y) + picture.y);
    }
    for (const chunk of this.chunks) {
      const x = chunk.column * TILE_W;
      const y = chunk.row * TILE_H;
      chunk.sprite.visible = x + CHUNK * TILE_W + TILE_W > view.x && x - TILE_W < view.x + width
        && y + CHUNK * TILE_H + TILE_H > view.y && y - TILE_H < view.y + height;
    }
    this.app.render();
  }

  private rebuild(): void {
    for (const chunk of this.chunks) chunk.sprite.destroy({ texture: true, textureSource: true });
    for (const { sprite } of this.placed.values()) sprite.destroy();
    for (const mover of this.movers.values()) mover.sprite.destroy();
    this.chunks = [];
    this.placed.clear();
    this.movers.clear();
    for (const child of this.ground.removeChildren()) (child as Sprite).destroy({ texture: true, textureSource: true });
    this.fog?.sprite.destroy({ texture: true, textureSource: true });
    this.fog = null;
    this.map = this.runtime.activeMap ?? null;
    const { mapWidth, mapHeight } = this.runtime.game;
    for (let row = 0; row < mapHeight; row += CHUNK) {
      for (let column = 0; column < mapWidth; column += CHUNK) {
        const sprite = new Sprite(Texture.EMPTY);
        // The chunk's image has the original's 11 / 8 margin (composites land at +11, +8).
        sprite.position.set(column * TILE_W - 11, row * TILE_H - 8);
        this.ground.addChild(sprite);
        this.chunks.push({ sprite, column, row, key: "" });
      }
    }
    this.drawMargin();
  }

  /** The map marker on tile (column, row) as f.o() draws it: a map object (gridB >= 175), a
   *  building or site (gridC -1..-60) or resource point (-61..-110); 0 for none. The rally markers
   *  (-111..-123) hold units: not on this layer. */
  private marker(column: number, row: number): number {
    const tile = (this.runtime.gridB[row]?.[column] ?? 0) & 0xff;
    if (tile >= GROUND_LIMIT) return tile;
    const cell = this.runtime.gridC[row]?.[column] ?? 0;
    return cell < 0 && cell >= -110 ? cell : 0;
  }

  /** f.a(int,byte)'s routing for `marker` on tile (column, row), relative to (originColumn, originRow). */
  private dispatch(marker: number, column: number, row: number, originColumn = 0, originRow = 0): LegacyMapMarkerDispatchResult {
    const rt = this.runtime;
    const data = rt.packedData!;
    return prepareLegacyMapMarkerDispatch(marker, 0, {
      ah: column - originColumn, ai: row - originRow, originColumn, originRow, dense: rt.denseState, gridC: rt.gridC,
      packedBytes: rt.packedBytes, packedOffsets: rt.packedOffsets, shortTables: data.shortTables, byteTables: data.byteTables, aQ: rt.game.aQ,
    });
  }

  /** What the chunk's ground is drawn from: each tile's ground value, marker and the marker's look. */
  private chunkKey(chunk: Chunk): string {
    const { gridB, game } = this.runtime;
    let key = "";
    for (let row = chunk.row; row < Math.min(chunk.row + CHUNK, game.mapHeight); row += 1) {
      for (let column = chunk.column; column < Math.min(chunk.column + CHUNK, game.mapWidth); column += 1) {
        const marker = this.marker(column, row);
        if (marker === 0) { key += `${(gridB[row]?.[column] ?? 0) & 0xff},`; continue; }
        const r = this.dispatch(marker, column, row);
        key += `${(gridB[row]?.[column] ?? 0) & 0xff}:${marker}:${r.local4}:${r.local7}:${r.resource},`;
      }
    }
    return key;
  }

  /** The chunk's ground, as f.o() draws it, into a new texture: the ground composites, and under
   *  each marker its ground pieces (all its pieces where it has no HD picture). */
  private draw(chunk: Chunk): void {
    const rt = this.runtime;
    const data = rt.packedData;
    if (!data) return;
    const scale = hdArt.scale();
    const image = new LegacyOffscreenImage(CHUNK * TILE_W + TILE_W, CHUNK * TILE_H + TILE_H, scale);
    // Composite `key` from the ground atlas, drawn as the original's at (x, y) (its 11 / 8 margin in the offset).
    const put = (key: string, x: number, y: number) => {
      const piece = hdArt.groundPiece(key);
      if (!piece) return;
      const [sx, sy, width, height, dx, dy] = piece.box;
      image.graphics.drawRegionScaled(piece.image, sx, sy, width, height, x + dx, y + dy, width / scale, height / scale);
    };
    for (let r = 0; r < CHUNK; r += 1) {
      for (let c = 0; c < CHUNK; c += 1) {
        const column = chunk.column + c;
        const row = chunk.row + r;
        if (row >= rt.game.mapHeight || column >= rt.game.mapWidth) continue;
        const tile = (rt.gridB[row]?.[column] ?? 0) & 0xff;
        if (tile < GROUND_LIMIT) put(`t${tile}`, c * TILE_W, r * TILE_H);
        const marker = this.marker(column, row);
        if (marker === 0) continue;
        const result = this.dispatch(marker, column, row, chunk.column, chunk.row);
        const prefix = this.picture(marker, result) ? "b" : "f";
        const pieces: [string, number, number][] = [];
        drawLegacyMapMarkerPieces(result, c, r, data.shortTables, data.byteTables, (record, px, py) => pieces.push([`${prefix}${record}`, px, py]));
        // A map object with no ground of its own (the bones, BUG-033: its pieces are all on sheet 1,
        // drawn by its picture; the original left the tile empty too): its neighbour's ground under it.
        if (marker >= GROUND_LIMIT && pieces.every(([key]) => !hdArt.groundPiece(key))) {
          const near = ([[-1, 0], [0, -1], [1, 0], [0, 1]] as const)
            .map(([dc, dr]) => (rt.gridB[row + dr]?.[column + dc] ?? 255) & 0xff)
            .find((tile) => tile < GROUND_LIMIT);
          if (near !== undefined) put(`t${near}`, c * TILE_W, r * TILE_H);
        }
        for (const [key, px, py] of pieces) put(key, px, py);
      }
    }
    const old = chunk.sprite.texture;
    chunk.sprite.texture = Texture.from(image.element);
    chunk.sprite.scale.set(1 / scale);
    if (old !== Texture.EMPTY) old.destroy(true);
  }

  /** Marker `marker`'s HD picture, as drawMapMarker asks HdArt for it (null: none, the original draws). */
  private picture(marker: number, r: LegacyMapMarkerDispatchResult) {
    return hdArt.markerPicture(marker < 0 && marker >= -60 ? r.local3 : 0, r.local4, r.local7, r.resource, r.local7);
  }

  /** The objects layer: one sprite per building / map object with an HD picture; new, changed and
   *  gone ones updated. A picture's place is in the catalog (HdArt.markerPicture). */
  private placeObjects(): void {
    const rt = this.runtime;
    const seen = new Set<string>();
    for (let row = 0; row < rt.game.mapHeight; row += 1) {
      for (let column = 0; column < rt.game.mapWidth; column += 1) {
        const marker = this.marker(column, row);
        if (marker === 0) continue;
        const id = marker < 0 && marker >= -60 ? `b${-marker}` : `${marker}@${column},${row}`;
        if (seen.has(id)) continue;
        const r = this.dispatch(marker, column, row);
        const picture = this.picture(marker, r);
        const bounds = picture?.bounds;
        if (!picture?.image || !bounds) continue; // none, still loading, or not in the catalog
        seen.add(id);
        let placed = this.placed.get(id);
        if (!placed) {
          placed = { sprite: new Sprite(), path: "" };
          this.objects.addChild(placed.sprite);
          this.placed.set(id, placed);
        }
        if (placed.path !== picture.path) {
          placed.path = picture.path;
          placed.sprite.texture = this.texture(picture.path, picture.image);
        }
        // drawSprite's +11 / +8 is in the bounds already (the tile's corner).
        const x = r.local10 + bounds.x - 11;
        const y = r.local11 + bounds.y - 8;
        placed.sprite.position.set(x, y);
        placed.sprite.width = bounds.width;
        placed.sprite.height = bounds.height;
        placed.sprite.zIndex = y + bounds.height;
      }
    }
    for (const [id, placed] of this.placed) {
      if (seen.has(id)) continue;
      placed.sprite.destroy();
      this.placed.delete(id);
    }
  }

  /**
   * The people and animals around the view (render/MapScene.ts: as f.u() draws them, on tiles in
   * sight, and the ones shown at a building), each one sprite of its body's picture, sorted with
   * the objects by its feet; their marks (selection, health bar, thought ...) just above them. A
   * picture is drawn the first time its calls come up and kept (`pictureOf`).
   */
  private drawMovers(people: Person[]): void {
    const seen = new Set(people.map((p) => p.key));
    for (const [key, mover] of this.movers) {
      if (seen.has(key)) continue;
      mover.sprite.destroy();
      this.movers.delete(key);
    }
    let marks = 0;
    for (const person of people) {
      let mover = this.movers.get(person.key);
      if (!mover) {
        const sprite = new Sprite();
        this.objects.addChild(sprite);
        mover = { sprite, from: person.at, to: person.at };
        this.movers.set(person.key, mover);
      }
      mover.from = mover.to;
      mover.to = person.at;
      const picture = this.pictureOf(person.body, person.kind === 108 ? person.id : -1);
      mover.picture = picture;
      mover.sprite.visible = !!picture;
      if (picture) {
        mover.sprite.texture = picture.texture;
        mover.sprite.width = picture.width;
        mover.sprite.height = picture.height;
      }
      mover.sprite.zIndex = person.at.y + TILE_H;
      for (const op of person.overlay) this.placeOp(this.marks, this.objects, marks++, op, person.at.y + TILE_H + 0.5);
    }
    this.hideFrom(this.marks, marks);
    this.stepAt = performance.now();
  }

  /** The tiles around the view (`margin` more on each side). */
  private viewWindow(margin: number): Window {
    const view = this.screen.viewTransform();
    const column = Math.floor(view.x / TILE_W) - margin;
    const row = Math.floor(view.y / TILE_H) - margin;
    return {
      column, row,
      columns: Math.ceil(this.app.screen.width / view.cssPerGame / TILE_W) + 2 * margin,
      rows: Math.ceil(this.app.screen.height / view.cssPerGame / TILE_H) + 2 * margin,
    };
  }

  /** The border's chunks (16 x 16 tiles on a grid from its corner), drawn once; their fog is the fog layer's. */
  private drawMargin(): void {
    const rt = this.runtime;
    const { mapWidth, mapHeight } = rt.game;
    const scale = hdArt.scale();
    for (let row = -MARGIN_TILES; row < mapHeight + MARGIN_TILES; row += CHUNK) {
      for (let column = -MARGIN_TILES; column < mapWidth + MARGIN_TILES; column += CHUNK) {
        const window = { column, row, columns: CHUNK, rows: CHUNK };
        if (column >= 0 && row >= 0 && column + CHUNK <= mapWidth && row + CHUNK <= mapHeight) continue;
        const image = new LegacyOffscreenImage(CHUNK * TILE_W + TILE_W, CHUNK * TILE_H + TILE_H, scale);
        drawMapMargin(image, window, mapWidth, mapHeight, scale, () => 0);
        const sprite = new Sprite(Texture.from(image.element));
        sprite.position.set(column * TILE_W - 11, row * TILE_H - 8);
        sprite.scale.set(1 / scale);
        this.ground.addChild(sprite);
      }
    }
  }

  /** The effects around the view (render/MapScene.ts) and the corners of the building under the
   *  cursor (w()'s, around its picture: BUG-026): one sprite each from a pool. */
  private placeEffects(effects: Op[]): void {
    let used = 0;
    const rt = this.runtime;
    const g = rt.game;
    const cell = rt.gridC[g.cameraRow + g.cursorRow]?.[g.cameraColumn + g.cursorColumn] ?? 0;
    if (cell <= -1 && cell >= -30) {
      const id = -cell;
      const kind = rt.denseState[BLD_KIND + id] ?? 0;
      const sprite = this.placed.get(`b${id}`)?.sprite;
      const x = sprite?.x ?? (rt.denseState[BLD_X + id] ?? 0) * TILE_W;
      const y = sprite?.y ?? (rt.denseState[BLD_Y + id] ?? 0) * TILE_H;
      const width = sprite?.width ?? (rt.packedBytes[(rt.packedOffsets[T_BUILDING] ?? 0) + 104 + kind] ?? 0) * TILE_W;
      const height = sprite?.height ?? (rt.packedBytes[(rt.packedOffsets[T_BUILDING] ?? 0) + 130 + kind] ?? 0) * TILE_H;
      [[x, y], [x + width, y], [x, y + height], [x + width, y + height]].forEach(([cx, cy], i) => {
        this.placeOp(this.effectSprites, this.effects, used++, { op: "effect", index: 6 + i, x: cx!, y: cy!, phase: g.animStep });
      });
    }
    for (const op of effects) this.placeOp(this.effectSprites, this.effects, used++, op);
    this.hideFrom(this.effectSprites, used);
  }

  /** Sprite `i` of `pool` showing `op` (a picture of it alone, or a health bar's tinted rectangle). */
  private placeOp(pool: Sprite[], parent: Container, i: number, op: Op, zIndex = 0): void {
    let sprite = pool[i];
    if (!sprite) { sprite = new Sprite(); pool.push(sprite); parent.addChild(sprite); }
    sprite.zIndex = zIndex;
    if (op.op === "rect") {
      sprite.texture = Texture.WHITE;
      sprite.tint = op.color;
      sprite.position.set(op.x, op.y);
      sprite.width = op.width;
      sprite.height = op.height;
      sprite.visible = true;
      return;
    }
    const picture = this.pictureOf([{ ...op, x: 0, y: 0 }]);
    sprite.visible = !!picture;
    if (!picture) return;
    sprite.tint = 0xffffff;
    sprite.texture = picture.texture;
    sprite.position.set(op.x + picture.x, op.y + picture.y);
    sprite.width = picture.width;
    sprite.height = picture.height;
  }

  private hideFrom(pool: Sprite[], used: number): void {
    for (let i = used; i < pool.length; i += 1) pool[i]!.visible = false;
  }

  /**
   * The picture of `ops` (the original's drawing calls, relative to their origin): drawn once into a
   * scratch canvas -- HD parts and frames through HdArt; an animal (`animal`, its slot) as its whole
   * HD frame where it has one -- trimmed, kept by its calls and the drawing scale. Null when it draws
   * nothing.
   */
  private pictureOf(ops: Op[], animal = -1): Picture | null {
    if (ops.length === 0) return null;
    const rt = this.runtime;
    const data = rt.packedData;
    if (!data) return null;
    const scale = this.pictureScale;
    // An effect's phase counts on and on: its key is the frame it picks (the composites it draws).
    const frames = ops.map((op) => {
      if (op.op !== "effect") return op;
      const frame: number[] = [];
      stepZSubrecordDraw(rt, op.index, op.x, op.y, op.phase, { onSpriteRecord: (r, x, y) => frame.push(r, x, y) });
      return { op: op.op, index: op.index, frame };
    });
    const key = `${scale}:${animal >= 0 ? `a${(rt.denseState[9535 + animal] ?? 0)}-${(rt.denseState[9557 + animal] ?? 0) & 255}-${rt.denseState[9579 + animal] ?? 0}:` : ""}${JSON.stringify(frames)}`;
    const known = this.pictures.get(key);
    if (known !== undefined) {
      if (known) known.used = this.step;
      return known;
    }
    const image = new LegacyOffscreenImage(PICTURE_SIZE, PICTURE_SIZE, scale);
    const graphics = image.graphics;
    graphics.shown = true;
    graphics.translate(PICTURE_X, PICTURE_Y);
    let an = -1;
    hdArt.begin(rt, graphics);
    try {
      const whole = animal >= 0 && hdArt.drawAnimal(rt, animal, 0, 0);
      const target = graphics;
      const packed = new LegacyPackedSpriteRenderer({ shortTables: data.shortTables, byteTables: data.byteTables, imageGroups: rt.imageGroups, graphics: target, get an() { return an; } });
      const context = image.element.getContext("2d")!;
      // Drawing coordinates on this canvas: the packed renderer's 11 / 8 margin, the origin's place.
      const at = (x: number, y: number) => [PICTURE_X + x + 11, PICTURE_Y + y + 8] as const;
      for (const op of whole ? [] : ops) {
        if (op.op === "sprite") { an = op.an; packed.drawSprite(op.index, op.x, op.y); an = -1; }
        else if (op.op === "composite") packed.drawComposite(op.index, op.x, op.y);
        else if (op.op === "effect") rt.stepZSubrecordDraw(op.index, op.x, op.y, op.phase, { onSpriteRecord: (r, x, y) => packed.drawComposite(r, x, y) });
        else if (op.op === "ellipse") {
          // A two-pixel rim, the dark colour outside and the light one inside (the original's pieces).
          const [x, y] = at(op.x, op.y);
          const ring = (inset: number, color: number) => {
            context.strokeStyle = `#${color.toString(16).padStart(6, "0")}`;
            context.lineWidth = 1;
            context.beginPath();
            context.ellipse(x + op.width / 2, y + op.height / 2, op.width / 2 - 0.5 - inset, op.height / 2 - 0.5 - inset, 0, 0, Math.PI * 2);
            context.stroke();
          };
          ring(0, op.color);
          ring(1, op.light);
        } else if (op.op === "ui") {
          const icon = hdArt.uiPicture(op.name);
          if (!icon) return null; // still loading: drawn on a later step
          const [x, y] = at(op.x, op.y);
          context.drawImage(icon, x, y, op.width, op.height);
        } else if (op.op === "text") {
          // White on a black edge in the web font (user, 2026-10-29: the original's digits replaced).
          const [x, y] = at(op.x, op.y);
          context.font = "bold 8px sans-serif";
          context.textBaseline = "top";
          context.lineJoin = "round";
          context.lineWidth = 2;
          context.strokeStyle = "#000";
          context.fillStyle = "#fff";
          context.strokeText(op.text, x, y);
          context.fillText(op.text, x, y);
        }
      }
    } finally {
      hdArt.end();
    }
    const picture = trimmed(image, scale);
    if (picture) picture.used = this.step;
    // An HD picture it needs is still loading: shown this step, made again on a later one.
    if (hdArt.incomplete) return picture;
    this.pictures.set(key, picture);
    if (this.pictures.size > PICTURE_CACHE) {
      for (const [k, p] of this.pictures) {
        if (p && p.used >= this.step) continue;
        p?.texture.destroy(true);
        this.pictures.delete(k);
      }
    }
    return picture;
  }

  /** The fog: one pixel per tile of the map and its border (alpha: 0 in sight, the shade explored,
   *  opaque unexplored), stretched with smoothing over the map; written again when a tile changes. */
  private drawFog(): void {
    const rt = this.runtime;
    const g = rt.game;
    const width = g.mapWidth + 2 * MARGIN_TILES;
    const height = g.mapHeight + 2 * MARGIN_TILES;
    if (!this.fog) {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const context = canvas.getContext("2d", { willReadFrequently: true })!;
      const sprite = new Sprite(Texture.from(canvas));
      // Pixel (i, j) covers tile (i - M, j - M): its middle on the tile's middle.
      sprite.position.set(-MARGIN_TILES * TILE_W, -MARGIN_TILES * TILE_H);
      sprite.scale.set(TILE_W, TILE_H);
      this.world.addChildAt(sprite, this.world.getChildIndex(this.hints));
      this.fog = { canvas, context, sprite, classes: new Uint8Array(width * height).fill(255) };
    }
    const fog = this.fog;
    let changed = false;
    for (let j = 0; j < height; j += 1) {
      for (let i = 0; i < width; i += 1) {
        const column = Math.max(0, Math.min(g.mapWidth - 1, i - MARGIN_TILES));
        const row = Math.max(0, Math.min(g.mapHeight - 1, j - MARGIN_TILES));
        // A story too: the true fog, not f.u()'s everything in sight (BUG-030; only the picture).
        const level = rt.occupancyClass(column, row);
        if (fog.classes[j * width + i] !== level) { fog.classes[j * width + i] = level; changed = true; }
      }
    }
    if (!changed) return;
    const pixels = fog.context.createImageData(width, height);
    const ALPHA = [0, 115, 255]; // 115 / 255: HdArt.shadeTile's 0.45
    for (let p = 0; p < fog.classes.length; p += 1) pixels.data[p * 4 + 3] = ALPHA[fog.classes[p]!] ?? 255;
    fog.context.putImageData(pixels, 0, 0);
    (fog.sprite.texture.source as { update(): void }).update();
  }

  /** Placing a building (w 3, a site's f.s): the light green on every tile in view it may cover
   *  (free and in sight), as WideScreen.drawPlaceable draws it on the old map. */
  private drawHints(): void {
    const rt = this.runtime;
    const g = rt.game;
    let used = 0;
    if (g.barMode === 3 && g.cSInt > 3 && g.cSInt !== 100) {
      const window = this.viewWindow(1);
      for (let row = Math.max(0, window.row); row < Math.min(g.mapHeight, window.row + window.rows); row += 1) {
        for (let column = Math.max(0, window.column); column < Math.min(g.mapWidth, window.column + window.columns); column += 1) {
          if (rt.gridC[row]?.[column] !== 0 || rt.occupancyClass(column, row) !== 0) continue;
          let tile = this.hints.children[used] as Sprite | undefined;
          if (!tile) {
            tile = new Sprite(Texture.WHITE);
            tile.tint = 0x96ff6e;
            tile.alpha = 0.28;
            this.hints.addChild(tile);
          }
          // One pixel of gap: the tiles read as a grid (the old map's faint outline).
          tile.position.set(column * TILE_W + 0.5, row * TILE_H + 0.5);
          tile.width = TILE_W - 1;
          tile.height = TILE_H - 1;
          tile.visible = true;
          used += 1;
        }
      }
    }
    for (let i = used; i < this.hints.children.length; i += 1) this.hints.children[i]!.visible = false;
  }

  /** The box select (f.u:Z): from its anchor tile to the cursor's, as f.w() draws it. */
  private drawBox(): void {
    const g = this.runtime.game;
    this.box.visible = g.boxSelecting && g.loopMode === 1;
    if (!this.box.visible) return;
    const cursorColumn = g.cameraColumn + g.cursorColumn;
    const cursorRow = g.cameraRow + g.cursorRow;
    const x = Math.min(g.boxAnchorColumn, cursorColumn) * TILE_W;
    const y = Math.min(g.boxAnchorRow, cursorRow) * TILE_H;
    const width = (Math.abs(cursorColumn - g.boxAnchorColumn) + 1) * TILE_W;
    const height = (Math.abs(cursorRow - g.boxAnchorRow) + 1) * TILE_H;
    // drawRect(x, y, w, h) outlines w + 1 by h + 1 pixels; the dark one a pixel down-right.
    const lines = this.box.children as Sprite[];
    for (let i = 0; i < 2; i += 1) {
      const ox = x + 1 - i;
      const oy = y + 1 - i;
      const sides: [number, number, number, number][] = [[ox, oy, width + 1, 1], [ox, oy + height, width + 1, 1], [ox, oy, 1, height + 1], [ox + width, oy, 1, height + 1]];
      sides.forEach(([sx, sy, sw, sh], side) => {
        const line = lines[i * 4 + side]!;
        line.position.set(sx, sy);
        line.width = sw;
        line.height = sh;
      });
    }
  }

  /** One texture per picture file, shared by every sprite showing it. */
  private texture(path: string, image: HTMLImageElement): Texture {
    let texture = this.textures.get(path);
    if (!texture) {
      texture = Texture.from(image);
      this.textures.set(path, texture);
    }
    return texture;
  }
}

/** The drawn pixels of `image` (a picture's scratch canvas, `scale` times the game's pixels) as a
 *  texture of their own, and where they are relative to the calls' origin (render/MapScene.ts:
 *  drawing coordinates, the packed renderer's 11 / 8 margin taken off). */
function trimmed(image: LegacyOffscreenImage, scale: number): Picture | null {
  const canvas = image.element;
  const pixels = canvas.getContext("2d")!.getImageData(0, 0, canvas.width, canvas.height).data;
  let left = canvas.width, top = canvas.height, right = -1, bottom = -1;
  for (let y = 0; y < canvas.height; y += 1) {
    for (let x = 0; x < canvas.width; x += 1) {
      if (pixels[(y * canvas.width + x) * 4 + 3] === 0) continue;
      if (x < left) left = x;
      if (x > right) right = x;
      if (y < top) top = y;
      if (y > bottom) bottom = y;
    }
  }
  if (right < 0) return null;
  const out = document.createElement("canvas");
  out.width = right - left + 1;
  out.height = bottom - top + 1;
  out.getContext("2d")!.drawImage(canvas, left, top, out.width, out.height, 0, 0, out.width, out.height);
  return {
    texture: Texture.from(out),
    x: left / scale - PICTURE_X - 11, y: top / scale - PICTURE_Y - 8,
    width: out.width / scale, height: out.height / scale, used: 0,
  };
}
