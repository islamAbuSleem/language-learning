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

/**
 * The misses of one unit that are still shaky, weakest first.
 *
 * This is the repair scope: a learner who finishes a unit at 70% does not go
 * back through the whole unit, they answer the ones they missed. An item
 * belongs here when it was answered wrong at least once and is still below
 * the ceiling — a miss that is already solid again needs no repair.
 */
export function selectRepairStates(
  unitExerciseIds: readonly string[],
  states: readonly ItemState[],
  count: number,
): ItemState[] {
  const wanted = new Set(unitExerciseIds)

  return states
    .filter(
      (state) =>
        wanted.has(state.itemId) &&
        state.lapses > 0 &&
        state.mastery < PRACTICE_MASTERY_CEILING,
    )
    .sort((a, b) => a.mastery - b.mastery || a.dueAt - b.dueAt)
    .slice(0, Math.max(0, count))
}

/**
 * The learner's errors: everything they got wrong and have not made solid.
 *
 * This is the list the gate points at. An item that was missed once and has
 * since been answered well enough is no longer an error, so it drops off the
 * list by itself. Items that were never missed are not errors either, even
 * when they are still shaky.
 */
export function selectErrorItems(states: readonly ItemState[], count: number): ItemState[] {
  return states
    .filter((state) => state.lapses > 0 && state.mastery < PRACTICE_MASTERY_CEILING)
    .sort((a, b) => a.mastery - b.mastery || a.dueAt - b.dueAt)
    .slice(0, Math.max(0, count))
}
