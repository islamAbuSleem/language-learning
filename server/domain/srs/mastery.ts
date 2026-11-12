import { dueAtFor, nextStability } from "./schedule"
import type { DifficultyGrade, ExerciseOutcome, ItemState } from "./types"

export const MIN_MASTERY = 0
export const MAX_MASTERY = 1

/**
 * Mastery change per outcome and self-grade.
 *
 * "Too easy" on a wrong answer is contradictory, so it is treated as neutral.
 */
export const MASTERY_DELTA = {
  correct: {
    too_easy: 0.3,
    neutral: 0.12,
    too_difficult: 0.02,
  },
  incorrect: {
    too_easy: -0.35,
    neutral: -0.35,
    too_difficult: -0.45,
  },
} as const

export function clampMastery(value: number): number {
  if (!Number.isFinite(value)) return MIN_MASTERY
  return Math.min(MAX_MASTERY, Math.max(MIN_MASTERY, value))
}

export function effectiveGrade(outcome: ExerciseOutcome, grade: DifficultyGrade): DifficultyGrade {
  if (outcome === "skipped") return "neutral"
  if (outcome === "incorrect" && grade === "too_easy") return "neutral"
  return grade
}

export function masteryDelta(outcome: ExerciseOutcome, grade: DifficultyGrade): number {
  if (outcome === "skipped") return 0
  return MASTERY_DELTA[outcome][effectiveGrade(outcome, grade)]
}

export function createItemState(itemId: string, now: number): ItemState {
  return {
    itemId,
    mastery: MIN_MASTERY,
    reps: 0,
    lapses: 0,
    stability: 0,
    dueAt: now,
    lastReviewedAt: null,
  }
}

/**
 * Apply one completed exercise to an item's state.
 *
 * Skips change nothing except the review timestamp: the item stays at the same
 * mastery and becomes due immediately, so it returns in the same session.
 */
export function applyOutcome(
  state: ItemState,
  outcome: ExerciseOutcome,
  grade: DifficultyGrade,
  now: number,
): ItemState {
  const mastery = clampMastery(state.mastery + masteryDelta(outcome, grade))
  const stability = nextStability(state.stability, mastery, outcome)

  return {
    itemId: state.itemId,
    mastery,
    reps: outcome === "skipped" ? state.reps : state.reps + 1,
    lapses: outcome === "incorrect" ? state.lapses + 1 : state.lapses,
    stability,
    dueAt: dueAtFor(now, stability),
    lastReviewedAt: now,
  }
}
