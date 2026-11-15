import { PRACTICE_MASTERY_CEILING } from "#shared/srs/types"
import type { ItemState } from "#shared/srs/types"

/**
 * The share of what the learner has learned that may still be an error.
 *
 * Twenty per cent. A learner who has met thirty words and got six of them
 * wrong has an error list of a fifth of their learning, and the path waits
 * for those six. A learner who got one word wrong out of twenty does not
 * wait for anything: one miss is a learning curve, not a hole.
 */
export const ERROR_SHARE_CEILING = 0.2

/**
 * How much the learner knows, and what is still wrong.
 *
 * This is the percentage the learner sees: errors against the words they
 * have met. It is measured over everything they have learned, so a unit
 * that was answered badly keeps counting until those words are solid again.
 */
export interface LearningProgress {
  /** Items the learner has been shown. */
  met: number
  /** Items still shaky: below the mastery ceiling. */
  shaky: number
  /**
   * Items that were answered wrong and are still shaky.
   *
   * These are the errors: the words the learner met and missed. An item
   * that was missed and has since been made solid is not an error any more.
   */
  errors: number
  /** Answers given, and how many were right. */
  answered: number
  right: number
  /** Right over answered, 0..1. Null before the first answer. */
  accuracy: number | null
  /** Errors over items met, 0..1. The percentage the learner sees. */
  errorShare: number
}

/**
 * What the learner knows, counted from the items they have met.
 *
 * A skipped item counts as met — it was shown — but not as an answer, so it
 * never flatters the accuracy.
 */
export function describeLearningProgress(states: readonly ItemState[]): LearningProgress {
  let met = 0
  let shaky = 0
  let errors = 0
  let answered = 0
  let right = 0

  for (const state of states) {
    if (state.lastReviewedAt === null) continue

    met += 1

    if (state.mastery < PRACTICE_MASTERY_CEILING) {
      shaky += 1
      if (state.lapses > 0) errors += 1
    }

    answered += state.reps
    right += state.reps - state.lapses
  }

  return {
    met,
    shaky,
    errors,
    answered,
    right,
    accuracy: answered > 0 ? right / answered : null,
    errorShare: met > 0 ? errors / met : 0,
  }
}

/**
 * Whether the path waits for the learner's errors.
 *
 * The wait is never a wall: it names the errors, says the share, and points
 * at the practice that clears them. It lifts as soon as the errors do.
 */
export interface ErrorGate {
  /** True while the path waits. */
  held: boolean
  /** How many errors are on the list. */
  errors: number
  /** The share of the learning that is still wrong, 0..1. */
  errorShare: number
  /** The share allowed before the path waits. */
  ceiling: number
  /** What the learner has to do to open the path. */
  message: string
}

/**
 * The gate itself.
 *
 * The path waits when the error list is a bigger share of the learning than
 * the ceiling allows, and there is at least one error to fix. Everything
 * else — a learner with no errors, a learner who has not met anything yet —
 * walks straight through.
 */
export function errorGate(progress: LearningProgress): ErrorGate {
  const held = progress.errors > 0 && progress.errorShare > ERROR_SHARE_CEILING

  const message = held
    ? `You are at ${Math.round(progress.errorShare * 100)}% errors — ${progress.errors} of your ${progress.met} words are still wrong. Practise them to get back to ${Math.round(ERROR_SHARE_CEILING * 100)}%.`
    : "Your errors are under control. Carry on."

  return {
    held,
    errors: progress.errors,
    errorShare: progress.errorShare,
    ceiling: ERROR_SHARE_CEILING,
    message,
  }
}
