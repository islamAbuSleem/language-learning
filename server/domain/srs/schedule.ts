import { MS_PER_DAY } from "./dates"
import type { ExerciseOutcome, ItemState } from "./types"

/**
 * Days until an item comes back, derived from mastery.
 *
 * The top band grows with stability instead of a fixed gap: a well-known item
 * keeps stretching out, a shaky one keeps coming back.
 */
export function intervalDaysFor(mastery: number): number {
  if (mastery < 0.2) return 0
  if (mastery < 0.4) return 1
  if (mastery < 0.6) return 2
  if (mastery < 0.8) return 4
  if (mastery < 0.95) return 8
  return 14
}

/**
 * The next stability, in days.
 *
 * A skipped item keeps its mastery but comes back in the same session, so its
 * stability is zero too.
 *
 * A wrong answer resets stability to zero: the item comes back this session.
 * A correct answer either adopts the mastery schedule or, for well-known items,
 * stretches the previous stability.
 */
export function nextStability(
  previousStability: number,
  mastery: number,
  outcome: ExerciseOutcome,
): number {
  if (outcome === "skipped" || outcome === "incorrect") return 0

  const scheduled = intervalDaysFor(mastery)
  if (scheduled < 14) return scheduled

  return Math.max(14, Math.round(previousStability * 2.5))
}

export function dueAtFor(now: number, stabilityDays: number): number {
  return now + stabilityDays * MS_PER_DAY
}
