// Pacing measurement (docs/modernization-plan.md §5 "节奏调整"): one fixed game in headless Chrome, the
// scenario tests' way (debug boot, tools/debug/stage.js, tests/inspect.js), with the pacing values of
// web/src/core/Pacing.ts or the ones given on the command line:
//
//   npm run pacing
//   npm run pacing -- build=1 childGrowth=1 berriesEndless=false
//   npm run pacing -- raids=true        with the enemy's raids (off by default, user 2026-11-03)
//   npm run pacing -- wait=false        trained fighters stay where they come out (no (8, 46) spot)
//   npm run pacing -- adults=3          3 more adults (age 20, men and women in turn) at the start
//   npm run pacing -- hits=true         also lists every hit on a villager and who stood near
//   npm run pacing -- couple=2          the next couple may pair twice as soon: the tribe's courtship
//                                       timer a[0][18] (750 frames, LegacySubsystemEntityLoop.ts) runs
//                                       this much faster -- measurement only, not a game setting
//
// Setup: PLOT OF LAND (custom map 11), fog cleared once, 999 wood and 999 stone; villagers 2-3 build,
// 4-6 each pick a berry bush near the camp ((10,43), (6,33), (30,44): not (23,32), which the enemy villagers pass, BUG-063), 7 cooks once the kitchen stands, 8 makes weapons once the
// armoury stands (9 clubs, then 9 spears; the maker needs melee 2 and ranged 4). One of them with nothing to do is sent back to the job;
// one who dies is replaced by a free adult. The building plan goes one step after the other: store, kitchen,
// hut, hut, armoury, gym, range, hut, hut, then the gym and the range to level 2. Every other adult
// but the chief becomes a fighter, up to 10, clubs and spears in turn (anyone may carry either); armed, they go into the gym (melee) or the range (ranged) whenever their
// skill is below what its level trains (level 1: 5, level 2: 7); at 7 they wait on open ground near
// (8, 46), off the training buildings' doors. Defence: enemies in the camp -> the
// game's FORM UP at the camp's middle, then the gathered fighters attack together (see p.defend).
// Goal "ready to attack" (user 2026-11-03): 10 fighters, all armed, melee and ranged both, each at 7
// in their weapon's skill. The run stops there or after 60 game minutes; one row every 2 minutes
// (1000 frames at 120 ms).
import path from "node:path";
import { createRequire } from "node:module";

const webDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const root = path.resolve(webDir, "..");
const require = createRequire(path.join(webDir, "package.json"));
const { createServer } = await import(require.resolve("vite"));
const { chromium } = require("playwright");

const MINUTE = 500;
const ROW = 2 * MINUTE;
const TOTAL = 60 * MINUTE;

const overrides = {};
const run = { raids: false, wait: true, adults: 0, couple: 1, hits: false };
for (const arg of process.argv.slice(2)) {
  const [name, value] = arg.split("=");
  if (!["build", "childGrowth", "berriesEndless", "raids", "wait", "adults", "couple", "hits"].includes(name) || value === undefined) throw new Error(`unknown argument ${arg} (build=, childGrowth=, berriesEndless=, raids=, wait=, adults=, couple=, hits=)`);
  if (name === "adults" || name === "couple") run[name] = Number(value);
  else if (name in run) run[name] = value === "true";
  else overrides[name] = name === "berriesEndless" ? value === "true" : Number(value);
}

