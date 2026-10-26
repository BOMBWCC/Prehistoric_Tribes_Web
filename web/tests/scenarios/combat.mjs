// Weapons, hunting and fighting (docs/gameplay.md §4).

async function start(t) {
  return t.eval(() => {
    S.enter(11);
    S.step(3);
    S.stock(100, 9);
    const hut = T.buildings().find((b) => b.kind === 3);
    const store = S.buildingNear(6, hut.x + 1, hut.y + 1);
    const chief = T.ui().chief;
    const id = T.villagers().find((v) => v.age >= 14 && !v.inside && v.id !== chief).id;
    return { hut, store, id };
  });
}

async function select(t, id) {
  const v = await t.eval((id) => T.villager(id), id);
  await t.tapTile(v.x, v.y);
  t.expect.equal(await t.eval(() => T.ui().selected), id, `villager ${id} selected`);
}

export default [
  {
    name: "weapons: a villager fetches a spear from the store",
    async run(t) {
      const s = await start(t);
      const ok = await t.eval(([id, store]) => S.giveWeapon(id, 2, store), [s.id, s.store]);
      t.expect.ok(ok, "spear ordered");
      await t.until((id) => T.villager(id).held === 2, { arg: s.id, max: 2000, what: "holding the spear" });
    },
  },
  {
    name: "hunting: a deer is killed and its meat reaches the store",
    async run(t) {
      const s = await start(t);
      const v = await t.eval((id) => T.villager(id), s.id);
      const deer = await t.eval(([x, y]) => S.animal(2, x + 4, y + 2), [v.x, v.y]);
      t.expect.ok(deer >= 0, "deer placed");
      const food = await t.eval(() => T.stock().food);
      await select(t, s.id);
      const at = await t.eval((slot) => T.animals().find((a) => a.slot === slot), deer);
      await t.tapTile(at.x, at.y);
      await t.until((slot) => !T.animals().some((a) => a.slot === slot), { arg: deer, max: 4000, what: "the deer dead" });
      await t.until((food) => T.stock().food > food, { arg: food, max: 4000, what: "meat in the store" });
    },
  },
  {
    // t181 aggression: boar 5, sabretooth 100, deer 0 -- a sabretooth goes for the tribe by itself.
    name: "fighting: a sabretooth next to the camp hurts someone",
    async run(t) {
      const s = await start(t);
      const v = await t.eval((id) => T.villager(id), s.id);
      const hp = await t.eval(() => T.villagers().reduce((sum, v) => sum + v.hp, 0));
      await t.eval(([x, y]) => S.animal(1, x + 3, y + 2), [v.x, v.y]);
      await t.until((hp) => T.villagers().reduce((sum, v) => sum + v.hp, 0) < hp, { arg: hp, max: 2000, what: "someone hurt" });
    },
  },
];
