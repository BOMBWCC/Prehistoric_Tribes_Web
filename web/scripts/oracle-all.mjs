// Replays every recorded oracle case in headless Chrome and compares the per-frame game state with
// the original's (web-oracle.js, O.compare). A reference only since 2026-10-26: deliberate changes
// make cases differ. The original's screenshots are no longer compared (user, 2026-10-30): the game
// does not draw the original's frame any more.
//
//   npm run oracle                 all cases
//   npm run oracle -- play26 ch    only these cases
//   npm run oracle -- --jobs 2     cases run in parallel (default 4)
//   npm run oracle -- rally --ignore 'Lb;\.(u|v):I'   skip fields matching this regex
//
// The dumps and keys live in public/__oracle (not committed: they come from the original JAR via
// tools/oracle/run.sh); missing cases are skipped.
import { createServer } from "vite";
import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const webDir = path.resolve(path.dirname(new URL(import.meta.url).pathname), "..");
const oracleDir = path.join(webDir, "public/__oracle");

// [name, dump, keys] -- paths relative to public/__oracle.
const CASES = [
  { name: "play26", dump: "play26.dump", keys: "play26.keys" },
  { name: "ch", dump: "ch/ch.dump", keys: "ch/campaignhard.keys" },
  { name: "custom1", dump: "custom1/custom1.dump", keys: "custom1/custom1.keys" },
  { name: "custom2", dump: "custom2/custom2.dump", keys: "custom2/custom2.keys" },
  { name: "custom3", dump: "custom3/custom3.dump", keys: "custom3/custom3.keys" },
  { name: "maps3", dump: "maps3/maps3.dump", keys: "maps3/maps3.keys" },
  { name: "slaughter", dump: "slaughter/slaughter.dump", keys: "slaughter/slaughter.keys" },
  { name: "hard", dump: "hard/hard.dump", keys: "hard/hard.keys" },
  { name: "chiefstore", dump: "cs/cs2.dump", keys: "cs/chiefstore2.keys" },
  { name: "chief2", dump: "chief/chief2.dump", keys: "chief/chief2.keys" },
  { name: "hutupg", dump: "hu/hu.dump", keys: "hu/hutupg.keys" },
  { name: "badge", dump: "bd/bd2.dump", keys: "bd/badge2.keys" },
  { name: "demolish", dump: "dm/dm.dump", keys: "dm/demolish.keys" },
  { name: "repair", dump: "rp/rp.dump", keys: "rp/repair.keys" },
  { name: "twobuild", dump: "tb/tb.dump", keys: "tb/twobuild.keys" },
  { name: "placecur", dump: "pc/pc.dump", keys: "pc/placecur.keys" },
  { name: "hover", dump: "hv/hv.dump", keys: "hv/hover.keys" },
  { name: "panels", dump: "pn/pn.dump", keys: "pn/panels.keys" },
  { name: "digits", dump: "dg/dg.dump", keys: "dg/digits.keys" },
  { name: "berry", dump: "be/be.dump", keys: "be/berry.keys" },
  { name: "rally", dump: "ra/ra.dump", keys: "ra/rally.keys" },
  { name: "scenepl", dump: "sp/sp.dump", keys: "sp/scenepl.keys" },
  { name: "flee", dump: "fl/fl.dump", keys: "fl/flee.keys" },
  { name: "moveidle", dump: "mi/mi.dump", keys: "mi/moveidle.keys" },
];

const args = process.argv.slice(2);
const jobsAt = args.indexOf("--jobs");
const jobs = jobsAt >= 0 ? Number(args[jobsAt + 1]) : 4;
const ignoreAt = args.indexOf("--ignore");
const ignore = ignoreAt >= 0 ? args[ignoreAt + 1] : null;
const only = args.filter((a, i) => !a.startsWith("--") && !["--jobs", "--ignore"].includes(args[i - 1]));
const exists = (rel) => rel && fs.existsSync(path.join(oracleDir, rel));
const selected = CASES.filter((c) => (only.length === 0 || only.includes(c.name)) && exists(c.keys));
const unknown = only.filter((n) => !CASES.some((c) => c.name === n));
if (unknown.length) console.log(`unknown case(s): ${unknown.join(", ")}`);

async function bootPage(browser, base) {
  const context = await browser.newContext({ viewport: { width: 240, height: 372 } });
  const page = await context.newPage();
  await page.goto(base);
  await page.waitForFunction(() => typeof window.__prehistoricDebugBootWithoutSplash === "function");
  await page.evaluate(() => localStorage.clear());
  return { context, page };
}

async function runState(browser, base, c) {
  const { context, page } = await bootPage(browser, base);
  try {
    await page.evaluate(() => window.__prehistoricDebugBootWithoutSplash());
    await page.addScriptTag({ url: "/__oracle/web-oracle.js" });
    return await page.evaluate(([d, k, ig]) => window.O.compare(d, k, 1e9, ig), [`/__oracle/${c.dump}`, `/__oracle/${c.keys}`, ignore]);
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
  const secs = Math.round((Date.now() - started) / 1000);
  console.log(`${ok ? "PASS" : "FAIL"} ${c.name} (${secs}s) -- ${lines.join("; ") || "nothing to compare"}`);
  return ok;
}

// No file watching or hot reload: editing the source during a run must not reload the pages.
const server = await createServer({ root: webDir, logLevel: "error", server: { port: 0, strictPort: false, host: "localhost", hmr: false, watch: null } }); // any free port, not the dev server's fixed 5173
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
