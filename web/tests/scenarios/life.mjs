// Villagers' lives: ageing, growing up, hunger, birth, death, the chief (docs/gameplay.md §3).

async function start(t, map = 11) {
  return t.eval((map) => {
    S.enter(map);
    S.step(3);
    const hut = T.buildings().find((b) => b.kind === 3);
    return { hut, chief: T.ui().chief, adults: T.villagers().filter((v) => v.age >= 14 && v.id !== T.ui().chief).map((v) => v.id) };
  }, map);
}

export default [
  {
    name: "ageing: an adult is a year older every 500 frames",
    async run(t) {
      const s = await start(t);
      const id = s.adults[0];
      const before = await t.eval((id) => T.villager(id).age, id);
      await t.step(1000, false);
      const after = await t.eval((id) => T.villager(id)?.age, id);
      t.expect.ok(after - before >= 1 && after - before <= 2, `two years at most in 1000 frames (${before} -> ${after})`);
    },
  },
  {
    name: "growing up: a child of 11 is an adult at 12",
    async run(t) {
      const s = await start(t);
      const kid = await t.eval(([x, y]) => S.villager(x + 3, y + 5, { age: 11 }), [s.hut.x, s.hut.y]);
      t.expect.ok(kid > 0, "child placed");
      await t.until((id) => T.villager(id)?.age >= 12, { arg: kid, max: 1500, what: "the child's 12th birthday" });
      // Children (type 17) become ordinary villagers, the original's adult types.
      await t.step(50, false);
      t.expect.notEqual(await t.eval((id) => T.villager(id).type, kid), 17, "no longer a child");
    },
  },
  {
    name: "hunger falls over time once the map's needs have started",
    async run(t) {
      const s = await start(t);
      // They only start to fall once the map's start frame for needs has passed (original).
      await t.until(() => T.ui().frame > T.needsStart(), { max: 20000, chunk: 200, what: "the needs' start frame" });
      const before = await t.eval((ids) => ids.map((id) => T.villager(id)), s.adults);
      await t.step(1500, false);
      const after = await t.eval((ids) => ids.map((id) => T.villager(id)), s.adults);
      t.expect.ok(after.some((v, i) => v && v.food < before[i].food), "someone got hungrier");
    },
  },
  {
    name: "birth: with a hut, the tribe grows",
    async run(t) {
      const s = await start(t);
      await t.eval(([x, y]) => { S.buildingNear(2, x + 1, y + 1); S.buildingNear(2, x + 4, y + 4); }, [s.hut.x, s.hut.y]);
      const people = await t.eval(() => T.villagers().length);
      await t.until((people) => T.villagers().length > people, { arg: people, max: 12000, chunk: 100, what: "a baby" });
      const baby = await t.eval(() => T.villagers().sort((a, b) => a.age - b.age)[0]);
      t.expect.equal(baby.type, 17, "the newest villager is a child (type 17)");
    },
  },
  {
    name: "old age: a very old villager dies",
    async run(t) {
      const s = await start(t);
      const id = s.adults[0];
      await t.eval((id) => S.set(id, { AGE: 95 }), id);
      await t.until((id) => T.villager(id) === null, { arg: id, max: 6000, chunk: 100, what: "death of old age" });
    },
  },
  {
    name: "chief: when the chief dies a new one is chosen by a tap",
    async run(t) {
      const s = await start(t);
      await t.eval((id) => S.set(id, { AGE: 99 }), s.chief);
      await t.until(() => T.ui().choosingChief, { max: 8000, chunk: 100, what: "choosing a new chief" });
      // "<name> is dead" and the villagers' words come first: tap them away.
      for (let i = 0; i < 40 && !(await t.visible(".hud-chief-prompt")); i += 1) {
        if (await t.visible(".story-hud")) await t.page.evaluate(() => document.querySelector(".story-hud").click());
        await t.step(20);
      }
      t.expect.ok(await t.visible(".hud-chief-prompt"), "the chief prompt");
      const pick = await t.eval(() => T.villagers().find((v) => v.age >= 12 && !v.inside));
      await t.tapTile(pick.x, pick.y);
      await t.tap(".hud-fab");
      await t.until((id) => T.ui().chief === id && !T.ui().choosingChief, { arg: pick.id, max: 200, what: "the new chief" });
    },
  },
];
