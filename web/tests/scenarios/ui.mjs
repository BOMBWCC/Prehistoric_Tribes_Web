// The touch HUD: panels, orders, placing, commands, the minimap (docs/gameplay.md §6).

async function start(t, { stock = 0 } = {}) {
  return t.eval((stock) => {
    S.enter(11);
    S.step(3);
    if (stock) S.stock(stock);
    const hut = T.buildings().find((b) => b.kind === 3);
    const store = S.buildingNear(6, hut.x + 1, hut.y + 1);
    const chief = T.ui().chief;
    const id = T.villagers().find((v) => v.age >= 14 && !v.inside && v.id !== chief).id;
    return { hut, store, id };
  }, stock);
}

async function select(t, id) {
  const v = await t.eval((id) => T.villager(id), id);
  await t.tapTile(v.x, v.y);
  t.expect.equal(await t.eval(() => T.ui().selected), id, `villager ${id} selected`);
}

/** A long press at the villager, then a drag: the box select over the camp's people. */
async function boxSelect(t, id) {
  const v = await t.eval((id) => { const v = T.villager(id); S.look(v.x, v.y); S.step(20); window.__prehistoricRuntime.game.cameraBFlag = false; return v; }, id);
  const from = await t.eval(([x, y]) => { const s = window.__prehistoricScreen; const b = s.element.getBoundingClientRect(); const p = s.tileToCss(x - 4, y - 4); return [b.left + p.x, b.top + p.y]; }, [v.x, v.y]);
  const ticking = setInterval(() => t.page.evaluate(() => S.step(1)).catch(() => {}), 100);
  await t.page.mouse.move(from[0], from[1]);
  await t.page.mouse.down();
  await t.page.waitForTimeout(1400);
  for (let i = 1; i <= 10; i += 1) { await t.page.mouse.move(from[0] + i * 18, from[1] + i * 15); await t.page.waitForTimeout(30); }
  await t.page.mouse.up();
  await t.page.waitForTimeout(600);
  clearInterval(ticking);
  await t.step(10);
}

