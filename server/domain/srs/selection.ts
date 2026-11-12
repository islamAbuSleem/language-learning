import { PRACTICE_MASTERY_CEILING, type ItemState } from "#shared/srs/types"

export function isDue(state: ItemState, now: number): boolean {
  return state.dueAt <= now
}

/**
 * The practice node draws the shakiest due items, oldest due first.
 */
export function selectPracticeItems(
  states: readonly ItemState[],
  count: number,
  now: number,
): ItemState[] {
  return states
    .filter((state) => state.mastery < PRACTICE_MASTERY_CEILING && isDue(state, now))
    .sort((a, b) => a.dueAt - b.dueAt || a.mastery - b.mastery)
    .slice(0, Math.max(0, count))
}

/**
 * A unit review mixes every due item of the unit, weakest first, regardless of
 * how well the learner knows it.
 */
export function selectReviewItems(
  states: readonly ItemState[],
  count: number,
  now: number,
): ItemState[] {
  return states
    .filter((state) => isDue(state, now))
    .sort((a, b) => a.mastery - b.mastery || a.dueAt - b.dueAt)
    .slice(0, Math.max(0, count))
}

/**
 * The weakest items, whether or not they are due.
 *
 * This is the "practice weakest skills" behaviour: a learner who keeps getting
 * one word wrong should be able to drill it now, not in six days.
 */
export function selectWeakItems(states: readonly ItemState[], count: number): ItemState[] {
  return states
    .filter((state) => state.mastery < PRACTICE_MASTERY_CEILING)
    .sort((a, b) => a.mastery - b.mastery || a.dueAt - b.dueAt)
    .slice(0, Math.max(0, count))
}
