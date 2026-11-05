// The WebGL map (render/PixiMap.ts, modernization step 3): what it draws follows the game. (Until it
// replaced the old drawing, 2026-10-28, it was compared with it tile by tile: they matched.)

/** The map's pixels at tile (x, y)'s middle (mean colour of a small square) and its visibility. */
async function tiles(t, list) {
  await t.page.waitForTimeout(150); // the people's slide between two steps is over
  return t.eval((list) => {
    const screen = window.__prehistoricScreen;
    const map = window.__prehistoricPixiMap;
    map.render();
    const pixi = document.querySelector("canvas.pixi-map");
    const c = document.createElement("canvas");
    c.width = screen.element.width; c.height = screen.element.height;
    const x2 = c.getContext("2d", { willReadFrequently: true });
    x2.drawImage(pixi, 0, 0, c.width, c.height); // right after render(): the WebGL picture is still there
    const dpr = window.devicePixelRatio || 1;
    const k = screen.tileToCss(1, 1).x - screen.tileToCss(0, 0).x;
    return list.map(([x, y]) => {
      const p = screen.tileToCss(x, y);
      const d = x2.getImageData(Math.round((p.x + k * 0.3) * dpr), Math.round((p.y + k * 0.25) * dpr), Math.max(1, Math.round(k * 0.4 * dpr)), Math.max(1, Math.round(k * 0.3 * dpr))).data;
      let sum = 0;
      for (let i = 0; i < d.length; i += 4) sum += d[i] + d[i + 1] + d[i + 2];
      return sum / (d.length / 4) / 3; // brightness 0..255
    });
  }, list);
}

