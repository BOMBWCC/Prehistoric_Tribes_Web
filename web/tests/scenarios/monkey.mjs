// Random play: seeded random taps on the map and on whatever HUD button shows, checking after every
// step that nothing impossible happened (no page error, no stat out of range, nobody off the map,
// no panel out of step with the game). Same seed, same run.

const BUTTONS = [".hud-build-button", ".hud-cmd", ".hud-cmd-item", ".hud-sheet-close", ".hud-card", ".hud-sheet-row .hud-item",
  ".hud-place", ".hud-fab", ".hud-order-tick", ".hud-member", ".hud-sheet-tick", ".hud-squad", ".story-hud", ".minimap-close"];

/** A small LCG, so the run is the same every time. */
function random(seed) {
  let s = seed >>> 0;
  return (n) => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s % n; };
}

async function broken(t) {
  return t.eval(() => {
    const g = window.__prehistoricRuntime.game;
    const problems = [];
    for (const v of T.villagers()) {
      if (v.hp > v.maxHp) problems.push(`villager ${v.id} hp ${v.hp} > ${v.maxHp}`);
      if (!v.inside && (v.x < 0 || v.y < 0 || v.x >= g.mapWidth || v.y >= g.mapHeight)) problems.push(`villager ${v.id} off the map at ${v.x},${v.y}`);
    }
    const stock = T.stock();
    for (const [name, value] of Object.entries(stock)) if (value < 0) problems.push(`${name} ${value}`);
    if (![0, 1, 2, 3, 4].includes(g.barMode)) problems.push(`barMode ${g.barMode}`);
    const shown = (s) => [...document.querySelectorAll(s)].some((el) => !el.closest("[hidden]") && el.getClientRects().length > 0);
    if (g.loopMode === 1 && shown(".hud-villager") && g.barMode !== 1) problems.push(`villager panel with barMode ${g.barMode}`);
    if (g.loopMode === 1 && shown(".hud-sheet .hud-sheet-row") && g.barMode !== 2 && g.barMode !== 4) problems.push(`building panel with barMode ${g.barMode}`);
    return problems;
  });
}

async function monkey(t, map, seed, steps) {
  const pick = random(seed);
  await t.eval((map) => { S.enter(map); S.step(3); S.stock(60); }, map);
  const camp = await t.eval(() => T.buildings().find((b) => b.kind === 3));
  for (let step = 0; step < steps; step += 1) {
    if (pick(3) === 0) {
      const visible = await t.eval((list) => list.filter((s) => [...document.querySelectorAll(s)].some((el) => !el.closest("[hidden]") && el.getClientRects().length > 0)), BUTTONS);
      if (visible.length) {
        const selector = visible[pick(visible.length)];
        await t.eval(([selector, n]) => {
          const all = [...document.querySelectorAll(selector)].filter((el) => !el.closest("[hidden]") && el.getClientRects().length > 0);
          all[n % all.length].click();
        }, [selector, pick(16)]);
      }
      await t.step(5 + pick(10), false);
    } else {
      await t.tapTile(camp.x - 8 + pick(18), camp.y - 8 + pick(18));
    }
    const problems = await broken(t);
    t.expect.deepEqual(problems, [], `step ${step}`);
  }
  // The same seed plays the same game: its outcome is the baseline (changes show up here).
  t.baseline(`monkey-${map}-${seed}`, await t.eval(() => ({
    frame: T.ui().frame,
    stock: T.stock(),
    villagers: T.villagers().map((v) => [v.id, v.age, v.hp, v.type, v.x, v.y]),
    buildings: T.buildings().map((b) => [b.id, b.kind, b.level, b.hp]),
    enemies: T.buildings(1).length,
  })));
}

export default [
  { name: "random play on PLOT OF LAND", run: (t) => monkey(t, 11, 20261026, 250) },
  { name: "random play on DESERT PASS", run: (t) => monkey(t, 8, 7, 250) },
];
