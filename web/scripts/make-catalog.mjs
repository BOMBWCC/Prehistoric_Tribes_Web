// Writes web/public/hd/catalog.json, the catalog of where each existing HD picture goes (render/HdArt.ts;
// modernization step 3, docs/modernization-plan.md §4.3 / §6):
//
//   npm --prefix web run catalog       (again after import-hd.mjs, which empties web/public/hd)
//
// The places are measured here, once, by drawing the original's pieces (the port's own drawing code,
// HD off) onto a clear canvas and trimming them, the way HdArt used to measure them while playing:
//
//   markers  map objects (gridB 175..255) and resource points, by HdArt's markerKey: the box of the
//            marker's ground and detail pieces, from its origin. Buildings and sites by picture key
//            ("<kind>-<level>"): their HD pictures are the original's placement preview (a(1000 +
//            kind + 1, 2), as export-art drew it) four times larger, which is taller than the map's
//            pieces (the stone ring, the yard: BUG-026 / BUG-027) -- so the picture at its own size
//            (a quarter), its bottom middle on the preview's
//   animals  each HD animal frame "<kind>-<anim>-<frame>": the box of its layers, from its (x, y),
//            facing right; "<key>:left" the box of the same frame facing left (drawn mirrored)
//   effects  each sub-record with HD frames: for every frame a phase picks (its composites), the HD
//            frame's number (the n-th distinct picture of phases 0..7, as export-art numbered them)
//            and its box from the sub-record's (x, y)
//   parts    each piece with a picture: the opaque part of its rectangle, from the rectangle's corner
//   pieces   the pieces without an HD part (the original four times larger until redrawn), packed into
//            hd/pieces.png: their box there; an overview per sheet goes to design/missing-art/
//   ground   each composite the map's ground draws (ground tiles, markers' ground pieces) in HD, packed
//            into hd/ground.png: its box there and its offset from the composite's (x, y)
//   scale    how many times larger the HD pictures are than the original's
import { writeHdFiles } from "./hd-files.mjs";
import { createServer } from "vite";
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const webDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const out = path.join(webDir, "public/hd/catalog.json");

