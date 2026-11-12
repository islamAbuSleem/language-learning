import type { ItemState } from "#shared/srs/types"

import type { LearnerProfile } from "../srs/progress"

export interface LearnerItemState {
  profile: LearnerProfile
  item: ItemState | null
}

/** One day of practice, as the calendar remembers it. */
export interface PracticeDay {
  /** `YYYY-MM-DD` in UTC. */
  day: string
  /** Exercises finished that day. */
  answers: number
  /** Of those, the ones answered correctly. */
  correct: number
  /** XP earned that day. */
  xp: number
}

/** What one finished exercise adds to its day. */
export interface DayScore {
  date: string
  answers: number
  correct: number
  xp: number
}

/**
 * Where progress lives.
 *
 * The SRS engine never touches a database: it works on plain values, and this
 * interface is the only seam. Swapping Neon for something else means writing
 * another implementation, not touching the scheduling logic.
 */
export interface ProgressRepository {
  /** The learner profile, empty if the learner is new. */
  loadProfile(learnerId: string): Promise<LearnerProfile>
  /** One item's memory state, or null if the learner has never met it. */
  loadItem(learnerId: string, itemId: string): Promise<ItemState | null>
  /**
   * The profile and one item in a single read.
   *
   * A round trip to Neon costs about a third of a second, and answering an
   * exercise needs both, so they are fetched together.
   */
  loadState(learnerId: string, itemId: string): Promise<LearnerItemState>
  /** Every item the learner has met. */
  listItems(learnerId: string): Promise<ItemState[]>
  /**
   * Write one finished exercise: the item's state and the profile together.
   *
   * Both in a single write, because a learner is waiting for the answer.
   * The day's totals ride in the same write, so the calendar never drifts
   * away from the answers.
   */
  recordExercise(
    learnerId: string,
    item: ItemState,
    profile: LearnerProfile,
    day: DayScore,
  ): Promise<void>
  /** Every day the learner has practised, oldest first. */
  listDays(learnerId: string): Promise<PracticeDay[]>
  /**
   * Move one learner's progress into another's, then forget the first.
   *
   * Signing in merges the anonymous cookie's progress into the account: per
   * item the most recently reviewed state wins, per day the counts add up,
   * and the profile keeps the summed XP with the longer streak. Histories
   * are disjoint by construction (a merged cookie is cleared), so nothing
   * is counted twice.
   */
  adoptProgress(fromLearnerId: string, toLearnerId: string): Promise<void>
}
