// The game's flow: the start menus, the campaign's opening story, custom maps, winning and losing
// (docs/gameplay.md §1).

/** Taps whatever the story / dialogue page shows until the map is on (or `max` taps). */
async function playThroughStory(t, max = 160) { // the cave scenes play for about 20 s
  const records = [];
  for (let i = 0; i < max; i += 1) {
    const state = await t.page.evaluate(() => ({ onMap: window.__prehistoricRuntime.game.loopMode === 1, screen: window.__prehistoricRuntime.game.screen, hud: !document.querySelector(".story-hud").hidden, segment: document.querySelector(".story-hud").dataset.segment }));
    if (state.hud && records.at(-1) !== state.segment) records.push(state.segment);
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
      // The pages ignore a second tap within 300 ms (StoryHud's TAP_GAP_MS): wait like a player.
      if (await kind()) { await t.page.evaluate(() => document.querySelector(".story-hud").click()); await t.page.waitForTimeout(350); }
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
      // The pages ignore a second tap within 300 ms (StoryHud's TAP_GAP_MS): wait like a player.
      if (await kind()) { await t.page.evaluate(() => document.querySelector(".story-hud").click()); await t.page.waitForTimeout(350); }
      await t.step(10);
    }
    t.expect.equal(await t.eval(() => window.__prehistoricRuntime.game.screen), 0, "back to the main menu");
    return;
  }
  await tapUntil("again");
  await t.page.evaluate(() => document.querySelector('.end-again button[data-ui-label="a11y.yes"]').click());
  await t.until(() => window.__prehistoricRuntime.game.loopMode === 1, { max: 600, chunk: 10, what: "the map again" });
}

