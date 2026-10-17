// Replays every recorded oracle case in headless Chrome and compares it with the original:
// the per-frame state (web-oracle.js, O.compare) and the screenshots KEmulator took (pixdiff.js).
//
//   npm run oracle                 all cases
//   npm run oracle -- play26 ch    only these cases
//   npm run oracle -- --jobs 2     cases run in parallel (default 4)
//   npm run oracle -- --no-shots   state only
//   npm run oracle -- rally --ignore 'Lb;\.(u|v):I'   skip fields matching this regex in the state compare
//   npm run oracle -- --wide-every 1   draw the larger view (render/WideView.ts) after every frame
//                                      instead of every 25th (the full run takes about two hours)
//
// The dumps, keys and screenshots live in public/__oracle (not committed: they come from the
// original JAR via tools/oracle/run.sh); missing cases are skipped. Screenshot diffs with more than
// 300 differing pixels are written to public/__oracle/_out/<case>-<frame>.png.
import { createServer } from "vite";
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const webDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const oracleDir = path.join(webDir, "public/__oracle");
const outDir = path.join(oracleDir, "_out");

// [name, dump, keys, screenshot dir] -- paths relative to public/__oracle. A null dump is a
// screenshots-only case; `frames` limits the screenshots to those frames.
const CASES = [
  { name: "play26", dump: "play26.dump", keys: "play26.keys", shots: "shots26" },
  { name: "dead", dump: null, keys: "play26.keys", shots: "dead" },
  { name: "ch", dump: "ch/ch.dump", keys: "ch/campaignhard.keys", shots: "ch" },
  { name: "custom1", dump: "custom1/custom1.dump", keys: "custom1/custom1.keys", shots: "custom1" },
  { name: "custom2", dump: "custom2/custom2.dump", keys: "custom2/custom2.keys", shots: "custom2" },
  { name: "custom3", dump: "custom3/custom3.dump", keys: "custom3/custom3.keys", shots: "custom3" },
  { name: "maps3", dump: "maps3/maps3.dump", keys: "maps3/maps3.keys", shots: "maps3" },
  { name: "slaughter", dump: "slaughter/slaughter.dump", keys: "slaughter/slaughter.keys", shots: "slaughter" },
  { name: "hard", dump: "hard/hard.dump", keys: "hard/hard.keys", shots: "hard" },
  { name: "chiefstore", dump: "cs/cs2.dump", keys: "cs/chiefstore2.keys", shots: "cs", frames: [1700, 2450] },
  { name: "chief2", dump: "chief/chief2.dump", keys: "chief/chief2.keys", shots: null },
  { name: "hutupg", dump: "hu/hu.dump", keys: "hu/hutupg.keys", shots: "hu" },
  { name: "badge", dump: "bd/bd2.dump", keys: "bd/badge2.keys", shots: "bd" },
  { name: "demolish", dump: "dm/dm.dump", keys: "dm/demolish.keys", shots: "dm" },
  { name: "demolish-dust", dump: null, keys: "dm/demolish.keys", shots: "dm/f" },
  { name: "repair", dump: "rp/rp.dump", keys: "rp/repair.keys", shots: "rp" },
  { name: "twobuild", dump: "tb/tb.dump", keys: "tb/twobuild.keys", shots: "tb" },
  { name: "placecur", dump: "pc/pc.dump", keys: "pc/placecur.keys", shots: "pc" },
  { name: "hover", dump: "hv/hv.dump", keys: "hv/hover.keys", shots: "hv" },
  { name: "panels", dump: "pn/pn.dump", keys: "pn/panels.keys", shots: "pn" },
  { name: "digits", dump: "dg/dg.dump", keys: "dg/digits.keys", shots: "dg" },
  { name: "berry", dump: "be/be.dump", keys: "be/berry.keys", shots: "be" },
  { name: "rally", dump: "ra/ra.dump", keys: "ra/rally.keys", shots: "ra" },
  { name: "scenepl", dump: "sp/sp.dump", keys: "sp/scenepl.keys", shots: "sp" },
  { name: "flee", dump: "fl/fl.dump", keys: "fl/flee.keys", shots: "fl" },
  { name: "moveidle", dump: "mi/mi.dump", keys: "mi/moveidle.keys", shots: "mi" },
];

const args = process.argv.slice(2);
const jobsAt = args.indexOf("--jobs");
const jobs = jobsAt >= 0 ? Number(args[jobsAt + 1]) : 4;
const withShots = !args.includes("--no-shots");
const ignoreAt = args.indexOf("--ignore");
const ignore = ignoreAt >= 0 ? args[ignoreAt + 1] : null;
// The larger view's draw must leave the game state untouched; a slip would show up in every later
// frame, so drawing it every 25th frame still catches one and keeps the run short (headless Chrome
// takes ~25 ms per draw, more than ten times a game frame).
const wideAt = args.indexOf("--wide-every");
const wideEvery = wideAt >= 0 ? Number(args[wideAt + 1]) : 25;
const only = args.filter((a, i) => !a.startsWith("--") && !["--jobs", "--ignore", "--wide-every"].includes(args[i - 1]));
const exists = (rel) => rel && fs.existsSync(path.join(oracleDir, rel));
const selected = CASES.filter((c) => (only.length === 0 || only.includes(c.name)) && exists(c.keys));
const unknown = only.filter((n) => !CASES.some((c) => c.name === n));
if (unknown.length) console.log(`unknown case(s): ${unknown.join(", ")}`);

