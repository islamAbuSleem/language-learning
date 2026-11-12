import type { Exercise } from "#shared/content/schema"

import { getProgressRepository } from "../db/progressRepository"
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
  return getProgressRepository().loadProfile(learnerId)
}

export async function getItemState(
  learnerId: string,
  itemId: string,
): Promise<ItemState | null> {
  return getProgressRepository().loadItem(learnerId, itemId)
}

export async function listItemStates(learnerId: string): Promise<ItemState[]> {
  return getProgressRepository().listItems(learnerId)
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
  const repository = getProgressRepository()

  const previous = (await repository.loadItem(learnerId, exercise.id)) ??
    createItemState(exercise.id, now)

  const item = applyOutcome(previous, outcome, grade, now)
  const profile = applyExerciseResult(await repository.loadProfile(learnerId), outcome, now)

  await repository.saveItem(learnerId, item)
  await repository.saveProfile(learnerId, profile)

  return { item, profile }
}
