// The game's state by name, for the scenario tests (docs/testing.md). Injected into the page after
// the debug boot, next to tools/debug/stage.js (S, which sets things up); this only reads.
//
//   T.stock()          { people, room, food, wood, stone, bones }   -- the top bar
//   T.villager(id)     { id, x, y, inside, age, gender, hp, maxHp, food, energy, mood, type, held,
//                        carryKind, carry, targetX, targetY, skills }   (null when dead)
//   T.villagers()      our living villagers (1..50)
//   T.building(id)     { id, x, y, kind, site, plannedKind, hp, maxHp, level, work, workers }
//   T.buildings(team)  living buildings and sites of team 0 (1..30) or 1 (31..60)
//   T.animals()        living animals { slot, kind, x, y, hp }
//   T.resource(slot)   { x, y, kind, amount }
//   T.ui()             { screen, onMap, barMode, selected, group, chief, mission, frame, scene }
(() => {
  const rt = window.__prehistoricRuntime;
  const g = rt.game;
  const e = rt.denseState;
  const U = { X: 0, Y: 101, MOOD: 505, AGE: 1414, GENDER: 1515, RANGED: 1616, MELEE: 1717, HP: 1919, FOOD: 2020, ENERGY: 2121,
    TYPE: 2828, TARGET_X: 3131, TARGET_Y: 3232, CARRY_KIND: 3535, CARRY: 3636, SELECTION: 909, HELD: 6565, MAX_HP: 6767,
    GATHER: 6969, SORCERY: 7373, BUILD: 7474, SCOUT: 7575 };
  const B = { X: 8383, Y: 8444, HP: 8505, MAX_HP: 8566, WORK: 8627, KIND: 8749, WORKERS: 8932, LEVEL: 9115, PLANNED: 9237 };
  const A = { X: 9359, Y: 9381, HP: 9513, KIND: 9535 };
  const R = { X: 9733, Y: 9783, KIND: 9833, AMOUNT: 9883 };
  const row = () => rt.mainArrays.aShort[0];
  const tile = (id) => {
    for (let y = 0; y < g.mapHeight; y += 1) { const x = rt.gridC[y]?.indexOf(id) ?? -1; if (x >= 0) return [x, y]; }
    return null;
  };

  const T = {
    stock() {
      const r = row();
      return { people: r[11], room: r[16], food: r[1], wood: r[2], stone: r[3], bones: r[4] };
    },
    villager(id) {
      if ((e[U.HP + id] ?? 0) <= 0) return null;
      const at = tile(id);
      return {
        id, x: e[U.X + id], y: e[U.Y + id], inside: at === null, age: e[U.AGE + id], gender: e[U.GENDER + id],
        hp: e[U.HP + id], maxHp: e[U.MAX_HP + id], food: e[U.FOOD + id], energy: e[U.ENERGY + id], mood: e[U.MOOD + id],
        type: e[U.TYPE + id], held: e[U.HELD + id], carryKind: e[U.CARRY_KIND + id], carry: e[U.CARRY + id],
        targetX: e[U.TARGET_X + id], targetY: e[U.TARGET_Y + id],
        skills: { ranged: e[U.RANGED + id], melee: e[U.MELEE + id], gather: e[U.GATHER + id], sorcery: e[U.SORCERY + id], build: e[U.BUILD + id], scout: e[U.SCOUT + id] },
      };
    },
    villagers() {
      const list = [];
      for (let id = 1; id <= 50; id += 1) { const v = T.villager(id); if (v) list.push(v); }
      return list;
    },
    building(id) {
      if ((e[B.HP + id] ?? 0) <= 0 && (e[B.KIND + id] ?? 0) === 0) return null;
      const kind = e[B.KIND + id];
      return { id, x: e[B.X + id], y: e[B.Y + id], kind, site: kind >= 12, plannedKind: e[B.PLANNED + id], hp: e[B.HP + id],
        maxHp: e[B.MAX_HP + id], level: e[B.LEVEL + id], work: e[B.WORK + id], workers: e[B.WORKERS + id] };
    },
    buildings(team = 0) {
      const list = [];
      for (let id = team === 0 ? 1 : 31; id <= (team === 0 ? 30 : 60); id += 1) { const b = T.building(id); if (b && b.hp > 0) list.push(b); }
      return list;
    },
    animals() {
      const list = [];
      for (let slot = 0; slot < 22; slot += 1) if ((e[A.HP + slot] ?? 0) > 0) list.push({ slot, kind: e[A.KIND + slot], x: e[A.X + slot], y: e[A.Y + slot], hp: e[A.HP + slot] });
      return list;
    },
    resource(slot) {
      return { x: e[R.X + slot], y: e[R.Y + slot], kind: e[R.KIND + slot], amount: e[R.AMOUNT + slot] };
    },
    /** The nearest cell to (x, y) whose value is one of `values` (e.g. -124 trees, -125 rock,
     *  -63 / -64 berries), within `radius`; null when none. */
    nearest(x, y, values, radius = 30) {
      for (let r = 1; r <= radius; r += 1) {
        for (let dy = -r; dy <= r; dy += 1) for (let dx = -r; dx <= r; dx += 1) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          if (values.includes(rt.gridC[y + dy]?.[x + dx] ?? 0)) return [x + dx, y + dy];
        }
      }
      return null;
    },
    /** A free square of `size` tiles near (x, y) (nothing on any of its cells), for a building. */
    freeSpot(x, y, size, radius = 25) {
      const free = (fx, fy) => {
        for (let dy = -1; dy <= size; dy += 1) for (let dx = -1; dx <= size; dx += 1) {
          if (fx + dx < 0 || fy + dy < 0 || fx + dx >= g.mapWidth || fy + dy >= g.mapHeight - 2) return false;
          if ((rt.gridC[fy + dy]?.[fx + dx] ?? 0) !== 0) return false;
        }
        return true;
      };
      for (let r = 2; r <= radius; r += 1) for (let dy = -r; dy <= r; dy += 1) for (let dx = -r; dx <= r; dx += 1) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) === r && free(x + dx, y + dy)) return [x + dx, y + dy];
      }
      return null;
    },
    /** The map cell value at (x, y): > 0 a unit, < 0 a building (-id) or resource point. */
    cell(x, y) { return rt.gridC[y]?.[x] ?? 0; },
    /** The frame from which hunger and tiredness start to fall on this map (a per-mission table). */
    needsStart() { return rt.saveOffsets[rt.sectionOffsets[4] + g.mission] ?? 0; },
    ui() {
      return { screen: g.screen, onMap: g.loopMode === 1, barMode: g.barMode, selected: g.selectedId, group: g.selectionGroup,
        chief: row()[17], mission: g.mission, frame: g.missionFrame, choosingChief: g.choosingChief, text: rt.shownTextRecord };
    },
    tile,
  };
  window.T = T;
  return "inspect ready";
})();
