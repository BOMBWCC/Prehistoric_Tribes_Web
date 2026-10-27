// The game's flow: the start menus, the campaign's opening story, custom maps, winning and losing
// (docs/gameplay.md §1).

/** Taps whatever the story / dialogue page shows until the map is on (or `max` taps). */
async function playThroughStory(t, max = 80) {
  const records = [];
  for (let i = 0; i < max; i += 1) {
    const state = await t.page.evaluate(() => ({ onMap: window.__prehistoricRuntime.game.loopMode === 1, screen: window.__prehistoricRuntime.game.screen, hud: !document.querySelector(".story-hud").hidden, text: window.__prehistoricRuntime.shownTextRecord }));
    if (state.hud && records.at(-1) !== state.text) records.push(state.text);
    if (state.onMap && !state.hud && state.screen !== 17) { await t.page.waitForTimeout(300); if (await t.page.evaluate(() => window.__prehistoricRuntime.game.loopMode === 1 && document.querySelector(".story-hud").hidden)) return records; }
    if (state.hud) await t.page.click(".story-hud", { position: { x: 200, y: 300 } });
    await t.page.waitForTimeout(500);
  }
  throw new Error(`still in the story after ${max} taps (texts ${records.join(",")})`);
}

/** The countdown after a result runs to the outcome page (Q 24, `record`: 56 lost, 57 won), then
 *  taps go through the score to `last` ("menu": the start menu, "again": play again? -> yes -> map). */
async function outcome(t, record, last) {
  const kind = () => t.page.evaluate(() => { const h = document.querySelector(".story-hud"); return h.hidden ? "" : h.dataset.kind; });
  const tapUntil = async (want) => {
    for (let i = 0; i < 40 && (await kind()) !== want; i += 1) {
      if (await kind()) await t.page.evaluate(() => document.querySelector(".story-hud").click());
      await t.step(10);
    }
    t.expect.equal(await kind(), want, `the ${want} page`);
  };
  await t.until(() => window.__prehistoricRuntime.game.screen === 24, { max: 3000, chunk: 50, what: "the outcome screen" });
  t.expect.equal(await t.eval(() => window.__prehistoricRuntime.game.vInt), record, "the outcome's words");
  await tapUntil("outcome");
  t.expect.ok(await t.visible(".end-picture"), "the end picture");
  await tapUntil("score");
  t.expect.equal(await t.eval(() => document.querySelectorAll(".end-row:not(.head)").length), 6, "six score rows");
  if (last === "menu") {
    for (let i = 0; i < 40 && (await t.eval(() => window.__prehistoricRuntime.game.screen)) !== 0; i += 1) {
      if (await kind()) await t.page.evaluate(() => document.querySelector(".story-hud").click());
      await t.step(10);
    }
    t.expect.equal(await t.eval(() => window.__prehistoricRuntime.game.screen), 0, "back to the main menu");
    return;
  }
  await tapUntil("again");
  await t.page.evaluate(() => document.querySelector('.end-again button[aria-label="yes"]').click());
  await t.until(() => window.__prehistoricRuntime.game.loopMode === 1, { max: 600, chunk: 10, what: "the map again" });
}

export default [
  {
    name: "start menu: custom is locked before the tutorial",
    boot: "real",
    async run(t) {
      await t.page.tap('.start-menu button[aria-label="custom"]');
      await t.page.waitForTimeout(200);
      t.expect.equal(await t.page.evaluate(() => document.querySelector(".start-menu").dataset.page), "locked");
      t.expect.match(await t.page.evaluate(() => document.querySelector(".start-text").textContent), /tutorial/i);
    },
  },
  {
    name: "campaign: the opening story and dialogue lead to the map",
    boot: "real",
    async run(t) {
      await t.page.tap('.start-menu button[aria-label="campaign"]');
      await t.page.waitForTimeout(100);
      await t.page.tap('.start-menu button[aria-label="easy"]');
      await t.page.waitForFunction(() => window.__prehistoricRuntime.game.screen === 18, null, { timeout: 30_000 });
      const records = await playThroughStory(t);
      // The three story pictures (/d0 71..73), then MUMBO's first words (75).
      t.expect.deepEqual(records.slice(0, 4), [71, 72, 73, 75], `the opening texts (${records.join(",")})`);
      t.expect.equal(await t.page.evaluate(() => window.__prehistoricRuntime.game.mission), 0, "mission 0, the tutorial");
    },
  },
  {
    name: "custom: a map chosen in the menu is the one played",
    boot: "real",
    async run(t) {
      await t.page.evaluate(() => { window.__prehistoricRuntime.game.progressR = 1; });
      await t.page.tap('.start-menu button[aria-label="custom"]');
      await t.page.waitForTimeout(100);
      await t.page.tap('.start-menu button[aria-label="hard"]');
      await t.page.waitForTimeout(100);
      await t.page.tap('.start-menu button[aria-label="地图 3"]');
      await t.page.waitForFunction(() => window.__prehistoricRuntime.game.loopMode === 1, null, { timeout: 30_000 });
      t.expect.equal(await t.page.evaluate(() => window.__prehistoricRuntime.game.mission), 9, "FOREST BELT (q 9)");
    },
  },
  {
    name: "custom maps: berry bushes within 15 tiles of the camp, at least 2 on every map",
    async run(t) {
      const near = await t.eval(() => [7, 8, 9, 10, 11].map((q) => {
        S.enter(q);
        const rt = window.__prehistoricRuntime, e = rt.denseState;
        const camp = T.buildings().find((b) => b.kind === 3);
        let n = 0;
        for (let s = 0; s < 50; s += 1) {
          const kind = e[9833 + s];
          if (kind >= 1 && kind <= 4 && Math.max(Math.abs(e[9733 + s] - camp.x), Math.abs(e[9783 + s] - camp.y)) <= 15) n += 1;
        }
        return n;
      }));
      t.expect.ok(near.every((n) => n >= 2), `berry bushes near the camp, maps 7..11: ${near.join(", ")}`);
    },
  },
  {
    name: "win: the enemy force gone -> the won picture, the score, the main menu",
    async run(t) {
      await t.eval(() => { S.enter(11); S.step(3); S.win(); });
      await outcome(t, 57, "menu");
    },
  },
  {
    name: "lose: nobody of ours left -> the lost picture, the score, play again -> the map",
    async run(t) {
      await t.eval(() => { S.enter(11); S.step(3); S.lose(); });
      await outcome(t, 56, "again");
    },
  },
];
