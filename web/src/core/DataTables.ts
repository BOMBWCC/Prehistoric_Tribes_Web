/**
 * Named indexes of the original's packed data tables (the `/pd0` resource; table N starts at
 * `packedBytes[packedOffsets[N]]`, written `t[N]` / `tN` in the docs). The value of each name is
 * the original's own table number. Only tables whose meaning is backed by the bytecode or by a
 * recorded test are named; see docs/feature-map.md for which code reads them. Changing gameplay
 * numbers means changing these tables' contents, not this file.
 */

// ---- Buildings -------------------------------------------------------------------------------
/** Per building kind, stored as row * 26 + kind: per-level worker / bed capacity
 *  ((level - 1) * 26 + kind), footprint width (104 + kind) and height (130 + kind), default
 *  owner slot (156 + kind), hit points (182 + kind), capacity while upgrading or repairing
 *  (494 + kind); building prices are in other rows of the same table. */
export const T_BUILDING = 138;
/** Highest level per kind at the start of a mission (rows for missions 1-4, 5, 6-7). */
export const T_BUILDING_MAX_LEVEL = 113;
/** Time-based upgrade unlocks: frame threshold / 100, the kind that gains a level, and the
 *  per-mission range [t302[q], t302[q + 1]) into the two. */
export const T_UPGRADE_UNLOCK_TIME = 299;
export const T_UPGRADE_UNLOCK_KIND = 300;
export const T_UPGRADE_UNLOCK_RANGE = 302;

// ---- Raids ----------------------------------------------------------------------------------
/** Raid interval per mission: base = (t214[q] - t215[q] * difficulty) * 100 frames; the next
 *  raid comes base / 4 + random(base * 1.5) frames later (b.as()). */
export const T_RAID_INTERVAL = 214;
export const T_RAID_INTERVAL_DIFFICULTY = 215;
/** Raid size: x = clamp(t206 + frame / t210 / 1000, 0, t208), sending x / 2 + random(x). */
export const T_RAID_SIZE_BASE = 206;
export const T_RAID_SIZE_MAX = 208;
export const T_RAID_SIZE_GROWTH = 210;
/** Enemy rally point per mission (column / row). */
export const T_RALLY_X = 233;
export const T_RALLY_Y = 234;

// ---- Missions -------------------------------------------------------------------------------
/** Per mission: bit 0 = winning by wiping out the enemy force counts, bit 1 = losing the home
 *  record loses (b.ak()). */
export const T_MISSION_RULES = 279;
/** Decoded map width / height per mission (t149[q * 2], t149[q * 2 + 1]). */
export const T_MAP_SIZE = 149;
/** Tutorial script (b.al()): steps per stage, scene command, wait kind (0 time, 1 building kind,
 *  2 job, 3 fixed 960 frames, 4 other), wait argument, delay (* 8 frames). */
export const T_TUTORIAL_STEPS = 294;
export const T_TUTORIAL_COMMAND = 295;
export const T_TUTORIAL_WAIT_KIND = 296;
export const T_TUTORIAL_WAIT_ARG = 297;
export const T_TUTORIAL_DELAY = 298;

// ---- Units ----------------------------------------------------------------------------------
/** Job class of a behaviour type (t41[UNIT_TYPE]). */
export const T_TYPE_JOB = 41;
/** Maximum hit points by age. */
export const T_MAX_HP_BY_AGE = 98;
/** Portrait roll by gender and age band. */
export const T_PORTRAIT = 189;
/** Weapon class of a held item (-1 melee weapon, -2 bare hands ...). */
export const T_ITEM_CLASS = 77;
/** Skill growth while working (#293): attribute -> dense field (t44), and per behaviour type the
 *  attribute, chance %, cap (t45..t47); the step per attribute is t64. */
export const T_SKILL_FIELD = 44;
export const T_SKILL_ATTR = 45;
export const T_SKILL_CHANCE = 46;
export const T_SKILL_CAP = 47;
export const T_SKILL_STEP = 64;
/** Skills trained at a building (#347): for kind k at level l, entries t69[k*4+l] .. t69[k*4+l+1]
 *  from base t68[k] give attribute / chance / cap / step in t65 / t66 / t67 / t63. */
export const T_BUILDING_SKILL_ATTR = 65;
export const T_BUILDING_SKILL_CHANCE = 66;
export const T_BUILDING_SKILL_CAP = 67;
export const T_BUILDING_SKILL_STEP = 63;
export const T_BUILDING_SKILL_BASE = 68;
export const T_BUILDING_SKILL_RANGE = 69;

// ---- Animals --------------------------------------------------------------------------------
/** Aggression [5, 100, 0] and damage [2, 4, 0] per animal kind. */
export const T_ANIMAL_AGGRESSION = 181;
export const T_ANIMAL_DAMAGE = 182;
