import type { ItemState } from "#shared/srs/types"

import type { LearnerProfile } from "../srs/progress"

export interface LearnerItemState {
  profile: LearnerProfile
  item: ItemState | null
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
   */
  recordExercise(
    learnerId: string,
    item: ItemState,
    profile: LearnerProfile,
  ): Promise<void>
}
