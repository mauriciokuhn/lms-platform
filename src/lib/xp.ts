/**
 * Shared gamification constants.
 *
 * Single source of truth for the XP economy so the award route, the
 * weekly summary and the UI never drift apart.
 */

/** XP granted for completing one lesson. */
export const XP_PER_LESSON = 50;

/** XP required to go from one level to the next. */
export const XP_PER_LEVEL = 200;

/** Current level from total XP (levels start at 1). */
export function levelFromXp(xp: number) {
  return Math.floor(xp / XP_PER_LEVEL) + 1;
}
