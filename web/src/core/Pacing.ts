/**
 * The game's pacing numbers in one place (docs/gameplay.md §7.2, docs/modernization-plan.md §5
 * "节奏调整"). Each is a multiplier on the original's speed (1 = the original) or a switch.
 * `npm --prefix web run pacing` measures a fixed game with these; it may override them for a run.
 */
export const Pacing = {
  /** Building speed: a builder's work steps on a site's or building's hit points come this much
   *  faster (user 2026-11-03: 1.5). */
  build: 1.5,
  /** How fast children grow up: scales only the frames per year of a child under 12 (252 at 1);
   *  adults age as before (user 2026-11-03: 2). */
  childGrowth: 2,
  /** Berry and mushroom bushes (resource kinds 1..4) never run out, like trees and rocks, and
   *  always show their fullest look (user 2026-11-03). */
  berriesEndless: true,
};
