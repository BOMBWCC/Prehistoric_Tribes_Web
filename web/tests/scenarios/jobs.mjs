// Does a villager keep their job through the things that interrupt it, and go back to it (BUG-075)?
// Each case: a builder, a gatherer and a cook at work, the interruption, then their job (its hat,
// dense 2222 = t41[6464]) and whether they are at it again.

/** The village: huts, store, kitchen with a cook of its own, a site. */
async function stage(t, prof) {
  return t.eval((prof) => {
    S.reveal = true; S.enter(11); S.step(3);
    const rt = __prehistoricRuntime, e = rt.denseState, row = rt.mainArrays.aShort[0], g = rt.game;
    const c = T.buildings().find((b) => b.kind === 3);
    S.buildingNear(2, c.x + 6, c.y + 1);
    const store = S.buildingNear(6, c.x + 1, c.y + 10);
    const kitchen = S.buildingNear(4, c.x + 12, c.y + 1);
    const site = S.siteNear(1, c.x + 12, c.y + 14);
    const chief = T.ui().chief;
    const people = T.villagers().filter((v) => v.age >= 14 && v.id !== chief).map((v) => v.id);
    const [id, other] = people;
    const K = T.building(kitchen), B = T.building(site);
    const keep = window.__keep = () => {
      rt.subsystemArrays.bAQ = 2 ** 30;
      row[0] = 500; row[1] = 500; row[2] = 900; row[3] = 900;
      if (!window.__courting) row[18] = 0;
    };
    window.__run = (n, stop) => { for (let i = 0; i < n; i += 1) { keep(); S.step(1); if (stop?.()) return i + 1; } return -1; };
    keep();
    if (prof === "gatherer") { const v = T.villager(id); const tree = T.nearest(v.x, v.y, [-124]); S.order(id, tree[0], tree[1]); }
    else { const to = prof === "cook" ? K : B; S.order(id, to.x + 1, to.y + 1); }
    S.step(5);
    if (prof !== "cook") { S.order(other, K.x + 1, K.y + 1); S.step(5); }
    window.__site = site;
    const working = { builder: () => e[4646 + id] >= 0 && e[8749 + e[4444 + id]] >= 12, cook: () => e[4444 + id] === kitchen && e[4646 + id] >= 0, gatherer: () => e[3636 + id] > 0 }[prof];
    window.__working = working;
    window.__look = () => { const i = id; return { type: e[2828 + i], job: e[6464 + i], hat: e[2222 + i], in: e[4646 + i] >= 0 ? e[4444 + i] : 0, x: e[i], y: e[101 + i] }; };
    __run(1500, working);
    // Past the map's start for needs, or hunger and tiredness do not fall.
    if (g.missionFrame <= T.needsStart()) g.missionFrame = T.needsStart() + 1;
    return { id, other, site, kitchen, store, hut: T.buildings().find((b) => b.kind === 2).id, working: working(), before: __look() };
  }, prof);
}

/** After the interruption: run on, note job changes; is the job there, are they at it again? */
const after = (t, s, ticks = 2500) => t.eval(([id, ticks]) => {
  const e = __prehistoricRuntime.denseState;
  const c = T.buildings().find((b) => b.kind === 3);
  const jobs = [e[6464 + id]];
  const seen = [];
  const visited = {}; // building kind: ticks inside (2 a hut, 4 the kitchen)
  let last = -1;
  let back = -1;
  for (let i = 0; i < ticks; i += 1) {
    __keep();
    S.step(1);
    if (e[1919 + id] <= 0) return { died: i, jobs: jobs.join(">") };
    if (e[6464 + id] !== jobs.at(-1)) jobs.push(e[6464 + id]);
    if (e[2828 + id] !== last) { last = e[2828 + id]; seen.push(last); if (seen.length > 14) seen.shift(); }
    if (i > 60 && __working()) back = i;
    if (e[4646 + id] >= 0) visited[e[8749 + e[4444 + id]]] = (visited[e[8749 + e[4444 + id]]] ?? 0) + 1;
  }
  // Any site they have put up behind them: a new one, and a builder goes (not for the others).
  if (!T.building(__site)?.site && !__working()) {
    window.__site = S.siteNear(5, c.x - 8, c.y + 12);
    for (let i = 0; i < 800 && back < 0; i += 1) { __keep(); S.step(1); if (__working()) back = i; }
  }
  return { jobs: jobs.join(">"), back, visited, end: __look() };
}, [s.id, ticks]);

