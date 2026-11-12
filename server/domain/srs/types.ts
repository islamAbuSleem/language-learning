/**
 * Core SRS types. Framework-free: this module must never import from Nuxt, Nitro
 * or any browser API so the scheduling logic stays testable in isolation.
 */

/** What the learner did with one exercise. */
export type ExerciseOutcome = "correct" | "incorrect" | "skipped"

/**
 * The learner's own judgement of how hard the item was. This is the signal the
 * reference app asks for on every item ("Too easy" / "Too difficult").
 */
export type DifficultyGrade = "too_easy" | "too_difficult" | "neutral"

/** The exercise kinds this app renders. */
export type ExerciseType = "select" | "match" | "type_in" | "listen"

/** Per-item memory state. */
export interface ItemState {
  /** Stable id, e.g. `es/u1/select/gato`. */
  itemId: string
  /** Estimated recall strength, 0..1. */
  mastery: number
  /** Times the item was presented and answered (skips do not count). */
  reps: number
  /** Times the item was answered incorrectly. */
  lapses: number
  /** Current scheduling interval in days. 0 means "again in this session". */
  stability: number
  /** Epoch milliseconds when the item is next due. */
  dueAt: number
  /** Epoch milliseconds of the last completed review, or null. */
  lastReviewedAt: number | null
}
