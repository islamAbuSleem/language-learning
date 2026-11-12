/**
 * SRS types shared by the app, the API and the tests.
 *
 * Lives in `shared/` so the learner app can talk about outcomes and grades
 * without importing anything from the server side.
 */

/** What the learner did with one exercise. */
export type ExerciseOutcome = "correct" | "incorrect" | "skipped"

/**
 * The learner's own judgement of how hard the item was. This is the signal the
 * reference app asks for on every item ("Too easy" / "Too difficult").
 */
export type DifficultyGrade = "too_easy" | "too_difficult" | "neutral"

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