export default [
  {
    name: "WebGL map: a context lost again before the first frame after a restore throws nothing, the map comes back (BUG-064)",
    async run(t) {
      await t.eval(() => { S.reveal = true; S.enter(11); S.step(3); S.look(14, 40); S.step(20); });
      await t.until(() => window.__prehistoricPixiMap.chunks?.length > 0, { max: 400, chunk: 10, what: "the WebGL map" });
      await t.page.waitForTimeout(300);
      const r = await t.page.evaluate(async () => {
        const map = window.__prehistoricPixiMap;
        const gl = map.app.renderer.gl;
        const ext = gl.getExtension("WEBGL_lose_context");
        const wait = (ms) => new Promise((done) => setTimeout(done, ms));
        const out = {};
        const draw = (key) => { try { map.render(); out[key] = "ok"; } catch (e) { out[key] = e.message; } };
        ext.loseContext();
        await wait(150);
        // Lost again between Pixi's restore (its programs forgotten) and the first frame.
        gl.canvas.addEventListener("webglcontextrestored", () => { ext.loseContext(); draw("lostAgain"); }, { once: true });
        ext.restoreContext();
        await wait(100);
        ext.restoreContext();
        await wait(300);
        draw("restored");
        // Pixi's program for the map has its uniforms again.
        out.uniforms = Math.min(...Object.values(map.app.renderer.shader._programDataHash).map((p) => Object.keys(p.uniformData).length));
        return out;
      });
      t.expect.equal(r.lostAgain, "ok", "no throw on the lost context");
      t.expect.equal(r.restored, "ok", "drawn when it is back");
      t.expect.ok(r.uniforms > 0, `a working program (${r.uniforms} uniforms)`);
    },
  },
  {
    name: "HD art: the boar's walk frame keeps the shape of its picture, not squeezed into its box (BUG-059)",
    async run(t) {
      await t.eval(() => { S.enter(11); S.step(3); });
      const drawn = await t.page.evaluate(async () => {
        const { hdArt } = await import("/src/render/HdArt.ts");
        const rt = window.__prehistoricRuntime, e = rt.denseState;
        // Animal slot 0 as a boar (kind 0) facing right in its walk, frame 0 (0-2-0: 140 x 152).
        e[9535] = 0; e[9557] = 2; e[9579] = 0; e[9491] = 0;
        const calls = [];
        const target = { drawScaled: (image, x, y, w, h) => calls.push([image.width, image.height, w, h]), drawScaledMirrored: () => {} };
        for (let i = 0; i < 100; i += 1) {
          hdArt.begin(rt, target);
          const done = hdArt.drawAnimal(rt, 0, 0, 0);
          hdArt.end();
          if (done) break;
          await new Promise((r) => setTimeout(r, 30));
        }
        return calls.at(-1) ?? null;
      });
      t.expect.ok(drawn, "the HD frame drawn");
      const [iw, ih, w, h] = drawn;
      t.expect.ok(Math.abs((w / h) / (iw / ih) - 1) < 0.02, `drawn ${w} x ${h} for a ${iw} x ${ih} picture`);
    },
  },
  {
    name: "WebGL map: every berry bush on PLOT OF LAND is drawn, the map's berry tiles too (BUG-050)",
    async run(t) {
      await t.eval(() => { S.reveal = true; S.enter(11); S.step(3); });
      await t.until(() => window.__prehistoricPixiMap.chunks?.length > 0, { max: 400, chunk: 10, what: "the WebGL map" });
      const bushes = await t.eval(() => { const e = __prehistoricRuntime.denseState; const l = []; for (let s = 0; s < 50; s += 1) { const k = e[9833 + s]; if (k >= 1 && k <= 4) l.push([e[9733 + s], e[9783 + s]]); } return l; });
      const missing = [];
      for (const [x, y] of bushes) {
        await t.eval(([x, y]) => { S.look(x, y); S.step(5); }, [x, y]);
        const key = await t.eval(([x, y]) => `${__prehistoricRuntime.gridC[y][x]}@${x},${y}`, [x, y]);
        try { await t.until((key) => { window.__prehistoricPixiMap.render(); return !!window.__prehistoricPixiMap.placed.get(key); }, { arg: key, max: 200, chunk: 10, what: key }); } catch { missing.push(key); }
      }
      t.expect.deepEqual(missing, [], "bushes not drawn");
    },
  },
  {
    name: "WebGL map: a bush whose look changes keeps its picture while the new one loads (BUG-050)",
    async run(t) {
      await t.eval(async () => { const { Pacing } = await import("/src/core/Pacing.ts"); Pacing.berriesEndless = false; S.reveal = true; S.enter(11); S.step(3); });
      await t.until(() => window.__prehistoricPixiMap.chunks?.length > 0, { max: 400, chunk: 10, what: "the WebGL map" });
      // The bush at (10, 43), resource slot found by its tile; its picture placed first.
      const slot = await t.eval(() => { const e = __prehistoricRuntime.denseState; for (let s = 0; s < 50; s += 1) if (e[9733 + s] === 10 && e[9783 + s] === 43) return s; return -1; });
      await t.eval(() => { S.look(10, 43); S.step(20); });
      const key = await t.eval((slot) => `${__prehistoricRuntime.gridC[43][10]}@10,43`, slot);
      await t.until((key) => !!window.__prehistoricPixiMap.placed.get(key), { arg: key, max: 400, chunk: 10, what: "the bush's picture" });
      // Its look drops to one never shown yet: on the very next frame the bush is still drawn.
      const after = await t.eval(([slot, key]) => {
        const e = __prehistoricRuntime.denseState;
        e[9883 + slot] = 1;
        e[9933 + slot] = 0;
        window.__prehistoricPixiMap.render();
        return !!window.__prehistoricPixiMap.placed.get(key);
      }, [slot, key]);
      t.expect.ok(after, "the bush stays drawn");
    },
  },
  {
    name: "WebGL map: builders on a site are drawn over its picture (BUG-049, BUG-055)",
    async run(t) {
      await t.eval(() => { S.reveal = true; S.enter(11); S.step(3); S.stock(300); });
      await t.until(() => window.__prehistoricPixiMap.chunks?.length > 0, { max: 400, chunk: 10, what: "the WebGL map" });
      const site = await t.eval(() => {
        const hut = T.buildings().find((b) => b.kind === 3);
        const id = S.siteNear(6, hut.x + 6, hut.y + 1);
        const b = T.building(id);
        for (const w of [2, 3]) S.order(w, b.x + 1, b.y + 1);
        S.look(b.x + 1, b.y + 1);
        S.step(300);
        return id;
      });
      await t.until((id) => !!window.__prehistoricPixiMap.placed.get(`b${id}`), { arg: site, max: 400, chunk: 10, what: "the site's picture" });
      const z = await t.eval((id) => { const map = window.__prehistoricPixiMap; return { site: map.placed.get(`b${id}`).sprite.zIndex, builders: ["u2", "u3"].map((k) => map.movers.get(k)?.sprite.zIndex ?? -1) }; }, site);
      t.expect.ok(z.builders.every((b) => b > z.site), `builders over the site (${JSON.stringify(z)})`);
    },
  },
  {
    name: "WebGL map: ground, objects and people drawn where the game has them, after a drag too",
    async run(t) {
      await t.eval(() => { S.reveal = true; S.enter(11); S.step(3); });
      await t.until(() => window.__prehistoricPixiMap.chunks?.length > 0, { max: 400, chunk: 10, what: "the WebGL map" });
      const hut = await t.eval(() => { const hut = T.buildings().find((b) => b.kind === 3); S.animal(2, hut.x + 3, hut.y + 4); S.enemy(hut.x - 4, hut.y + 5); S.look(hut.x, hut.y); S.step(200); return hut; });
      for (const look of [[0, 0], [9, 7]]) {
        await t.eval(([x, y]) => { S.look(x, y); S.step(20); }, [hut.x + look[0], hut.y + look[1]]);
        const state = await t.eval(() => {
          const rt = window.__prehistoricRuntime; const g = rt.game; const map = window.__prehistoricPixiMap;
          const screen = window.__prehistoricScreen;
          const r = screen.viewRect();
          const people = [];
          for (let y = Math.ceil(r.row); y < Math.floor(r.row + r.rows); y += 1) for (let x = Math.ceil(r.column); x < Math.floor(r.column + r.columns); x += 1) {
            const v = rt.gridC[y]?.[x] ?? 0;
            if (v >= 1 && v <= 122) people.push(v <= 100 ? `u${v}` : `a${v - 101}`);
          }
          const ground = [];
          for (let y = Math.ceil(r.row) + 2; y < Math.floor(r.row + r.rows) - 1; y += 3) for (let x = Math.ceil(r.column) + 1; x < Math.floor(r.column + r.columns) - 1; x += 3) if (y < g.mapHeight && x < g.mapWidth) ground.push([x, y]);
          return { people, movers: [...map.movers.keys()], objects: map.placed.size, ground };
        });
        t.expect.ok(state.objects >= 50, `objects on the map (${state.objects})`);
        t.expect.ok(state.people.length >= 3 && state.people.every((p) => state.movers.includes(p)), `each person and animal in view has its sprite (${state.people} / ${state.movers})`);
        const light = await tiles(t, state.ground);
        t.expect.ok(light.every((b) => b > 20), `every tile in view is drawn (darkest ${Math.min(...light).toFixed(0)})`);
      }
    },
  },
  {
    name: "WebGL map: fog -- unexplored black, explored shaded, in sight clear; the map's border",
    async run(t) {
      await t.eval(() => { S.enter(11); S.step(3); });
      await t.until(() => window.__prehistoricPixiMap.chunks?.length > 0, { max: 400, chunk: 10, what: "the WebGL map" });
      await t.eval(() => { const hut = T.buildings().find((b) => b.kind === 3); S.look(Math.max(0, hut.x - 12), hut.y); S.step(20); });
      const sample = await t.eval(() => {
        const rt = window.__prehistoricRuntime; const g = rt.game; const r = window.__prehistoricScreen.viewRect();
        const fog = (x, y) => rt.occupancyClass(Math.max(0, Math.min(g.mapWidth - 1, x)), Math.max(0, Math.min(g.mapHeight - 1, y)));
        const out = { 0: [], 2: [], border: [] };
        for (let y = Math.ceil(r.row) + 1; y < Math.floor(r.row + r.rows) - 1; y += 1) for (let x = Math.ceil(r.column) + 1; x < Math.floor(r.column + r.columns) - 1; x += 1) {
          const level = fog(x, y);
          // Only tiles whose neighbours share their fog (its edges are smoothed over a tile).
          if (![[-1, 0], [1, 0], [0, -1], [0, 1]].every(([dx, dy]) => fog(x + dx, y + dy) === level)) continue;
          if (x < 0) { if (level !== 1) out.border.push([x, y, level]); } else if (level !== 1) out[level].push([x, y]);
        }
        return out;
      });
      t.expect.ok(sample[0].length >= 20 && sample[2].length >= 20 && sample.border.length >= 5, `tiles to look at (${sample[0].length} / ${sample[2].length} / ${sample.border.length})`);
      const clear = await tiles(t, sample[0]);
      const dark = await tiles(t, sample[2]);
      const border = await tiles(t, sample.border.map(([x, y]) => [x, y]));
      t.expect.ok(dark.every((b) => b < 3), `unexplored is black (brightest ${Math.max(...dark).toFixed(1)})`);
      t.expect.ok(clear.filter((b) => b > 20).length >= clear.length * 0.95, "in sight is clear");
      t.expect.ok(border.every((b, i) => (sample.border[i][2] === 0 ? b > 20 : b < 3)), "the border: its scenery, under its edge tile's fog");
      // A tile seen and then out of sight: shaded, darker than in sight but not black.
      const seen = await t.eval(() => { const rt = window.__prehistoricRuntime; const g = rt.game; for (let y = 0; y < g.mapHeight; y += 1) for (let x = 1; x < g.mapWidth - 1; x += 1) if ([x - 1, x, x + 1].every((c) => rt.occupancyClass(c, y) === 1) && rt.occupancyClass(x, y - 1) === 1 && rt.occupancyClass(x, y + 1) === 1) return [x, y]; return null; });
      if (seen) {
        await t.eval(([x, y]) => { S.look(x, y); S.step(5); }, seen);
        const [b] = await tiles(t, [seen]);
        t.expect.ok(b > 3, `explored out of sight is shaded, not black (${b.toFixed(1)})`);
      }
    },
  },
  {
    name: "WebGL map: a story over the map keeps the true fog (BUG-030)",
    async run(t) {
      await t.eval(() => { S.enter(11); S.step(3); });
      await t.until(() => window.__prehistoricPixiMap.chunks?.length > 0, { max: 400, chunk: 10, what: "the WebGL map" });
      // A scene (s:Z without j:Z): the original draws every tile in sight (f.u()); the picture does not.
      const fog = await t.eval(() => {
        const rt = window.__prehistoricRuntime; const g = rt.game; const map = window.__prehistoricPixiMap;
        g.cameraSFlag = true; g.jSceneFlag = false;
        map.update();
        const M = 4; // render/MapMargin.ts's MARGIN_TILES
        const width = g.mapWidth + 2 * M;
        let dark = 0; let wrong = 0;
        for (let y = 0; y < g.mapHeight; y += 1) for (let x = 0; x < g.mapWidth; x += 1) {
          const level = rt.occupancyClass(x, y);
          if (level === 2) dark += 1;
          if (map.fog.classes[(y + M) * width + x + M] !== level) wrong += 1;
        }
        const hidden = [...map.movers.keys()].filter((key) => { const id = key[0] === "u" ? Number(key.slice(1)) : 101 + Number(key.slice(1)); for (let y = 0; y < g.mapHeight; y += 1) { const x = rt.gridC[y]?.indexOf(id) ?? -1; if (x >= 0) return rt.occupancyClass(x, y) !== 0; } return false; });
        g.cameraSFlag = false;
        return { dark, wrong, hidden: hidden.length };
      });
      t.expect.ok(fog.dark > 50, `unexplored tiles to look at (${fog.dark})`);
      t.expect.equal(fog.wrong, 0, "the fog layer is the true fog");
      t.expect.equal(fog.hidden, 0, "no person or animal out of sight is drawn");
    },
  },
  {
    name: "WebGL map: the box select's green frame",
    async run(t) {
      await t.eval(() => { S.reveal = true; S.enter(11); S.step(3); const hut = T.buildings().find((b) => b.kind === 3); S.look(hut.x, hut.y + 3); S.step(10); });
      await t.until(() => window.__prehistoricPixiMap.chunks?.length > 0, { max: 400, chunk: 10, what: "the WebGL map" });
      const box = await t.eval(() => {
        const g = window.__prehistoricRuntime.game;
        g.boxSelecting = true; g.boxAnchorColumn = g.cameraColumn + g.cursorColumn - 2; g.boxAnchorRow = g.cameraRow + g.cursorRow - 2;
        S.step(1);
        const map = window.__prehistoricPixiMap;
        const green = map.box.children[4];
        const shown = map.box.visible;
        g.boxSelecting = false; S.step(1);
        return { shown, x: green.x, y: green.y, w: green.width, anchor: [g.boxAnchorColumn, g.boxAnchorRow], hidden: !map.box.visible };
      });
      t.expect.ok(box.shown && box.hidden, "shown while box selecting, gone after");
      t.expect.deepEqual([box.x, box.y, box.w], [box.anchor[0] * 22, box.anchor[1] * 16, 3 * 22 + 1], "from the anchor tile, three tiles wide");
    },
  },
  {
    name: "WebGL map: the chief's hut's corners on its picture, its fire on the campfire (BUG-026, BUG-027)",
    async run(t) {
      await t.eval(() => { S.reveal = true; S.enter(11); S.step(3); });
      await t.until(() => window.__prehistoricPixiMap.chunks?.length > 0, { max: 400, chunk: 10, what: "the WebGL map" });
      await t.eval(() => {
        const hut = T.buildings().find((b) => b.kind === 3);
        S.look(hut.x + 1, hut.y + 1); // the cursor (the view's middle) on the hut
        S.step(20);
        return hut;
      });
      // The HD pictures load on first use: a few steps until the hut's and its corners' are there.
      await t.until(() => { const map = window.__prehistoricPixiMap; map.update(); return map.placed.has("b1") && map.effectSprites.slice(0, 4).every((s) => s.visible); }, { max: 200, chunk: 5, what: "the hut's picture and corners" });
      const seen = await t.eval(() => {
        const hut = T.buildings().find((b) => b.kind === 3);
        const map = window.__prehistoricPixiMap;
        map.update();
        const picture = map.placed.get(`b${hut.id}`).sprite;
        const box = (s) => [s.x, s.y, s.x + s.width, s.y + s.height];
        return { picture: box(picture), effects: map.effectSprites.filter((s) => s.visible).map(box), footprint: [hut.x * 22, hut.y * 16] };
      });
      const [left, top, right, bottom] = seen.picture;
      // The HD picture is the original's placement preview: it reaches the footprint's bottom.
      t.expect.ok(Math.abs(bottom - (seen.footprint[1] + 64)) <= 1, `the picture down to the footprint's bottom (${bottom})`);
      const corners = seen.effects.slice(0, 4);
      const near = (a, b) => Math.abs(a - b) <= 12;
      t.expect.ok(near(corners[0][0], left) && near(corners[0][1], top) && near(corners[3][2], right) && near(corners[3][3], bottom), `the corners around the picture (${JSON.stringify(corners)} / ${seen.picture})`);
      const inside = seen.effects.slice(4).filter(([x0, y0, x1, y1]) => x0 >= left && x1 <= right && y0 >= top + (bottom - top) / 2 && y1 <= bottom);
      t.expect.ok(inside.length >= 1, "its fire inside the lower half of its picture");
    },
  },
  {
    name: "WebGL map: drawing the people and effects writes no game state",
    async run(t) {
      await t.eval(() => { S.reveal = true; S.enter(11); S.step(3); });
      await t.until(() => window.__prehistoricPixiMap.chunks?.length > 0, { max: 400, chunk: 10, what: "the WebGL map" });
      const same = await t.eval(() => {
        const rt = window.__prehistoricRuntime;
        const hut = T.buildings().find((b) => b.kind === 3);
        S.animal(2, hut.x + 3, hut.y + 4); S.enemy(hut.x - 4, hut.y + 5); S.look(hut.x, hut.y); S.step(100);
        const state = () => JSON.stringify([Array.from(rt.denseState), rt.gridC.map((r) => Array.from(r)), Object.entries(rt.game).filter(([, v]) => typeof v !== "object"), Array.from(rt.mainArrays.aShort[0])]);
        const before = state();
        window.__prehistoricPixiMap.update();
        return before === state();
      });
      t.expect.ok(same, "the game state is as it was");
    },
  },
  {
    name: "WebGL map: every map's ground is in the ground atlas (hd/catalog.json)",
    async run(t) {
      const missing = new Set();
      for (let q = 0; q <= 11; q += 1) {
        await t.eval((q) => { S.enter(q); S.step(3); }, q);
        await t.until(() => window.__prehistoricPixiMap.chunks?.length > 0, { max: 400, chunk: 10, what: "the WebGL map" });
        const keys = await t.eval(async () => {
          const rt = __prehistoricRuntime;
          const map = window.__prehistoricPixiMap;
          const { drawLegacyMapMarkerPieces } = await import("/src/render/LegacyMapMarkerDispatch.ts");
          const catalog = await (await fetch("/hd/catalog.json")).json();
          const out = new Set();
          for (let row = 0; row < rt.game.mapHeight; row += 1) for (let column = 0; column < rt.game.mapWidth; column += 1) {
            const tile = rt.gridB[row][column] & 0xff;
            if (tile < 175) out.add(`t${tile}`);
            const marker = map.marker(column, row);
            if (marker === 0) continue;
            const r = map.dispatch(marker, column, row);
            const prefix = map.picture(marker, r) ? "b" : "f";
            drawLegacyMapMarkerPieces(r, column, row, rt.packedData.shortTables, rt.packedData.byteTables, (record) => out.add(`${prefix}${record}`));
          }
          return [...out].filter((key) => !(key in catalog.ground));
        });
        for (const key of keys) missing.add(`${q}:${key}`);
      }
      t.expect.deepEqual([...missing], [], "no ground piece missing");
    },
  },
  {
    name: "WebGL map: an animal facing left is its HD frame mirrored (BUG-032)",
    async run(t) {
      await t.eval(() => { S.reveal = true; S.enter(11); S.step(3); });
      await t.until(() => window.__prehistoricPixiMap.chunks?.length > 0, { max: 400, chunk: 10, what: "the WebGL map" });
      await t.eval(() => { const hut = T.buildings().find((b) => b.kind === 3); S.animal(2, hut.x + 3, hut.y + 4); S.look(hut.x + 3, hut.y + 4); S.step(5); });
      // Facing right (direction 1) and left (direction 4), the same frame: the picture each draws.
      const read = (direction) => t.eval(async (direction) => {
        const rt = __prehistoricRuntime;
        const map = window.__prehistoricPixiMap;
        const slot = T.animals()[0].slot;
        rt.denseState[9491 + slot] = direction;
        for (let i = 0; i < 50; i += 1) { map.update(); const m = map.movers.get(`a${slot}`); if (m?.picture) break; await new Promise((r) => setTimeout(r, 50)); }
        const source = map.movers.get(`a${slot}`).picture.texture.source.resource;
        const c = document.createElement("canvas");
        c.width = source.width; c.height = source.height;
        const x = c.getContext("2d", { willReadFrequently: true });
        x.drawImage(source, 0, 0);
        return { width: c.width, height: c.height, alpha: Array.from(x.getImageData(0, 0, c.width, c.height).data.filter((_, i) => i % 4 === 3)) };
      }, direction);
      const right = await read(1);
      const left = await read(4);
      t.expect.deepEqual([left.width, left.height], [right.width, right.height], "the same size");
      let same = 0;
      for (let y = 0; y < right.height; y += 1) for (let x = 0; x < right.width; x += 1) {
        if ((right.alpha[y * right.width + x] > 0) === (left.alpha[y * right.width + (right.width - 1 - x)] > 0)) same += 1;
      }
      t.expect.ok(same / (right.width * right.height) > 0.98, `mirrored (${(same / (right.width * right.height) * 100).toFixed(1)}% of the pixels)`);
    },
  },
  {
    name: "WebGL map: a map object without ground of its own (the bones) stands on its neighbour's ground (BUG-033)",
    async run(t) {
      await t.eval(() => { S.reveal = true; S.enter(11); S.step(3); });
      await t.until(() => window.__prehistoricPixiMap.chunks?.length > 0, { max: 400, chunk: 10, what: "the WebGL map" });
      const bones = await t.eval(() => {
        const rt = __prehistoricRuntime;
        for (let r = 1; r < rt.game.mapHeight - 1; r += 1) for (let c = 1; c < rt.game.mapWidth - 1; c += 1) if ((rt.gridB[r][c] & 255) === 178) { S.look(c, r); S.step(10); return [c, r]; }
        return null;
      });
      t.expect.ok(bones, "bones on map 11");
      await t.page.waitForTimeout(500);
      // The tile's top-left corner (the bones lie in its middle): ground, not the black under the map.
      const dark = await t.eval(([c, r]) => {
        const screen = window.__prehistoricScreen;
        const map = window.__prehistoricPixiMap;
        map.update(); map.render();
        const pixi = document.querySelector("canvas.pixi-map");
        const copy = document.createElement("canvas");
        copy.width = screen.element.width; copy.height = screen.element.height;
        const x = copy.getContext("2d", { willReadFrequently: true });
        x.drawImage(pixi, 0, 0, copy.width, copy.height);
        const dpr = window.devicePixelRatio || 1;
        const k = screen.tileToCss(1, 1).x - screen.tileToCss(0, 0).x;
        const p = screen.tileToCss(c, r);
        const d = x.getImageData(Math.round((p.x + k * 0.05) * dpr), Math.round((p.y + k * 0.05) * dpr), Math.max(1, Math.round(k * 0.15 * dpr)), Math.max(1, Math.round(k * 0.1 * dpr))).data;
        let sum = 0;
        for (let i = 0; i < d.length; i += 4) sum += d[i] + d[i + 1] + d[i + 2];
        return sum / (d.length / 4) / 3;
      }, bones);
      t.expect.ok(dark > 30, `the bones' tile has ground under it (brightness ${dark.toFixed(0)})`);
    },
  },
];