const command = async (t, label, tick) => {
  await t.tap(".hud-sheet-close", 5).catch(() => {});
  await t.step(5);
  await t.tap(".hud-cmd", 2);
  await t.tap(`.hud-cmd-item[data-ui-label="${label}"]`, 25);
  if (tick) { await t.page.evaluate(() => { const b = [...document.querySelectorAll(".hud-place")].find((e) => !e.hidden && e.getClientRects().length); b?.click(); }); await t.step(25); }
};
const CASES = {
  arms: async (t, s) => { await t.eval((id) => { const v = T.villager(id); S.look(v.x, v.y); __run(25); __prehistoricRuntime.game.cameraBFlag = false; }, s.id); await command(t, "orders.callToArms", true); t.expect.ok(await t.eval(() => __prehistoricRuntime.game.callToArmsActive), "call to arms on"); await t.eval(() => __run(400)); await command(t, "orders.backToWork", false); t.expect.ok(!(await t.eval(() => __prehistoricRuntime.game.callToArmsActive)), "back to work"); },
  rally: async (t, s) => { await t.eval((id) => { const v = T.villager(id); S.look(v.x, v.y); __run(25); __prehistoricRuntime.game.cameraBFlag = false; }, s.id); await command(t, "orders.formUp", true); t.expect.ok(await t.eval(() => __prehistoricRuntime.game.formUpActive), "form up on"); await t.eval(() => __run(400)); await command(t, "orders.disband", false); t.expect.ok(!(await t.eval(() => __prehistoricRuntime.game.formUpActive)), "disbanded"); },
  enemy: (t, s) => t.eval((id) => { const v = T.villager(id); const k = S.enemy(v.x + 4, v.y + 3); __run(500); if (k > 0) __prehistoricRuntime.denseState[1919 + k] = 0; for (const u of T.villagers()) {} __run(1); }, s.id),
  // The real choice of a new chief, when they stand on the map (a worker at a post cannot be tapped).
  chief: async (t, s) => {
    await t.tap(".hud-sheet-close", 5).catch(() => {});
    const old = await t.eval(() => T.ui().chief);
    await t.eval((old) => S.set(old, { AGE: 99 }), old);
    await t.until(() => { __keep(); return T.ui().choosingChief; }, { max: 8000, chunk: 100, what: "choosing a new chief" });
    for (let i = 0; i < 40 && !(await t.visible(".hud-prompt")); i += 1) {
      if (await t.visible(".story-hud")) await t.page.evaluate(() => document.querySelector(".story-hud").click());
      await t.step(20);
    }
    await t.until((id) => { const v = T.villager(id); return !v.inside && [69, 83, 84, 85].includes(v.type); }, { arg: s.id, max: 2500, chunk: 1, what: "on the map, not walking off" }).catch(() => {});
    const v = await t.eval((id) => T.villager(id), s.id);
    if (v.inside || !(await t.visible(".hud-prompt"))) return;
    for (let i = 0; i < 12 && !s.chosen; i += 1) {
      const at = await t.eval((id) => T.villager(id), s.id);
      if (!at.inside) await t.tapTile(at.x, at.y);
      const mine = await t.eval((id) => { const c = document.querySelector(".hud-chief-mark"); return c && !c.hidden; }, s.id);
      if (mine) await t.tap(".hud-chief-mark", 20);
      s.chosen = await t.eval((id) => T.ui().chief === id, s.id);
      if (!s.chosen) await t.step(30);
    }
  },
  train: (t, s) => t.eval((id) => {
    const c = T.buildings().find((b) => b.kind === 3);
    const b = S.buildingNear(1, c.x - 8, c.y + 2);
    const B = T.building(b);
    __prehistoricRuntime.denseState[6565 + id] = 0; // a club: the gym takes armed people
    S.order(id, B.x + 1, B.y + 1);
    __run(1500);
  }, s.id),
  sleep: (t, s) => t.eval((id) => { __prehistoricRuntime.denseState[2121 + id] = 5; }, s.id),
  eat: (t, s) => t.eval((id) => { __prehistoricRuntime.denseState[2020 + id] = 5; }, s.id),
  heal: (t, s) => t.eval((id) => { __prehistoricRuntime.denseState[1919 + id] = 4; }, s.id),
  save: (t, s) => t.eval(() => { const rt = __prehistoricRuntime; rt.saveGameplayToStore(1); __run(30); rt.loadGameplayFromStore(1); }),
  court: (t, s) => t.eval((id) => {
    const rt = __prehistoricRuntime, e = rt.denseState, row = rt.mainArrays.aShort[0];
    const mate = T.villagers().find((v) => v.id !== id && v.age >= 14 && v.gender !== T.villager(id).gender && v.id !== T.ui().chief).id;
    window.__courting = true;
    let paired = false;
    for (let i = 0; i < 6000; i += 1) {
      __keep();
      if (row[18] >= 0) row[18] = Math.min(749, row[18] + 20);
      for (const v of T.villagers()) e[505 + v.id] = v.id === id || v.id === mate ? 95 : 40;
      S.step(1);
      if ((e[8282 + id] & 127) !== 0) paired = true;
      if (paired && (e[8282 + id] & 127) === 0) break;
    }
    window.__courting = false;
    window.__paired = paired;
  }, s.id),
};

