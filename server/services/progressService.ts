import type { Exercise } from "#shared/content/schema"

import {
  applyExerciseResult,
  applyOutcome,
  createItemState,
  createLearnerProfile,
  type DifficultyGrade,
  type ExerciseOutcome,
  type ItemState,
  type LearnerProfile,
} from "../domain/srs"

/**
 * Learner state for v0.
 *
 * There is no account system yet, so everything lives in memory for a single
 * learner id. Swapping this for a database means replacing this module only:
 * the SRS engine already works on plain values.
 */
const LEARNER_ID = "local"

interface LearnerState {
  profile: LearnerProfile
  items: Map<string, ItemState>
}

const state = new Map<string, LearnerState>()

function learnerState(learnerId: string): LearnerState {
  const existing = state.get(learnerId)
  if (existing) return existing

  const created: LearnerState = {
    profile: createLearnerProfile(),
    items: new Map<string, ItemState>(),
  }
  state.set(learnerId, created)

  return created
}

export function currentLearnerId(): string {
  return LEARNER_ID
}

export function getProfile(learnerId: string): LearnerProfile {
  return { ...learnerState(learnerId).profile }
}

export function getItemState(learnerId: string, itemId: string): ItemState {
  const learner = learnerState(learnerId)

  return learner.items.get(itemId) ?? createItemState(itemId, Date.now())
}

export function listItemStates(learnerId: string): ItemState[] {
  return [...learnerState(learnerId).items.values()]
}

/**
 * Record one finished exercise: the item's memory state and the learner's
 * hearts, xp and streak all move together.
 */
export function recordExercise(
  learnerId: string,
  exercise: Exercise,
  outcome: ExerciseOutcome,
  grade: DifficultyGrade,
  now: number,
): { item: ItemState; profile: LearnerProfile } {
  const learner = learnerState(learnerId)
  const previous = learner.items.get(exercise.id) ?? createItemState(exercise.id, now)

  const item = applyOutcome(previous, outcome, grade, now)
  const profile = applyExerciseResult(learner.profile, outcome, now)

  learner.items.set(exercise.id, item)
  learner.profile = profile

  return { item, profile }
}
