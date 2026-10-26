// Scenario tests for the game as it plays now (docs/testing.md): each test sets up a game in headless
// Chrome (the debug boot, tools/debug/stage.js to stage it, tests/inspect.js to read it), plays it --
// taps on the screen, orders, frames -- and checks the outcome against the game's rules.
//
//   npm run scenarios                 all tests
//   npm run scenarios -- build hut    only tests whose name contains one of these words
//   npm run scenarios -- --jobs 1     tests run side by side (default 2: the user's machine stays usable)
//   npm run scenarios -- --bless      accept the current results as the new baselines (tests/baseline/)
//
// A test file in tests/scenarios/ exports an array of { name, boot?: "debug" | "real", run(t) }.
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";
import { createRequire } from "node:module";

const webDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const root = path.resolve(webDir, "..");
const require = createRequire(path.join(webDir, "package.json"));
const { createServer } = await import(require.resolve("vite"));
const { chromium } = require("playwright");

const args = process.argv.slice(2);
const jobsAt = args.indexOf("--jobs");
const jobs = jobsAt >= 0 ? Number(args[jobsAt + 1]) : 2;
const filters = args.filter((a, i) => !a.startsWith("--") && (jobsAt < 0 || i !== jobsAt + 1));
const bless = args.includes("--bless");
const TEST_MS = 180_000;

const tests = [];
for (const file of fs.readdirSync(path.join(webDir, "tests/scenarios")).filter((f) => f.endsWith(".mjs")).sort()) {
  const mod = await import(path.join(webDir, "tests/scenarios", file));
  for (const test of mod.default) tests.push({ ...test, file });
}
const chosen = tests.filter((test) => filters.length === 0 || filters.some((f) => test.name.includes(f) || test.file.includes(f)));

const server = await createServer({ root: webDir, logLevel: "error", server: { port: 0, hmr: false, watch: null } });
await server.listen();
const url = server.resolvedUrls.local[0];
const browser = await chromium.launch({ channel: "chrome", headless: true });

/** The helpers a test's run(t) gets. */
async function makeContext(test) {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.addInitScript(() => { try { localStorage.clear(); } catch { /* none */ } });
  await page.goto(url);
  if (test.boot === "real") {
    await page.waitForFunction(() => document.querySelector(".start-menu")?.dataset.page === "main", null, { timeout: 60_000 });
  } else {
    await page.waitForFunction(() => !!window.__prehistoricDebugBootWithoutSplash);
    await page.evaluate(async () => { window.__prehistoricWideEvery = 1; await window.__prehistoricDebugBootWithoutSplash(); });
    await page.addScriptTag({ path: path.join(root, "tools/debug/stage.js") });
    await page.addScriptTag({ path: path.join(webDir, "tests/inspect.js") });
  }
  const t = {
    page,
    errors,
    expect: assert,
    /** Runs `fn` in the page (S, T and the runtime are there) with `arg`. */
    eval: (fn, arg) => page.evaluate(fn, arg),
    /** Ticks and draws `n` frames, as the real loop does. `wide` false skips the HD map view (faster). */
    step: (n = 1, wide = true) => page.evaluate(([n, wide]) => { window.__prehistoricWideEvery = wide ? 1 : 1000; S.step(n); }, [n, wide]),
    /** Steps until `predicate` (a page function of `arg`) is true, `chunk` frames at a time; returns
     *  the frames it took, fails after `max`. */
    async until(predicate, { max = 3000, chunk = 25, arg, wide = false, what = "condition" } = {}) {
      for (let frames = 0; frames <= max; frames += chunk) {
        if (await page.evaluate(predicate, arg)) return frames;
        await t.step(chunk, wide);
      }
      throw new Error(`${what} not reached in ${max} frames`);
    },
    /** A tap on map tile (x, y) as a finger does it (the view first moved there). */
    async tapTile(x, y) {
      await page.evaluate(([x, y]) => { S.look(x, y); for (let i = 0; i < 20; i += 1) S.step(1); window.__prehistoricRuntime.game.cameraBFlag = false; }, [x, y]);
      await page.evaluate(([x, y]) => {
        const screen = window.__prehistoricScreen;
        const box = screen.element.getBoundingClientRect();
        const p = screen.tileToCss(x, y);
        const k = screen.tileToCss(1, 1).x - screen.tileToCss(0, 0).x;
        const fire = (type) => screen.element.dispatchEvent(new PointerEvent(type, { clientX: box.left + p.x + k / 2, clientY: box.top + p.y + k / 3, pointerId: 7, button: 0, bubbles: true, isPrimary: true }));
        fire("pointerdown");
        fire("pointerup");
      }, [x, y]);
      await t.step(10);
    },
    /** A click on the first visible element matching `selector`, then `frames` frames. */
    async tap(selector, frames = 10) {
      const found = await page.evaluate((selector) => {
        const element = [...document.querySelectorAll(selector)].find((el) => !el.closest("[hidden]") && el.getClientRects().length > 0);
        if (!element) return false;
        element.click();
        return true;
      }, selector);
      if (!found) throw new Error(`nothing visible matches ${selector}`);
      await t.step(frames);
    },
    /** Compares `data` with the saved baseline `name` (tests/baseline/<name>.json); writes it when
     *  there is none yet or with --bless (a deliberate change). */
    baseline(name, data) {
      const file = path.join(webDir, "tests/baseline", `${name}.json`);
      if (bless || !fs.existsSync(file)) {
        fs.mkdirSync(path.dirname(file), { recursive: true });
        fs.writeFileSync(file, `${JSON.stringify(data, null, 2)}\n`);
        return;
      }
      assert.deepEqual(data, JSON.parse(fs.readFileSync(file, "utf8")), `differs from tests/baseline/${name}.json (run with --bless if the change is meant)`);
    },
    visible: (selector) => page.evaluate((selector) => [...document.querySelectorAll(selector)].some((el) => !el.closest("[hidden]") && el.getClientRects().length > 0), selector),
  };
  return { t, context };
}

async function runOne(test) {
  const started = Date.now();
  const { t, context } = await makeContext(test);
  let failure = null;
  try {
    await Promise.race([test.run(t), new Promise((_, reject) => setTimeout(() => reject(new Error(`timed out after ${TEST_MS / 1000} s`)), TEST_MS))]);
    if (t.errors.length) failure = `page error: ${t.errors[0]}`;
  } catch (error) {
    failure = error instanceof Error ? error.message : String(error);
  } finally {
    await context.close();
  }
  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  console.log(`${failure ? "FAIL" : "PASS"} ${test.file.replace(/\.mjs$/, "")} / ${test.name} (${seconds}s)${failure ? ` -- ${failure}` : ""}`);
  return !failure;
}

const queue = [...chosen];
let passed = 0;
await Promise.all(Array.from({ length: Math.max(1, jobs) }, async () => {
  while (queue.length) if (await runOne(queue.shift())) passed += 1;
}));
console.log(`${passed}/${chosen.length} scenarios passed`);
await browser.close();
await server.close();
process.exit(passed === chosen.length ? 0 : 1);
