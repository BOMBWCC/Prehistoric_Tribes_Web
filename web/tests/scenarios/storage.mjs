// The browser's storage full or blocked (L08, BUG-077): the game goes on, a save that fails says so,
// and a save already there is not lost.

const MODES = {
  // A full disk: only writing fails.
  full: () => { Storage.prototype.setItem = () => { throw new DOMException("full", "QuotaExceededError"); }; },
  // Every call fails.
  broken: () => {
    for (const name of ["getItem", "setItem", "removeItem", "clear"]) Storage.prototype[name] = () => { throw new DOMException("no", "SecurityError"); };
  },
  // Blocked by the browser's settings: touching localStorage at all throws.
  blocked: () => { Object.defineProperty(window, "localStorage", { get() { throw new DOMException("no", "SecurityError"); } }); },
};

/** The page again with storage in `mode`, the debug boot on it, on the map. */
async function boot(t, mode) {
  await t.page.addInitScript(MODES[mode]);
  await t.page.reload();
  await t.page.waitForFunction(() => !!window.__prehistoricDebugBootWithoutSplash);
  await t.page.evaluate(async () => { await window.__prehistoricDebugBootWithoutSplash(); });
  await t.page.addScriptTag({ path: "../tools/debug/stage.js" });
  await t.page.addScriptTag({ path: "tests/inspect.js" });
  await t.eval(() => { S.enter(11); S.step(3); });
  await t.step(20);
}

/** The game menu's save, as a finger does it: the notice it ends with. */
async function menuSave(t) {
  await t.tap(".hud-menu-button", 5);
  await t.tap('.hud-menu-item[data-ui-label="menu.save"]', 5);
  if (await t.eval(() => !!document.querySelector("dialog.confirm[open]"))) await t.tap("dialog.confirm .yes", 5);
  for (let i = 0; i < 40; i += 1) {
    const notice = await t.eval(() => [...document.querySelectorAll(".notice")].map((n) => n.textContent).join("|"));
    if (/保存|save/i.test(notice)) return notice;
    await t.step(5);
  }
  return "";
}

export default [
  ...Object.keys(MODES).map((mode) => ({
  name: `storage ${mode}: the game starts and plays, a save says it failed, loading finds nothing (BUG-077)`,
  async run(t) {
    await boot(t, mode);
    const notice = await menuSave(t);
    t.expect.ok(/内存不足|Not enough memory/.test(notice), `the save says it failed (${notice})`);
    t.expect.equal(await t.eval(() => __prehistoricRuntime.loadGameplayFromStore(1)), false, "nothing to load");
    await t.step(10);
  },
  })),
  ...Object.keys(MODES).map((mode) => ({
    name: `storage ${mode}: the start menu comes up (BUG-077)`,
    boot: "real",
    async run(t) {
      await t.page.addInitScript(MODES[mode]);
      await t.page.reload();
      await t.page.waitForFunction(() => document.querySelector(".start-menu")?.dataset.page === "main", null, { timeout: 60_000 });
    },
  })),
  {
    name: "storage: a save that fails leaves the save already there; a broken save is no save (BUG-077)",
    async run(t) {
      await t.eval(() => { S.enter(11); S.step(3); });
      await t.step(20);
      t.expect.ok(/已保存|保存了|saved/i.test(await menuSave(t)), "the first save");
      await t.tap(".hud-menu-button", 5).catch(() => {});
      const before = await t.eval(() => Object.fromEntries(Object.keys(localStorage).map((k) => [k, localStorage.getItem(k)])));
      await t.eval(() => { window.__set = Storage.prototype.setItem; Storage.prototype.setItem = () => { throw new DOMException("full", "QuotaExceededError"); }; __prehistoricRuntime.game.missionFrame += 50; S.step(20); });
      t.expect.equal(await t.eval(() => __prehistoricRuntime.saveOriginalResourceAction(1)) || await t.eval(() => __prehistoricRuntime.saveOriginalResourceAction(2)), false, "the save reports it failed");
      const after = await t.eval(() => { Storage.prototype.setItem = __set; return Object.fromEntries(Object.keys(localStorage).map((k) => [k, localStorage.getItem(k)])); });
      t.expect.deepEqual(after, before, "what was saved is all there");
      // Not ours to read: the boot and the loads go on.
      await t.eval(() => { for (const k of ["t0", "t1", "t2"]) localStorage.setItem(k, "[not json"); });
      t.expect.equal(await t.eval(() => __prehistoricRuntime.loadGameplayFromStore(1)), false, "a broken save loads as none");
      await t.page.reload();
      await t.page.waitForFunction(() => !!window.__prehistoricDebugBootWithoutSplash);
      await t.page.evaluate(async () => { await window.__prehistoricDebugBootWithoutSplash(); });
    },
  },
];