function shotFrames(c) {
  if (!withShots || !c.shots || !exists(c.shots)) return [];
  const all = fs.readdirSync(path.join(oracleDir, c.shots))
    .map((f) => /^shot-(\d+)\.png$/.exec(f)?.[1]).filter(Boolean).map(Number);
  return (c.frames ?? all).filter((f) => all.includes(f)).sort((a, b) => a - b);
}

async function bootPage(browser, base, name) {
  // The smallest page that holds the 240x320 frame and the button bar: the larger view draws the
  // fewest tiles.
  const context = await browser.newContext({ viewport: { width: 240, height: 372 } });
  const page = await context.newPage();
  await page.addInitScript((every) => { window.__prehistoricWideEvery = every; }, wideEvery);
  // pixdiff.js posts large diffs to a local receiver; keep them under _out instead.
  await page.route("http://127.0.0.1:8765/**", async (route) => {
    const body = route.request().postData() ?? "";
    const m = /^data:image\/png;base64,(.*)$/.exec(body);
    if (m) {
      fs.mkdirSync(outDir, { recursive: true });
      const file = path.basename(new URL(route.request().url()).pathname).replace(/^d26-/, `${name}-`);
      fs.writeFileSync(path.join(outDir, file), Buffer.from(m[1], "base64"));
    }
    await route.fulfill({ status: 200, body: "ok" });
  });
  await page.goto(base);
  await page.waitForFunction(() => typeof window.__prehistoricDebugBootWithoutSplash === "function");
  await page.evaluate(() => localStorage.clear());
  return { context, page };
}

async function runState(browser, base, c) {
  const { context, page } = await bootPage(browser, base, c.name);
  try {
    await page.evaluate(() => window.__prehistoricDebugBootWithoutSplash());
    await page.addScriptTag({ url: "/__oracle/web-oracle.js" });
    return await page.evaluate(([d, k, ig]) => window.O.compare(d, k, 1e9, ig), [`/__oracle/${c.dump}`, `/__oracle/${c.keys}`, ignore]);
  } finally {
    await context.close();
  }
}

async function runShots(browser, base, c, frames) {
  const { context, page } = await bootPage(browser, base, c.name);
  try {
    await page.addScriptTag({ url: "/__oracle/pixdiff.js" });
    await page.evaluate(async () => { await window.__bootDebug(); window.__shotRes = []; window.__shotIdx = 0; });
    const keys = `/__oracle/${c.keys}`;
    const dir = `/__oracle/${c.shots}`;
    for (;;) {
      const r = await page.evaluate(async ([k, f, d]) => {
        const text = window.__keysText ?? (window.__keysText = await (await fetch(k)).text());
        return window.__shotRun(text, f, d, 30000);
      }, [keys, frames, dir]);
      if (r.idx >= r.of) break;
    }
    return await page.evaluate(() => window.__shotRes);
  } finally {
    await context.close();
  }
}

async function runCase(browser, base, c) {
  const started = Date.now();
  const lines = [];
  let ok = true;
  if (c.dump && exists(c.dump)) {
    const r = await runState(browser, base, c);
    if (r.frame === null) lines.push(`state ${r.compared} frames identical`);
    else { ok = false; lines.push(`state DIFFERS at frame ${r.frame}: ${JSON.stringify(r.diffs).slice(0, 400)}`); }
  }
  const frames = shotFrames(c);
  if (frames.length) {
    const res = await runShots(browser, base, c, frames);
    const bad = res.filter((s) => s.n > 0);
    if (bad.length === 0) lines.push(`${res.length} screenshots 0 px`);
    else { ok = false; lines.push(`screenshots differ: ${bad.map((s) => `${s.f}:${s.n}px`).join(" ")}`); }
  }
  const secs = Math.round((Date.now() - started) / 1000);
  console.log(`${ok ? "PASS" : "FAIL"} ${c.name} (${secs}s) -- ${lines.join("; ") || "nothing to compare"}`);
  return ok;
}

// No file watching or hot reload: editing the source during a run must not reload the pages.
const server = await createServer({ root: webDir, logLevel: "error", server: { port: 0, hmr: false, watch: null } });
await server.listen();
const base = server.resolvedUrls.local[0];
const browser = await chromium.launch({ channel: "chrome", headless: true }).catch(() => chromium.launch({ headless: true }));
let failed = 0;
try {
  const queue = [...selected];
  await Promise.all(Array.from({ length: Math.max(1, jobs) }, async () => {
    for (let c = queue.shift(); c; c = queue.shift()) {
      try {
        if (!(await runCase(browser, base, c))) failed += 1;
      } catch (err) {
        failed += 1;
        console.log(`FAIL ${c.name} -- ${String(err).split("\n")[0]}`);
      }
    }
  }));
} finally {
  await browser.close();
  await server.close();
}
console.log(`${selected.length - failed}/${selected.length} cases passed`);
process.exit(failed ? 1 : 0);