const HATS = { builder: 12, gatherer: 2, cook: 9 };
const job = (name, prof) => ({
  name: `jobs: a ${prof} keeps their job and goes back to it after: ${name} (BUG-075)`,
  async run(t) {
    const s = await stage(t, prof);
    t.expect.ok(s.working, "at work to begin with");
    await CASES[name](t, s);
    const r = await after(t, s);
    if (name === "chief" && prof !== "cook") t.expect.ok(s.chosen, "chosen as the chief");
    if (name === "court") t.expect.ok(await t.eval(() => window.__paired), "paired");
    if (r.died !== undefined) return; // call to arms took them to the enemy
    // Training is an order of the player's, to another job.
    if (name === "train" && r.end.hat !== HATS[prof]) return;
    t.expect.equal(r.end.hat, HATS[prof], `the job's hat (${r.jobs})`);
    t.expect.ok(r.back >= 0, `at it again (${JSON.stringify(r.visited)})`);
  },
});

export { stage, CASES, after };
export default [
  ...Object.keys(CASES).flatMap((name) => ["builder", "gatherer", "cook"].map((prof) => job(name, prof))),
  {
    name: "jobs: the panel's head has the job's hat off the site too (BUG-075)",
    async run(t) {
      const s = await stage(t, "builder");
      await t.tap(".hud-sheet-close", 5).catch(() => {});
      // Their site up, they stand about: selected by a tap, as on the phone.
      await t.until((id) => { __keep(); const v = T.villager(id); return !v.inside && [69, 83, 84, 85].includes(v.type) && !T.building(__site)?.site; }, { arg: s.id, max: 3000, chunk: 5, what: "idle after the site" });
      for (let i = 0; i < 8 && (await t.eval(() => T.ui().selected)) !== s.id; i += 1) {
        await t.tap(".hud-sheet-close", 5).catch(() => {});
        const v = await t.eval((id) => T.villager(id), s.id);
        await t.tapTile(v.x, v.y);
      }
      t.expect.equal(await t.eval(() => T.ui().selected), s.id, "selected");
      await t.step(5);
      t.expect.ok(await t.eval(() => [...document.querySelectorAll(".hud-villager img")].some((i) => i.src.includes("pt-builder"))), `the builder's head (${await t.eval(() => [...document.querySelectorAll(".hud-villager img")].map((i) => i.src.split("/").pop()).slice(0, 2).join(" "))})`);
    },
  },
];