export default [
  {
    name: "start menu: custom is open from the start, no tutorial needed (user 2026-11-03); the pictures load first (BUG-057)",
    boot: "real",
    async run(t) {
      await t.page.tap('.start-menu button[aria-label="custom"]');
      await t.page.waitForTimeout(100);
      await t.page.tap('.start-menu button[aria-label="easy"]');
      await t.page.waitForTimeout(100);
      await t.page.tap('.start-menu .start-map >> nth=0');
      await t.page.waitForFunction(() => window.__prehistoricRuntime.game.loopMode === 1, null, { timeout: 30_000 });
      t.expect.ok(await t.page.evaluate(() => window.__prehistoricRuntime.game.mission >= 7), "a custom map");
      // Every HD picture was loaded before the map opened (BUG-057).
      t.expect.equal(await t.page.evaluate(async () => (await import("/src/render/HdArt.ts")).hdArt.preloaded()), 1, "all pictures loaded");
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
      // BUG-045: every display frame until the map, a story screen covers it (no map flashing
      // between a picture and the dialogue after it).
      await t.page.evaluate(() => {
        window.__storyGaps = 0;
        let started = false;
        const frame = () => {
          const layer = document.querySelector(".story-hud");
          const covered = !layer.hidden || !document.querySelector(".story-leaving").hidden;
          started ||= !layer.hidden;
          if (started && !covered && window.__prehistoricRuntime.game.loopMode !== 1) window.__storyGaps += 1;
          requestAnimationFrame(frame);
        };
        requestAnimationFrame(frame);
      });
      const records = await playThroughStory(t);
      // The story pictures, the cave, then MUMBO's first words on the map (public/i18n/*/story.json).
      t.expect.deepEqual(records.slice(0, 3), ["intro", "cave-awakening", "arrival"], `the opening segments (${records.join(",")})`);
      t.expect.equal(await t.page.evaluate(() => window.__prehistoricRuntime.game.mission), 0, "mission 0, the tutorial");
      t.expect.equal(await t.page.evaluate(() => window.__storyGaps), 0, "no frame without a story screen");
      // BUG-039: back on the map, the view is on our chief's hut (dense building 1, kind 3, 4 x 4).
      const view = await t.eval(() => {
        const e = __prehistoricRuntime.denseState;
        return { hut: [e[8383 + 1] + 2, e[8444 + 1] + 2, e[8749 + 1]], centre: window.__prehistoricScreen.centreTile() };
      });
      t.expect.equal(view.hut[2], 3, "building 1 is the chief's hut");
      t.expect.ok(Math.abs(view.centre[0] - view.hut[0]) <= 1, `the view's middle column ${view.centre} at the hut ${view.hut}`);
    },
  },
  {
    name: "story: a dialogue on the map pauses the world, keeps the camera and goes back to the map",
    async run(t) {
      await t.eval(() => { S.enter(0); S.step(3); });
      const before = await t.eval(() => { const g = __prehistoricRuntime.game; return { frame: g.missionFrame, camera: [g.cameraColumn, g.cameraRow] }; });
      // The original's dialogue 13, "the kitchen is finished" (story/StoryData.ts), as its tutorial starts it.
      await t.eval(() => { __prehistoricRuntime.stepSubsystemStateCommand(13); S.step(30); });
      await t.until(() => !!document.querySelector(".story-hud").dataset.segment, { max: 100, chunk: 5, what: "the story's words" });
      const during = await t.eval(() => ({ frame: __prehistoricRuntime.game.missionFrame, segment: document.querySelector(".story-hud").dataset.segment, words: document.querySelector(".story-hud .story-text")?.textContent ?? "" }));
      t.expect.equal(during.segment, "kitchen-built", "the kitchen's words");
      t.expect.ok(during.words.length > 0, "a page shows");
      t.expect.equal(during.frame, before.frame, "the world waits");
      for (let i = 0; i < 20 && (await t.visible(".story-hud")); i += 1) {
        await t.page.evaluate(() => document.querySelector(".story-hud").click());
        await t.page.waitForTimeout(350);
        await t.step(5);
      }
      await t.step(10);
      const after = await t.eval(() => { const g = __prehistoricRuntime.game; return { onMap: g.loopMode === 1, frame: g.missionFrame, camera: [g.cameraColumn, g.cameraRow] }; });
      t.expect.ok(after.onMap, "back on the map");
      t.expect.ok(after.frame > before.frame, "the world goes on");
      t.expect.deepEqual(after.camera, before.camera, "the camera where it was");
    },
  },
  {
    name: "story: a dialogue right after a tap while placing still ends the placing (BUG-048)",
    async run(t) {
      await t.eval(() => { S.enter(11); S.step(3); S.stock(100); });
      await t.tap(".hud-build-button", 30);
      // A finger on the build card (pointerdown counts as a touch), then the dialogue 5 ticks later.
      await t.page.evaluate(() => { const c = document.querySelector('.hud-card[data-kind="2"]'); c.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true })); c.click(); });
      await t.step(5);
      t.expect.equal(await t.eval(() => T.ui().barMode), 3, "placing");
      await t.eval(() => { __prehistoricRuntime.stepSubsystemStateCommand(13); S.step(30); });
      for (let i = 0; i < 20 && (await t.visible(".story-hud")); i += 1) {
        await t.page.evaluate(() => document.querySelector(".story-hud").click());
        await t.page.waitForTimeout(350);
        await t.step(5);
      }
      await t.step(10);
      t.expect.deepEqual(await t.eval(() => [T.ui().onMap, T.ui().barMode]), [true, 0], "back on the map, not placing");
    },
  },
  {
    name: "story: the chief and the shaman speak with the face of the villager they are now",
    async run(t) {
      await t.eval(() => { S.enter(0); S.step(3); });
      // Dialogue 33 (enemy-among-us): the chief, Mumbo, then the shaman, the story's cast p[3].
      const play = async (shamanAlive) => {
        const expected = await t.eval((alive) => {
          const rt = __prehistoricRuntime;
          const face = (id) => `face-0${720 + rt.denseState[2727 + id]}.webp`;
          rt.stepSubsystemStateCommand(33);
          const shaman = rt.stateCommandState.p[3];
          if (!alive) rt.denseState[1919 + shaman] = 0;
          S.step(5);
          return { chief: face(rt.mainArrays.aShort[0][17]), shaman: alive ? face(shaman) : "face-0727.webp" };
        }, shamanAlive);
        await t.until(() => !document.querySelector(".story-hud").hidden, { max: 100, chunk: 5, what: "the story's words" });
        const seen = [];
        for (let i = 0; i < 30 && (await t.visible(".story-hud")); i += 1) {
          seen.push(await t.eval(() => document.querySelector(".story-hud .story-face")?.getAttribute("src")?.split("/").pop() ?? ""));
          await t.page.evaluate(() => document.querySelector(".story-hud").click());
          await t.page.waitForTimeout(350);
          await t.step(5);
        }
        t.expect.ok(seen.includes(expected.chief), `the chief's own face (${expected.chief} in ${seen})`);
        t.expect.ok(seen.includes(expected.shaman), `the shaman's face (${expected.shaman} in ${seen})`);
      };
      await play(true);
      await t.step(10);
      await play(false);
    },
  },
  {
    name: "story: scene 8 plays only its words, then a › notice jumps to what it showed",
    async run(t) {
      await t.eval(() => { S.enter(0); S.step(3); });
      // The raiders coming (dialogue 15, scene 8, camera on its actor 5): one raider far away as it.
      const enemy = await t.eval(() => {
        const rt = __prehistoricRuntime;
        S.enemy(30, 25); S.step(2);
        let id = 0;
        for (let u = 51; u <= 100 && !id; u += 1) if (rt.denseState[1919 + u] > 0) id = u;
        rt.stateCommandState.p[5] = id;
        rt.stepSubsystemStateCommand(15);
        S.step(8);
        return { x: rt.denseState[id], y: rt.denseState[101 + id] };
      });
      await t.until(() => !document.querySelector(".story-hud").hidden, { max: 100, chunk: 5, what: "the story's words" });
      t.expect.ok(await t.eval(() => document.querySelector(".story-hud").classList.contains("fade-in")), "the story fades in");
      for (let i = 0; i < 20 && (await t.visible(".story-hud")); i += 1) {
        await t.page.evaluate(() => document.querySelector(".story-hud").click());
        await t.page.waitForTimeout(350);
        await t.step(3);
      }
      await t.step(3);
      const notice = await t.eval(() => [...document.querySelectorAll("button.notice")].map((n) => n.textContent));
      t.expect.ok(notice.length === 1 && notice[0].endsWith("›"), `a › notice (${notice})`);
      await t.page.click("button.notice");
      await t.step(3);
      // Centred on it as far as the map's edge lets the view go.
      const view = await t.eval(() => window.__prehistoricScreen.viewRect());
      const inside = enemy.x >= view.column + 1 && enemy.x < view.column + view.columns - 1 && enemy.y >= view.row + 1 && enemy.y < view.row + view.rows - 1;
      t.expect.ok(inside && Math.abs(view.column + view.columns / 2 - enemy.x) <= 3, `the view on the raider (${JSON.stringify(view)} / ${JSON.stringify(enemy)})`);
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
      await t.page.tap('.start-menu .start-map >> nth=2');
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
