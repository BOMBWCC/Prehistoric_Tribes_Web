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

/** The countdown after a result runs to the outcome screen (Q 24) with `record` (56 lost, 57 won). */
async function outcome(t, record) {
  await t.until(() => window.__prehistoricRuntime.game.screen === 24, { max: 3000, chunk: 50, what: "the outcome screen" });
  t.expect.equal(await t.eval(() => window.__prehistoricRuntime.game.vInt), record, "the outcome's words");
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
    name: "win: once the enemy force is gone the game is won",
    async run(t) {
      await t.eval(() => { S.enter(11); S.step(3); window.__prehistoricRuntime.mainArrays.aShort[1][14] = 0; });
      await outcome(t, 57);
    },
  },
  {
    name: "lose: once nobody of ours is left the game is lost",
    async run(t) {
      await t.eval(() => { S.enter(11); S.step(3); window.__prehistoricRuntime.mainArrays.aShort[0][11] = 0; });
      await outcome(t, 56);
    },
  },
];
