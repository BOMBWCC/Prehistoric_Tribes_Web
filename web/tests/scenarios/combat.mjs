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
    name: "weapons: after fetching one they carry on: idle to where they stood, a gatherer to the same tree, a cook to the kitchen",
    async run(t) {
      const s = await start(t);
      await t.eval(() => { __prehistoricRuntime.mainArrays.aShort[0][7] = 6; S.stock(300); });
      const fetch = async (id) => {
        t.expect.ok(await t.eval(([id, store]) => S.giveWeapon(id, 2, store), [id, s.store]), `villager ${id}: the spear ordered`);
        await t.until((id) => T.villager(id).held === 2, { arg: id, max: 2000, chunk: 5, what: "holding the spear" });
        await t.eval(() => { for (let i = 0; i < 3; i += 1) S.key("SOFT_RIGHT"); S.step(3); });
      };
      const people = await t.eval(() => { const chief = T.ui().chief; return T.villagers().filter((v) => v.age >= 14 && !v.inside && v.id !== chief).map((v) => v.id); });
      // Idle: back where they stood, idle again.
      const idle = people[0];
      const was = await t.eval((id) => T.villager(id), idle);
      await fetch(idle);
      await t.until(([id, x, y]) => { const v = T.villager(id); return v.x === x && v.y === y && v.type === 84; }, { arg: [idle, was.x, was.y], max: 1000, what: "idle where they stood" });
      // Gathering wood: to the same tree, wood coming in.
      const gatherer = people[1];
      await t.eval((id) => { const v = T.villager(id); const tree = T.nearest(v.x, v.y, [-124]); S.order(id, tree[0], tree[1]); }, gatherer);
      await t.until((id) => T.villager(id).carry > 0, { arg: gatherer, max: 2000, what: "gathering" });
      const tree = await t.eval((id) => { const v = T.villager(id); return [v.targetX, v.targetY]; }, gatherer);
      await fetch(gatherer);
      await t.until(([id, x, y]) => { const v = T.villager(id); return v.type === 11 && v.targetX === x && v.targetY === y; }, { arg: [gatherer, tree[0], tree[1]], max: 1000, what: "back at the tree" });
      // A cook: back to the kitchen's post.
      const cook = people[2];
      const kitchen = await t.eval(([id, x, y]) => { const k = S.buildingNear(4, x + 6, y + 1); const b = T.building(k); S.order(id, b.x + 1, b.y + 1); return k; }, [cook, s.hut.x, s.hut.y]);
      await t.until((id) => __prehistoricRuntime.denseState[6464 + id] === 66 && __prehistoricRuntime.denseState[4646 + id] < 0 && !T.villager(id).inside, { arg: cook, max: 2000, chunk: 5, what: "a cook, out of the kitchen" });
      await fetch(cook);
      await t.until(([id, k]) => { const e = __prehistoricRuntime.denseState; return e[4646 + id] >= 0 && e[4444 + id] === k; }, { arg: [cook, kitchen], max: 1000, what: "back at the kitchen" });
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
