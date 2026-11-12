import type { ItemState } from "./types"

/** Items below this mastery are "shaky" and feed the practice node. */
export const PRACTICE_MASTERY_CEILING = 0.6

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
