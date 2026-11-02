// Debug staging for art capture (phase 3 redraw): sets up a game state quickly in the dev build.
// Inject after the page has booted (Playwright: page.addScriptTag({ path: "tools/debug/stage.js" })),
// then use window.S. It only calls the port's own functions (the original's spawn, placement and
// allocation code) or writes the fields those functions write; it changes no game logic. A staged
// game is not one the original could reach (instant buildings, free stock, no fog), so never use
// it for oracle comparisons.
//
//   await __prehistoricDebugBootWithoutSplash(); S.enter(10);   // map q (0..6 campaign, 7..11 custom)
//   S.reveal = true; S.stock(500);
//   const a = S.animal(0, 20, 20);                              // kind 0 boar, 1 sabretooth, 2 deer
//   const b = S.building(6, 12, 12, 1);                         // a finished store, level 1
//   const n = S.buildingNear(2, 12, 12);                         // a hut wherever it fits near there
//   const v = S.villager(14, 16, { gender: 1 });                // adult; { age: 5 } for a child
//   const x = S.enemy(30, 30);                                   // one of the other tribe
//   S.food(200); S.bones(50); S.win(); S.lose();
//   S.order(v, 20, 20);                                         // select v, FIRE on that tile
//   S.step(40); S.shot(...)                                      // tick + draw, fog cleared each tick
(() => {
  const rt = window.__prehistoricRuntime;
  const g = rt.game;
  const e = rt.denseState;
  // Dense field bases (web/src/core/DenseLayout.ts).
  const UNIT = { X: 0, Y: 101, AGE: 1414, GENDER: 1515, HP: 1919, ENERGY: 2020, FOOD: 2121, TYPE: 2828, CARRY_KIND: 3535, CARRY_AMOUNT: 3636, MAX_HP: 6767 };
  const BLD = { X: 8383, Y: 8444, HP: 8505, MAX_HP: 8566, WORK: 8627, KIND: 8749, WORKERS: 8932, WORKER_HEAD: 8993, LEVEL: 9115, PLANNED_KIND: 9237 };
  const ANIMAL = { HP: 9513, KIND: 9535, ANIM: 9557, FRAME: 9579 };
  const T_BUILDING = 138;
  const table = (row, index) => rt.packedBytes[(rt.packedOffsets[row] ?? 0) + index] ?? 0;

  const S = {
    /** Clear the fog (both bit layers, f.a:[[[I) after every tick of S.step. */
    reveal: false,
    clearFog() {
      for (const layer of [rt.mainArrays.aInt[0], rt.mainArrays.aInt[1]]) for (const column of layer ?? []) column.fill(-1);
      g.AFlag = true; // f.n() redraws the whole view
    },
    /** Ticks and draws `n` frames, as the real loop does (the draw consumes the RNG too). */
    step(n = 1) {
      for (let i = 0; i < n; i += 1) {
        window.__prehistoricDebugTick();
        if (S.reveal) S.clearFog();
        window.__prehistoricDebugRender();
      }
    },
    /** Enters map q directly (debugEnterMap: f.q, the map entry, v = 1). */
    enter(q) {
      window.__prehistoricDebugEnterMap(q);
      S.step(2);
    },
    /** Sets the tribe's stock (f.a:[[S row 0: 2 wood, 3 stone) and every weapon in the store
     *  (row 0, 5..10: club, stone, spear, stone axe, bone mace, tomahawk). */
    stock(amount = 500, weapons = 9) {
      const row = rt.mainArrays.aShort[0];
      row[2] = amount;
      row[3] = amount;
      for (let i = 5; i <= 10; i += 1) row[i] = weapons;
    },
    /** The camera so that map tile (x, y) is in view, the cursor on it. */
    look(x, y) {
      g.cameraColumn = Math.max(0, Math.min(g.mapWidth - g.viewColumns, x - (g.viewColumns >> 1)));
      g.cameraRow = Math.max(0, Math.min(g.mapHeight - g.viewRows - 1, y - (g.viewRows >> 1)));
      g.cursorColumn = x - g.cameraColumn;
      g.cursorRow = y - g.cameraRow;
      g.AFlag = true;
      window.__prehistoricScreen?.centerOn?.(x, y);
    },
    /** Presses and releases an original key (FIRE, SOFT_LEFT, SOFT_RIGHT, UP ...). */
    key(name, hold = 1) {
      rt.input.press(name);
      S.step(hold);
      rt.input.release(name);
      S.step(6); // past the original's double-press window (f.n:I)
    },
    /** An animal of `kind` near (x, y), the way b.h() spawns one: the free-cell search
     *  a(1, 10, x, y), then f.b(kind, cell, 0). Returns its slot (cell value 101 + slot). */
    animal(kind, x, y) {
      try { rt.checkSpiralPlacementGate(1, 10, x, y, 0); } catch { /* b.h()'s own catch */ }
      return rt.allocateSubsystemRecord(rt.gridC, kind, e[3131], e[3232], 0, {
        randomRemainder: (mask, divisor) => rt.randomRemainder(mask, divisor),
        counters: g.subsystemT,
        q: g.mission,
      });
    },
    /** One of our villagers near (x, y) (f.a(IIIII), as b.a(IIIBB) calls it: age 20 by default;
     *  under 12 makes a child). `gender` 0 / 1 overrides the drawn one. Returns the id. */
    villager(x, y, { age = 20, gender } = {}) {
      if ((rt.gridC[y]?.[x] ?? 0) !== 0) {
        try { rt.checkSpiralPlacementGate(1, 127, x, y, 0); } catch { /* as b.a(IIIBB) */ }
        x = e[3131]; y = e[3232];
      }
      const id = rt.allocateRecord(rt.gridC, 0, x, y, age, 0, rt.recordOptions());
      if (id > 0 && gender !== undefined) e[UNIT.GENDER + id] = gender;
      return id;
    },
    /** An enemy (team 1, records 51..100) near (x, y): the same allocation as a villager's, for
     *  the other tribe. Returns the id. */
    enemy(x, y, { age = 20, gender } = {}) {
      if ((rt.gridC[y]?.[x] ?? 0) !== 0) {
        try { rt.checkSpiralPlacementGate(1, 127, x, y, 0); } catch { /* as b.a(IIIBB) */ }
        x = e[3131]; y = e[3232];
      }
      const id = rt.allocateRecord(rt.gridC, 1, x, y, age, 0, rt.recordOptions());
      if (id > 0 && gender !== undefined) e[UNIT.GENDER + id] = gender;
      return id;
    },
    /** Food (f.a:[[S row 0, 1) and bones (row 0, 4) in the store. */
    food(amount = 200) { rt.mainArrays.aShort[0][1] = amount; },
    bones(amount = 50) { rt.mainArrays.aShort[0][4] = amount; },
    /** Ends the game as b.ak() does: the enemy force (row 1, 14) or our people (row 0, 11) at 0 --
     *  the countdown and the outcome screen follow. */
    win() { rt.mainArrays.aShort[1][14] = 0; },
    lose() { rt.mainArrays.aShort[0][11] = 0; },
    /** Makes villager `id` the chief (f.a:[[S row 0, 17 -- the hat). */
    chief(id) { rt.mainArrays.aShort[0][17] = id; },
    /** The tile villager `id` stands on (null inside a building). */
    where(id) {
      for (let y = 0; y < g.mapHeight; y += 1) { const x = rt.gridC[y]?.indexOf(id) ?? -1; if (x >= 0) return [x, y]; }
      return null;
    },
    /** Selects villager `id` and sends them at map tile (x, y), as the player does: FIRE on them,
     *  FIRE on the target (a tree, rock, bush, animal, enemy, building site, building ...). */
    order(id, x, y) {
      for (let i = 0; i < 4 && g.barMode !== 0; i += 1) S.key("SOFT_RIGHT");
      const at = S.where(id);
      if (!at) return false;
      S.look(at[0], at[1]); S.step(2); S.key("FIRE");
      if (g.selectedId !== id) return false;
      S.look(x, y); S.step(2); S.key("FIRE");
      return true;
    },
    /** A building site for `kind` (0..11) at (x, y), as the player's placing makes it: x() with
     *  f.s = t138[416 + kind] and the build card's kind. Returns its record id (< 0: not placed). */
    site(kind, x, y) {
      const options = { ...rt.buildingPlacementOptions(), teamZeroSlotValue: kind };
      return rt.placeEntity(rt.gridC, 0, table(T_BUILDING, 416 + kind), x, y, 1, false, -1, options);
    },
    /** Finishes site `id`: its progress (8505) at the planned kind's target with no builders, so
     *  the next b.g() turns it into the building (the original's completion). */
    complete(id) {
      e[BLD.HP + id] = table(T_BUILDING, 182 + e[BLD.PLANNED_KIND + id]);
      e[BLD.WORKERS + id] = 0;
      e[BLD.WORKER_HEAD + id] = 0;
      S.step(3);
      return e[BLD.KIND + id];
    },
    /** Building record `id` at `level` with the hit points that level has (the upgrade's own
     *  clamp, af() code 27: t138[(6 + level) * 26 + kind]). */
    level(id, level) {
      e[BLD.LEVEL + id] = level;
      e[BLD.MAX_HP + id] = table(T_BUILDING, (6 + level) * 26 + e[BLD.KIND + id]);
      e[BLD.HP + id] = e[BLD.MAX_HP + id];
      g.AFlag = true;
    },
    /** A finished building of `kind` at (x, y): site + complete (+ level). Returns its id. */
    building(kind, x, y, level = 1) {
      const id = S.site(kind, x, y);
      if (id <= 0) return id;
      S.complete(id);
      if (level !== 1) S.level(id, level);
      return id;
    },
    /** A site for `kind` at the nearest spot to (x, y) where the original's placement takes it,
     *  trying outwards ring by ring. Returns its record id (< 0: nowhere within `radius`). */
    siteNear(kind, x, y, radius = 20) {
      for (let r = 1; r <= radius; r += 1) {
        for (let dy = -r; dy <= r; dy += 1) for (let dx = -r; dx <= r; dx += 1) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          const id = S.site(kind, x + dx, y + dy);
          if (id > 0) return id;
        }
      }
      return -1;
    },
    /** A finished building of `kind` near (x, y): siteNear + complete (+ level). */
    buildingNear(kind, x, y, level = 1) {
      const id = S.siteNear(kind, x, y);
      if (id <= 0) return id;
      S.complete(id);
      if (level !== 1) S.level(id, level);
      return id;
    },
    /** Field shortcuts for staging a villager's look: hunger / tiredness (0..99, low sends them
     *  to eat / rest), hit points, what they carry. */
    set(id, fields) {
      for (const [name, value] of Object.entries(fields)) e[UNIT[name] + id] = value;
    },
    /** Gives villager `id` weapon `code` (0 club, 1 stone, 2 spear, 3 stone axe, 4 bone mace,
     *  5 tomahawk) from store record `store`, as the player does: select them, FIRE on the store
     *  (its bar opens with them as k), that weapon's item, FIRE (ag(): type 44 + code, order 3).
     *  They walk to the store and take it. S.stock() fills the store first. */
    giveWeapon(id, code, store) {
      if (!S.order(id, e[BLD.X + store], e[BLD.Y + store])) return false;
      const slot = Array.from(rt.mainArrays.r.slice(0, g.frameLayoutAR)).indexOf(code);
      if (g.barMode !== 2 || slot < 0) return false;
      for (let i = 0; i < 12 && g.menuCursor !== slot; i += 1) S.key(g.menuCursor < slot ? "RIGHT" : "LEFT");
      S.key("FIRE");
      return true;
    },
    UNIT, BLD, ANIMAL,
  };
  window.S = S;
  return "stage ready";
})();
