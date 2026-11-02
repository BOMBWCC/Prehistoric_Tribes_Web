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
    name: "original HUD: the command bar scan never runs on the map -- build list, building panel, command bar (BUG-021)",
    async run(t) {
      const s = await start(t);
      // f.a(byte,int,int), the scan's drawing of each HUD slot: counted while on the map.
      await t.eval(() => {
        const rt = window.__prehistoricRuntime;
        const draw = rt.drawFrameCommandPrimitive.bind(rt);
        window.__scans = 0;
        rt.drawFrameCommandPrimitive = (...args) => { if (rt.game.loopMode === 1) window.__scans += 1; return draw(...args); };
      });
      await t.tap(".hud-build-button", 8);
      t.expect.ok(await t.visible(".hud-sheet-list"), "the build list");
      await t.tap(".hud-sheet-close", 8);
      const store = await t.eval((id) => T.building(id), s.store);
      await t.tapTile(store.x + 1, store.y + 1);
      t.expect.ok(await t.visible(".hud-sheet-row"), "the building panel");
      await t.tap(".hud-sheet-close", 8);
      await t.eval(() => { S.key("SOFT_LEFT"); S.step(4); });
      t.expect.ok(await t.visible('.hud-item[data-code="11"]'), "the command bar in the sheet");
      t.expect.equal(await t.eval(() => window.__scans), 0, "scans on the map");
    },
  },
  {
    name: "building panel: the upgrade's price, the armoury's weapons with price and skill",
    async run(t) {
      const s = await start(t, { stock: 300 });
      const armoury = await t.eval(([x, y]) => T.building(S.buildingNear(0, x - 3, y + 3)), [s.hut.x, s.hut.y]);
      await t.tapTile(armoury.x + 1, armoury.y + 1);
      const costs = await t.eval(() => {
        const rt = window.__prehistoricRuntime;
        const t138 = (row, column) => rt.packedBytes[rt.packedOffsets[138] + row * 26 + column];
        const shown = (code) => [...document.querySelectorAll(`.hud-item[data-code="${code}"] .cost .line`)].map((line) => [...line.querySelectorAll("img")].map((i) => i.src.split("/").pop().replace(".png", "").replace("digit-", "")).join(" "));
        return { upgrade: shown(16), club: shown(0), want: { upgrade: [t138(10, 0), t138(11, 0)], club: [t138(10, 12), t138(11, 12), t138(14, 12)] } };
      });
      const n = (v) => String(v).split("").join(" ");
      t.expect.deepEqual(costs.upgrade, [`icon-wood ${n(costs.want.upgrade[0])} icon-stone ${n(costs.want.upgrade[1])}`], "the upgrade's price (the armoury's)");
      t.expect.ok(costs.club.length === 2 && costs.club[0].includes("icon-wood") && /^sk-\S+ /.test(costs.club[1]) && costs.club[1].endsWith(n(costs.want.club[2])), `the club's price and skill (${costs.club.join(" | ")})`);
    },
  },
  {
    name: "portraits in the sheet (the VILLAGERS row, as a building's): a tap opens their panel, the tick selects them",
    async run(t) {
      const s = await start(t);
      await t.eval(() => { S.key("SOFT_LEFT"); S.step(4); });
      await t.tap('.hud-item[data-code="13"]', 30);
      await t.tap(`.hud-item[data-code="-${s.id}"]`, 4);
      t.expect.ok(await t.visible(".hud-villager"), "their panel");
      t.expect.ok(!(await t.visible(".hud-sheet-row")), "instead of the row");
      await t.tap(".hud-sheet-close", 2);
      t.expect.ok(await t.visible(".hud-sheet-row"), "back to the row");
      await t.tap(`.hud-item[data-code="-${s.id}"]`, 4);
      await t.tap(".hud-sheet-tick");
      await t.until((id) => T.ui().selected === id, { arg: s.id, max: 400, what: "selected" });
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
      // The view dragged off the game camera's middle: the ghost still starts on the screen's middle tile (BUG-046).
      await t.eval(() => { window.__prehistoricScreen.panBy(37, 23); S.step(5); });
      await t.tap(".hud-build-button", 30);
      t.expect.ok(await t.visible(".hud-card"), "the build list");
      const centre = await t.eval(() => window.__prehistoricScreen.centreTile());
      await t.tap('.hud-card[data-kind="2"]', 30);
      t.expect.equal(await t.eval(() => T.ui().barMode), 3, "placing");
      t.expect.ok(await t.visible(".hud-ghost"), "the ghost");
      t.expect.deepEqual(await t.eval(() => { const g = window.__prehistoricRuntime.game; return [g.cameraColumn + g.cursorColumn, g.cameraRow + g.cursorRow]; }), centre, "on the middle tile");
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
    name: "rally / call to arms: placed like a building -- flag starts on the middle tile and stays on its tile, dragging it moves it, dragging elsewhere moves the map, red where it cannot go, the tick places it, the menu item cancels it (BUG-028, BUG-046)",
    dpr: 3,
    async run(t) {
      const s = await start(t);
      const cdp = await t.page.context().newCDPSession(t.page);
      const ghost = () => t.eval(() => {
        const g = window.__prehistoricRuntime.game; const sc = window.__prehistoricScreen;
        const el = document.querySelector(".hud-ghost"); const pic = el.querySelector("img").getBoundingClientRect();
        const k = sc.tileToCss(1, 0).x - sc.tileToCss(0, 0).x;
        return { shown: !el.hidden && el.classList.contains("order"), blocked: el.classList.contains("blocked"), h: pic.height, villager: (k * 24) / 22, src: el.querySelector("img").src, tile: [g.cameraColumn + g.cursorColumn, g.cameraRow + g.cursorRow], centre: sc.centreTile(), tick: !document.querySelector(".hud-place").hidden, at: [pic.left + pic.width / 2, pic.bottom - 4] };
      });
      for (const [order, glyph, active, cancel, cancelLabel] of [["orders.formUp", "cmd-rally", "formUpActive", "cmd-rally-cancel", "orders.disband"], ["orders.callToArms", "cmd-arms", "callToArmsActive", "cmd-arms-cancel", "orders.backToWork"]]) {
        await t.eval(([x, y]) => { S.look(x, y); S.step(20); window.__prehistoricRuntime.game.cameraBFlag = false; }, [s.hut.x + 2, s.hut.y + 6]);
        await t.tap(".hud-cmd", 2);
        await t.tap(`.hud-cmd-item[data-ui-label="${order}"]`, 25);
        const before = await ghost();
        t.expect.ok(before.shown && before.tick && before.src.endsWith(`${glyph}.png`), `${order}: its flag and tick on the map`);
        t.expect.ok(Math.abs(before.h - before.villager) < 1, `${order}: a villager high (${before.h} / ${before.villager})`);
        t.expect.deepEqual(before.tile, before.centre, `${order}: on the tile in the middle`);
        // Finger drags (touch events, as on the phone).
        const touch = (type, x, y) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : [{ x, y, id: 1 }] });
        const drag = async ([x, y], dx, dy) => {
          await touch("touchStart", x, y);
          for (let i = 1; i <= 10; i += 1) { await touch("touchMove", x + (i * dx) / 10, y + (i * dy) / 10); await t.step(1); }
          await touch("touchEnd");
          await t.step(5);
        };
        // Elsewhere: the map moves, the flag stays on its tile.
        await drag([before.at[0] + 120, before.at[1] + 150], -60, -80);
        const panned = await ghost();
        t.expect.notDeepEqual(panned.centre, before.centre, `${order}: the map moved`);
        t.expect.deepEqual(panned.tile, before.tile, `${order}: the flag stayed on its tile`);
        // On the flag: it moves with the finger.
        await drag(panned.at, -100, 0);
        const dragged = await ghost();
        t.expect.ok(await t.eval(([x, y]) => document.elementFromPoint(x, y) === window.__prehistoricScreen.element, panned.at), `${order}: the tick is off the flag`);
        t.expect.notDeepEqual(dragged.tile, panned.tile, `${order}: dragging the flag moved it`);
        t.expect.equal(dragged.tile[1], panned.tile[1], `${order}: along the drag`);
        // A tree, rock or water tile near the camp: red, and the tick places nothing.
        const bad = await t.eval(([x, y]) => { const rt = window.__prehistoricRuntime; for (let r = 1; r < 15; r += 1) for (let d = -r; d <= r; d += 1) for (const [cx, cy] of [[x + d, y - r], [x + d, y + r], [x - r, y + d], [x + r, y + d]]) if ((rt.gridC[cy]?.[cx] ?? 0) < 0 && rt.occupancyClass(cx, cy) === 0) return [cx, cy]; return null; }, [s.hut.x, s.hut.y]);
        await t.eval(([x, y]) => { S.look(x, y); S.step(5); }, bad);
        t.expect.ok((await ghost()).blocked, `${order}: red on ${bad}`);
        await t.tap(".hud-place", 20);
        t.expect.ok(!(await t.eval((active) => window.__prehistoricRuntime.game[active], active)), `${order}: the grey tick places nothing`);
        // Open ground: green, placed.
        const good = await t.eval(([x, y]) => { const rt = window.__prehistoricRuntime; for (let r = 2; r < 15; r += 1) for (let d = -r; d <= r; d += 1) { const cx = x + d; const cy = y + r; if (rt.gridC[cy]?.[cx] === 0 && rt.occupancyClass(cx, cy) === 0) return [cx, cy]; } return null; }, [s.hut.x, s.hut.y]);
        await t.eval(([x, y]) => { S.look(x, y); S.step(5); }, good);
        t.expect.ok(!(await ghost()).blocked, `${order}: green on ${good}`);
        await t.tap(".hud-place", 1);
        await t.step(20);
        t.expect.ok(await t.eval((active) => window.__prehistoricRuntime.game[active], active), `${order}: ordered`);
        // The flag stays on its tile, standing on it; it pops and rings spread, then it blinks.
        const flag = await t.eval(() => {
          const g = window.__prehistoricRuntime.game; const sc = window.__prehistoricScreen;
          const el = document.querySelector(".hud-order-flag"); const r = el.getBoundingClientRect(); const b = sc.element.getBoundingClientRect();
          const spot = sc.tileToCss(g.outerLoopRowEndMarker[0], g.outerLoopRowEndMarker[1]); const k = sc.tileToCss(1, 0).x - sc.tileToCss(0, 0).x;
          return { shown: !el.hidden, burst: el.classList.contains("burst"), rings: el.querySelectorAll(".ring").length, src: el.querySelector("img").src, spot: [...g.outerLoopRowEndMarker], dx: r.left + r.width / 2 - (b.left + spot.x + k / 2), dy: r.bottom - (b.top + spot.y + (k * 16) / 22) };
        });
        t.expect.ok(flag.shown && flag.burst && flag.rings === 2 && flag.src.endsWith(`${glyph}.png`), `${order}: the flag, its pop and rings (${JSON.stringify(flag)})`);
        t.expect.deepEqual(flag.spot, good, `${order}: placed on the chosen tile`);
        t.expect.ok(Math.abs(flag.dx) < 1 && Math.abs(flag.dy) < 1, `${order}: standing on its tile`);
        t.expect.ok(!(await t.visible(".hud-ghost")), `${order}: the preview gone`);
        await t.tap(".hud-cmd", 2);
        t.expect.ok(await t.eval((cancel) => [...document.querySelectorAll(".hud-cmd-item .glyph")].some((g) => g.src.endsWith(`${cancel}.png`)), cancel), `${order}: the cancel icon`);
        await t.tap(`.hud-cmd-item[data-ui-label="${cancelLabel}"]`, 30);
        t.expect.ok(!(await t.eval((active) => window.__prehistoricRuntime.game[active], active)), `${order}: cancelled`);
        t.expect.ok(!(await t.visible(".hud-order-flag")), `${order}: the flag gone`);
        t.expect.equal(await t.eval(() => T.ui().barMode), 0, `${order}: back on the plain map`);
      }
    },
  },
  {
    name: "rally / call to arms: X goes straight back to the map, past the command bar (BUG-029)",
    async run(t) {
      await start(t);
      for (const order of ["orders.formUp", "orders.callToArms"]) {
        await t.tap(".hud-cmd", 2);
        await t.tap(`.hud-cmd-item[data-ui-label="${order}"]`, 25);
        t.expect.ok(await t.visible(".hud-ghost.order"), `${order}: its flag on the map`);
        // Every frame until the map is plain again: the command bar's sheet never shows.
        let sheet = false;
        await t.tap(".hud-fab", 1);
        for (let i = 0; i < 12; i += 1) { sheet ||= await t.visible('.hud-sheet .hud-item[data-code="11"]'); await t.step(1); }
        t.expect.ok(!sheet, `${order}: no command bar on the way back`);
        t.expect.equal(await t.eval(() => T.ui().barMode), 0, `${order}: back on the plain map`);
        t.expect.ok(!(await t.eval(() => window.__prehistoricRuntime.game.formUpActive)), `${order}: nothing ordered`);
        t.expect.ok(!(await t.eval(() => window.__prehistoricRuntime.game.callToArmsActive)), `${order}: no call to arms`);
      }
    },
  },
  {
    name: "command bar: the keyboard's right soft key from the rally spot still shows it; form up from there",
    async run(t) {
      await start(t);
      await t.tap(".hud-cmd", 2);
      await t.tap('.hud-cmd-item[data-ui-label="orders.formUp"]', 25);
      await t.eval(() => { S.key("SOFT_RIGHT"); S.step(6); });
      t.expect.ok(await t.visible('.hud-sheet .hud-item[data-code="11"]'), "the command bar in the sheet");
      await t.tap('.hud-item[data-code="11"]', 25);
      t.expect.ok(await t.visible(".hud-ghost.order"), "the rally flag on the map");
      await t.eval(() => { const rt = window.__prehistoricRuntime; const g = rt.game; for (let r = 0; r < 15; r += 1) for (let d = -r; d <= r; d += 1) { const x = g.cameraColumn + g.cursorColumn + d; const y = g.cameraRow + g.cursorRow + r; if (rt.gridC[y]?.[x] === 0 && rt.occupancyClass(x, y) === 0) { S.look(x, y); S.step(5); return; } } });
      await t.tap(".hud-place", 20);
      t.expect.ok(await t.eval(() => window.__prehistoricRuntime.game.formUpActive), "formed up");
    },
  },
  {
    name: "pinch: two fingers zoom the map about their middle, within limits; taps still hit the right tile",
    dpr: 3, // an iPhone's: the zoom levels 4, 3, 2 device pixels per game pixel
    async run(t) {
      const s = await start(t);
      // The map's middle, so the view's edges do not stop the zoom.
      await t.eval(() => { const g = window.__prehistoricRuntime.game; S.look(g.mapWidth >> 1, g.mapHeight >> 1); S.step(20); g.cameraBFlag = false; });
      /** Fingers 1 and 2 at `gap` CSS pixels either side of the screen's middle, then at `to`; returns the
       *  tile size after (CSS pixels) and the map pixel under the middle before and after. */
      const pinch = (gap, to) => t.eval(([gap, to]) => {
        const screen = window.__prehistoricScreen;
        const el = screen.element;
        const box = el.getBoundingClientRect();
        const mx = box.left + box.width / 2;
        const my = box.top + box.height / 2;
        const fire = (type, id, x) => el.dispatchEvent(new PointerEvent(type, { clientX: x, clientY: my, pointerId: id, button: 0, bubbles: true, isPrimary: id === 1, pointerType: "touch" }));
        const under = () => { const v = screen.viewTransform(); return [v.x + (mx - box.left) / v.cssPerGame, v.y + (my - box.top) / v.cssPerGame]; };
        const before = under();
        fire("pointerdown", 1, mx - gap);
        fire("pointerdown", 2, mx + gap);
        for (let i = 1; i <= 8; i += 1) { const g = gap + ((to - gap) * i) / 8; fire("pointermove", 1, mx - g); fire("pointermove", 2, mx + g); }
        fire("pointerup", 2, mx + to);
        fire("pointerup", 1, mx - to);
        return { tile: screen.tileToCss(1, 0).x - screen.tileToCss(0, 0).x, before, after: under() };
      }, [gap, to]);
      const tile0 = await t.eval(() => { const s = window.__prehistoricScreen; return s.tileToCss(1, 0).x - s.tileToCss(0, 0).x; });
      t.expect.ok(Math.abs(tile0 - 22 * 4 / 3) < 0.01, "starts at the largest level (4 device pixels per game pixel)");
      const out = await pinch(120, 80);
      t.expect.ok(Math.abs(out.tile - tile0 * 2 / 3) < 0.01, `fingers closer: zoomed out by their ratio (${out.tile})`);
      t.expect.ok(Math.hypot(out.after[0] - out.before[0], out.after[1] - out.before[1]) < 0.5, `the middle stays over the same map pixel (${out.before} -> ${out.after})`);
      t.expect.ok(Math.abs((await pinch(150, 20)).tile - tile0 / 2) < 0.01, "no smaller than half (2 device pixels per game pixel)");
      t.expect.ok(Math.abs((await pinch(20, 180)).tile - tile0) < 0.01, "no larger than the largest level");
      await t.step(10);
      t.expect.equal(await t.eval(() => T.ui().barMode), 0, "a pinch is no tap");
      t.expect.equal(await t.eval(() => T.ui().selected), 0, "nobody selected by the pinch");
      await pinch(120, 70);
      await t.step(10);
      await select(t, s.id);
    },
  },
  {
    name: "armoury: a swipe on a weapon sets how many to make; the armourer makes that many (BUG-037)",
    async run(t) {
      const s = await start(t);
      const a = await t.eval(([x, y, id]) => {
        S.stock(300, 0);
        const armoury = S.buildingNear(0, x - 3, y + 3);
        S.order(id, T.building(armoury).x, T.building(armoury).y);
        return armoury;
      }, [s.hut.x, s.hut.y, s.id]);
      await t.until((id) => T.villager(id).inside, { arg: s.id, max: 2000, what: "the armourer inside" });
      const b = await t.eval((id) => T.building(id), a);
      await t.tapTile(b.x + 1, b.y + 1);
      const club = await t.eval(() => { const r = document.querySelector('.hud-item[data-code="0"]').getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; });
      // A finger (touch events: the item keeps the pointer as it moves off it) two steps to the
      // right (24 pixels each), the game ticking as it moves.
      const cdp = await t.page.context().newCDPSession(t.page);
      const touch = (type, x, y) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : [{ x, y, id: 1 }] });
      await touch("touchStart", club[0], club[1]);
      for (let i = 1; i <= 6; i += 1) { await touch("touchMove", club[0] + i * 9, club[1]); await t.step(6); }
      await touch("touchEnd");
      await t.step(20);
      const index = await t.eval(() => Number(document.querySelector('.hud-item[data-code="0"]').dataset.index));
      t.expect.equal(await t.eval((i) => __prehistoricRuntime.mainArrays.s[i], index), 2, "two clubs ordered");
      await t.tap(".hud-sheet-close", 5);
      // The clubs reach the store one by one (store row 0 [5 + code]); then no more are made.
      await t.until(() => __prehistoricRuntime.mainArrays.aShort[0][5] >= 2, { max: 20000, chunk: 200, what: "two clubs in the store" });
      await t.step(3000);
      t.expect.equal(await t.eval(() => __prehistoricRuntime.mainArrays.aShort[0][5]), 2, "exactly two made");
    },
  },
  {
    name: "villager list: the command button's villagers show a row of heads, a head their panel, ✓ selects them",
    async run(t) {
      await start(t);
      await t.tap(".hud-cmd", 2);
      await t.tap('.hud-cmd-item[data-ui-label="orders.villagers"]', 30);
      const heads = await t.eval(() => document.querySelectorAll(".hud-sheet-row button.hud-item").length);
      t.expect.ok(heads > 1, `a row of heads (${heads})`);
      await t.tap(".hud-sheet-row button.hud-item:nth-child(2)", 5);
      t.expect.ok(await t.visible(".hud-villager"), "their panel");
      await t.tap(".hud-sheet-tick", 30);
      t.expect.ok(await t.eval(() => window.__prehistoricRuntime.game.selectedId > 0 && window.__prehistoricRuntime.game.barMode === 1), "selected on the map");
    },
  },
  {
    name: "minimap: opens over the game with the view framed, closes with X",
    async run(t) {
      await start(t);
      await t.tap(".hud-cmd", 2);
      await t.tap('.hud-cmd-item[data-ui-label="orders.map"]', 2);
      t.expect.ok(await t.visible(".minimap canvas"), "the minimap");
      t.expect.ok(await t.eval(() => parseFloat(document.querySelector(".minimap-view").style.width) > 0), "the view's frame");
      await t.tap(".minimap-close", 2);
      t.expect.ok(!(await t.visible(".minimap")), "closed");
    },
  },
  {
    name: "villager panel: read from the original's panel code without changing the game",
    async run(t) {
      await t.eval(() => { S.enter(11); S.step(30); });
      const seen = await t.eval(async () => {
        const rt = __prehistoricRuntime;
        const { villagerPanelOf } = await import("/src/render/WideView.ts");
        const state = () => JSON.stringify([Array.from(rt.denseState), Object.entries(rt.game).filter(([, v]) => typeof v !== "object"), Array.from(rt.game.zlDShorts), Array.from(rt.game.zlKBytes), rt.game.frameFlags, rt.game.selectionFlags, rt.frameHelperCalls.length, rt.frameDispatchState.N]);
        const before = state();
        const id = T.villagers()[0].id;
        const cells = villagerPanelOf(rt, id);
        return { same: before === state(), gender: cells.some((c) => c.asset === 619 || c.asset === 620), numbers: cells.filter((c) => c.asset < 0).length };
      });
      t.expect.ok(seen.same, "the game state is as it was");
      t.expect.ok(seen.gender && seen.numbers >= 5, `the panel's cells (gender ${seen.gender}, ${seen.numbers} numbers)`);
    },
  },
  {
    name: "help: the game menu's help opens a card, ▼ turns its pages, ✕ / Esc / back return to the menu (BUG-035, BUG-036)",
    async run(t) {
      await t.eval(() => { S.enter(11); S.step(10); });
      const state = () => t.eval(() => ({
        open: !!document.querySelector("dialog.card.help")?.open,
        title: document.querySelector("dialog.card.help .help-title")?.textContent ?? "",
        menu: !document.querySelector(".hud-menu")?.hidden,
        screen: __prehistoricRuntime.game.screen,
      }));
      const openHelp = async () => {
        if (!(await state()).menu) await t.tap(".hud-menu-button");
        await t.tap('.hud-menu-item[data-ui-label="menu.help"]');
        await t.until(() => document.querySelector("dialog.card.help .help-title")?.textContent !== "", { max: 100, chunk: 2, what: "the help's title" });
        // Still open a moment later: nothing left over from the last close may close it (BUG-036).
        await t.page.waitForTimeout(300);
        const s = await state();
        t.expect.ok(s.open && s.title, `the help card with a section's title, still open (${JSON.stringify(s)})`);
        t.expect.notEqual(s.screen, 15, "not the original's help screen");
      };
      const backAtMenu = async (how) => {
        await t.step(5);
        const s = await state();
        t.expect.ok(!s.open && s.menu && (s.screen === 10 || s.screen === 11), `${how}: back at the game menu (${JSON.stringify(s)})`);
      };
      await openHelp();
      const first = (await state()).title;
      await t.tap("dialog.card.help .help-next", 2);
      t.expect.notEqual((await state()).title, first, "▼: the next section");
      // ✕ tapped where it is on screen (a real pointer, as a finger).
      const box = await t.eval(() => { const r = document.querySelector("dialog.card.help .corner.no").getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2 }; });
      await t.page.mouse.click(box.x, box.y);
      await backAtMenu("✕");
      await openHelp();
      await t.page.keyboard.press("Escape");
      await backAtMenu("Esc");
      // Opened again at once after closing (BUG-036).
      await openHelp();
      await t.eval(() => history.back());
      await t.page.waitForTimeout(200);
      await backAtMenu("back");
    },
  },
  {
    name: "squads: adding the selection keeps its panel or queue; a squad shows its panel (one) or queue (several); no selection X (BUG-038)",
    async run(t) {
      const s = await start(t);
      const look = () => t.eval(() => { const vis = (q) => [...document.querySelectorAll(q)].some((el) => !el.closest("[hidden]") && el.getClientRects().length > 0); return { villager: vis(".hud-villager"), queue: vis(".hud-group"), cancel: vis(".hud-action.cancel"), squads: [...document.querySelectorAll(".hud-squad:not(.plus)")].filter((e) => !e.hidden).length }; });
      // One villager.
      await select(t, s.id);
      await t.tap(".hud-squad.plus", 20);
      t.expect.deepEqual(await look(), { villager: true, queue: false, cancel: false, squads: 1 }, "added: the panel stays");
      await t.tap(".hud-sheet-close", 20);
      t.expect.ok(!(await t.visible(".hud-villager")), "deselected");
      await t.tap(".hud-squad:not(.plus)", 20);
      t.expect.deepEqual(await look(), { villager: true, queue: false, cancel: false, squads: 1 }, "the squad of one: the panel");
      await t.tap(".hud-sheet-close", 20);
      // Several.
      await boxSelect(t, s.id);
      t.expect.ok(await t.visible(".hud-group"), "the queue");
      await t.tap(".hud-squad.plus", 20);
      t.expect.deepEqual(await look(), { villager: false, queue: true, cancel: false, squads: 1 }, "added: the queue stays (the first villager moved over: squad 1 empty)");
      await t.tap(".hud-sheet-close", 20);
      t.expect.ok(!(await t.visible(".hud-group")), "deselected");
      await t.tap(".hud-squad:not(.plus)", 20);
      t.expect.deepEqual(await look(), { villager: false, queue: true, cancel: false, squads: 1 }, "the squad of several: the queue");
    },
  },
];