const server = await createServer({ root: webDir, logLevel: "error", server: { port: 0, strictPort: false, host: "localhost", hmr: false, watch: null } }); // any free port, not the dev server's fixed 5173
await server.listen();
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const page = await (await browser.newContext({ viewport: { width: 240, height: 372 } })).newPage();
  await page.goto(server.resolvedUrls.local[0]);
  await page.waitForFunction(() => typeof window.__prehistoricDebugBootWithoutSplash === "function");
  await page.evaluate(async () => { localStorage.clear(); await window.__prehistoricDebugBootWithoutSplash({ originals: true }); });
  await page.addScriptTag({ path: path.resolve(webDir, "../tools/debug/stage.js") });
  await page.evaluate(() => { window.S.enter(11); window.S.step(3); });

  const catalog = await page.evaluate(async () => {
    const { Graphics } = await import("/src/platform/Graphics.ts");
    const { LegacyPackedSpriteRenderer } = await import("/src/render/LegacyPackedSpriteRenderer.ts");
    const { prepareLegacyMapMarkerDispatch, drawLegacyMapMarkerPieces } = await import("/src/render/LegacyMapMarkerDispatch.ts");
    const { stepLegacyMapMarkerDetail } = await import("/src/render/LegacyMapMarkerDetail.ts");
    const { personOps } = await import("/src/render/MapScene.ts");
    const { drawPrivately } = await import("/src/render/WideView.ts");
    const { stepZSubrecordDraw, drawImageHelper } = await import("/src/render/RenderRuntime.ts");
    const { hdArt, markerKey } = await import("/src/render/HdArt.ts");
    const D = await import("/src/core/DenseLayout.ts");
    await hdArt.load();
    const manifest = await (await fetch("/hd/manifest.json")).json();
    const rt = window.__prehistoricRuntime;
    const data = rt.packedData;
    const e = rt.denseState;
    const j = data.byteTables;

    /** A clear size x size canvas, its graphics and a packed renderer on it (HD off). */
    const scratch = (size) => {
      const canvas = document.createElement("canvas");
      canvas.width = canvas.height = size;
      const context = canvas.getContext("2d", { willReadFrequently: true });
      context.imageSmoothingEnabled = false;
      const graphics = new Graphics(context);
      let an = -1;
      const packed = new LegacyPackedSpriteRenderer({ shortTables: data.shortTables, byteTables: j, imageGroups: rt.imageGroups, graphics, get an() { return an; } });
      return { canvas, context, graphics, packed, setAn: (value) => { an = value; } };
    };
    const trim = (context, size) => {
      const pixels = context.getImageData(0, 0, size, size).data;
      let left = size, top = size, right = -1, bottom = -1;
      for (let y = 0; y < size; y += 1) for (let x = 0; x < size; x += 1) {
        if (pixels[(y * size + x) * 4 + 3] === 0) continue;
        left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y);
      }
      return right < 0 ? null : [left, top, right - left + 1, bottom - top + 1];
    };
    const relative = (b, ox, oy) => b && [b[0] - ox, b[1] - oy, b[2], b[3]];

    // ---- markers ----
    const markers = {};
    const dispatch = (value, arg2, column, row) => prepareLegacyMapMarkerDispatch(value, arg2, {
      ah: column, ai: row, originColumn: 0, originRow: 0, dense: e, gridC: rt.gridC, packedBytes: rt.packedBytes,
      packedOffsets: rt.packedOffsets, shortTables: data.shortTables, byteTables: j, aQ: rt.game.aQ,
    });
    // The ground's composites (render/PixiMap.ts draws them from hd/ground.png): t<n> a ground tile
    // (gridB < 175), b<n> a marker's ground-sheet piece under its HD picture, f<n> all of a marker's
    // pieces where it has none.
    const ground = new Set();
    for (let tile = 0; tile < 175; tile += 1) ground.add(`t${tile}`);
    const groundOf = (value, column, row) => {
      const r = dispatch(value, 0, column, row);
      const building = value < 0 && value >= -60 ? r.local3 : 0;
      const prefix = markerKey(building, r.local4, r.local7, r.resource, r.local7) ? "b" : "f";
      drawLegacyMapMarkerPieces(r, column, row, data.shortTables, j, (record) => ground.add(`${prefix}${record}`));
    };
    // The map objects the map data can show and that have an HD picture, from the manifest file itself
    // (not HdArt's view of it, which is what went wrong in BUG-034): each must get its box.
    const expectedObjects = new Set();
    const measure = (value, column, row) => {
      groundOf(value, column, row);
      const r = dispatch(value, 0, column, row);
      const id = 1000 + r.resource;
      const wanted = manifest.objects.includes(id) && !manifest.resources.includes(`${id}-look${r.local7}`);
      const key = markerKey(0, r.local4, r.local7, r.resource, r.local7);
      if (!wanted && (!key || key.looked)) return;
      if (key && key.boundsKey in markers) return;
      const size = 400, ox = 150, oy = 260;
      const s = scratch(size);
      s.graphics.translate(ox - r.local10, oy - r.local11);
      drawLegacyMapMarkerPieces(r, column, row, data.shortTables, j, (record, x, y) => s.packed.drawComposite(record, x, y));
      const upper = dispatch(value, 1, column, row);
      const markerG = new Int8Array(8);
      for (const write of upper.scratchGWrites) markerG[write.index] = write.value;
      stepLegacyMapMarkerDetail(upper.local3, upper.local7, upper.local4, upper.local10, upper.local11, upper.arg2, {
        phase: 0, N: upper.N, O: upper.O, qByte: rt.game.mission, vByte: rt.game.loopMode, ai: row, originRow: 0, dense: e,
        packedBytes: rt.packedBytes, packedOffsets: rt.packedOffsets, shortTables: data.shortTables, byteTables: j,
        entityMarkerG: markerG, entityMarkerH: new Int8Array(8), entityMarkerI: new Int8Array(8),
        statScratch: [Int16Array.from(rt.mainArrays.aShort[0])],
      }, { onComposite: (record, x, y) => s.packed.drawComposite(record, x, y) });
      const box = relative(trim(s.context, size), ox, oy);
      if (box && wanted) expectedObjects.add(id); // drawn, so it must be in the catalog
      if (box && key && !key.looked) markers[key.boundsKey] = box;
    };
    const column = 20, row = 20;
    // The HD scale: the upscaled ground sheet against the original's.
    const k = await new Promise((resolve) => { const image = new Image(); image.onload = () => resolve(Math.round(image.naturalWidth / rt.imageGroups[0].get(8).image.width)); image.src = "/hd/terrain/8.png"; });
    for (const key of manifest.buildings) {
      const kind = Number(key.split("-")[0]);
      const size = 400, ox = 150, oy = 260;
      const s = scratch(size);
      drawPrivately(rt, () => {
        for (let i = 0; i < 4; i += 1) rt.offscreenTargets.graphics[i] = s.graphics;
        rt.game.projectionS = ox; rt.game.projectionT = oy;
        drawImageHelper(rt, 1000 + kind + 1, 2, ox, oy);
      });
      const preview = relative(trim(s.context, size), ox, oy);
      const hd = await new Promise((resolve) => { const image = new Image(); image.onload = () => resolve(image); image.onerror = () => resolve(null); image.src = `/hd/buildings/${key}.png`; });
      if (!preview || !hd) continue;
      const width = hd.naturalWidth / k, height = hd.naturalHeight / k;
      markers[key] = [preview[0] + (preview[2] - width) / 2, preview[1] + preview[3] - height, width, height];
    }
    drawPrivately(rt, () => {
      // Buildings and sites (building 1 moved here and changed): the ground pieces of every tile.
      const table = rt.packedOffsets[138];
      for (let kind = 0; kind <= 19; kind += 1) {
        const width = rt.packedBytes[table + 104 + kind], height = rt.packedBytes[table + 130 + kind];
        for (let level = 0; level <= 3; level += 1) {
          e[D.BLD_X + 1] = column; e[D.BLD_Y + 1] = row; e[D.BLD_KIND + 1] = kind; e[D.BLD_LEVEL + 1] = level;
          for (let r = 0; r < height; r += 1) for (let c = 0; c < width; c += 1) rt.gridC[row + r][column + c] = -1;
          for (let r = 0; r < height; r += 1) for (let c = 0; c < width; c += 1) groundOf(-1, column + c, row + r);
          for (let r = 0; r < height; r += 1) for (let c = 0; c < width; c += 1) rt.gridC[row + r][column + c] = 0;
        }
      }
    });
    drawPrivately(rt, () => {
      // Map objects.
      for (let value = 175; value <= 255; value += 1) {
        rt.gridB[row][column] = value > 127 ? value - 256 : value;
        measure(value, column, row);
      }
      // Resource points (slot 0): every kind and look.
      for (let kind = 0; kind <= 20; kind += 1) {
        for (let look = 0; look <= 3; look += 1) {
          e[D.RES_X] = column; e[D.RES_Y] = row; e[D.RES_KIND] = kind; e[D.RES_LOOK] = look; e[D.RES_AMOUNT] = 50;
          rt.gridC[row][column] = -61;
          measure(-61, column, row);
        }
      }
    });

    // ---- animals ----
    const animals = {};
    drawPrivately(rt, () => {
      // Facing right (direction 0, the HD frames') and left (direction 3: "<key>:left", BUG-032).
      for (const key of manifest.animals) {
        const [kind, anim, frame] = key.split("-").map(Number);
        for (const [direction, name] of [[0, key], [3, `${key}:left`]]) {
          e[9535] = kind; e[9557] = anim > 127 ? anim - 256 : anim; e[9579] = frame; e[9491] = direction;
          const size = 160, ox = 64, oy = 96;
          const s = scratch(size);
          s.graphics.translate(ox, oy);
          for (const op of personOps(rt, 0, 0, 0, direction, 108).body) {
            if (op.op === "sprite") { s.setAn(op.an); s.packed.drawSprite(op.index, op.x, op.y); s.setAn(-1); }
            else if (op.op === "composite") s.packed.drawComposite(op.index, op.x, op.y);
          }
          const box = relative(trim(s.context, size), ox, oy);
          if (box) animals[name] = box;
        }
      }
    });

    // ---- effects ----
    const effects = {};
    const records = [...new Set(manifest.effects.map((k) => Number(k.split("-")[0])))];
    const picture = (record, phase) => {
      const size = 96, origin = 32;
      const s = scratch(size);
      try {
        stepZSubrecordDraw(rt, record, origin, origin, phase, { onSpriteRecord: (r, x, y) => s.packed.drawComposite(r, x, y) });
      } catch { return null; }
      const b = trim(s.context, size);
      if (!b) return null;
      const cut = document.createElement("canvas");
      cut.width = b[2]; cut.height = b[3];
      cut.getContext("2d").drawImage(s.canvas, b[0], b[1], b[2], b[3], 0, 0, b[2], b[3]);
      return { url: cut.toDataURL(), box: relative(b, origin, origin) };
    };
    for (const record of records) {
      const frames = [];
      for (let phase = 0; phase < 8; phase += 1) {
        const p = picture(record, phase);
        if (p && !frames.includes(p.url)) frames.push(p.url);
      }
      const byFrame = {};
      for (let phase = 0; phase < 128; phase += 1) {
        const composites = [];
        try { stepZSubrecordDraw(rt, record, 0, 0, phase, { onSpriteRecord: (r, x, y) => composites.push(r, x, y) }); } catch { continue; }
        const signature = JSON.stringify(composites);
        if (signature in byFrame) continue;
        const p = picture(record, phase);
        const index = p ? frames.indexOf(p.url) : -1;
        if (index >= 0 && manifest.effects.includes(`${record}-${index}`)) byFrame[signature] = [index, ...p.box];
      }
      if (Object.keys(byFrame).length > 0) effects[record] = byFrame;
    }

    // ---- parts ----
    const parts = {};
    for (const index of manifest.parts) {
      const sheet = (j[20][index] & 0xff) & 31;
      const sx = (j[21][index] & 0xff) & 127, sy = j[22][index] & 0xff, width = j[23][index] & 0xff, height = j[24][index] & 0xff;
      const image = rt.imageGroups[0]?.get(sheet)?.image;
      if (!image || width === 0 || height === 0) continue;
      const size = Math.max(width, height);
      const s = scratch(size);
      s.context.drawImage(image.element, sx, sy, width, height, 0, 0, width, height);
      const box = trim(s.context, size);
      if (box) parts[index] = box;
    }
    // Every map as it starts (the campaign's and the custom ones): what its tiles draw.
    for (let q = 0; q <= 11; q += 1) {
      window.S.enter(q);
      window.S.step(3);
      for (let r = 0; r < rt.game.mapHeight; r += 1) {
        for (let c = 0; c < rt.game.mapWidth; c += 1) {
          const tile = rt.gridB[r][c] & 0xff;
          const cell = rt.gridC[r][c];
          const value = tile >= 175 ? tile : cell < 0 && cell >= -110 ? cell : 0;
          if (value !== 0) groundOf(value, c, r);
        }
      }
    }
    window.S.enter(11);
    window.S.step(3);

    // The atlases below draw the HD parts where these measurements put them (not the last run's).
    hdArt.useCatalog({ parts: { ...parts }, scale: k });

    // ---- the ground atlas ----
    // Each ground composite drawn in HD (the upscaled terrain sheets, HD pieces, the shining stone
    // tiles) as the map drew them, trimmed, packed into shelves of one picture.
    const { LegacyOffscreenImage } = await import("/src/render/LegacyOffscreenTargets.ts");
    const drawGround = (key) => {
      const size = 96, ox = 30, oy = 40;
      const image = new LegacyOffscreenImage(size, size, k);
      const packed = new LegacyPackedSpriteRenderer({ shortTables: data.shortTables, byteTables: j, imageGroups: rt.imageGroups, graphics: image.graphics });
      hdArt.begin(rt, image.graphics);
      try {
        const record = Number(key.slice(1));
        if (key[0] === "t") { if (!hdArt.drawStoneTile(record, ox, oy)) packed.drawComposite(record, ox, oy); }
        else if (key[0] === "b") hdArt.ground.drawComposite(record, ox, oy);
        else packed.drawComposite(record, ox, oy);
      } finally {
        hdArt.end();
      }
      return { image, ox, oy, size };
    };

    for (const key of ground) drawGround(key); // asks for the HD pieces they use
    await new Promise((resolve) => setTimeout(resolve, 3000));
    const tiles = [], empty = [];
    for (const key of ground) {
      const { image, ox, oy, size } = drawGround(key);
      const context = image.element.getContext("2d", { willReadFrequently: true });
      const b = trim(context, size * k);
      if (b) tiles.push({ key, canvas: image.element, b, offset: [b[0] / k - ox, b[1] / k - oy] });
      else empty.push(key);
    }
    tiles.sort((a, b) => b.b[3] - a.b[3]);
    const width = 2048;
    let x = 0, y = 0, shelf = 0;
    const groundBoxes = Object.fromEntries(empty.map((key) => [key, null])); // nothing to draw (a marker's non-ground piece)
    for (const t of tiles) {
      if (x + t.b[2] > width) { x = 0; y += shelf + 2; shelf = 0; }
      t.at = [x, y];
      groundBoxes[t.key] = [x, y, t.b[2], t.b[3], t.offset[0], t.offset[1]];
      x += t.b[2] + 2;
      shelf = Math.max(shelf, t.b[3]);
    }
    const atlas = document.createElement("canvas");
    atlas.width = width;
    atlas.height = y + shelf;
    const context = atlas.getContext("2d");
    for (const t of tiles) context.drawImage(t.canvas, t.b[0], t.b[1], t.b[2], t.b[3], t.at[0], t.at[1], t.b[2], t.b[3]);

    // ---- pieces without an HD picture ----
    // Every picture piece of the non-terrain sheets that has no HD part yet: the original's pixels
    // four times larger (nearest), trimmed, packed into hd/pieces.png -- until the UI design redraws
    // them (design/missing-art/). The terrain sheets are whole HD sheets.
    const terrainSheets = new Set(manifest.terrain);
    const hdParts = new Set(manifest.parts);
    const missing = [];
    for (let index = 1; index < j[20].length; index += 1) {
      const sheet = (j[20][index] & 0xff) & 31;
      const sx = (j[21][index] & 0xff) & 127, sy = j[22][index] & 0xff, width = j[23][index] & 0xff, height = j[24][index] & 0xff;
      if (sheet >= 27 || terrainSheets.has(sheet) || hdParts.has(index) || width === 0 || height === 0) continue;
      const image = rt.imageGroups[0]?.get(sheet)?.image;
      if (!image) continue;
      const size = Math.max(width, height);
      const s = scratch(size);
      s.context.drawImage(image.element, sx, sy, width, height, 0, 0, width, height);
      const box = trim(s.context, size);
      if (!box) continue;
      const big = document.createElement("canvas");
      big.width = box[2] * k; big.height = box[3] * k;
      const bigContext = big.getContext("2d");
      bigContext.imageSmoothingEnabled = false;
      bigContext.drawImage(s.canvas, box[0], box[1], box[2], box[3], 0, 0, big.width, big.height);
      parts[index] = box;
      missing.push({ index, sheet, canvas: big });
    }
    missing.sort((a, b) => b.canvas.height - a.canvas.height);
    const pieces = {};
    let px = 0, py = 0, tallest = 0;
    for (const m of missing) {
      if (px + m.canvas.width > width) { px = 0; py += tallest + 2; tallest = 0; }
      m.at = [px, py];
      pieces[m.index] = [px, py, m.canvas.width, m.canvas.height];
      px += m.canvas.width + 2;
      tallest = Math.max(tallest, m.canvas.height);
    }
    const piecesAtlas = document.createElement("canvas");
    piecesAtlas.width = width;
    piecesAtlas.height = py + tallest;
    const piecesContext = piecesAtlas.getContext("2d");
    for (const m of missing) piecesContext.drawImage(m.canvas, m.at[0], m.at[1]);
    // The redraw list's overview, one picture per sheet: each piece four times larger, its number under it.
    const sheets = {};
    for (const m of missing.sort((a, b) => a.index - b.index)) (sheets[m.sheet] ??= []).push(m);
    const overviews = {};
    for (const [sheet, list] of Object.entries(sheets)) {
      const cell = 80, perRow = 12;
      const c = document.createElement("canvas");
      c.width = cell * perRow; c.height = Math.ceil(list.length / perRow) * (cell + 14);
      const x = c.getContext("2d");
      x.fillStyle = "#3a3f2a"; x.fillRect(0, 0, c.width, c.height);
      x.imageSmoothingEnabled = false;
      list.forEach((m, i) => {
        const cx = (i % perRow) * cell, cy = Math.floor(i / perRow) * (cell + 14);
        const f = Math.min(1, (cell - 4) / Math.max(m.canvas.width, m.canvas.height));
        x.drawImage(m.canvas, cx + 2, cy + 2, m.canvas.width * f, m.canvas.height * f);
        x.fillStyle = "#fff"; x.font = "11px sans-serif"; x.fillText(String(m.index), cx + 2, cy + cell + 10);
      });
      overviews[sheet] = { png: c.toDataURL("image/png"), pieces: list.map((m) => m.index) };
    }
    return { expectedObjects: [...expectedObjects], markers, animals, effects, parts, pieces, ground: groundBoxes, scale: k, groundPng: atlas.toDataURL("image/png"), piecesPng: piecesAtlas.toDataURL("image/png"), overviews };
  });

  // A catalog with something missing is not written (BUG-034: a first run once measured 38 markers
  // of 163): every building picture, every map object, every ground tile, every HD animal frame.
  const manifest = JSON.parse(fs.readFileSync(path.join(webDir, "public/hd/manifest.json"), "utf8"));
  const lacking = [
    ...manifest.buildings.filter((key) => !(key in catalog.markers)).map((key) => `building ${key}`),
    ...catalog.expectedObjects.filter((id) => !Object.keys(catalog.markers).some((key) => key.startsWith(`o${id}:`))).map((id) => `object ${id}`),
    ...Array.from({ length: 175 }, (_, tile) => `t${tile}`).filter((key) => !(key in catalog.ground)).map((key) => `ground ${key}`),
    ...manifest.animals.flatMap((key) => [key, `${key}:left`]).filter((key) => !(key in catalog.animals)).map((key) => `animal ${key}`),
  ];
  if (lacking.length > 0) {
    console.error(`catalog.json NOT written, ${lacking.length} missing: ${lacking.slice(0, 12).join(", ")}${lacking.length > 12 ? " ..." : ""}`);
    process.exitCode = 1;
  } else {
    const png = (dataUrl) => Buffer.from(dataUrl.split(",")[1], "base64");
    fs.writeFileSync(path.join(webDir, "public/hd/ground.png"), png(catalog.groundPng));
    fs.writeFileSync(path.join(webDir, "public/hd/pieces.png"), png(catalog.piecesPng));
    const overviewDir = path.resolve(webDir, "../design/missing-art");
    fs.mkdirSync(overviewDir, { recursive: true });
    for (const [sheet, { png: data, pieces }] of Object.entries(catalog.overviews)) {
      fs.writeFileSync(path.join(overviewDir, `sheet-${sheet}.png`), png(data));
      fs.writeFileSync(path.join(overviewDir, `sheet-${sheet}.json`), JSON.stringify(pieces));
    }
    delete catalog.groundPng;
    delete catalog.piecesPng;
    delete catalog.overviews;
    delete catalog.expectedObjects;
    fs.writeFileSync(out, JSON.stringify(catalog));
    console.log(`catalog.json: ${Object.keys(catalog.ground).length} ground pieces, ${Object.keys(catalog.markers).length} markers, ${Object.keys(catalog.animals).length} animals, ${Object.keys(catalog.effects).length} effects, ${Object.keys(catalog.parts).length} parts`);
  }
} finally {
  await browser.close();
  await server.close();
}
console.log(`files.json: ${writeHdFiles()} pictures`);
