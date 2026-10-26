// Gathering, the store, building, upgrading and demolishing (docs/gameplay.md §2).

/** PLOT OF LAND (custom map q 11) with a store next to the camp; returns where things are. */
async function camp(t, { stock = 0 } = {}) {
  return t.eval((stock) => {
    S.enter(11);
    S.step(3);
    if (stock) S.stock(stock);
    const hut = T.buildings().find((b) => b.kind === 3);
    const store = S.buildingNear(6, hut.x + 1, hut.y + 1);
    const chief = T.ui().chief;
    const worker = T.villagers().find((v) => v.age >= 14 && !v.inside && v.id !== chief);
    return { hut, store, worker: worker.id };
  }, stock);
}

/** One of our villagers selected by a tap on them. */
async function select(t, id) {
  const v = await t.eval((id) => T.villager(id), id);
  await t.tapTile(v.x, v.y);
  t.expect.equal(await t.eval(() => T.ui().selected), id, `villager ${id} selected`);
}

async function gather(t, cells, field) {
  const c = await camp(t);
  t.expect.ok(c.store > 0, "store built");
  await select(t, c.worker);
  const v = await t.eval((id) => T.villager(id), c.worker);
  const spot = await t.eval(([x, y, cells]) => T.nearest(x, y, cells), [v.x, v.y, cells]);
  t.expect.ok(spot, `a ${field} source near the camp`);
  const before = await t.eval((field) => T.stock()[field], field);
  await t.tapTile(spot[0], spot[1]);
  await t.until(([field, before]) => T.stock()[field] > before, { arg: [field, before], max: 4000, what: `${field} delivered to the store` });
}

export default [
  { name: "wood: a villager sent to a tree brings wood to the store", run: (t) => gather(t, [-124], "wood") },
  { name: "stone: a villager sent to rock brings stone to the store", run: (t) => gather(t, [-125], "stone") },
  {
    name: "build: a hut site is built by a villager and costs 15 wood, 5 stone",
    async run(t) {
      const c = await camp(t, { stock: 100 });
      const site = await t.eval(([x, y]) => { const id = S.siteNear(2, x + 1, y + 1); return { id, spot: [T.building(id)?.x, T.building(id)?.y] }; }, [c.hut.x, c.hut.y]);
      t.expect.ok(site.id > 0, "hut site placed");
      const room = await t.eval(() => T.stock().room);
      await select(t, c.worker);
      await t.tapTile(site.spot[0], site.spot[1]);
      await t.until((id) => T.building(id)?.kind === 2, { arg: site.id, max: 6000, what: "the hut finished" });
      const stock = await t.eval(() => T.stock());
      t.expect.equal(stock.wood, 100 - 15, "wood spent");
      t.expect.equal(stock.stone, 100 - 5, "stone spent");
      t.expect.ok(stock.room > room, "more room for people");
    },
  },
  {
    name: "upgrade: the hut goes to level 2 with level 2's hit points",
    async run(t) {
      const c = await camp(t, { stock: 200 });
      const hut = await t.eval(([x, y]) => S.buildingNear(2, x + 1, y + 1), [c.hut.x, c.hut.y]);
      const b = await t.eval((id) => T.building(id), hut);
      await t.tapTile(b.x, b.y);
      await t.tap('.hud-item[data-code="16"]');
      t.expect.equal(await t.eval((id) => T.building(id).work, hut), 1, "upgrade ordered");
      if (await t.visible(".hud-sheet-close")) await t.tap(".hud-sheet-close");
      await select(t, c.worker);
      await t.tapTile(b.x, b.y);
      await t.until((id) => T.building(id).level === 2 && T.building(id).work === 0, { arg: hut, max: 8000, what: "level 2" });
      const max = await t.eval((id) => { const rt = window.__prehistoricRuntime; return [T.building(id).maxHp, rt.packedBytes[rt.packedOffsets[138] + 8 * 26 + 2]]; }, hut);
      t.expect.equal(max[0], max[1], "level 2 hit points from t138 row 8");
    },
  },
  {
    name: "demolish: confirmed demolish clears the building",
    async run(t) {
      const c = await camp(t, { stock: 100 });
      const hut = await t.eval(([x, y]) => S.buildingNear(2, x + 1, y + 1), [c.hut.x, c.hut.y]);
      const b = await t.eval((id) => T.building(id), hut);
      await t.tapTile(b.x, b.y);
      await t.tap('.hud-item[data-code="17"]');
      t.expect.ok(await t.visible(".hud-sheet-confirm"), "asks first");
      await t.tap(".hud-sheet-tick");
      // Hit points -1 at once, then the dust; its cells are freed when the dust is gone.
      await t.until((id) => T.building(id) === null || T.building(id).hp <= 0, { arg: hut, max: 100, what: "the hut demolished" });
      await t.until(([x, y]) => T.cell(x, y) === 0, { arg: [b.x, b.y], max: 600, what: "its cells free" });
    },
  },
];
