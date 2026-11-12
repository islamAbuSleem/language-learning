import type { Exercise } from "#shared/content/schema"

import { getProgressRepository } from "../db/progressRepository"
import type { PracticeDay } from "../domain/progress/repository"
import { toIsoDate } from "../domain/srs/dates"
import {
  applyExerciseResult,
  applyOutcome,
  createItemState,
  type DifficultyGrade,
  type ExerciseOutcome,
  type ItemState,
  type LearnerProfile,
} from "../domain/srs"

/**
 * Learner progress.
 *
 * The store is Postgres (Neon). The SRS engine is unchanged: it still works on
 * plain values, and this module is the only thing that knows about rows.
 */

export async function getProfile(learnerId: string): Promise<LearnerProfile> {
  const repository = await getProgressRepository()

  return repository.loadProfile(learnerId)
}

export async function getItemState(
  learnerId: string,
  itemId: string,
): Promise<ItemState | null> {
  const repository = await getProgressRepository()

  return repository.loadItem(learnerId, itemId)
}

export async function listItemStates(learnerId: string): Promise<ItemState[]> {
  const repository = await getProgressRepository()

  return repository.listItems(learnerId)
}

/**
 * Record one finished exercise: the item's memory state and the learner's xp
 * and streak both move together.
 */
export async function recordExercise(
  learnerId: string,
  exercise: Exercise,
  outcome: ExerciseOutcome,
  grade: DifficultyGrade,
  now: number,
): Promise<{ item: ItemState; profile: LearnerProfile }> {
  const repository = await getProgressRepository()

  // One read for both the item and the profile, then one write for both.
  const state = await repository.loadState(learnerId, exercise.id)
  const previous = state.item ?? createItemState(exercise.id, now)

  const item = applyOutcome(previous, outcome, grade, now)
  const profile = applyExerciseResult(state.profile, outcome, now)

  // The day's totals ride in the same write, so the calendar never drifts
  // away from the answers. A skip earns nothing but still counts as showing up.
  await repository.recordExercise(learnerId, item, profile, {
    date: toIsoDate(now),
    answers: 1,
    correct: outcome === "correct" ? 1 : 0,
    xp: profile.xp - state.profile.xp,
  })

  return { item, profile }
}

/** Every day the learner has practised, oldest first. */
export async function listPracticeDays(learnerId: string): Promise<PracticeDay[]> {
  const repository = await getProgressRepository()

  return repository.listDays(learnerId)
}