const server = await createServer({ root: webDir, logLevel: "error", server: { port: 0, strictPort: false, host: "localhost", hmr: false, watch: null } });
await server.listen();
const browser = await chromium.launch({ channel: "chrome", headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  // The run only needs the game's state; a page error (e.g. from the WebGL map in headless Chrome)
  // is reported at the end, not fatal.
  const pageErrors = [];
  page.on("pageerror", (e) => pageErrors.push(e.message));
  await page.addInitScript(() => { try { localStorage.clear(); } catch { /* none */ } });
  await page.goto(server.resolvedUrls.local[0]);
  await page.waitForFunction(() => !!window.__prehistoricDebugBootWithoutSplash);
  await page.evaluate(async () => { await window.__prehistoricDebugBootWithoutSplash(); });
  await page.addScriptTag({ path: path.join(root, "tools/debug/stage.js") });
  await page.addScriptTag({ path: path.join(webDir, "tests/inspect.js") });

  const pacing = await page.evaluate(async (overrides) => {
    const { Pacing } = await import("/src/core/Pacing.ts");
    Object.assign(Pacing, overrides);
    return { ...Pacing };
  }, overrides);
  console.log(`Pacing: build ${pacing.build}, childGrowth ${pacing.childGrowth}, berriesEndless ${pacing.berriesEndless}; raids ${run.raids ? "on" : "off"}${run.wait ? "" : ", no waiting spot"}${run.adults ? `, ${run.adults} more adults` : ""}${run.couple !== 1 ? `, courtship timer x${run.couple}` : ""}`);

  await page.evaluate((run) => {
    const rt = window.__prehistoricRuntime;
    const e = rt.denseState;
    const g = rt.game;
    // f.a:[[S row 0: [0] food in the kitchen (cooked), [1] food in the store (raw), [5] clubs, [7] spears.
    const row = rt.mainArrays.aShort[0];
    S.enter(11);
    S.clearFog();
    row[2] = 999;
    row[3] = 999;
    const camp = T.buildings().find((b) => b.kind === 3);
    for (let i = 0; i < run.adults; i += 1) S.villager(camp.x + 1 + (i % 4), camp.y + 5, { age: 20, gender: i % 2 });
    const p = {
      // The fixed jobs; whoever holds one and dies is replaced by a free adult (see fillJobs).
      jobs: [{ job: "build", id: 2 }, { job: "build", id: 3 }, { job: "gather", id: 4, at: [10, 43] }, { job: "gather", id: 5, at: [6, 33] },
        { job: "gather", id: 6, at: [30, 44] }, { job: "cook", id: 7 }, { job: "arm", id: 8 }],
      replaced: 0, rallies: 0, rally: null, calm: 0,
      plan: [["site", 6, 20, 36, "store"], ["site", 4, 18, 40, "kitchen"], ["site", 2, 10, 37, "hut"], ["site", 2, 7, 39, "hut"],
        ["site", 0, 20, 30, "armoury"], ["site", 1, 22, 42, "gym"], ["site", 5, 4, 40, "range"], ["site", 2, 12, 33, "hut"], ["site", 2, 8, 34, "hut"],
        ["upgrade", "gym"], ["upgrade", "range"]],
      steps: [], built: {}, fighters: [], goal: 0,
      gathered: 0, cooked: 0, eaten: 0, idleSamples: 0, samples: 0, births: 0, armedAt: 0, deaths: [], hits: [],
    };
    window.P = p;
    const B = (id) => T.building(id);
    // A living adult (ids are reused: a dead villager's id may come back as a baby).
    const alive = (id) => e[1919 + id] > 0 && e[1414 + id] >= 12;
    p.holders = (job) => p.jobs.filter((j) => j.job === job).map((j) => j.id);
    Object.defineProperty(p, "gatherers", { get: () => p.holders("gather") });
    // A gatherer is idle when standing or walking with no job (type 69 / 84), or waiting next to
    // their bush while it has nothing to pick (look 0: the gate of LegacyResourceNodeGate.ts).
    p.idle = (id) => {
      if (!alive(id)) return false;
      if ([69, 84].includes(e[2828 + id])) return true;
      const cell = e[4747 + id];
      if (cell > -61 || cell < -110) return false;
      const slot = -cell - 61;
      return e[9933 + slot] === 0 && Math.max(Math.abs(e[id] - e[9733 + slot]), Math.abs(e[101 + id] - e[9783 + slot])) <= 1;
    };
    /** Living enemies (records 51..100) in the camp: [id, x, y]. */
    p.raiders = () => {
      const list = [];
      for (let id = 51; id <= 100; id += 1) if (e[1919 + id] > 0 && Math.max(Math.abs(e[id] - 16), Math.abs(e[101 + id] - 40)) <= 10) list.push([id, e[id], e[101 + id]]);
      return list;
    };
    // Every frame of the run -- the orders' own key presses too -- goes through here.
    const step = S.step;
    S.step = (n = 1) => {
      for (let i = 0; i < n; i += 1) {
        const raw = row[1], cooked = row[0], people = row[11];
        // The courtship timer a[0][18] counts up while >= 0 and frees the next pairing at 750.
        if (run.couple > 1 && row[18] >= 0) row[18] = Math.min(749, row[18] + Math.round(run.couple) - 1);
        // Raids off: a raid starts when the frame reaches b.aQ (LegacySubsystemAs.ts), so it is kept
        // out of reach.
        if (!run.raids) rt.subsystemArrays.bAQ = 2 ** 30;
        const hpBefore = run.hits ? Array.from({ length: 51 }, (_, id) => e[1919 + id]) : null;
        step(1);
        // hits=true: every hit on a villager, with who stands within 2 tiles (BUG-063).
        if (hpBefore) for (let id = 1; id <= 50; id += 1) {
          if (!(e[1919 + id] < hpBefore[id]) || hpBefore[id] <= 0) continue;
          const x = e[id], y = e[101 + id], near = (a, b) => Math.max(Math.abs(a - x), Math.abs(b - y)) <= 2;
          const who = [];
          for (let o = 1; o <= 100; o += 1) if (o !== id && e[1919 + o] > 0 && near(e[o], e[101 + o])) who.push(`${o <= 50 ? "我" : "敌"}${o}:${e[2828 + o]}`);
          for (const a of T.animals()) if (near(a.x, a.y)) who.push(`兽${a.kind}`);
          p.hits.push(`${(g.missionFrame / 500).toFixed(1)} ${id}(${e[2828 + id]} 武器${e[6565 + id]} 近${e[1717 + id]} 投${e[1616 + id]})@${x},${y} ${hpBefore[id]}→${e[1919 + id]} [${who.join(" ")}]`);
        }
        if (row[1] > raw) p.gathered += row[1] - raw;
        if (row[0] > cooked) p.cooked += row[0] - cooked;
        if (row[0] < cooked) p.eaten += cooked - row[0];
        if (row[11] > people) p.births += row[11] - people;
        if (g.missionFrame % 10 === 0) {
          // Who died since the last look, as they were then: hunger and tiredness (99 full, 0 empty).
          const seen = new Map(T.villagers().map((v) => [v.id, v]));
          for (const [id, v] of p.lastSeen ?? []) if (!seen.has(id) || seen.get(id).age < v.age) p.deaths.push({ minute: (g.missionFrame / 500).toFixed(1), age: v.age, food: v.food, energy: v.energy, hp: v.hp });
          p.lastSeen = seen;
          p.samples += p.gatherers.length;
          p.idleSamples += p.gatherers.filter(p.idle).length;
          p.raidSamples += p.raiders().length > 0 ? 1 : 0;
        }
      }
    };
    const closeBars = () => { for (let i = 0; i < 4 && g.barMode !== 0; i += 1) S.key("SOFT_RIGHT"); };
    /** Opens building `id`'s bar (FIRE on it with nothing selected) and puts the cursor on `code`. */
    const barItem = (id, code) => {
      closeBars();
      S.look(B(id).x + 1, B(id).y + 1);
      S.step(2);
      S.key("FIRE");
      const slot = Array.from(rt.mainArrays.r.slice(0, g.frameLayoutAR)).indexOf(code);
      if (g.barMode !== 2 || slot < 0) return false;
      for (let i = 0; i < 12 && g.menuCursor !== slot; i += 1) S.key(g.menuCursor < slot ? "RIGHT" : "LEFT");
      return true;
    };
    const sendBuilders = (id) => { for (const w of p.holders("build")) S.order(w, B(id).x + 1, B(id).y + 1); };
    /** Sends job holder `j` to their work: the open site or upgrade, their bush, the kitchen, the armoury. */
    const sendToJob = (j) => {
      const at = (name) => p.built[name] && B(p.built[name]);
      const open = p.steps.find((s) => s.done === undefined);
      const b = j.job === "build" ? open && B(open.id) : j.job === "cook" ? at("kitchen") : j.job === "arm" ? at("armoury") : null;
      if (j.job === "gather") S.order(j.id, ...j.at);
      else if (b) S.order(j.id, b.x + 1, b.y + 1);
    };
    p.jobs.filter((j) => j.job === "gather").forEach(sendToJob);
    p.startStep = () => {
      const step = p.plan[p.steps.length];
      const s = { name: step[0] === "site" ? step[4] : `${step[1]}↑2`, placed: g.missionFrame };
      if (step[0] === "site") {
        s.id = S.siteNear(step[1], step[2], step[3]);
        s.kind = step[1];
        sendBuilders(s.id);
      } else {
        s.id = p.built[step[1]];
        s.upgrade = true;
        barItem(s.id, 16);
        S.key("FIRE");
        closeBars();
        sendBuilders(s.id);
      }
      p.steps.push(s);
    };
    p.checkStep = () => {
      const s = p.steps[p.steps.length - 1];
      const b = B(s.id);
      if (s.done !== undefined || !b) return;
      if (s.upgrade ? b.level === 2 && b.work === 0 : b.kind === s.kind) {
        s.done = g.missionFrame;
        if (!s.upgrade) p.built[s.name] = s.id;
        if (s.name === "kitchen") p.jobs.filter((j) => j.job === "cook").forEach(sendToJob);
        if (s.name === "armoury") {
          p.jobs.filter((j) => j.job === "arm").forEach(sendToJob);
          for (const code of [0, 2]) if (barItem(s.id, code)) for (let i = 0; i < 9; i += 1) S.key("UP");
          closeBars();
        }
        if (p.steps.length < p.plan.length) p.startStep();
      }
    };
    const taken = () => [rt.mainArrays.aShort[0][17], ...p.jobs.map((j) => j.id)];
    p.fillJobs = () => {
      for (const j of p.jobs) {
        if (alive(j.id)) {
          // Standing or walking with nothing to do: sent back, as a player would.
          if (!p.rally && [69, 84].includes(e[2828 + j.id]) && !T.villager(j.id).inside) sendToJob(j);
          continue;
        }
        // A free adult first, else a fighter without a weapon yet; the weapon maker must have the skills
        // the armoury's weapons ask for (t138 rows 13-14: a club melee 2, a spear ranged 4).
        const fits = (v) => j.job !== "arm" || (v.skills.melee >= 2 && v.skills.ranged >= 4);
        const free = T.villagers().find((v) => v.age >= 12 && !taken().includes(v.id) && !p.fighterOf(v.id) && fits(v))
          ?? T.villagers().find((v) => p.fighterOf(v.id) && !p.armed(p.fighterOf(v.id)) && !taken().includes(v.id) && fits(v));
        if (!free) continue;
        p.fighters = p.fighters.filter((f) => f.id !== free.id);
        j.id = free.id;
        p.replaced += 1;
        sendToJob(j);
      }
    };
    const click = (selector, frames) => {
      const el = [...document.querySelectorAll(selector)].find((x) => !x.closest("[hidden]") && x.getClientRects().length > 0);
      if (el) { el.click(); S.step(frames); }
      return !!el;
    };
    /** The game's FORM UP (集结: those with a weapon or fighting skill over 4) through the command menu,
     *  as a player taps it: the horn, FORM UP, the flag on (16, 41), the tick; or DISBAND. */
    const formUp = (on) => {
      closeBars();
      click(".hud-cmd", 2);
      if (!click(`.hud-cmd-item[data-ui-label="${on ? "orders.formUp" : "orders.disband"}"]`, 25)) return;
      if (on) { S.look(16, 41); S.step(5); click(".hud-place", 20); }
    };
    const far = (v, x, y) => Math.max(Math.abs(v.x - x), Math.abs(v.y - y));
    /** Defence: enemies in the camp (within 10 tiles of its middle; their own villagers wander up to
     *  15 tiles near, around (25..31, 25..32), and are no raid) -> form up at the camp's middle; once half of the armed fighters stand within 3 tiles
     *  of the flag (or 200 frames on), those near it attack the nearest enemy together; 100 frames
     *  after the last enemy left, disband. Returns the enemies in the camp. */
    p.defend = () => {
      const raiders = p.raiders();
      if (raiders.length) p.calm = g.missionFrame;
      if (raiders.length && !p.rally) {
        formUp(true);
        p.rally = { since: g.missionFrame };
        p.rallies += 1;
      }
      if (p.rally && !raiders.length && g.missionFrame - p.calm >= 100) {
        formUp(false);
        p.rally = null;
      }
      if (!p.rally || !raiders.length) return raiders;
      const armed = p.fighters.filter(p.armed).map((f) => T.villager(f.id)).filter((v) => v && !v.inside);
      const gathered = armed.filter((v) => far(v, 16, 41) <= 3);
      if (!p.rally.attack && (gathered.length * 2 >= armed.length || g.missionFrame - p.rally.since >= 200)) p.rally.attack = true;
      if (!p.rally.attack) return raiders;
      for (const v of armed) {
        const target = e[4747 + v.id];
        if (target >= 51 && target <= 100) continue;
        if (far(v, 16, 41) > 4) continue;
        const near = raiders.reduce((a, b) => (far(v, a[1], a[2]) <= far(v, b[1], b[2]) ? a : b));
        S.order(v.id, near[1], near[2]);
      }
      return raiders;
    };
    p.fighterOf = (id) => p.fighters.find((f) => f.id === id);
    /** Skill a fighter trains: melee (1717) with a club, ranged (1616) with a spear. */
    p.skill = (f) => e[(f.ranged ? 1616 : 1717) + f.id];
    p.armed = (f) => e[6565 + f.id] === (f.ranged ? 2 : 0);
    p.fighterStep = () => {
      p.fighters = p.fighters.filter((f) => alive(f.id));
      p.fillJobs();
      for (const v of T.villagers()) {
        if (p.fighters.length >= 10) break;
        if (v.age < 12 || taken().includes(v.id) || p.fighterOf(v.id)) continue;
        p.fighters.push({ id: v.id, ranged: p.fighters.filter((f) => f.ranged).length < p.fighters.filter((f) => !f.ranged).length });
      }
      p.defend();
      for (const f of p.fighters) {
        const v = T.villager(f.id);
        if (p.rally || !v || v.inside || ![69, 84].includes(v.type)) continue;
        if (!p.armed(f)) {
          if (row[f.ranged ? 7 : 5] > 0) S.giveWeapon(f.id, f.ranged ? 2 : 0, 2);
          continue;
        }
        const id = p.built[f.ranged ? "range" : "gym"];
        const b = id && B(id);
        if (!b || b.work !== 0) continue;
        if (p.skill(f) < (b.level >= 2 ? 7 : 5)) S.order(f.id, b.x + 1, b.y + 1);
        // Trained ones would stand about the training buildings' doors and keep the next trainees
        // out (seen 2026-11-03): they wait on open ground off the camp, as a player sends them.
        else if (run.wait && p.skill(f) >= 7 && far(v, ...p.waitAt) > 3) S.order(f.id, ...p.waitAt);
      }
      if (!p.armedAt && p.fighters.length >= 10 && p.fighters.every(p.armed)) p.armedAt = g.missionFrame;
      const ready = p.fighters.filter((f) => p.armed(f) && p.skill(f) >= 7);
      if (!p.goal && ready.length >= 10 && ready.some((f) => f.ranged) && ready.some((f) => !f.ranged)) p.goal = g.missionFrame;
    };
    // The waiting spot: the first free tile from (8, 46) outwards.
    for (let r = 0; r < 8 && !p.waitAt; r += 1) for (let dy = -r; dy <= r && !p.waitAt; dy += 1) for (let dx = -r; dx <= r && !p.waitAt; dx += 1) {
      if (rt.gridC[46 + dy]?.[8 + dx] === 0 && rt.occupancyClass(8 + dx, 46 + dy) === 0) p.waitAt = [8 + dx, 46 + dy];
    }
    p.startStep();
  }, run);

  const rows = [];
  for (let end = ROW; end <= TOTAL; end += ROW) {
    const r = await page.evaluate((end) => {
      const rt = window.__prehistoricRuntime;
      const g = rt.game;
      const row = rt.mainArrays.aShort[0];
      const p = window.P;
      p.gathered = p.cooked = p.eaten = p.idleSamples = p.samples = p.raidSamples = 0;
      while (g.missionFrame < end && !p.goal && !p.ended) {
        const before = g.missionFrame;
        S.step(1);
        if (g.missionFrame === before) {
          // Off the map the frame stands still: a story or a villager speaking (Q 17, 18, 20) waits for
          // a tap, as a player gives it; anything else that long is the end of the game.
          if ([17, 18, 20].includes(g.screen)) S.key("FIRE");
          p.stalled = (p.stalled ?? 0) + 1;
          if (p.stalled > 300) { p.ended = before; break; }
          continue;
        }
        p.stalled = 0;
        if (g.missionFrame % 10 === 0) p.checkStep();
        if (g.missionFrame % 100 === 0) p.fighterStep();
      }
      const people = T.villagers();
      const skills = p.fighters.map(p.skill);
      return {
        minute: (g.missionFrame / 500).toFixed(1).replace(/\.0$/, ""), goal: p.goal, ended: p.ended, screen: g.screen, people: people.length, adults: people.filter((v) => v.age >= 12).length,
        raw: row[1], cooked: row[0], gathered: p.gathered, cookedIn: p.cooked, eaten: p.eaten,
        idleNow: p.gatherers.filter(p.idle).length, idleShare: Math.round((100 * p.idleSamples) / Math.max(1, p.samples)),
        raid: Math.round((100 * p.raidSamples * p.gatherers.length) / Math.max(1, p.samples)),
        fighters: p.fighters.length, armed: p.fighters.filter(p.armed).length,
        melee: p.fighters.filter((f) => !f.ranged).length, ranged: p.fighters.filter((f) => f.ranged).length,
        at7: p.fighters.filter((f) => p.armed(f) && p.skill(f) >= 7).length,
        top: skills.length ? Math.max(...skills) : 0, mean: skills.length ? (skills.reduce((a, b) => a + b, 0) / skills.length).toFixed(1) : "0",
        replaced: p.replaced, rallies: p.rallies, births: p.births, armedAt: p.armedAt, deaths: p.deaths, hits: p.hits,
        steps: p.steps.map((s) => `${s.name} ${s.done === undefined ? "…" : ((s.done - s.placed) / 500).toFixed(1)}`).join(", "),
      };
    }, end);
    rows.push(r);
    if (r.goal || r.ended) break;
  }

  console.log("| 分钟 | 人口/成年 | 生食 | 熟食 | 采到 | 做熟 | 吃掉 | 闲着的采集者（此刻 / 这 2 分钟） | 敌人在营地 | 战士：有武器/人数（近战+投掷） | 练到 7 | 训练等级 最高/平均 |");
  console.log("|---|---|---|---|---|---|---|---|---|---|---|---|");
  for (const r of rows) {
    console.log(`| ${r.minute} | ${r.people}/${r.adults} | ${r.raw} | ${r.cooked} | ${r.gathered} | ${r.cookedIn} | ${r.eaten} | ${r.idleNow}/3（${r.idleShare}%） | ${r.raid}% | ${r.armed}/${r.fighters}（${r.melee}+${r.ranged}） | ${r.at7} | ${r.top}/${r.mean} |`);
  }
  const last = rows[rows.length - 1];
  console.log(`\n岗位上的人死了、由别人顶上：${last.replaced} 次；集结守家 ${last.rallies} 次；出生 ${last.births} 人`);
  if (run.hits) console.log(`受伤 ${last.hits.length} 次（分钟 编号(类型)@位置 血量 [2 格内的人：我/敌 编号:类型，兽 种类]）：\n${last.hits.join("\n")}`);
  if (last.deaths.length) console.log(`死亡 ${last.deaths.length} 人（分钟 年龄 饥饿/疲劳/血量，饥饿、疲劳 0 = 空）：${last.deaths.map((d) => `${d.minute} ${d.age}岁 ${d.food}/${d.energy}/${d.hp}`).join("；")}`);
  console.log(last.armedAt ? `10 个战士都有武器：第 ${(last.armedAt / 500).toFixed(1)} 分钟` : "10 个战士都有武器：没达成");
  console.log(`建筑（放下 / 下令升级到完成，分钟）：${last.steps}`);
  if (pageErrors.length) console.log(`页面报错 ${pageErrors.length} 次，第一次：${pageErrors[0]}`);
  if (last.ended) console.log(`第 ${(last.ended / 500).toFixed(1)} 分钟游戏停住了（不在地图上，画面 ${last.screen}${last.screen === 24 ? "：结算" : ""}）`);
  console.log(last.goal ? `准备进攻：第 ${(last.goal / 500).toFixed(1)} 分钟达成` : `准备进攻：没达成`);
} finally {
  await browser.close();
  await server.close();
}