export default [
  {
    name: "building panel: a tap on the store opens it; the chief's hut has nothing to do",
    async run(t) {
      const s = await start(t);
      const store = await t.eval((id) => T.building(id), s.store);
      await t.tapTile(store.x + 1, store.y + 1);
      t.expect.ok(await t.visible(".hud-sheet .hud-sheet-row"), "the building panel");
      t.expect.ok(await t.visible('.hud-item[data-code="17"]'), "demolish offered");
      await t.tap(".hud-sheet-close");
      await t.tapTile(s.hut.x + 1, s.hut.y + 1);
      t.expect.ok(await t.visible(".hud-item.nothing"), "nothing to do here");
      t.expect.ok(!(await t.visible('.hud-item[data-code="17"]')), "the camp cannot be demolished");
    },
  },
  {
    name: "double tap: two quick taps on a building never press its first item (BUG-019)",
    async run(t) {
      const s = await start(t);
      const hut = await t.eval(([x, y]) => S.buildingNear(2, x + 1, y + 1), [s.hut.x, s.hut.y]);
      const b = await t.eval((id) => T.building(id), hut);
      await t.tapTile(b.x, b.y);
      await t.tapTile(b.x, b.y);
      await t.step(60);
      const after = await t.eval((id) => T.building(id), hut);
      t.expect.ok(after && after.hp > 0, "still standing");
      t.expect.equal(await t.eval(() => T.ui().barMode), 2, "its panel open, no item confirming");
    },
  },
  {
    name: "villager panel: one villager shows the full panel and hides build and commands",
    async run(t) {
      const s = await start(t);
      await select(t, s.id);
      await t.step(20);
      t.expect.ok(await t.visible(".hud-villager"), "the villager panel");
      const cells = await t.eval(() => ({ cells: document.querySelectorAll(".hud-villager .hud-cell, .hud-villager .hud-stat").length, skills: document.querySelectorAll(".hud-col.skills .hud-cell").length }));
      t.expect.ok(cells.cells >= 10, `all the cells (${cells.cells})`);
      t.expect.ok(cells.skills >= 1, "skills shown");
      t.expect.ok(!(await t.visible(".hud-build-button")), "no build button");
      t.expect.ok(!(await t.visible(".hud-cmd")), "no command button");
    },
  },
  {
    name: "several villagers: a box select shows the row; a portrait shows one, back returns, the group stays",
    async run(t) {
      const s = await start(t);
      await boxSelect(t, s.id);
      t.expect.ok(await t.visible(".hud-group"), "the row of portraits");
      const group = await t.eval(() => T.ui().group);
      t.expect.ok(group >= 0, "a group selected");
      await t.tap(".hud-member");
      t.expect.ok(await t.visible(".hud-villager"), "one villager's panel");
      t.expect.equal(await t.eval(() => document.querySelector(".hud-sheet-close").dataset.icon), "back", "the corner is back");
      t.expect.equal(await t.eval(() => T.ui().group), group, "still the whole group");
      await t.tap(".hud-sheet-close");
      t.expect.ok(await t.visible(".hud-group"), "back to the row");
      await t.tap(".hud-sheet-close");
      t.expect.equal(await t.eval(() => T.ui().barMode), 0, "deselected");
    },
  },
  {
    name: "one tap order: with a villager selected a tap on the ground sends them there",
    async run(t) {
      const s = await start(t);
      await select(t, s.id);
      const v = await t.eval((id) => T.villager(id), s.id);
      const spot = await t.eval(([x, y]) => { for (let d = 3; d < 10; d += 1) if (T.cell(x + d, y) === 0) return [x + d, y]; return null; }, [v.x, v.y]);
      await t.tapTile(spot[0], spot[1]);
      const after = await t.eval((id) => T.villager(id), s.id);
      t.expect.deepEqual([after.targetX, after.targetY], spot, "target set");
      t.expect.equal(await t.eval(() => T.ui().selected), s.id, "still selected");
    },
  },
  {
    name: "build button: the original's command bar never shows on the way to the build list (BUG-021)",
    async run(t) {
      await start(t);
      await t.page.evaluate(() => document.querySelector(".hud-build-button").click());
      for (let frame = 0; frame < 8; frame += 1) {
        // The original's HUD layer (WideScreen's overlay): nothing of it at the bottom, frame by frame.
        const drawn = await t.eval(() => {
          S.step(1);
          const data = window.__prehistoricScreen.overlay.getContext("2d").getImageData(0, 160, 240, 160).data;
          let n = 0;
          for (let i = 3; i < data.length; i += 4) if (data[i]) n += 1;
          return n;
        });
        t.expect.equal(drawn, 0, `frame ${frame}: the original's bar is drawn`);
      }
      t.expect.ok(await t.visible(".hud-sheet-list"), "the build list");
    },
  },
  {
    name: "tapping the selected villager again and again keeps him selected, walking or not (BUG-022)",
    async run(t) {
      const s = await start(t);
      await select(t, s.id);
      const v = await t.eval((id) => T.villager(id), s.id);
      const spot = await t.eval(([x, y]) => { for (let d = 5; d < 12; d += 1) if (T.cell(x + d, y) === 0) return [x + d, y]; return null; }, [v.x, v.y]);
      await t.tapTile(spot[0], spot[1]);
      for (let i = 0; i < 8; i += 1) {
        // A finger on his figure (the cell he is in, moved by his walking offset), the cursor left where it is.
        await t.eval((id) => {
          const rt = window.__prehistoricRuntime;
          const v = T.villager(id);
          const screen = window.__prehistoricScreen;
          const box = screen.element.getBoundingClientRect();
          const p = screen.tileToCss(v.x, v.y);
          const k = screen.tileToCss(1, 1).x - screen.tileToCss(0, 0).x;
          const x = box.left + p.x + k / 2 + (rt.denseState[202 + id] * k) / 22;
          const y = box.top + p.y + k / 3 + (rt.denseState[303 + id] * k) / 22;
          for (const type of ["pointerdown", "pointerup"]) screen.element.dispatchEvent(new PointerEvent(type, { clientX: x, clientY: y, pointerId: 7, button: 0, bubbles: true, isPrimary: true }));
        }, s.id);
        await t.step(4 + i * 3);
        const ui = await t.eval(() => T.ui());
        t.expect.deepEqual([ui.barMode, ui.selected], [1, s.id], `still selected after tap ${i + 1}`);
      }
    },
  },
  {
    name: "job icon: the selected villager's tree keeps the wood icon; it goes when deselected and comes back",
    async run(t) {
      const s = await start(t);
      await t.eval(([x, y]) => S.buildingNear(6, x + 4, y + 4), [s.hut.x, s.hut.y]);
      await select(t, s.id);
      const v = await t.eval((id) => T.villager(id), s.id);
      const tree = await t.eval(([x, y]) => T.nearest(x, y, [-124]), [v.x, v.y]);
      await t.tapTile(tree[0], tree[1]);
      // Past the order's flash (wall time), on with the job icon.
      await t.page.waitForTimeout(900);
      await t.step(200, false);
      const icon = () => t.page.evaluate(() => { const i = document.querySelector(".hud-action-icon"); return i.hidden ? "" : i.src.split("/").pop(); });
      t.expect.equal(await icon(), "44-0.png", "the wood icon stays");
      const where = await t.page.evaluate(([x, y]) => { const i = document.querySelector(".hud-action-icon").getBoundingClientRect(); const s = window.__prehistoricScreen; const p = s.tileToCss(x, y); const k = s.tileToCss(1, 1).x - s.tileToCss(0, 0).x; return Math.hypot(i.left + i.width / 2 - (p.x + k / 2), i.top + i.height / 2 - (p.y + (k * 16) / 22 / 2)); }, tree);
      t.expect.ok(where < 3, `centred on the tree (${where.toFixed(1)} px off)`);
      await t.tap(".hud-sheet-close");
      await t.page.waitForTimeout(100);
      t.expect.equal(await icon(), "", "gone when deselected");
      await select(t, s.id);
      await t.page.waitForTimeout(900);
      await t.step(2);
      t.expect.equal(await icon(), "44-0.png", "back when selected again");
    },
  },
  {
    name: "job icon: hunting marks the deer, then its meat",
    async run(t) {
      const s = await start(t);
      const v = await t.eval((id) => T.villager(id), s.id);
      const deer = await t.eval(([x, y]) => S.animal(2, x + 4, y + 2), [v.x, v.y]);
      await select(t, s.id);
      const at = await t.eval((slot) => T.animals().find((a) => a.slot === slot), deer);
      await t.tapTile(at.x, at.y);
      await t.page.waitForTimeout(900);
      await t.step(1);
      // The HUD updates on display frames (requestAnimationFrame), late on a busy machine: wait for it.
      const icon = (want) => t.page.waitForFunction((want) => { const i = document.querySelector(".hud-action-icon"); return (i.hidden ? "" : i.src.split("/").pop()) === want; }, want, { timeout: 2000 }).then(() => want, () => "not shown");
      t.expect.equal(await icon("43-0.png"), "43-0.png", "the food icon on the deer");
      await t.until((slot) => !T.animals().some((a) => a.slot === slot), { arg: deer, max: 4000, what: "the deer dead" });
      await t.step(50, false);
      t.expect.equal(await icon("43-0.png"), "43-0.png", "the food icon on its meat");
    },
  },
  {
    name: "job icon: walking to the ground shows the move arrows until he is there",
    async run(t) {
      const s = await start(t);
      await select(t, s.id);
      const v = await t.eval((id) => T.villager(id), s.id);
      const spot = await t.eval(([x, y]) => { for (let d = 4; d < 10; d += 1) if (T.cell(x + d, y) === 0) return [x + d, y]; return null; }, [v.x, v.y]);
      await t.tapTile(spot[0], spot[1]);
      await t.page.waitForTimeout(900);
      await t.step(1);
      const icon = () => t.page.evaluate(() => { const i = document.querySelector(".hud-action-icon"); return i.hidden ? "" : i.src.split("/").pop().replace(/-\d+\.png$/, ""); });
      t.expect.equal(await icon(), "35", "the move arrows while walking");
      await t.until(([id, x, y]) => T.villager(id).x === x && T.villager(id).y === y, { arg: [s.id, ...spot], max: 600, what: "arrived" });
      await t.page.waitForTimeout(50);
      t.expect.equal(await icon(), "", "gone once there");
    },
  },
  {
    name: "border: the view goes past the map's edge; a tap on the border is a tap on the nearest edge tile",
    async run(t) {
      const s = await start(t);
      await select(t, s.id);
      const v = await t.eval((id) => T.villager(id), s.id);
      const view = await t.eval(([y]) => { window.__prehistoricScreen.centerOn(0, y); return window.__prehistoricScreen.viewRect(); }, [v.y]);
      t.expect.ok(view.column < 0, `the view reaches past the left edge (${view.column.toFixed(1)})`);
      await t.tapTile(-2, v.y);
      const after = await t.eval((id) => T.villager(id), s.id);
      t.expect.deepEqual([after.targetX, after.targetY], [0, v.y], "sent to the edge tile");
    },
  },
  {
    name: "placing: the ghost is red where the hut cannot go, the tick places it where it can",
    async run(t) {
      const s = await start(t, { stock: 100 });
      await t.tap(".hud-build-button", 30);
      t.expect.ok(await t.visible(".hud-card"), "the build list");
      await t.tap('.hud-card[data-kind="2"]', 30);
      t.expect.equal(await t.eval(() => T.ui().barMode), 3, "placing");
      t.expect.ok(await t.visible(".hud-ghost"), "the ghost");
      // On the camp: blocked.
      await t.eval(([x, y]) => { S.look(x + 1, y + 1); S.step(5); }, [s.hut.x, s.hut.y]);
      t.expect.ok(await t.eval(() => document.querySelector(".hud-ghost").classList.contains("blocked")), "red on the camp");
      const sites = await t.eval(() => T.buildings().filter((b) => b.site).length);
      await t.tap(".hud-place");
      t.expect.equal(await t.eval(() => T.buildings().filter((b) => b.site).length), sites, "the grey tick places nothing");
      // A free spot: allowed, placed.
      const ok = await t.eval(([x, y]) => { for (let r = 3; r < 12; r += 1) for (let d = -r; d <= r; d += 1) { S.look(x + d, y + r); S.step(2); if (window.__prehistoricRuntime.game.cRFlag) return true; } return false; }, [s.hut.x, s.hut.y]);
      t.expect.ok(ok, "a free spot");
      t.expect.ok(!(await t.eval(() => document.querySelector(".hud-ghost").classList.contains("blocked"))), "green there");
      await t.tap(".hud-place", 20);
      t.expect.equal(await t.eval(() => T.buildings().filter((b) => b.site).length), sites + 1, "a site placed");
    },
  },
  {
    name: "rally: the icon in the middle, the tick orders it, the menu item cancels it",
    async run(t) {
      await start(t);
      await t.tap(".hud-cmd", 2);
      await t.tap('.hud-cmd-item[aria-label="集结"]', 25);
      t.expect.ok(await t.visible(".hud-order"), "the rally icon in the middle");
      await t.tap(".hud-order-tick", 20);
      t.expect.ok(await t.eval(() => window.__prehistoricRuntime.game.formUpActive), "formed up");
      await t.tap(".hud-cmd", 2);
      t.expect.ok(await t.eval(() => [...document.querySelectorAll(".hud-cmd-item .glyph")].some((g) => g.src.endsWith("cmd-rally-cancel.png"))), "the cancel icon");
      await t.tap('.hud-cmd-item[aria-label="解散"]', 30);
      t.expect.ok(!(await t.eval(() => window.__prehistoricRuntime.game.formUpActive)), "dismissed");
      t.expect.equal(await t.eval(() => T.ui().barMode), 0, "back on the plain map");
    },
  },
  {
    name: "minimap: opens over the game with the view framed, closes with X",
    async run(t) {
      await start(t);
      await t.tap(".hud-cmd", 2);
      await t.tap('.hud-cmd-item[aria-label="小地图"]', 2);
      t.expect.ok(await t.visible(".minimap canvas"), "the minimap");
      t.expect.ok(await t.eval(() => parseFloat(document.querySelector(".minimap-view").style.width) > 0), "the view's frame");
      await t.tap(".minimap-close", 2);
      t.expect.ok(!(await t.visible(".minimap")), "closed");
    },
  },
];
