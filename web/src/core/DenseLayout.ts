/**
 * Named offsets into f.e:[B (#286), the original's dense state bank (`denseState`, often `state`,
 * `dense` or `e` in the ports). A field of record `id` lives at `e[BASE + id]`; the value of each
 * name is the original's own number, so `e[UNIT_HP + id]` is `e[1919 + id]` in the bytecode.
 *
 * Only fields whose meaning is backed by the bytecode or by a recorded test are named; the rest
 * stay as plain numbers in the code. Sources: docs/unknowns.md (2026-09-15: the villager panel
 * f.y() / t147 and the skill table t44), the checklist rows cited below, and the port files named.
 */

// ---- Units: records 1..100 (1..50 team 0, 51..100 team 1), 101 bytes per field --------------
/** Tile column. `e[UNIT_Y + id]` is the row. */
export const UNIT_X = 0;
export const UNIT_Y = 101;
/** Pixel offset of the sprite inside its tile while walking (x / y). */
export const UNIT_OFFSET_X = 202;
export const UNIT_OFFSET_Y = 303;
/** Progress of the current work cycle; one unit of output each time it reaches t49[type]. */
export const UNIT_WORK_PROGRESS = 404;
/** Happiness (panel smiley); courtship needs >= 75. */
export const UNIT_HAPPINESS = 505;
/** Facing 0..7 (movement deltas come from t1[8 + direction]). */
export const UNIT_DIRECTION = 606;
/** Selection group: 4 = picked by the box select (f.aF()). */
export const UNIT_SELECTION = 909;
/** Ticks per step; the speed skill lowers it. */
export const UNIT_SPEED = 1010;
/** Duration counter of the current idle/animation state (e.g. type 83). */
export const UNIT_TIMER = 1313;
/** Age in years (adults are >= 12). */
export const UNIT_AGE = 1414;
/** 0 male, 1 female. */
export const UNIT_GENDER = 1515;
/** Ranged (spear) and melee (club) combat skills. */
export const UNIT_RANGED_SKILL = 1616;
export const UNIT_MELEE_SKILL = 1717;
/** Hit points; <= 0 is dead. */
export const UNIT_HP = 1919;
/** Food (hunger: falls over time, 0 hurts) and energy (tiredness: sleeping restores it). */
export const UNIT_FOOD = 2020;
export const UNIT_ENERGY = 2121;
/** Portrait index, rolled from t189 by gender and age band. */
export const UNIT_PORTRAIT = 2727;
/** Current behaviour type (69 idle, 77 building, 10.. gathering ...); indexes most `t` tables. */
export const UNIT_TYPE = 2828;
/** Sub-state of the current type. */
export const UNIT_MODE = 2929;
/** Where the unit is heading (tile column / row). */
export const UNIT_TARGET_X = 3131;
export const UNIT_TARGET_Y = 3232;
/** Thought bubble shown above the unit. */
export const UNIT_THOUGHT = 3333;
/** What the unit carries (1 = raw food ...), how much, and how much it can carry. */
export const UNIT_CARRY_KIND = 3535;
export const UNIT_CARRY_AMOUNT = 3636;
export const UNIT_CARRY_CAPACITY = 3737;
/** The type saved before a temporary state (restored afterwards). */
export const UNIT_SAVED_TYPE = 3939;
/** The record (building / site; negative = resource cell) the unit works for or heads to. */
export const UNIT_RECORD = 4444;
/** Next unit in a record's worker chain (also the FORM UP chain, -111..-122). */
export const UNIT_NEXT_WORKER = 4545;
/** Work slot inside the record. */
export const UNIT_SLOT = 4646;
/** Work target: a grid value (negative resource / building id, 101+ animal). */
export const UNIT_WORK_TARGET = 4747;
/** Sight radius. */
export const UNIT_VISION = 4949;
/** Order state: 2 is written when the player orders the unit somewhere; other values unnamed. */
export const UNIT_ORDER = 6161;
/** Place the unit returns to after eating / sleeping (column / row). */
export const UNIT_HOME_X = 6262;
export const UNIT_HOME_Y = 6363;
/** The type the unit falls back to: its job (56 builder, 69 none ...). */
export const UNIT_JOB_TYPE = 6464;
/** Item in hand (weapon slot index into t77; 9 = bare hands, 15 = flower). */
export const UNIT_HELD_ITEM = 6565;
export const UNIT_MAX_HP = 6767;
/** Name index. */
export const UNIT_NAME = 6868;
/** Civil skills named by the help page and the J() tables (6969 gathering, 7373 sorcery, 7474
 *  building); 7070/7171/7272 are only guessed from the help page order and stay numbers. */
export const UNIT_GATHER_SKILL = 6969;
export const UNIT_SORCERY_SKILL = 7373;
export const UNIT_BUILD_SKILL = 7474;
export const UNIT_SCOUT_SKILL = 7575;
/** Bit flags (4 = marked by b.t()'s timers, 96 = CALL TO ARMS / FORM UP member; others unnamed). */
export const UNIT_FLAGS = 7979;

// ---- Buildings and sites: records 1..60 (1..30 team 0, 31..60 team 1), 61 bytes per field ----
export const BLD_X = 8383;
export const BLD_Y = 8444;
/** Hit points; for a site, construction progress. */
export const BLD_HP = 8505;
export const BLD_MAX_HP = 8566;
/** Work in progress on a finished building: 1 upgrade, 2 repair. */
export const BLD_WORK = 8627;
/** Building kind (2 hut, 3 camp, 4 kitchen, 6 store ...; >= 12 is a construction site). */
export const BLD_KIND = 8749;
/** The unit inside / owner (cook, smith ...). */
export const BLD_OWNER = 8810;
/** Number of workers and the head of the worker chain (see UNIT_NEXT_WORKER). */
export const BLD_WORKERS = 8932;
export const BLD_WORKER_HEAD = 8993;
export const BLD_LEVEL = 9115;
/** For a site, the kind it becomes when finished; during an upgrade, the saved dwellers. */
export const BLD_PLANNED_KIND = 9237;

// ---- Animals: 22 slots, 22 bytes per field ---------------------------------------------------
export const ANIMAL_X = 9359;
export const ANIMAL_Y = 9381;
/** 19 + the unit that last hit it. */
export const ANIMAL_HIT_BY = 9447;
export const ANIMAL_HP = 9513;
/** Kind 0..2; t181 aggression [5, 100, 0] -- kind 2 never fights back (the deer). */
export const ANIMAL_KIND = 9535;
export const ANIMAL_TARGET = 9601;
/** Remembered destination cell. */
export const ANIMAL_DEST_X = 9645;
export const ANIMAL_DEST_Y = 9667;

// ---- Resource points (trees, stone, berries): 50 slots, 50 bytes per field --------------------
export const RES_X = 9733;
export const RES_Y = 9783;
export const RES_KIND = 9833;
export const RES_AMOUNT = 9883;
/** Appearance stage (how depleted it looks). */
export const RES_LOOK = 9933;
